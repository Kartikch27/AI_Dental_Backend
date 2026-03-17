import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IngestionService } from './ingestion/ingestion.service.js';
import { RetrievalService } from './retrieval/retrieval.service.js';

@Injectable()
export class RagService {
  constructor(
    private prisma: PrismaService,
    private ingestionService: IngestionService,
    private retrievalService: RetrievalService,
  ) {}

  async ingestDocument(title: string, content: string, metadata: any) {
    return this.ingestionService.processDocument(title, content, metadata);
  }

  async ingestFile(title: string, file: any, metadata: any) {
    return this.ingestionService.processFile(title, file, metadata);
  }

  async retrieveContext(
    query: string,
    scope: { nodeId?: string; yearId?: string; subjectId?: string; chapterId?: string; conceptId?: string },
    limit = 5
  ) {
    return this.retrievalService.retrieveRelevantChunks(query, scope, limit);
  }

  async getDocumentById(id: string) {
    const doc = await this.prisma.ragDocument.findUnique({
      where: { id },
      include: {
        _count: { select: { chunks: true } },
        node: true,
      }
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return doc;
  }

  async deleteDocument(id: string) {
    const doc = await this.prisma.ragDocument.findUnique({
      where: { id }
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    // Wrap deletions in a transaction to prevent partial state on error
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
}
