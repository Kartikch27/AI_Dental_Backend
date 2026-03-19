import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { RagScope } from './retrieval.types';

@Injectable()
export class VectorRetrieverService {
  constructor(private prisma: PrismaService) {}

  async searchByVector(vectorString: string, scope: RagScope, limit: number) {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `
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
      `,
      vectorString,
      scope.nodeId || null,
      scope.yearId || null,
      scope.subjectId || null,
      scope.chapterId || null,
      scope.conceptId || null,
      limit,
    );

    return rows as Array<{
      id: string;
      content: string;
      documentId: string;
      chunkIndex: number;
      pageNumber: number | null;
      sectionTitle: string | null;
      vectorScore: number;
    }>;
  }
}

