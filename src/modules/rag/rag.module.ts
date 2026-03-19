import { Module } from '@nestjs/common';
import { RagService } from './rag.service.js';
import { IngestionService } from './ingestion/ingestion.service.js';
import { RetrievalService } from './retrieval/retrieval.service.js';
import { VectorRetrieverService } from './retrieval/vector-retriever.service.js';
import { LexicalRetrieverService } from './retrieval/lexical-retriever.service.js';
import { RerankService } from './retrieval/rerank.service.js';
import { MmrService } from './retrieval/mmr.service.js';
import { ChunkingService } from './ingestion/chunking.service.js';
import { EmbeddingService } from './ingestion/embedding.service.js';
import { IngestionProcessor } from './ingestion/ingestion.processor.js';
import { ChapterDetectionService } from './ingestion/chapter-detection.service.js';
import { PdfRendererService } from './ingestion/pdf-renderer.service.js';
import { TocVisionService } from './ingestion/toc-vision.service.js';
import { OcrService } from './ingestion/ocr.service.js';
import { GenerationService } from './generation/generation.service.js';
import { RagAdminController } from './rag.admin.controller.js';
import { RagController } from './rag.controller.js';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { SyllabusModule } from '../syllabus/syllabus.module';

const enableRagQueue =
  process.env.ENABLE_RAG_QUEUE === 'true' ||
  process.env.ENABLE_QUEUES === 'true' ||
  process.env.ENABLE_BULLMQ === 'true';

@Module({
  imports: [
    ...(enableRagQueue
      ? [
          BullModule.registerQueue({
            name: 'ingestion',
          }),
        ]
      : []),
    PrismaModule,
    SyllabusModule,
  ],
  controllers: [RagAdminController, RagController],
  providers: [
    RagService,
    IngestionService,
    RetrievalService,
    VectorRetrieverService,
    LexicalRetrieverService,
    RerankService,
    MmrService,
    ChunkingService,
    EmbeddingService,
    ChapterDetectionService,
    PdfRendererService,
    TocVisionService,
    OcrService,
    ...(enableRagQueue ? [IngestionProcessor] : []),
    GenerationService,
  ],
  exports: [RagService, GenerationService, ChapterDetectionService],
})
export class RagModule {}
