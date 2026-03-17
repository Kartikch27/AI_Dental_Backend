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
const prisma_service_1 = require("../../../prisma/prisma.service");
const chunking_service_1 = require("./chunking.service");
const embedding_service_1 = require("./embedding.service");
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs/promises"));
const fsSync = __importStar(require("fs"));
const pdf_parse_1 = require("pdf-parse");
let IngestionProcessor = IngestionProcessor_1 = class IngestionProcessor extends bullmq_1.WorkerHost {
    prisma;
    chunkingService;
    embeddingService;
    logger = new common_1.Logger(IngestionProcessor_1.name);
    constructor(prisma, chunkingService, embeddingService) {
        super();
        this.prisma = prisma;
        this.chunkingService = chunkingService;
        this.embeddingService = embeddingService;
    }
    async process(job) {
        const { documentId, metadata } = job.data;
        this.logger.log(`[Job ${job.id}] Starting ingestion`);
        try {
            this.logger.debug(`[Job ${job.id}] Updating status to PROCESSING...`);
            await this.prisma.ragDocument.update({
                where: { id: documentId },
                data: {
                    ingestionStatus: 'PROCESSING',
                    failureReason: null
                },
            });
            let content = '';
            this.logger.debug(`[Job ${job.id}] Extracting text for job type: ${job.name}`);
            if (job.name === 'process-content') {
                content = job.data.content;
            }
            else if (job.name === 'process-file') {
                const filePath = job.data.filePath;
                if (!filePath || !fsSync.existsSync(filePath)) {
                    throw new Error("Uploaded PDF file not found");
                }
                this.logger.log(`[Job ${job.id}] Loading file from ${filePath}`);
                const fileBuffer = await fs.readFile(filePath);
                this.logger.log(`[Job ${job.id}] Parsing PDF`);
                const parser = new pdf_parse_1.PDFParse({ data: fileBuffer });
                const pdfData = await parser.getText();
                await parser.destroy();
                this.logger.log(`[Job ${job.id}] Extracting text`);
                content = pdfData.text;
            }
            else {
                throw new Error(`Unknown job name: ${job.name}`);
            }
            this.logger.debug(`[Job ${job.id}] Text extracted. Length: ${content.length} characters.`);
            content = content.replace(/\n\s*\n/g, '\n\n').trim();
            this.logger.debug(`[Job ${job.id}] Text cleaned. New length: ${content.length} characters.`);
            this.logger.log(`[Job ${job.id}] Chunking`);
            const chunks = this.chunkingService.chunkText(content);
            this.logger.log(`[Job ${job.id}] Generated ${chunks.length} chunks.`);
            this.logger.log(`[Job ${job.id}] Generating embeddings`);
            this.logger.log(`[Job ${job.id}] Saving chunks`);
            for (let i = 0; i < chunks.length; i++) {
                const text = chunks[i];
                if (i % 10 === 0) {
                    this.logger.debug(`[Job ${job.id}] Generating embedding and inserting chunk ${i + 1}/${chunks.length}...`);
                }
                const embedding = await this.embeddingService.generateEmbedding(text);
                await this.prisma.$executeRawUnsafe(`INSERT INTO "RagChunk" (
            "id", "documentId", "chunkIndex", "content", "tokenCount", 
            "yearId", "subjectId", "chapterId", "conceptId", "nodeId",
            "embedding", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10::vector, NOW()
          )`, documentId, i, text, Math.ceil(text.length / 4), metadata.yearId || null, metadata.subjectId || null, metadata.chapterId || null, metadata.conceptId || null, metadata.nodeId || null, `[${embedding.join(',')}]`);
            }
            this.logger.debug(`[Job ${job.id}] Updating document status to INDEXED...`);
            await this.prisma.ragDocument.update({
                where: { id: documentId },
                data: {
                    status: 'active',
                    ingestionStatus: 'INDEXED',
                    processedAt: new Date(),
                    failureReason: null
                },
            });
            this.logger.log(`[Job ${job.id}] Ingestion complete`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`[Job ${job.id}] Failed to process document ${documentId}: ${errorMessage}`, errorStack);
            try {
                await this.prisma.ragDocument.update({
                    where: { id: documentId },
                    data: {
                        status: 'inactive',
                        ingestionStatus: 'FAILED',
                        failureReason: errorMessage
                    },
                });
            }
            catch (dbError) {
                this.logger.error(`[Job ${job.id}] Failed to update document failure status: ${dbError.message}`);
            }
            throw error;
        }
    }
};
exports.IngestionProcessor = IngestionProcessor;
exports.IngestionProcessor = IngestionProcessor = IngestionProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('ingestion'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        chunking_service_1.ChunkingService,
        embedding_service_1.EmbeddingService])
], IngestionProcessor);
//# sourceMappingURL=ingestion.processor.js.map