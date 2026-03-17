import { Module } from '@nestjs/common';
import { RagService } from './rag.service.js';
import { IngestionService } from './ingestion/ingestion.service.js';
import { RetrievalService } from './retrieval/retrieval.service.js';
import { ChunkingService } from './ingestion/chunking.service.js';
import { EmbeddingService } from './ingestion/embedding.service.js';
import { IngestionProcessor } from './ingestion/ingestion.processor.js';
import { GenerationService } from './generation/generation.service.js';
import { RagAdminController } from './rag.admin.controller.js';
import { RagController } from './rag.controller.js';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ingestion',
    }),
    PrismaModule,
  ],
  controllers: [RagAdminController, RagController],
  providers: [
    RagService,
    IngestionService,
    RetrievalService,
    ChunkingService,
    EmbeddingService,
    IngestionProcessor,
    GenerationService,
  ],
  exports: [RagService, GenerationService],
})
export class RagModule {}
