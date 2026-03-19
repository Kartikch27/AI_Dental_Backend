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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const common_1 = require("@nestjs/common");
const genai_1 = require("@google/genai");
let GeminiProvider = class GeminiProvider {
    ai;
    model;
    constructor() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY is not set');
        }
        this.ai = new genai_1.GoogleGenAI({ apiKey });
        this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    }
    async generateText(prompt, context) {
        const finalPrompt = context === undefined
            ? prompt
            : `${prompt}\n\nCONTEXT (JSON):\n${JSON.stringify(context)}`;
        try {
            const resp = await this.ai.models.generateContent({
                model: this.model,
                contents: finalPrompt,
            });
            if (!resp?.text) {
                throw new Error('Gemini returned an empty response');
            }
            return resp.text;
        }
        catch (err) {
            const status = err?.status ?? err?.error?.code;
            const message = err?.error?.message || err?.message || 'Gemini request failed';
            if (status === 429 || String(message).includes('RESOURCE_EXHAUSTED')) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Gemini quota exceeded / rate limited. Enable billing/quota for your Gemini API project (or wait) and retry.',
                    details: message,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            throw new common_1.ServiceUnavailableException(`Gemini is currently unavailable. Details: ${message}`);
        }
    }
    async generateStructured(prompt, schema) {
        const text = await this.generateText(prompt, { schema });
        return { text };
    }
};
exports.GeminiProvider = GeminiProvider;
exports.GeminiProvider = GeminiProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GeminiProvider);
//# sourceMappingURL=gemini.provider.js.map