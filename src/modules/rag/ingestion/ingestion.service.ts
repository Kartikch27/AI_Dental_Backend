import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { IngestionStatus } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @InjectQueue('ingestion') private ingestionQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async processDocument(title: string, content: string, metadata: any) {
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
        ingestionStatus: IngestionStatus.PROCESSING,
      },
    });

    await this.ingestionQueue.add('process-content', {
      documentId: document.id,
      content,
      metadata,
    });

    return document;
  }

  async processFile(title: string, file: any, metadata: any) {
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
        ingestionStatus: IngestionStatus.PENDING,
      },
    });

    await this.ingestionQueue.add('process-file', {
      documentId: document.id,
      filePath: uploadPath,
      metadata,
    });

    return document;
  }

  async retryIngestion(documentId: string) {
    const document = await this.prisma.ragDocument.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new Error("Document not found");
    }

    if (document.ingestionStatus !== IngestionStatus.FAILED) {
      throw new Error("Only failed documents can be retried");
    }

    // Reset status and clear chunks if any
    await this.prisma.$transaction([
      this.prisma.ragChunk.deleteMany({
        where: { documentId: document.id }
      }),
      this.prisma.ragDocument.update({
        where: { id: documentId },
        data: {
          ingestionStatus: IngestionStatus.PENDING,
          failureReason: null,
          processedAt: null,
          status: 'active'
        }
      })
    ]);

    // Requeue
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
      // For text input, we need the original content. Since we don't store it 
      // directly on the document, this requires a re-paste in a real system.
      // For now, we'll just throw an error as text retries aren't fully supported
      // without storing the original text.
      throw new Error("Retrying text-based ingestion requires re-pasting the text. Please delete and re-ingest.");
    }

    return { message: "Ingestion retried successfully" };
  }
}
