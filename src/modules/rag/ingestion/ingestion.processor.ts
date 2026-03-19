import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { PrismaService } from '../../../prisma/prisma.service';
import { SyllabusService } from '../../syllabus/syllabus.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { ChapterDetectionService, DetectedChapter } from './chapter-detection.service';
import { PdfRendererService } from './pdf-renderer.service';
import { TocVisionService } from './toc-vision.service';
import { OcrService } from './ocr.service';
import { NodeType } from '@prisma/client';

interface ChapterScope {
  nodeId: string;
  yearId?: string;
  subjectId?: string;
  chapterId?: string;
  conceptId?: string;
}

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private prisma: PrismaService,
    private syllabusService: SyllabusService,
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService,
    private chapterDetectionService: ChapterDetectionService,
    private pdfRenderer: PdfRendererService,
    private tocVision: TocVisionService,
    private ocrService: OcrService,
  ) {
    super();
  }

  // ─── Entry point ─────────────────────────────────────────────────────────────

  async process(job: Job<any>): Promise<any> {
    const { documentId, metadata } = job.data;
    this.logger.log(`[Job ${job.id}] Starting ingestion for document ${documentId}`);

    try {
      await this.prisma.ragDocument.update({
        where: { id: documentId },
        data: { ingestionStatus: 'PROCESSING', failureReason: null },
      });

      // 1. Extract raw text
      const rawText = await this.extractText(job);
      this.logger.log(`[Job ${job.id}] Extracted ${rawText.length} chars`);

      // 2. Decide whether to auto-detect chapters
      const autoDetect = metadata?.autoDetectChapters !== false; // default: true

      if (autoDetect && metadata?.nodeId) {
        await this.ingestWithChapterDetection(job.id as string, documentId, rawText, metadata);
      } else {
        // Legacy flat ingestion (no chapter splitting)
        await this.ingestFlat(job.id as string, documentId, rawText, metadata);
      }

      await this.prisma.ragDocument.update({
        where: { id: documentId },
        data: { ingestionStatus: 'INDEXED', processedAt: new Date(), failureReason: null },
      });

      this.logger.log(`[Job ${job.id}] ✅ Ingestion complete`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Job ${job.id}] ❌ Failed: ${msg}`, error instanceof Error ? error.stack : undefined);

      await this.prisma.ragDocument
        .update({
          where: { id: documentId },
          data: { ingestionStatus: 'FAILED', failureReason: msg },
        })
        .catch(() => {});

      throw error;
    }
  }

  // ─── Smart chapter-aware ingestion ───────────────────────────────────────────

  private async ingestWithChapterDetection(
    jobId: string,
    documentId: string,
    rawText: string,
    metadata: any,
  ) {
    // If Claude Vision already gave us a ToC, use it directly — no need to re-detect
    let chapters: DetectedChapter[];

    if (this._pendingTocResult && this._pendingTocResult.allChapters.length >= 2) {
      this.logger.log(`[Job ${jobId}] Using Claude Vision ToC (${this._pendingTocResult.allChapters.length} chapters)`);
      // Convert TocChapter → DetectedChapter by splitting the rawText on "CHAPTER N" markers
      chapters = this.buildChaptersFromVisionToc(rawText, this._pendingTocResult);
      this._pendingTocResult = null;
    } else {
      const result = this.chapterDetectionService.detect(rawText);
      this.logger.log(
        `[Job ${jobId}] Chapter detection: strategy=${result.strategy}, found=${result.chapters.length} chapters`,
      );
      chapters = result.chapters;
    }

    if (chapters.length === 0) {
      this.logger.warn(`[Job ${jobId}] No chapters detected, falling back to flat ingestion`);
      return this.ingestFlat(jobId, documentId, rawText, metadata);
    }

    const parentNodeId: string = metadata.nodeId;

    // Determine what NodeType to create for detected chapters based on parent type
    const childType = await this.resolveChildType(parentNodeId);
    this.logger.log(`[Job ${jobId}] Parent type → creating ${childType} nodes for each chapter`);

    let totalChunks = 0;

    for (const chapter of chapters) {
      this.logger.log(`[Job ${jobId}] Processing chapter [${chapter.index}/${chapters.length}]: "${chapter.title}"`);

      // Find or create a SyllabusNode for this chapter
      const chapterNode = await this.findOrCreateNode(
        chapter.title,
        childType,
        parentNodeId,
        chapter.index,
      );

      // Build the full ancestor scope for this chapter node
      const scope = await this.syllabusService.resolveAncestorScope(chapterNode.id);

      // Chunk + embed + store
      const chunkCount = await this.ingestChapterContent(
        jobId,
        documentId,
        chapter,
        scope,
        totalChunks,
      );

      totalChunks += chunkCount;
    }

    this.logger.log(`[Job ${jobId}] Inserted ${totalChunks} total chunks across ${chapters.length} chapters`);
  }

  // ─── Flat (legacy) ingestion ─────────────────────────────────────────────────

  private async ingestFlat(
    jobId: string,
    documentId: string,
    rawText: string,
    metadata: any,
  ) {
    const cleaned = rawText.replace(/\n\s*\n/g, '\n\n').trim();
    const chunks = this.chunkingService.chunkText(cleaned);
    this.logger.log(`[Job ${jobId}] Flat ingestion: ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      if (i % 20 === 0) this.logger.debug(`[Job ${jobId}] Flat chunk ${i + 1}/${chunks.length}`);
      await this.insertChunk(documentId, i, chunks[i], metadata);
    }
  }

  // ─── Core chunk insert ────────────────────────────────────────────────────────

  private async ingestChapterContent(
    jobId: string,
    documentId: string,
    chapter: DetectedChapter,
    scope: ChapterScope,
    globalOffset: number,
  ): Promise<number> {
    const chunks = this.chunkingService.chunkText(chapter.content);
    this.logger.debug(`[Job ${jobId}]   → ${chunks.length} chunks for "${chapter.title}"`);

    if (chunks.length === 0) return 0;

    // Generate all embeddings concurrently (3 at a time to respect Gemini free tier ~15 RPM)
    const embeddings = await this.embeddingService.generateEmbeddingBatch(chunks, 3);

    // Insert all chunks concurrently
    await Promise.all(
      chunks.map((text, i) =>
        this.insertChunkWithEmbedding(documentId, globalOffset + i, text, embeddings[i], {
          ...scope,
          sectionTitle: chapter.title,
        }),
      ),
    );

    return chunks.length;
  }

  /** Pre-computed embedding variant — avoids redundant API call when embedding is already known */
  private async insertChunkWithEmbedding(
    documentId: string,
    chunkIndex: number,
    text: string,
    embedding: number[],
    scope: {
      nodeId?: string;
      yearId?: string;
      subjectId?: string;
      chapterId?: string;
      conceptId?: string;
      sectionTitle?: string;
    },
  ) {
    const vectorStr = `[${embedding.join(',')}]`;

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "RagChunk" (
        "id", "documentId", "chunkIndex", "content", "tokenCount",
        "yearId", "subjectId", "chapterId", "conceptId", "nodeId",
        "sectionTitle",
        "embedding", "embeddingHalf", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10,
        $11::vector, $11::halfvec, NOW()
      )`,
      documentId,
      chunkIndex,
      text,
      Math.ceil(text.length / 4),
      scope.yearId ?? null,
      scope.subjectId ?? null,
      scope.chapterId ?? null,
      scope.conceptId ?? null,
      scope.nodeId ?? null,
      scope.sectionTitle ?? null,
      vectorStr,
    );
  }

  private async insertChunk(
    documentId: string,
    chunkIndex: number,
    text: string,
    scope: {
      nodeId?: string;
      yearId?: string;
      subjectId?: string;
      chapterId?: string;
      conceptId?: string;
      sectionTitle?: string;
    },
  ) {
    const embedding = await this.embeddingService.generateEmbedding(text);
    const vectorStr = `[${embedding.join(',')}]`;

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "RagChunk" (
        "id", "documentId", "chunkIndex", "content", "tokenCount",
        "yearId", "subjectId", "chapterId", "conceptId", "nodeId",
        "sectionTitle",
        "embedding", "embeddingHalf", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10,
        $11::vector, $11::halfvec, NOW()
      )`,
      documentId,
      chunkIndex,
      text,
      Math.ceil(text.length / 4),
      scope.yearId ?? null,
      scope.subjectId ?? null,
      scope.chapterId ?? null,
      scope.conceptId ?? null,
      scope.nodeId ?? null,
      (scope as any).sectionTitle ?? null,
      vectorStr,
    );
  }

  // ─── Syllabus node helpers ────────────────────────────────────────────────────

  /** Given a parent nodeId, return the appropriate child NodeType */
  private async resolveChildType(parentNodeId: string): Promise<NodeType> {
    const parent = await this.prisma.syllabusNode.findUnique({
      where: { id: parentNodeId },
    });
    if (!parent) return NodeType.CHAPTER;

    const map: Record<string, NodeType> = {
      YEAR: NodeType.SUBJECT,
      SUBJECT: NodeType.CHAPTER,
      CHAPTER: NodeType.CONCEPT,
      CONCEPT: NodeType.CONCEPT, // leaf — stay at concept
    };
    return map[parent.type] ?? NodeType.CHAPTER;
  }

  /**
   * Looks for an existing sibling node with the same (normalized) name under parentId.
   * Creates it if not found.
   */
  private async findOrCreateNode(
    title: string,
    type: NodeType,
    parentId: string,
    orderIndex: number,
  ) {
    const normalizedTitle = title.trim();

    // Case-insensitive name match under the same parent
    const existing = await this.prisma.syllabusNode.findFirst({
      where: {
        parentId,
        name: { equals: normalizedTitle, mode: 'insensitive' },
        type,
      },
    });

    if (existing) {
      this.logger.debug(`  Reusing existing node: "${normalizedTitle}" (${existing.id})`);
      return existing;
    }

    const created = await this.prisma.syllabusNode.create({
      data: { name: normalizedTitle, type, parentId, orderIndex },
    });

    this.logger.log(`  Created new ${type} node: "${normalizedTitle}" (${created.id})`);
    return created;
  }

  // ─── Text extraction (scanned + text PDFs) ───────────────────────────────────

  private async extractText(job: Job<any>): Promise<string> {
    if (job.name === 'process-content') {
      return job.data.content as string;
    }

    if (job.name === 'process-file') {
      const filePath: string = job.data.filePath;

      if (!filePath || !fsSync.existsSync(filePath)) {
        throw new Error(`Uploaded file not found at path: ${filePath}`);
      }

      const buffer = await fs.readFile(filePath);
      return this.extractTextFromBuffer(buffer, job.id as string);
    }

    throw new Error(`Unknown job name: ${job.name}`);
  }

  private async extractTextFromBuffer(buffer: Buffer, jobId: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    const rawText: string = pdfData.text ?? '';

    // Use pdf-parse's reported page count (reliable for all PDF types)
    const pageCount: number = pdfData.total ?? 1;

    this.logger.log(`[Job ${jobId}] PDF: ${pageCount} pages, ${rawText.length} chars extracted`);

    if (this.pdfRenderer.isScannedPdf(rawText, pageCount)) {
      this.logger.log(`[Job ${jobId}] Scanned PDF detected (${pageCount} pages). Running OCR pipeline...`);
      return this.runScannedPipeline(buffer, jobId);
    }

    return rawText;
  }

  /**
   * Full scanned PDF pipeline:
   *  1. Claude Vision extracts ToC → structured chapter list
   *  2. Tesseract OCR extracts body text page by page
   *  3. Chapter text is matched back to ToC structure
   *
   * Stores the job's chapter structure in the job data for the ingestion
   * processor to use instead of running ChapterDetectionService again.
   */
  private async runScannedPipeline(buffer: Buffer, jobId: string): Promise<string> {
    // Step 1: Render ToC pages and extract structure with Claude Vision
    if (this.tocVision.isAvailable) {
      this.logger.log(`[Job ${jobId}] Extracting ToC with Claude Vision...`);
      const tocPages = await this.pdfRenderer.findTocPages(buffer);
      this.logger.log(`[Job ${jobId}] Rendering ToC pages: ${tocPages.join(', ')}`);
      const tocImages = await this.pdfRenderer.renderPages(buffer, tocPages, 1.8);
      const tocResult = await this.tocVision.extractToc(tocImages);

      if (tocResult && tocResult.allChapters.length >= 2) {
        this.logger.log(
          `[Job ${jobId}] Claude Vision found ${tocResult.allChapters.length} chapters. Running per-chapter OCR...`,
        );
        // Store ToC result on the processor instance so ingestWithChapterDetection can use it
        this._pendingTocResult = tocResult;
        // Step 2: OCR each chapter's pages using the ToC page numbers
        return this.ocrChaptersByPageRange(buffer, jobId, tocResult);
      }
    }

    // Fallback: OCR the entire PDF
    this.logger.log(`[Job ${jobId}] Falling back to full-PDF OCR...`);
    return this.ocrService.extractTextFromScannedPdf(buffer);
  }

  /** Temporary store for the Claude Vision ToC result during processing */
  private _pendingTocResult: import('./toc-vision.service').TocVisionResult | null = null;

  /**
   * OCR all chapters concurrently with a shared Tesseract worker pool.
   *
   * Performance architecture:
   *  - One GhostScript call per chapter (batch render entire page range)
   *  - Shared pool of POOL_SIZE Tesseract workers across all concurrent chapters
   *  - CONCURRENCY chapters processed at the same time
   *
   * Typical speedup: ~8–10x vs sequential single-worker (686 pages in ~5 min)
   */
  private async ocrChaptersByPageRange(
    buffer: Buffer,
    jobId: string,
    toc: import('./toc-vision.service').TocVisionResult,
  ): Promise<string> {
    const POOL_SIZE = 6;   // Tesseract workers (parallel OCR)
    const CONCURRENCY = 4; // Chapters processed at the same time

    const totalPdfPages = await this.pdfRenderer.getPageCount(buffer);
    const chapters = toc.allChapters;
    const offset = 8; // typical book frontmatter pages

    this.logger.log(
      `[Job ${jobId}] Starting concurrent OCR: ${chapters.length} chapters, ` +
      `${CONCURRENCY} parallel, ${POOL_SIZE} Tesseract workers`,
    );

    // Create shared worker pool once for the entire job
    const workerPool = await this.ocrService.createWorkerPool(POOL_SIZE);

    // Build page ranges for every chapter upfront
    const chapterRanges = chapters.map((ch, i) => {
      const next = chapters[i + 1];
      const pdfStart = Math.max(1, ch.page + offset);
      const pdfEnd = next
        ? Math.min(next.page + offset - 1, totalPdfPages)
        : totalPdfPages;
      return { chapter: ch, pdfStart, pdfEnd };
    });

    // Process chapters in parallel batches of CONCURRENCY
    const fullTextParts: (string | null)[] = new Array(chapters.length).fill(null);

    try {
      for (let batch = 0; batch < chapterRanges.length; batch += CONCURRENCY) {
        const slice = chapterRanges.slice(batch, batch + CONCURRENCY);

        await Promise.all(
          slice.map(async ({ chapter, pdfStart, pdfEnd }, sliceIdx) => {
            const idx = batch + sliceIdx;
            this.logger.log(
              `[Job ${jobId}] OCR Ch.${chapter.number} "${chapter.title}" ` +
              `(PDF ${pdfStart}–${pdfEnd})`,
            );

            const text = await this.ocrService.extractTextFromPageRange(
              buffer,
              pdfStart,
              pdfEnd,
              workerPool,
            );

            fullTextParts[idx] =
              `\n\nCHAPTER ${chapter.number}\n${chapter.title}\n\n${text}`;
          }),
        );

        this.logger.log(
          `[Job ${jobId}] Batch complete: chapters ${batch + 1}–${Math.min(batch + CONCURRENCY, chapters.length)} / ${chapters.length}`,
        );
      }
    } finally {
      await this.ocrService.terminatePool(workerPool);
    }

    return fullTextParts.filter(Boolean).join('\n\n');
  }

  /**
   * Estimates the offset between book page numbers and PDF page numbers.
   * Books have frontmatter (cover, preface, ToC) before page 1 of content.
   */
  /**
   * Splits OCR'd text (which has "CHAPTER N\nTitle\n..." markers) back into
   * DetectedChapter objects using the Claude Vision ToC for titles/metadata.
   */
  private buildChaptersFromVisionToc(
    text: string,
    toc: import('./toc-vision.service').TocVisionResult,
  ): DetectedChapter[] {
    const chapters: DetectedChapter[] = [];

    for (let i = 0; i < toc.allChapters.length; i++) {
      const ch = toc.allChapters[i];
      const marker = `CHAPTER ${ch.number}\n${ch.title}`;
      const startIdx = text.indexOf(marker);

      if (startIdx === -1) {
        // Chapter marker not found in OCR text — create an empty chapter
        // (OCR might have failed for some pages)
        this.logger.warn(`Chapter ${ch.number} marker not found in OCR text`);
        chapters.push({
          title: ch.title,
          headingRaw: marker,
          index: ch.number,
          content: '',
          charOffset: 0,
          sectionTitle: ch.sectionTitle,
        });
        continue;
      }

      const nextCh = toc.allChapters[i + 1];
      const endMarker = nextCh ? `CHAPTER ${nextCh.number}\n${nextCh.title}` : null;
      const endIdx = endMarker ? text.indexOf(endMarker, startIdx + marker.length) : text.length;

      const rawContent = text.slice(startIdx, endIdx !== -1 ? endIdx : text.length);
      const firstNl = rawContent.indexOf('\n');
      const content = firstNl !== -1 ? rawContent.slice(firstNl).trim() : rawContent;

      chapters.push({
        title: ch.title,
        headingRaw: marker,
        index: ch.number,
        content,
        charOffset: startIdx,
        sectionTitle: ch.sectionTitle,
      });
    }

    return chapters.filter((c) => c.content.length >= 100);
  }

  private async estimatePageOffset(buffer: Buffer, firstContentPage: number): Promise<number> {
    // For scanned PDFs, text-based page offset detection doesn't apply
    void buffer;
    void firstContentPage;
    return 8; // typical frontmatter offset for textbooks
  }
}
