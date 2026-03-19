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
exports.GroqProvider = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
let GroqProvider = class GroqProvider {
    apiKey;
    client;
    model;
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY || '';
        this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        this.client = this.apiKey
            ? new openai_1.default({
                apiKey: this.apiKey,
                baseURL: 'https://api.groq.com/openai/v1',
            })
            : null;
    }
    async generateText(prompt, context) {
        if (!this.client) {
            throw new common_1.ServiceUnavailableException('GROQ_API_KEY is not set');
        }
        try {
            const messages = [];
            if (context !== undefined) {
                messages.push({
                    role: 'system',
                    content: `Context (JSON):\n${JSON.stringify(context)}`,
                });
            }
            messages.push({ role: 'user', content: prompt });
            const resp = await this.client.chat.completions.create({
                model: this.model,
                messages,
                temperature: 0.4,
            });
            const text = resp.choices?.[0]?.message?.content?.trim();
            if (!text)
                throw new Error('Groq returned an empty response');
            return text;
        }
        catch (err) {
            const status = err?.status ?? err?.response?.status;
            const message = err?.message || 'Groq request failed';
            if (status === 429) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Groq rate limited. Retry later.',
                    details: message,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            throw new common_1.ServiceUnavailableException(`Groq is currently unavailable. Details: ${message}`);
        }
    }
    async generateStructured(prompt, schema) {
        const text = await this.generateText(prompt, { schema });
        return { text };
    }
};
exports.GroqProvider = GroqProvider;
exports.GroqProvider = GroqProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GroqProvider);
//# sourceMappingURL=groq.provider.js.map