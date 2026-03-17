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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var IngestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
let IngestionService = IngestionService_1 = class IngestionService {
    ingestionQueue;
    prisma;
    logger = new common_1.Logger(IngestionService_1.name);
    constructor(ingestionQueue, prisma) {
        this.ingestionQueue = ingestionQueue;
        this.prisma = prisma;
    }
    async processDocument(title, content, metadata) {
        const document = await this.prisma.ragDocument.create({
            data: {
                title,
                sourceType: metadata.sourceType || 'notes',
                inputMethod: 'text',
                yearId: metadata.yearId,
                subjectId: metadata.subjectId,
                chapterId: metadata.chapterId,
                conceptId: metadata.conceptId,
                nodeId: metadata.nodeId,
                status: 'active',
                ingestionStatus: client_1.IngestionStatus.PROCESSING,
            },
        });
        await this.ingestionQueue.add('process-content', {
            documentId: document.id,
            content,
            metadata,
        });
        return document;
    }
    async processFile(title, file, metadata) {
        const filename = `${Date.now()}-${file.originalname}`;
        const uploadPath = path.join(process.cwd(), 'uploads/rag', filename);
        await fs.writeFile(uploadPath, file.buffer);
        const document = await this.prisma.ragDocument.create({
            data: {
                title,
                sourceType: metadata.sourceType || 'notes',
                inputMethod: 'upload',
                fileUrl: uploadPath,
                fileName: file.originalname,
                mimeType: file.mimetype,
                yearId: metadata.yearId,
                subjectId: metadata.subjectId,
                chapterId: metadata.chapterId,
                conceptId: metadata.conceptId,
                nodeId: metadata.nodeId,
                status: 'active',
                ingestionStatus: client_1.IngestionStatus.PENDING,
            },
        });
        await this.ingestionQueue.add('process-file', {
            documentId: document.id,
            filePath: uploadPath,
            metadata,
        });
        return document;
    }
    async retryIngestion(documentId) {
        const document = await this.prisma.ragDocument.findUnique({
            where: { id: documentId }
        });
        if (!document) {
            throw new Error("Document not found");
        }
        if (document.ingestionStatus !== client_1.IngestionStatus.FAILED) {
            throw new Error("Only failed documents can be retried");
        }
        await this.prisma.$transaction([
            this.prisma.ragChunk.deleteMany({
                where: { documentId: document.id }
            }),
            this.prisma.ragDocument.update({
                where: { id: documentId },
                data: {
                    ingestionStatus: client_1.IngestionStatus.PENDING,
                    failureReason: null,
                    processedAt: null,
                    status: 'active'
                }
            })
        ]);
        if (document.inputMethod === 'upload' && document.fileUrl) {
            await this.ingestionQueue.add('process-file', {
                documentId: document.id,
                filePath: document.fileUrl,
                metadata: {
                    sourceType: document.sourceType,
                    yearId: document.yearId,
                    subjectId: document.subjectId,
                    chapterId: document.chapterId,
                    conceptId: document.conceptId,
                    nodeId: document.nodeId,
                },
            });
        }
        else {
            throw new Error("Retrying text-based ingestion requires re-pasting the text. Please delete and re-ingest.");
        }
        return { message: "Ingestion retried successfully" };
    }
};
exports.IngestionService = IngestionService;
exports.IngestionService = IngestionService = IngestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('ingestion')),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        prisma_service_1.PrismaService])
], IngestionService);
//# sourceMappingURL=ingestion.service.js.map