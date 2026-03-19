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
exports.LexicalRetrieverService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let LexicalRetrieverService = class LexicalRetrieverService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async runQuery(sql, params) {
        return (await this.prisma.$queryRawUnsafe(sql, ...params));
    }
    async searchByLexical(query, scope, limit) {
        const baseWhere = `
      ($2::text IS NULL OR "nodeId" IS NULL OR "nodeId" = $2) AND
      ($3::text IS NULL OR "yearId" IS NULL OR "yearId" = $3) AND
      ($4::text IS NULL OR "subjectId" IS NULL OR "subjectId" = $4) AND
      ($5::text IS NULL OR "chapterId" IS NULL OR "chapterId" = $5) AND
      ($6::text IS NULL OR "conceptId" IS NULL OR "conceptId" = $6)
    `;
        const params = [
            query,
            scope.nodeId || null,
            scope.yearId || null,
            scope.subjectId || null,
            scope.chapterId || null,
            scope.conceptId || null,
            limit,
        ];
        try {
            const rows = await this.runQuery(`
        SELECT
          "id", "content", "documentId", "chunkIndex", "pageNumber", "sectionTitle",
          ts_rank_cd(to_tsvector('english', "content"), websearch_to_tsquery('english', $1)) as "lexicalRaw"
        FROM "RagChunk"
        WHERE ${baseWhere}
          AND to_tsvector('english', "content") @@ websearch_to_tsquery('english', $1)
        ORDER BY "lexicalRaw" DESC
        LIMIT $7
        `, params);
            return rows;
        }
        catch {
            const rows = await this.runQuery(`
        SELECT
          "id", "content", "documentId", "chunkIndex", "pageNumber", "sectionTitle",
          ts_rank_cd(to_tsvector('english', "content"), plainto_tsquery('english', $1)) as "lexicalRaw"
        FROM "RagChunk"
        WHERE ${baseWhere}
          AND to_tsvector('english', "content") @@ plainto_tsquery('english', $1)
        ORDER BY "lexicalRaw" DESC
        LIMIT $7
        `, params);
            return rows;
        }
    }
};
exports.LexicalRetrieverService = LexicalRetrieverService;
exports.LexicalRetrieverService = LexicalRetrieverService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LexicalRetrieverService);
//# sourceMappingURL=lexical-retriever.service.js.map