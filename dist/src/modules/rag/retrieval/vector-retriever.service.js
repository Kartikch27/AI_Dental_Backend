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
exports.VectorRetrieverService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let VectorRetrieverService = class VectorRetrieverService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchByVector(vectorString, scope, limit) {
        const rows = await this.prisma.$queryRawUnsafe(`
      SELECT 
        "id", "content", "documentId", "chunkIndex", "pageNumber", "sectionTitle",
        GREATEST(0, LEAST(1, 1 - ("embeddingHalf" <=> $1::halfvec))) as "vectorScore"
      FROM "RagChunk"
      WHERE 
        ($2::text IS NULL OR "nodeId" IS NULL OR "nodeId" = $2) AND
        ($3::text IS NULL OR "yearId" IS NULL OR "yearId" = $3) AND
        ($4::text IS NULL OR "subjectId" IS NULL OR "subjectId" = $4) AND
        ($5::text IS NULL OR "chapterId" IS NULL OR "chapterId" = $5) AND
        ($6::text IS NULL OR "conceptId" IS NULL OR "conceptId" = $6) AND
        "embeddingHalf" IS NOT NULL
      ORDER BY "embeddingHalf" <=> $1::halfvec
      LIMIT $7
      `, vectorString, scope.nodeId || null, scope.yearId || null, scope.subjectId || null, scope.chapterId || null, scope.conceptId || null, limit);
        return rows;
    }
};
exports.VectorRetrieverService = VectorRetrieverService;
exports.VectorRetrieverService = VectorRetrieverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VectorRetrieverService);
//# sourceMappingURL=vector-retriever.service.js.map