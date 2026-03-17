import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from '../ingestion/embedding.service';

@Injectable()
export class RetrievalService {
  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  async retrieveRelevantChunks(
    query: string,
    scope: { 
      nodeId?: string; 
      yearId?: string; 
      subjectId?: string;
      chapterId?: string;
      conceptId?: string;
    },
    limit = 5
  ) {
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;

    // Metadata-first filtering + vector similarity
    // We use raw SQL for vector similarity because of the vector type
    const chunks: any[] = await this.prisma.$queryRawUnsafe(
      `
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
      `,
      vectorString,
      scope.nodeId || null,
      scope.yearId || null,
      scope.subjectId || null,
      scope.chapterId || null,
      scope.conceptId || null,
      limit
    );

    return chunks;
  }
}
