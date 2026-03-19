-- RAG search indexes optimized for Neon Postgres + pgvector 0.8
-- We use halfvec for ANN indexing because HNSW on vector is limited to 2000 dims.
-- Your embeddings are vector(3072), so we index a half-precision copy: halfvec(3072).

-- 0) Add halfvec column for indexed ANN search
ALTER TABLE "RagChunk"
ADD COLUMN IF NOT EXISTS "embeddingHalf" halfvec(3072);

-- 1) Backfill halfvec column (safe to re-run)
UPDATE "RagChunk"
SET "embeddingHalf" = "embedding"::halfvec
WHERE "embedding" IS NOT NULL
  AND "embeddingHalf" IS NULL;

-- 2) Vector ANN index (HNSW) on halfvec cosine distance
CREATE INDEX IF NOT EXISTS "RagChunk_embeddingHalf_hnsw_idx"
ON "RagChunk"
USING hnsw ("embeddingHalf" halfvec_cosine_ops)
WHERE "embeddingHalf" IS NOT NULL;

-- 3) Full-text search index for lexical retrieval (hybrid search)
CREATE INDEX IF NOT EXISTS "RagChunk_content_fts_idx"
ON "RagChunk"
USING gin (to_tsvector('english', "content"));

-- 4) Scope/filter indexes
CREATE INDEX IF NOT EXISTS "RagChunk_nodeId_idx" ON "RagChunk" ("nodeId");
CREATE INDEX IF NOT EXISTS "RagChunk_yearId_idx" ON "RagChunk" ("yearId");
CREATE INDEX IF NOT EXISTS "RagChunk_subjectId_idx" ON "RagChunk" ("subjectId");
CREATE INDEX IF NOT EXISTS "RagChunk_chapterId_idx" ON "RagChunk" ("chapterId");
CREATE INDEX IF NOT EXISTS "RagChunk_conceptId_idx" ON "RagChunk" ("conceptId");
CREATE INDEX IF NOT EXISTS "RagChunk_documentId_idx" ON "RagChunk" ("documentId");

