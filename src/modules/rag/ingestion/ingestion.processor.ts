import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { PDFParse } from 'pdf-parse';

@Processor('ingestion')
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(
    private prisma: PrismaService,
    private chunkingService: ChunkingService,
    private embeddingService: EmbeddingService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { documentId, metadata } = job.data;
    this.logger.log(`[Job ${job.id}] Starting ingestion`);

    try {
      this.logger.debug(`[Job ${job.id}] Updating status to PROCESSING...`);
      await this.prisma.ragDocument.update({
        where: { id: documentId },
        data: { 
          ingestionStatus: 'PROCESSING',
          failureReason: null
        },
      });

      let content = '';
      this.logger.debug(`[Job ${job.id}] Extracting text for job type: ${job.name}`);

      if (job.name === 'process-content') {
        content = job.data.content;
      } else if (job.name === 'process-file') {
        const filePath = job.data.filePath;

        if (!filePath || !fsSync.existsSync(filePath)) {
          throw new Error("Uploaded PDF file not found");
        }

        this.logger.log(`[Job ${job.id}] Loading file from ${filePath}`);
        const fileBuffer = await fs.readFile(filePath);
        
        this.logger.log(`[Job ${job.id}] Parsing PDF`);
        const parser = new PDFParse({ data: fileBuffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        
        this.logger.log(`[Job ${job.id}] Extracting text`);
        content = pdfData.text;
      } else {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      this.logger.debug(`[Job ${job.id}] Text extracted. Length: ${content.length} characters.`);
      
      // Clean extracted text (remove excessive newlines/spaces)
      content = content.replace(/\n\s*\n/g, '\n\n').trim();
      this.logger.debug(`[Job ${job.id}] Text cleaned. New length: ${content.length} characters.`);

      this.logger.log(`[Job ${job.id}] Chunking`);
      const chunks = this.chunkingService.chunkText(content);
      this.logger.log(`[Job ${job.id}] Generated ${chunks.length} chunks.`);
      
      this.logger.log(`[Job ${job.id}] Generating embeddings`);
      this.logger.log(`[Job ${job.id}] Saving chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i];
        if (i % 10 === 0) {
          this.logger.debug(`[Job ${job.id}] Generating embedding and inserting chunk ${i+1}/${chunks.length}...`);
        }
        const embedding = await this.embeddingService.generateEmbedding(text);
        
        // Use raw SQL to insert with vector
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO "RagChunk" (
            "id", "documentId", "chunkIndex", "content", "tokenCount", 
            "yearId", "subjectId", "chapterId", "conceptId", "nodeId",
            "embedding", "updatedAt"
          ) VALUES (
            gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9,
            $10::vector, NOW()
          )`,
          documentId, i, text, Math.ceil(text.length / 4),
          metadata.yearId || null, metadata.subjectId || null, 
          metadata.chapterId || null, metadata.conceptId || null, metadata.nodeId || null,
          `[${embedding.join(',')}]`
        );
      }

      this.logger.debug(`[Job ${job.id}] Updating document status to INDEXED...`);
      await this.prisma.ragDocument.update({
        where: { id: documentId },
        data: { 
          status: 'active', 
          ingestionStatus: 'INDEXED',
          processedAt: new Date(),
          failureReason: null
        },
      });

      this.logger.log(`[Job ${job.id}] Ingestion complete`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(`[Job ${job.id}] Failed to process document ${documentId}: ${errorMessage}`, errorStack);
      
      try {
        await this.prisma.ragDocument.update({
          where: { id: documentId },
          data: { 
            status: 'inactive', 
            ingestionStatus: 'FAILED',
            failureReason: errorMessage
          },
        });
      } catch (dbError) {
        this.logger.error(`[Job ${job.id}] Failed to update document failure status: ${dbError.message}`);
      }
      
      throw error;
    }
  }
}
