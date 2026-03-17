"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestPapersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const ai_provider_interface_1 = require("../ai/ai.provider.interface");
const rag_service_1 = require("../rag/rag.service");
let TestPapersService = class TestPapersService {
    prisma;
    ai;
    ragService;
    constructor(prisma, ai, ragService) {
        this.prisma = prisma;
        this.ai = ai;
        this.ragService = ragService;
    }
    async generateTest(userId, nodeId, config) {
        const node = await this.prisma.syllabusNode.findUnique({ where: { id: nodeId } });
        if (!node)
            throw new Error('Node not found');
        const contextChunks = await this.ragService.retrieveContext(node.name, { nodeId }, 10);
        const contextText = contextChunks.map(c => c.content).join('\n\n');
        const prompt = `
      You are an expert dental examiner.
      Generate a test paper for the topic: ${node.name}.
      
      APPROVED CONTENT CONTEXT:
      ${contextText || 'Use general dental curriculum standards.'}
      
      CONFIGURATION:
      ${JSON.stringify(config)}
      
      STRUCTURE:
      Section A: MCQs (with options and answer key)
      Section B: Short Answer Questions (SAQs)
      Section C: Long Answer Questions (LAQs)
      Section D: Case-based Questions
      
      Ensure all questions are grounded in the provided context if available.
    `;
        const content = await this.ai.generateText(prompt);
        const generation = await this.prisma.testPaperGeneration.create({
            data: {
                userId,
                nodeId,
                config,
                content,
            },
            include: { node: true }
        });
        if (contextChunks.length > 0) {
            await this.prisma.generationSource.createMany({
                data: contextChunks.map(chunk => ({
                    userId,
                    generationType: 'test_paper',
                    generationId: generation.id,
                    chunkId: chunk.id,
                    relevanceScore: chunk.relevanceScore,
                }))
            });
        }
        return generation;
    }
    async getHistory(userId) {
        return this.prisma.testPaperGeneration.findMany({
            where: { userId },
            include: { node: true },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.TestPapersService = TestPapersService;
exports.TestPapersService = TestPapersService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(ai_provider_interface_1.AI_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object, rag_service_1.RagService])
], TestPapersService);
//# sourceMappingURL=test-papers.service.js.map