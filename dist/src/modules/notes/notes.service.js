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
exports.NotesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const ai_provider_interface_1 = require("../ai/ai.provider.interface");
const rag_service_1 = require("../rag/rag.service");
const syllabus_service_1 = require("../syllabus/syllabus.service");
let NotesService = class NotesService {
    prisma;
    ai;
    ragService;
    syllabusService;
    constructor(prisma, ai, ragService, syllabusService) {
        this.prisma = prisma;
        this.ai = ai;
        this.ragService = ragService;
        this.syllabusService = syllabusService;
    }
    async generateNotes(userId, nodeId, style) {
        const node = await this.prisma.syllabusNode.findUnique({ where: { id: nodeId } });
        if (!node)
            throw new Error('Node not found');
        const scope = await this.syllabusService.resolveAncestorScope(nodeId);
        const maxSources = Number.parseInt(process.env.RAG_MAX_SOURCES || '4', 10);
        const maxSourceChars = Number.parseInt(process.env.RAG_SOURCE_MAX_CHARS || '900', 10);
        const maxContextChars = Number.parseInt(process.env.RAG_CONTEXT_MAX_CHARS || '3600', 10);
        const contextChunks = await this.ragService.retrieveContext(node.name, scope, maxSources);
        let used = 0;
        const parts = [];
        for (let i = 0; i < contextChunks.length; i++) {
            const raw = String(contextChunks[i].content || '');
            const clipped = raw.length > maxSourceChars ? raw.slice(0, maxSourceChars) : raw;
            const block = `[Source ${i + 1}]\n${clipped}`;
            if (used + block.length > maxContextChars)
                break;
            parts.push(block);
            used += block.length;
        }
        const contextText = parts.join('\n\n');
        const prompt = `
      You are an expert dental educator.
      Use the following approved educational context to generate ${style} for the topic: ${node.name}.
      
      CONTEXT:
      ${contextText || 'No specific context found. Use general dental knowledge.'}
      
      INSTRUCTION:
      Ensure clinical relevance and professional structure. 
      If context is provided, prioritize it.
    `;
        const content = await this.ai.generateText(prompt);
        const generation = await this.prisma.noteGeneration.create({
            data: {
                userId,
                nodeId,
                style,
                content,
            },
            include: { node: true }
        });
        if (contextChunks.length > 0) {
            await this.prisma.generationSource.createMany({
                data: contextChunks.map(chunk => ({
                    userId,
                    generationType: 'note',
                    generationId: generation.id,
                    chunkId: chunk.id,
                    relevanceScore: chunk.relevanceScore,
                }))
            });
        }
        return generation;
    }
    async getUserNotes(userId) {
        return this.prisma.noteGeneration.findMany({
            where: { userId },
            include: { node: true },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.NotesService = NotesService;
exports.NotesService = NotesService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(ai_provider_interface_1.AI_PROVIDER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object, rag_service_1.RagService,
        syllabus_service_1.SyllabusService])
], NotesService);
//# sourceMappingURL=notes.service.js.map