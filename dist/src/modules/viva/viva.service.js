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
exports.VivaService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const ai_provider_interface_1 = require("../ai/ai.provider.interface");
const rag_service_1 = require("../rag/rag.service");
let VivaService = class VivaService {
    prisma;
    ai;
    ragService;
    constructor(prisma, ai, ragService) {
        this.prisma = prisma;
        this.ai = ai;
        this.ragService = ragService;
    }
    async startSession(userId, nodeId) {
        const node = await this.prisma.syllabusNode.findUnique({ where: { id: nodeId } });
        if (!node)
            throw new Error('Node not found');
        const session = await this.prisma.vivaSession.create({
            data: {
                userId,
                nodeId,
                status: 'active',
            }
        });
        const contextChunks = await this.ragService.retrieveContext(`Introduction and basic questions about ${node.name}`, { nodeId });
        const contextText = contextChunks.map(c => c.content).join('\n\n');
        const prompt = `
      You are a strict but fair dental examiner.
      Start a viva session for the topic: ${node.name}.
      
      APPROVED CONTENT CONTEXT:
      ${contextText || 'Use standard dental curriculum.'}
      
      INSTRUCTION:
      Welcome the student and ask the first examiner question. 
      Ensure the question is grounded in the provided context if available.
    `;
        const greeting = await this.ai.generateText(prompt);
        await this.prisma.vivaMessage.create({
            data: {
                sessionId: session.id,
                role: 'examiner',
                text: greeting,
            }
        });
        if (contextChunks.length > 0) {
            await this.prisma.generationSource.createMany({
                data: contextChunks.map(chunk => ({
                    userId,
                    generationType: 'viva',
                    generationId: session.id,
                    chunkId: chunk.id,
                    relevanceScore: chunk.relevanceScore,
                }))
            });
        }
        return { session, firstQuestion: greeting };
    }
    async processAnswer(sessionId, answer) {
        const session = await this.prisma.vivaSession.findUnique({
            where: { id: sessionId },
            include: { node: true, messages: true }
        });
        if (!session)
            throw new Error('Session not found');
        await this.prisma.vivaMessage.create({
            data: {
                sessionId: session.id,
                role: 'student',
                text: answer,
            }
        });
        const contextChunks = await this.ragService.retrieveContext(`${session.node.name}: ${answer}`, { nodeId: session.nodeId });
        const contextText = contextChunks.map(c => c.content).join('\n\n');
        const prompt = `
      You are a dental examiner.
      Topic: ${session.node.name}.
      
      APPROVED CONTENT CONTEXT:
      ${contextText || 'Use standard dental curriculum.'}
      
      STUDENT ANSWER:
      "${answer}"
      
      CONVERSATION HISTORY:
      ${session.messages.slice(-4).map(m => `${m.role}: ${m.text}`).join('\n')}
      
      INSTRUCTION:
      Evaluate the student's answer. If incorrect, provide brief feedback. 
      Then ask the next relevant viva question. Keep the flow natural.
      Ground your evaluation and next question in the approved context.
    `;
        const aiResponse = await this.ai.generateText(prompt);
        const examinerMsg = await this.prisma.vivaMessage.create({
            data: {
                sessionId: session.id,
                role: 'examiner',
                text: aiResponse,
            }
        });
        if (contextChunks.length > 0) {
            await this.prisma.generationSource.createMany({
                data: contextChunks.map(chunk => ({
                    userId: session.userId,
                    generationType: 'viva_turn',
                    generationId: examinerMsg.id,
                    chunkId: chunk.id,
                    relevanceScore: chunk.relevanceScore,
                }))
            });
        }
        return aiResponse;
    }
    async getSessionHistory(sessionId) {
        return this.prisma.vivaMessage.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
    }
};
exports.VivaService = VivaService;
exports.VivaService = VivaService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(ai_provider_interface_1.AI_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object, rag_service_1.RagService])
], VivaService);
//# sourceMappingURL=viva.service.js.map