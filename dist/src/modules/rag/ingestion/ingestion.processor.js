"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var IngestionProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs/promises"));
const fsSync = __importStar(require("fs"));
const prisma_service_1 = require("../../../prisma/prisma.service");
const syllabus_service_1 = require("../../syllabus/syllabus.service");
const chunking_service_1 = require("./chunking.service");
const embedding_service_1 = require("./embedding.service");
const chapter_detection_service_1 = require("./chapter-detection.service");
const pdf_renderer_service_1 = require("./pdf-renderer.service");
const toc_vision_service_1 = require("./toc-vision.service");
const ocr_service_1 = require("./ocr.service");
const client_1 = require("@prisma/client");
let IngestionProcessor = IngestionProcessor_1 = class IngestionProcessor extends bullmq_1.WorkerHost {
    prisma;
    syllabusService;
    chunkingService;
    embeddingService;
    chapterDetectionService;
    pdfRenderer;
    tocVision;
    ocrService;
    logger = new common_1.Logger(IngestionProcessor_1.name);
    constructor(prisma, syllabusService, chunkingService, embeddingService, chapterDetectionService, pdfRenderer, tocVision, ocrService) {
        super();
        this.prisma = prisma;
        this.syllabusService = syllabusService;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
        this.chapterDetectionService = chapterDetectionService;
        this.pdfRenderer = pdfRenderer;
        this.tocVision = tocVision;
        this.ocrService = ocrService;
    }
    async process(job) {
        const { documentId, metadata } = job.data;
        this.logger.log(`[Job ${job.id}] Starting ingestion for document ${documentId}`);
        try {
            await this.prisma.ragDocument.update({
                where: { id: documentId },
                data: { ingestionStatus: 'PROCESSING', failureReason: null },
            });
            const rawText = await this.extractText(job);
            this.logger.log(`[Job ${job.id}] Extracted ${rawText.length} chars`);
            const autoDetect = metadata?.autoDetectChapters !== false;
            if (autoDetect && metadata?.nodeId) {
                await this.ingestWithChapterDetection(job.id, documentId, rawText, metadata);
            }
            else {
                await this.ingestFlat(job.id, documentId, rawText, metadata);
            }
            await this.prisma.ragDocument.update({
                where: { id: documentId },
                data: { ingestionStatus: 'INDEXED', processedAt: new Date(), failureReason: null },
            });
            this.logger.log(`[Job ${job.id}] ✅ Ingestion complete`);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(`[Job ${job.id}] ❌ Failed: ${msg}`, error instanceof Error ? error.stack : undefined);
            await this.prisma.ragDocument
                .update({
                where: { id: documentId },
                data: { ingestionStatus: 'FAILED', failureReason: msg },
            })
                .catch(() => { });
            throw error;
        }
    }
    async ingestWithChapterDetection(jobId, documentId, rawText, metadata) {
        let chapters;
        if (this._pendingTocResult && this._pendingTocResult.allChapters.length >= 2) {
            this.logger.log(`[Job ${jobId}] Using Claude Vision ToC (${this._pendingTocResult.allChapters.length} chapters)`);
            chapters = this.buildChaptersFromVisionToc(rawText, this._pendingTocResult);
            this._pendingTocResult = null;
        }
        else {
            const result = this.chapterDetectionService.detect(rawText);
            this.logger.log(`[Job ${jobId}] Chapter detection: strategy=${result.strategy}, found=${result.chapters.length} chapters`);
            chapters = result.chapters;
        }
        if (chapters.length === 0) {
            this.logger.warn(`[Job ${jobId}] No chapters detected, falling back to flat ingestion`);
            return this.ingestFlat(jobId, documentId, rawText, metadata);
        }
        const parentNodeId = metadata.nodeId;
        const childType = await this.resolveChildType(parentNodeId);
        this.logger.log(`[Job ${jobId}] Parent type → creating ${childType} nodes for each chapter`);
        let totalChunks = 0;
        for (const chapter of chapters) {
            this.logger.log(`[Job ${jobId}] Processing chapter [${chapter.index}/${chapters.length}]: "${chapter.title}"`);
            const chapterNode = await this.findOrCreateNode(chapter.title, childType, parentNodeId, chapter.index);
            const scope = await this.syllabusService.resolveAncestorScope(chapterNode.id);
            const chunkCount = await this.ingestChapterContent(jobId, documentId, chapter, scope, totalChunks);
            totalChunks += chunkCount;
        }
        this.logger.log(`[Job ${jobId}] Inserted ${totalChunks} total chunks across ${chapters.length} chapters`);
    }
    async ingestFlat(jobId, documentId, rawText, metadata) {
        const cleaned = rawText.replace(/\n\s*\n/g, '\n\n').trim();
        const chunks = this.chunkingService.chunkText(cleaned);
        this.logger.log(`[Job ${jobId}] Flat ingestion: ${chunks.length} chunks`);
        for (let i = 0; i < chunks.length; i++) {
            if (i % 20 === 0)
                this.logger.debug(`[Job ${jobId}] Flat chunk ${i + 1}/${chunks.length}`);
            await this.insertChunk(documentId, i, chunks[i], metadata);
        }
    }
    async ingestChapterContent(jobId, documentId, chapter, scope, globalOffset) {
        const chunks = this.chunkingService.chunkText(chapter.content);
        this.logger.debug(`[Job ${jobId}]   → ${chunks.length} chunks for "${chapter.title}"`);
        if (chunks.length === 0)
            return 0;
        const embeddings = await this.embeddingService.generateEmbeddingBatch(chunks, 3);
        await Promise.all(chunks.map((text, i) => this.insertChunkWithEmbedding(documentId, globalOffset + i, text, embeddings[i], {
            ...scope,
            sectionTitle: chapter.title,
        })));
        return chunks.length;
    }
    async insertChunkWithEmbedding(documentId, chunkIndex, text, embedding, scope) {
        const vectorStr = `[${embedding.join(',')}]`;
        await this.prisma.$executeRawUnsafe(`INSERT INTO "RagChunk" (
        "id", "documentId", "chunkIndex", "content", "tokenCount",
        "yearId", "subjectId", "chapterId", "conceptId", "nodeId",
        "sectionTitle",
        "embedding", "embeddingHalf", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10,
        $11::vector, $11::halfvec, NOW()
      )`, documentId, chunkIndex, text, Math.ceil(text.length / 4), scope.yearId ?? null, scope.subjectId ?? null, scope.chapterId ?? null, scope.conceptId ?? null, scope.nodeId ?? null, scope.sectionTitle ?? null, vectorStr);
    }
    async insertChunk(documentId, chunkIndex, text, scope) {
        const embedding = await this.embeddingService.generateEmbedding(text);
        const vectorStr = `[${embedding.join(',')}]`;
        await this.prisma.$executeRawUnsafe(`INSERT INTO "RagChunk" (
        "id", "documentId", "chunkIndex", "content", "tokenCount",
        "yearId", "subjectId", "chapterId", "conceptId", "nodeId",
        "sectionTitle",
        "embedding", "embeddingHalf", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text, $1, $2, $3, $4,
        $5, $6, $7, $8, $9,
        $10,
        $11::vector, $11::halfvec, NOW()
      )`, documentId, chunkIndex, text, Math.ceil(text.length / 4), scope.yearId ?? null, scope.subjectId ?? null, scope.chapterId ?? null, scope.conceptId ?? null, scope.nodeId ?? null, scope.sectionTitle ?? null, vectorStr);
    }
    async resolveChildType(parentNodeId) {
        const parent = await this.prisma.syllabusNode.findUnique({
            where: { id: parentNodeId },
        });
        if (!parent)
            return client_1.NodeType.CHAPTER;
        const map = {
            YEAR: client_1.NodeType.SUBJECT,
            SUBJECT: client_1.NodeType.CHAPTER,
            CHAPTER: client_1.NodeType.CONCEPT,
            CONCEPT: client_1.NodeType.CONCEPT,
        };
        return map[parent.type] ?? client_1.NodeType.CHAPTER;
    }
    async findOrCreateNode(title, type, parentId, orderIndex) {
        const normalizedTitle = title.trim();
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
    async extractText(job) {
        if (job.name === 'process-content') {
            return job.data.content;
        }
        if (job.name === 'process-file') {
            const filePath = job.data.filePath;
            if (!filePath || !fsSync.existsSync(filePath)) {
                throw new Error(`Uploaded file not found at path: ${filePath}`);
            }
            const buffer = await fs.readFile(filePath);
            return this.extractTextFromBuffer(buffer, job.id);
        }
        throw new Error(`Unknown job name: ${job.name}`);
    }
    async extractTextFromBuffer(buffer, jobId) {
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        const rawText = pdfData.text ?? '';
        const pageCount = pdfData.total ?? 1;
        this.logger.log(`[Job ${jobId}] PDF: ${pageCount} pages, ${rawText.length} chars extracted`);
        if (this.pdfRenderer.isScannedPdf(rawText, pageCount)) {
            this.logger.log(`[Job ${jobId}] Scanned PDF detected (${pageCount} pages). Running OCR pipeline...`);
            return this.runScannedPipeline(buffer, jobId);
        }
        return rawText;
    }
    async runScannedPipeline(buffer, jobId) {
        if (this.tocVision.isAvailable) {
            this.logger.log(`[Job ${jobId}] Extracting ToC with Claude Vision...`);
            const tocPages = await this.pdfRenderer.findTocPages(buffer);
            this.logger.log(`[Job ${jobId}] Rendering ToC pages: ${tocPages.join(', ')}`);
            const tocImages = await this.pdfRenderer.renderPages(buffer, tocPages, 1.8);
            const tocResult = await this.tocVision.extractToc(tocImages);
            if (tocResult && tocResult.allChapters.length >= 2) {
                this.logger.log(`[Job ${jobId}] Claude Vision found ${tocResult.allChapters.length} chapters. Running per-chapter OCR...`);
                this._pendingTocResult = tocResult;
                return this.ocrChaptersByPageRange(buffer, jobId, tocResult);
            }
        }
        this.logger.log(`[Job ${jobId}] Falling back to full-PDF OCR...`);
        return this.ocrService.extractTextFromScannedPdf(buffer);
    }
    _pendingTocResult = null;
    async ocrChaptersByPageRange(buffer, jobId, toc) {
        const POOL_SIZE = 6;
        const CONCURRENCY = 4;
        const totalPdfPages = await this.pdfRenderer.getPageCount(buffer);
        const chapters = toc.allChapters;
        const offset = 8;
        this.logger.log(`[Job ${jobId}] Starting concurrent OCR: ${chapters.length} chapters, ` +
            `${CONCURRENCY} parallel, ${POOL_SIZE} Tesseract workers`);
        const workerPool = await this.ocrService.createWorkerPool(POOL_SIZE);
        const chapterRanges = chapters.map((ch, i) => {
            const next = chapters[i + 1];
            const pdfStart = Math.max(1, ch.page + offset);
            const pdfEnd = next
                ? Math.min(next.page + offset - 1, totalPdfPages)
                : totalPdfPages;
            return { chapter: ch, pdfStart, pdfEnd };
        });
        const fullTextParts = new Array(chapters.length).fill(null);
        try {
            for (let batch = 0; batch < chapterRanges.length; batch += CONCURRENCY) {
                const slice = chapterRanges.slice(batch, batch + CONCURRENCY);
                await Promise.all(slice.map(async ({ chapter, pdfStart, pdfEnd }, sliceIdx) => {
                    const idx = batch + sliceIdx;
                    this.logger.log(`[Job ${jobId}] OCR Ch.${chapter.number} "${chapter.title}" ` +
                        `(PDF ${pdfStart}–${pdfEnd})`);
                    const text = await this.ocrService.extractTextFromPageRange(buffer, pdfStart, pdfEnd, workerPool);
                    fullTextParts[idx] =
                        `\n\nCHAPTER ${chapter.number}\n${chapter.title}\n\n${text}`;
                }));
                this.logger.log(`[Job ${jobId}] Batch complete: chapters ${batch + 1}–${Math.min(batch + CONCURRENCY, chapters.length)} / ${chapters.length}`);
            }
        }
        finally {
            await this.ocrService.terminatePool(workerPool);
        }
        return fullTextParts.filter(Boolean).join('\n\n');
    }
    buildChaptersFromVisionToc(text, toc) {
        const chapters = [];
        for (let i = 0; i < toc.allChapters.length; i++) {
            const ch = toc.allChapters[i];
            const marker = `CHAPTER ${ch.number}\n${ch.title}`;
            const startIdx = text.indexOf(marker);
            if (startIdx === -1) {
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
    async estimatePageOffset(buffer, firstContentPage) {
        void buffer;
        void firstContentPage;
        return 8;
    }
};
exports.IngestionProcessor = IngestionProcessor;
exports.IngestionProcessor = IngestionProcessor = IngestionProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('ingestion'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        syllabus_service_1.SyllabusService,
        chunking_service_1.ChunkingService,
        embedding_service_1.EmbeddingService,
        chapter_detection_service_1.ChapterDetectionService,
        pdf_renderer_service_1.PdfRendererService,
        toc_vision_service_1.TocVisionService,
        ocr_service_1.OcrService])
], IngestionProcessor);
//# sourceMappingURL=ingestion.processor.js.map