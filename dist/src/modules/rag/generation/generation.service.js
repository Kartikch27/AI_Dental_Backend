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
var GenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerationService = void 0;
const common_1 = require("@nestjs/common");
const retrieval_service_1 = require("../retrieval/retrieval.service");
const genai_1 = require("@google/genai");
let GenerationService = GenerationService_1 = class GenerationService {
    retrievalService;
    logger = new common_1.Logger(GenerationService_1.name);
    genai;
    constructor(retrievalService) {
        this.retrievalService = retrievalService;
        this.genai = new genai_1.GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });
    }
    async generateResponse(query, scope = {}, history = []) {
        this.logger.log(`Retrieving context for query: "${query}"`);
        const maxSources = Number.parseInt(process.env.RAG_MAX_SOURCES || '5', 10);
        const maxSourceChars = Number.parseInt(process.env.RAG_SOURCE_MAX_CHARS || '1200', 10);
        const maxContextChars = Number.parseInt(process.env.RAG_CONTEXT_MAX_CHARS || '6000', 10);
        const chunks = await this.retrievalService.retrieveRelevantChunks(query, scope, maxSources);
        let contextText = '';
        if (chunks && chunks.length > 0) {
            let used = 0;
            const parts = [];
            for (let i = 0; i < chunks.length; i++) {
                const raw = String(chunks[i].content || '');
                const clipped = raw.length > maxSourceChars ? raw.slice(0, maxSourceChars) : raw;
                const block = `[Source ${i + 1}]:\n${clipped}`;
                if (used + block.length > maxContextChars)
                    break;
                parts.push(block);
                used += block.length;
            }
            contextText = parts.join('\n\n');
        }
        const systemPrompt = `You are a helpful AI assistant for dental students, helping them study from their course materials.
Your goal is to answer the user's question based strictly on the provided context materials.
If the answer is not contained in the context, say "I don't have enough information in the provided documents to answer that definitively.", but try to be as helpful as possible based on the provided text.
Always cite your sources using the [Source X] format when using information from the context.

CONTEXT MATERIALS:
${contextText ? contextText : 'No specific context found.'}`;
        const geminiHistory = history.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
        }));
        this.logger.log(`Generating response using Gemini...`);
        try {
            const response = await this.genai.models.generateContentStream({
                model: 'gemini-2.0-flash',
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.3,
                },
                contents: [
                    ...geminiHistory,
                    { role: 'user', parts: [{ text: query }] },
                ],
            });
            return response;
        }
        catch (error) {
            this.logger.error('Error generating response:', error);
            throw error;
        }
    }
};
exports.GenerationService = GenerationService;
exports.GenerationService = GenerationService = GenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [retrieval_service_1.RetrievalService])
], GenerationService);
//# sourceMappingURL=generation.service.js.map