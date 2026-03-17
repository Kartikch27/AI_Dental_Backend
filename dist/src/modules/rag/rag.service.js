"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const ingestion_service_js_1 = require("./ingestion/ingestion.service.js");
const retrieval_service_js_1 = require("./retrieval/retrieval.service.js");
let RagService = class RagService {
    prisma;
    ingestionService;
    retrievalService;
    constructor(prisma, ingestionService, retrievalService) {
        this.prisma = prisma;
        this.ingestionService = ingestionService;
        this.retrievalService = retrievalService;
    }
    async ingestDocument(title, content, metadata) {
        return this.ingestionService.processDocument(title, content, metadata);
    }
    async ingestFile(title, file, metadata) {
        return this.ingestionService.processFile(title, file, metadata);
    }
    async retrieveContext(query, scope, limit = 5) {
        return this.retrievalService.retrieveRelevantChunks(query, scope, limit);
    }
    async getDocumentById(id) {
        const doc = await this.prisma.ragDocument.findUnique({
            where: { id },
            include: {
                _count: { select: { chunks: true } },
                node: true,
            }
        });
        if (!doc) {
            throw new common_1.NotFoundException('Document not found');
        }
        return doc;
    }
    async deleteDocument(id) {
        const doc = await this.prisma.ragDocument.findUnique({
            where: { id }
        });
        if (!doc) {
            throw new common_1.NotFoundException('Document not found');
        }
        await this.prisma.$transaction([
            this.prisma.ragChunk.deleteMany({
                where: { documentId: id }
            }),
            this.prisma.ragDocument.delete({
                where: { id }
            })
        ]);
        return { success: true, message: 'Document and its chunks deleted successfully' };
    }
};
exports.RagService = RagService;
exports.RagService = RagService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ingestion_service_js_1.IngestionService,
        retrieval_service_js_1.RetrievalService])
], RagService);
//# sourceMappingURL=rag.service.js.map