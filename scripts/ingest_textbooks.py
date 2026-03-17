import os
import argparse
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import DictCursor
import uuid
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import google.generativeai as genai
import pymupdf
import math
import time
import json
import subprocess

# Load environment variables
load_dotenv(dotenv_path="../.env")

DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is missing.")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is missing.")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

def embed_texts(texts, retries=5):
    """Generate embeddings using Gemini API with jittered exponential backoff."""
    for attempt in range(retries):
        try:
            result = genai.embed_content(
                model="models/gemini-embedding-001",
                content=texts,
                task_type="retrieval_document",
            )
            return result['embedding']
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                if attempt < retries - 1:
                    # More aggressive backoff for 429s: 15s, 30s, 60s, 120s
                    wait_time = (2 ** attempt * 15) + (time.time() % 5) # Adding a bit of jitter
                    print(f"    Rate limit hit (429). Retrying in {wait_time:.1f}s... (Attempt {attempt + 1}/{retries})")
                    time.sleep(wait_time)
                else:
                    raise
            else:
                if attempt < retries - 1:
                    wait_time = (2 ** attempt * 5) + (time.time() % 5)
                    print(f"    Error: {e}. Retrying in {wait_time:.1f}s...")
                    time.sleep(wait_time)
                else:
                    raise

def extract_text_with_ocr(pdf_path):
    """Extract text from PDF using PyMuPDF and OCR fallback if necessary."""
    doc = pymupdf.open(pdf_path)
    pages_text = []
    
    print(f"  Extracting text from {len(doc)} pages...")
    for i, page in enumerate(doc):
        # First try standard text extraction
        text = page.get_text().strip()
        
        # If no text found, try OCR
        if not text:
            try:
                # Get page as image (zoom 2x for better OCR)
                pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
                img_data = pix.tobytes("png")
                
                # Use Tesseract via subprocess since we don't want to rely on more pip packages if possible
                # Or we can use pytesseract if we want to install it. Subprocess is cleaner here.
                process = subprocess.Popen(['tesseract', 'stdin', 'stdout'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                stdout, stderr = process.communicate(input=img_data)
                text = stdout.decode('utf-8').strip()
                if text:
                    print(f"    Page {i+1}: Extracted text via OCR.")
            except Exception as e:
                print(f"    Page {i+1}: OCR failed: {e}")
        
        pages_text.append({
            "content": text,
            "metadata": {"page": i}
        })
    
    return pages_text

def main():
    parser = argparse.ArgumentParser(description="Ingest PDF textbooks into RAG database.")
    parser.add_argument("--dir", type=str, required=True, help="Directory containing PDF files")
    args = parser.parse_args()
    
    pdf_dir = Path(args.dir)
    if not pdf_dir.exists() or not pdf_dir.is_dir():
        print(f"Error: Directory '{pdf_dir}' does not exist.")
        return

    pdf_files = list(pdf_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"No PDF files found in '{pdf_dir}'.")
        return

    print(f"Found {len(pdf_files)} PDF files in {pdf_dir}")

    # Connect to DB
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=DictCursor)

    for pdf_path in pdf_files:
        print(f"\nProcessing {pdf_path.name}...")
        
        # 3. Check if document exists and get ID
        title = pdf_path.stem
        cursor.execute("SELECT id, status, \"ingestionStatus\" FROM \"RagDocument\" WHERE title = %s", (title,))
        existing_doc = cursor.fetchone()
        
        doc_id = None
        if existing_doc:
            doc_id = existing_doc['id']
            # Check if it already has chunks
            cursor.execute("SELECT COUNT(*) FROM \"RagChunk\" WHERE \"documentId\" = %s", (doc_id,))
            chunk_count = cursor.fetchone()[0]
            
            if existing_doc['ingestionStatus'] == 'INDEXED' and chunk_count > 0:
                print(f"  Document '{title}' already indexed with {chunk_count} chunks. Skipping.")
                continue
            else:
                print(f"  Document '{title}' exists (ID: {doc_id}) but is incomplete ({chunk_count} chunks). Resuming...")
        else:
            # Insert Document Record
            doc_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO "RagDocument" 
                (id, title, "sourceType", "inputMethod", "fileName", status, "ingestionStatus", "processedAt", "updatedAt")
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """,
                (doc_id, title, "textbook", "upload", pdf_path.name, "active", "PROCESSING")
            )
            conn.commit()
            print(f"  Created new RagDocument with ID: {doc_id}")

        # 4. Parse PDF with OCR fallback
        print(f"  Loading PDF and extracting text (with OCR fallback)...")
        pages = extract_text_with_ocr(str(pdf_path))
        print(f"  Loaded {len(pages)} pages.")

        # 5. Chunk Text
        print(f"  Chunking text...")
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
            is_separator_regex=False,
        )
        
        # Format for splitter
        from langchain_core.documents import Document
        docs = [Document(page_content=p["content"], metadata=p["metadata"]) for p in pages if p["content"]]
        
        chunks = text_splitter.split_documents(docs)
        print(f"  Created {len(chunks)} chunks.")

        if not chunks:
            print(f"  No text could be extracted. Skipping.")
            continue

        # 6. Generate Embeddings & Insert Chunks
        print(f"  Generating embeddings and inserting chunks...")
        texts = [chunk.page_content for chunk in chunks]
        token_counts = [math.ceil(len(chunk.page_content) / 4) for chunk in chunks]
        
        # Process in batches of 100 (Gemini supports up to 100 in one batch_embed_contents call)
        # Larger batches = fewer requests against your daily/minute quota.
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i+batch_size]
            batch_num = i // batch_size + 1
            total_batches = math.ceil(len(texts) / batch_size)
            
            # RESUME LOGIC: Check if these chunks already exist
            # Note: This is an approximation based on index and document
            cursor.execute(
                "SELECT COUNT(*) FROM \"RagChunk\" WHERE \"documentId\" = %s AND \"chunkIndex\" >= %s AND \"chunkIndex\" < %s",
                (doc_id, i, i + batch_size)
            )
            existing_count = cursor.fetchone()[0]
            if existing_count == len(batch_texts):
                print(f"    Batch {batch_num}/{total_batches} already exists. Skipping.")
                continue

            print(f"    Embedding batch {batch_num}/{total_batches} ({len(batch_texts)} chunks)...")
            
            # Generate embeddings via Gemini
            embeddings = embed_texts(batch_texts)
            
            # Insert into database
            for j, (text, embedding) in enumerate(zip(batch_texts, embeddings)):
                global_index = i + j
                chunk_id = str(uuid.uuid4())
                
                # Format embedding vector for pgvector
                embedding_str = f"[{','.join(map(str, embedding))}]"
                
                cursor.execute(
                    """
                    INSERT INTO "RagChunk" 
                    (id, "documentId", "chunkIndex", content, "tokenCount", "pageNumber", embedding, "updatedAt")
                    VALUES (%s, %s, %s, %s, %s, %s, %s::vector, NOW())
                    """,
                    (
                        chunk_id, 
                        doc_id, 
                        global_index, 
                        text, 
                        token_counts[global_index],
                        chunks[global_index].metadata.get("page", 0) + 1,
                        embedding_str
                    )
                )
            
            # Commit after each batch
            conn.commit()
            
            # Small delay to avoid rate limiting
            # For Free Tier (15 RPM), waiting ~5-10s between batch-of-100s is safer
            time.sleep(5.0)

        # Mark as fully indexed
        cursor.execute(
            "UPDATE \"RagDocument\" SET \"ingestionStatus\" = 'INDEXED', \"updatedAt\" = NOW() WHERE id = %s",
            (doc_id,)
        )
        conn.commit()
        print(f"  Successfully processed {pdf_path.name}.")
    
    cursor.close()
    conn.close()
    print("\nAll done!")

if __name__ == "__main__":
    main()
