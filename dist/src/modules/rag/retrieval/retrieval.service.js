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
exports.RetrievalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const embedding_service_1 = require("../ingestion/embedding.service");
let RetrievalService = class RetrievalService {
    prisma;
    embeddingService;
    constructor(prisma, embeddingService) {
        this.prisma = prisma;
        this.embeddingService = embeddingService;
    }
    async retrieveRelevantChunks(query, scope, limit = 5) {
        const queryEmbedding = await this.embeddingService.generateEmbedding(query);
        const vectorString = `[${queryEmbedding.join(',')}]`;
        const chunks = await this.prisma.$queryRawUnsafe(`
      SELECT 
        "id", "content", "documentId", "chunkIndex", "pageNumber", "sectionTitle",
        1 - ("embedding" <=> $1::vector) as "relevanceScore"
      FROM "RagChunk"
      WHERE 
        ($2::text IS NULL OR "nodeId" = $2) AND
        ($3::text IS NULL OR "yearId" = $3) AND
        ($4::text IS NULL OR "subjectId" = $4) AND
        ($5::text IS NULL OR "chapterId" = $5) AND
        ($6::text IS NULL OR "conceptId" = $6)
      ORDER BY "embedding" <=> $1::vector
      LIMIT $7
      `, vectorString, scope.nodeId || null, scope.yearId || null, scope.subjectId || null, scope.chapterId || null, scope.conceptId || null, limit);
        return chunks;
    }
};
exports.RetrievalService = RetrievalService;
exports.RetrievalService = RetrievalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        embedding_service_1.EmbeddingService])
], RetrievalService);
//# sourceMappingURL=retrieval.service.js.map