"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const syllabus_module_1 = require("./modules/syllabus/syllabus.module");
const ai_module_1 = require("./modules/ai/ai.module");
const notes_module_1 = require("./modules/notes/notes.module");
const test_papers_module_1 = require("./modules/test-papers/test-papers.module");
const viva_module_1 = require("./modules/viva/viva.module");
const pdf_module_1 = require("./modules/pdf/pdf.module");
const bullmq_1 = require("@nestjs/bullmq");
const rag_module_1 = require("./modules/rag/rag.module");
function getRedisConnection() {
    if (process.env.REDIS_URL) {
        try {
            const u = new URL(process.env.REDIS_URL);
            const dbFromPath = u.pathname?.replace('/', '');
            const db = dbFromPath ? Number.parseInt(dbFromPath, 10) : undefined;
            return {
                host: u.hostname,
                port: u.port ? Number.parseInt(u.port, 10) : 6379,
                username: u.username || undefined,
                password: u.password || undefined,
                db: Number.isFinite(db) ? db : undefined,
                ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
            };
        }
        catch {
            return null;
        }
    }
    if (process.env.REDIS_HOST) {
        return {
            host: process.env.REDIS_HOST,
            port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
        };
    }
    return null;
}
const redisConnection = getRedisConnection();
const enableRagQueue = process.env.ENABLE_RAG_QUEUE === 'true' ||
    process.env.ENABLE_QUEUES === 'true' ||
    process.env.ENABLE_BULLMQ === 'true';
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            ai_module_1.AIModule,
            auth_module_1.AuthModule,
            syllabus_module_1.SyllabusModule,
            notes_module_1.NotesModule,
            test_papers_module_1.TestPapersModule,
            viva_module_1.VivaModule,
            pdf_module_1.PdfModule,
            ...(enableRagQueue && redisConnection
                ? [
                    bullmq_1.BullModule.forRoot({
                        connection: redisConnection,
                    }),
                    rag_module_1.RagModule,
                ]
                : []),
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map