import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { SyllabusService } from '../../syllabus/syllabus.service';
import { IngestionStatus } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private prisma: PrismaService,
    private syllabusService: SyllabusService,
    @Optional() @InjectQueue('ingestion') private ingestionQueue?: Queue,
  ) {}

  /**
   * Resolves the full ancestor scope from the syllabus tree.
   * If the caller already supplied explicit yearId/subjectId/chapterId/conceptId
   * those values win; otherwise they are auto-derived from nodeId.
   */
  private async resolveScope(metadata: any) {
    const nodeId: string | undefined = metadata.nodeId;
    if (!nodeId) return metadata;

    const auto = await this.syllabusService.resolveAncestorScope(nodeId);
    // Explicit values from the caller take priority; auto-resolved fills in blanks.
    return {
      ...metadata,
      nodeId,
      yearId: metadata.yearId ?? auto.yearId,
      subjectId: metadata.subjectId ?? auto.subjectId,
      chapterId: metadata.chapterId ?? auto.chapterId,
      conceptId: metadata.conceptId ?? auto.conceptId,
    };
  }

  async processDocument(title: string, content: string, metadata: any) {
    if (!this.ingestionQueue) {
      throw new Error(
        'RAG ingestion queue is disabled. Set ENABLE_RAG_QUEUE=true and configure REDIS_URL (or REDIS_HOST/REDIS_PORT) to enable ingestion.',
      );
    }

    const resolved = await this.resolveScope(metadata);

    const document = await this.prisma.ragDocument.create({
      data: {
        title,
        sourceType: resolved.sourceType || 'notes',
        inputMethod: 'text',
        yearId: resolved.yearId,
        subjectId: resolved.subjectId,
        chapterId: resolved.chapterId,
        conceptId: resolved.conceptId,
        nodeId: resolved.nodeId,
        status: 'active',
        ingestionStatus: IngestionStatus.PROCESSING,
      },
    });

    await this.ingestionQueue.add('process-content', {
      documentId: document.id,
      content,
      metadata: resolved,
    });

    return document;
  }

  async processFile(title: string, file: any, metadata: any) {
    if (!this.ingestionQueue) {
      throw new Error(
        'RAG ingestion queue is disabled. Set ENABLE_RAG_QUEUE=true and configure REDIS_URL (or REDIS_HOST/REDIS_PORT) to enable ingestion.',
      );
    }

    const resolved = await this.resolveScope(metadata);

    const filename = `${Date.now()}-${file.originalname}`;
    const uploadPath = path.join(process.cwd(), 'uploads/rag', filename);
    await fs.writeFile(uploadPath, file.buffer);

    const document = await this.prisma.ragDocument.create({
      data: {
        title,
        sourceType: resolved.sourceType || 'notes',
        inputMethod: 'upload',
        fileUrl: uploadPath,
        fileName: file.originalname,
        mimeType: file.mimetype,
        yearId: resolved.yearId,
        subjectId: resolved.subjectId,
        chapterId: resolved.chapterId,
        conceptId: resolved.conceptId,
        nodeId: resolved.nodeId,
        status: 'active',
        ingestionStatus: IngestionStatus.PENDING,
      },
    });

    await this.ingestionQueue.add('process-file', {
      documentId: document.id,
      filePath: uploadPath,
      metadata: resolved,
    });

    return document;
  }

  async retryIngestion(documentId: string) {
    if (!this.ingestionQueue) {
      throw new Error(
        'RAG ingestion queue is disabled. Set ENABLE_RAG_QUEUE=true and configure REDIS_URL (or REDIS_HOST/REDIS_PORT) to enable ingestion.',
      );
    }
    const document = await this.prisma.ragDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) throw new Error('Document not found');
    if (document.ingestionStatus !== IngestionStatus.FAILED)
      throw new Error('Only failed documents can be retried');

    await this.prisma.$transaction([
      this.prisma.ragChunk.deleteMany({ where: { documentId: document.id } }),
      this.prisma.ragDocument.update({
        where: { id: documentId },
        data: {
          ingestionStatus: IngestionStatus.PENDING,
          failureReason: null,
          processedAt: null,
          status: 'active',
        },
      }),
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
    } else {
      throw new Error(
        'Retrying text-based ingestion requires re-pasting the text. Please delete and re-ingest.',
      );
    }

    return { message: 'Ingestion retried successfully' };
  }
}
