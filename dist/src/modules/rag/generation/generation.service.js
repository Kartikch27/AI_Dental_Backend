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
var GenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationService = void 0;
const common_1 = require("@nestjs/common");
const retrieval_service_1 = require("../retrieval/retrieval.service");
const genai_1 = require("@google/genai");
const ai_provider_interface_1 = require("../../ai/ai.provider.interface");
let GenerationService = GenerationService_1 = class GenerationService {
    retrievalService;
    aiRouter;
    logger = new common_1.Logger(GenerationService_1.name);
    genai;
    constructor(retrievalService, aiRouter) {
        this.retrievalService = retrievalService;
        this.aiRouter = aiRouter;
        this.genai = process.env.GEMINI_API_KEY
            ? new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
            : null;
    }
    async buildContext(query, scope) {
        const maxSources = Number.parseInt(process.env.RAG_MAX_SOURCES || '5', 10);
        const maxSrcChars = Number.parseInt(process.env.RAG_SOURCE_MAX_CHARS || '1200', 10);
        const maxCtxChars = Number.parseInt(process.env.RAG_CONTEXT_MAX_CHARS || '6000', 10);
        const chunks = await this.retrievalService.retrieveRelevantChunks(query, scope, maxSources);
        let used = 0;
        const parts = [];
        for (let i = 0; i < chunks.length; i++) {
            const raw = String(chunks[i].content || '');
            const clipped = raw.length > maxSrcChars ? raw.slice(0, maxSrcChars) : raw;
            const block = `[Source ${i + 1}]:\n${clipped}`;
            if (used + block.length > maxCtxChars)
                break;
            parts.push(block);
            used += block.length;
        }
        return { contextText: parts.join('\n\n'), sources: chunks };
    }
    buildSystemPrompt(contextText) {
        return `You are a helpful AI assistant for dental students, helping them study from their course materials.
Answer the user's question based strictly on the provided context materials.
If the answer is not contained in the context, say "I don't have enough information in the provided documents to answer that definitively.", but try to be as helpful as possible.
Always cite your sources using the [Source X] format when using information from the context.

CONTEXT MATERIALS:
${contextText || 'No specific context found for the selected scope.'}`;
    }
    async generateResponse(query, scope = {}, history = []) {
        this.logger.log(`[Stream] query="${query}" scope=${JSON.stringify(scope)}`);
        const { contextText } = await this.buildContext(query, scope);
        const systemPrompt = this.buildSystemPrompt(contextText);
        if (this.genai) {
            try {
                const geminiHistory = history.map(msg => ({
                    role: msg.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: msg.content }],
                }));
                return await this.genai.models.generateContentStream({
                    model: 'gemini-2.0-flash',
                    config: { systemInstruction: systemPrompt, temperature: 0.3 },
                    contents: [
                        ...geminiHistory,
                        { role: 'user', parts: [{ text: query }] },
                    ],
                });
            }
            catch (err) {
                const isRateLimit = err?.status === 429 || String(err?.message || '').includes('429');
                if (isRateLimit) {
                    this.logger.warn('[Stream] Gemini rate-limited (429) — falling back to AI router');
                }
                else {
                    this.logger.error('[Stream] Gemini error — falling back to AI router:', err?.message);
                }
            }
        }
        this.logger.warn('[Stream] Using AI router fallback (non-streaming)');
        const fullPrompt = `${systemPrompt}\n\nConversation history:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${query}`;
        const answer = await this.aiRouter.generateText(fullPrompt);
        return (async function* () { yield { text: answer }; })();
    }
    async chat(query, scope = {}, history = []) {
        this.logger.log(`[Chat] query="${query}" scope=${JSON.stringify(scope)}`);
        const { contextText, sources } = await this.buildContext(query, scope);
        const systemPrompt = this.buildSystemPrompt(contextText);
        const historyText = history.length
            ? `\n\nConversation so far:\n${history.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n')}`
            : '';
        const fullPrompt = `${systemPrompt}${historyText}\n\nStudent question: ${query}`;
        const answer = await this.aiRouter.generateText(fullPrompt);
        return {
            answer,
            sources: sources.map(s => ({
                id: s.id,
                content: s.content.slice(0, 300),
                sectionTitle: s.sectionTitle,
                relevanceScore: s.relevanceScore,
            })),
        };
    }
};
exports.GenerationService = GenerationService;
exports.GenerationService = GenerationService = GenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(ai_provider_interface_1.AI_PROVIDER)),
    __metadata("design:paramtypes", [retrieval_service_1.RetrievalService, Object])
], GenerationService);
//# sourceMappingURL=generation.service.js.map