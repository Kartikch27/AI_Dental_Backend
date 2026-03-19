"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagModule = void 0;
const common_1 = require("@nestjs/common");
const rag_service_js_1 = require("./rag.service.js");
const ingestion_service_js_1 = require("./ingestion/ingestion.service.js");
const retrieval_service_js_1 = require("./retrieval/retrieval.service.js");
const vector_retriever_service_js_1 = require("./retrieval/vector-retriever.service.js");
const lexical_retriever_service_js_1 = require("./retrieval/lexical-retriever.service.js");
const rerank_service_js_1 = require("./retrieval/rerank.service.js");
const mmr_service_js_1 = require("./retrieval/mmr.service.js");
const chunking_service_js_1 = require("./ingestion/chunking.service.js");
const embedding_service_js_1 = require("./ingestion/embedding.service.js");
const ingestion_processor_js_1 = require("./ingestion/ingestion.processor.js");
const chapter_detection_service_js_1 = require("./ingestion/chapter-detection.service.js");
const pdf_renderer_service_js_1 = require("./ingestion/pdf-renderer.service.js");
const toc_vision_service_js_1 = require("./ingestion/toc-vision.service.js");
const ocr_service_js_1 = require("./ingestion/ocr.service.js");
const generation_service_js_1 = require("./generation/generation.service.js");
const rag_admin_controller_js_1 = require("./rag.admin.controller.js");
const rag_controller_js_1 = require("./rag.controller.js");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_module_1 = require("../../prisma/prisma.module");
const syllabus_module_1 = require("../syllabus/syllabus.module");
const enableRagQueue = process.env.ENABLE_RAG_QUEUE === 'true' ||
    process.env.ENABLE_QUEUES === 'true' ||
    process.env.ENABLE_BULLMQ === 'true';
let RagModule = class RagModule {
};
exports.RagModule = RagModule;
exports.RagModule = RagModule = __decorate([
    (0, common_1.Module)({
        imports: [
            ...(enableRagQueue
                ? [
                    bullmq_1.BullModule.registerQueue({
                        name: 'ingestion',
                    }),
                ]
                : []),
            prisma_module_1.PrismaModule,
            syllabus_module_1.SyllabusModule,
        ],
        controllers: [rag_admin_controller_js_1.RagAdminController, rag_controller_js_1.RagController],
        providers: [
            rag_service_js_1.RagService,
            ingestion_service_js_1.IngestionService,
            retrieval_service_js_1.RetrievalService,
            vector_retriever_service_js_1.VectorRetrieverService,
            lexical_retriever_service_js_1.LexicalRetrieverService,
            rerank_service_js_1.RerankService,
            mmr_service_js_1.MmrService,
            chunking_service_js_1.ChunkingService,
            embedding_service_js_1.EmbeddingService,
            chapter_detection_service_js_1.ChapterDetectionService,
            pdf_renderer_service_js_1.PdfRendererService,
            toc_vision_service_js_1.TocVisionService,
            ocr_service_js_1.OcrService,
            ...(enableRagQueue ? [ingestion_processor_js_1.IngestionProcessor] : []),
            generation_service_js_1.GenerationService,
        ],
        exports: [rag_service_js_1.RagService, generation_service_js_1.GenerationService, chapter_detection_service_js_1.ChapterDetectionService],
    })
], RagModule);
//# sourceMappingURL=rag.module.js.map