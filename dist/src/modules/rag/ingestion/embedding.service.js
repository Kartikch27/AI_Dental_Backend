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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const common_1 = require("@nestjs/common");
const genai_1 = require("@google/genai");
const openai_1 = __importDefault(require("openai"));
let EmbeddingService = class EmbeddingService {
    genai;
    openai;
    provider;
    constructor() {
        if (process.env.GEMINI_API_KEY) {
            this.provider = 'gemini';
            this.genai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            this.openai = null;
            return;
        }
        if (process.env.OPENAI_API_KEY) {
            this.provider = 'openai';
            this.openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
            this.genai = null;
            return;
        }
        this.provider = 'gemini';
        this.genai = null;
        this.openai = null;
    }
    async generateEmbeddingBatch(texts, concurrency = 3) {
        const results = new Array(texts.length);
        for (let i = 0; i < texts.length; i += concurrency) {
            const slice = texts.slice(i, i + concurrency);
            const embeddings = await Promise.all(slice.map((t) => this.generateEmbedding(t)));
            embeddings.forEach((emb, j) => { results[i + j] = emb; });
        }
        return results;
    }
    async generateEmbedding(text, attempt = 0) {
        const input = text.replace(/\n/g, ' ');
        if (this.provider === 'gemini') {
            if (!this.genai) {
                throw new common_1.ServiceUnavailableException('Embedding provider GEMINI is selected but GEMINI_API_KEY is not set.');
            }
            try {
                const response = await this.genai.models.embedContent({
                    model: 'gemini-embedding-001',
                    contents: input,
                });
                return response.embeddings[0].values;
            }
            catch (err) {
                const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
                if (is429 && attempt < 6) {
                    const delay = Math.min(4000 * Math.pow(2, attempt), 120_000);
                    await new Promise((r) => setTimeout(r, delay));
                    return this.generateEmbedding(text, attempt + 1);
                }
                throw err;
            }
        }
        if (!this.openai) {
            throw new common_1.ServiceUnavailableException('Embedding provider OPENAI is selected but OPENAI_API_KEY is not set.');
        }
        const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';
        const resp = await this.openai.embeddings.create({
            model,
            input,
        });
        const vec = resp.data?.[0]?.embedding;
        if (!vec || !Array.isArray(vec)) {
            throw new common_1.ServiceUnavailableException('OpenAI embeddings returned empty vector');
        }
        return vec;
    }
};
exports.EmbeddingService = EmbeddingService;
exports.EmbeddingService = EmbeddingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmbeddingService);
//# sourceMappingURL=embedding.service.js.map