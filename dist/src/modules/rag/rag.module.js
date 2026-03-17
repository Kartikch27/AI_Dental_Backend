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
const chunking_service_js_1 = require("./ingestion/chunking.service.js");
const embedding_service_js_1 = require("./ingestion/embedding.service.js");
const ingestion_processor_js_1 = require("./ingestion/ingestion.processor.js");
const generation_service_js_1 = require("./generation/generation.service.js");
const rag_admin_controller_js_1 = require("./rag.admin.controller.js");
const rag_controller_js_1 = require("./rag.controller.js");
const bullmq_1 = require("@nestjs/bullmq");
const prisma_module_1 = require("../../prisma/prisma.module");
let RagModule = class RagModule {
};
exports.RagModule = RagModule;
exports.RagModule = RagModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'ingestion',
            }),
            prisma_module_1.PrismaModule,
        ],
        controllers: [rag_admin_controller_js_1.RagAdminController, rag_controller_js_1.RagController],
        providers: [
            rag_service_js_1.RagService,
            ingestion_service_js_1.IngestionService,
            retrieval_service_js_1.RetrievalService,
            chunking_service_js_1.ChunkingService,
            embedding_service_js_1.EmbeddingService,
            ingestion_processor_js_1.IngestionProcessor,
            generation_service_js_1.GenerationService,
        ],
        exports: [rag_service_js_1.RagService, generation_service_js_1.GenerationService],
    })
], RagModule);
//# sourceMappingURL=rag.module.js.map