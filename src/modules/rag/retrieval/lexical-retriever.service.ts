import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RagScope } from './retrieval.types';

@Injectable()
export class LexicalRetrieverService {
  constructor(private prisma: PrismaService) {}

  private async runQuery(sql: string, params: any[]) {
    return (await this.prisma.$queryRawUnsafe(sql, ...params)) as any[];
  }

  async searchByLexical(query: string, scope: RagScope, limit: number) {
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

    // Prefer websearch_to_tsquery when available.
    try {
      const rows = await this.runQuery(
        `
        SELECT
          "id", "content", "documentId", "chunkIndex", "pageNumber", "sectionTitle",
          ts_rank_cd(to_tsvector('english', "content"), websearch_to_tsquery('english', $1)) as "lexicalRaw"
        FROM "RagChunk"
        WHERE ${baseWhere}
          AND to_tsvector('english', "content") @@ websearch_to_tsquery('english', $1)
        ORDER BY "lexicalRaw" DESC
        LIMIT $7
        `,
        params,
      );
      return rows as Array<{
        id: string;
        content: string;
        documentId: string;
        chunkIndex: number;
        pageNumber: number | null;
        sectionTitle: string | null;
        lexicalRaw: number;
      }>;
    } catch {
      const rows = await this.runQuery(
        `
        SELECT
          "id", "content", "documentId", "chunkIndex", "pageNumber", "sectionTitle",
          ts_rank_cd(to_tsvector('english', "content"), plainto_tsquery('english', $1)) as "lexicalRaw"
        FROM "RagChunk"
        WHERE ${baseWhere}
          AND to_tsvector('english', "content") @@ plainto_tsquery('english', $1)
        ORDER BY "lexicalRaw" DESC
        LIMIT $7
        `,
        params,
      );
      return rows as Array<{
        id: string;
        content: string;
        documentId: string;
        chunkIndex: number;
        pageNumber: number | null;
        sectionTitle: string | null;
        lexicalRaw: number;
      }>;
    }
  }
}

