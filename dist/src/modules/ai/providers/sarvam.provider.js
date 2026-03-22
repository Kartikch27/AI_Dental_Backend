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
exports.SarvamProvider = void 0;
const common_1 = require("@nestjs/common");
let SarvamProvider = class SarvamProvider {
    apiKey;
    model;
    constructor() {
        this.apiKey = process.env.SARVAM_API_KEY || '';
        this.model = process.env.SARVAM_MODEL || 'sarvam-105b';
    }
    get isAvailable() {
        return !!this.apiKey;
    }
    async generateText(prompt, context) {
        if (!this.apiKey) {
            throw new common_1.ServiceUnavailableException('SARVAM_API_KEY is not set');
        }
        const messages = [];
        if (context !== undefined) {
            messages.push({
                role: 'system',
                content: `Context (JSON):\n${JSON.stringify(context)}`,
            });
        }
        messages.push({ role: 'user', content: prompt });
        try {
            const { SarvamAIClient } = require('sarvamai');
            const client = new SarvamAIClient({ apiSubscriptionKey: this.apiKey });
            const response = await client.chat.completions({
                model: this.model,
                messages,
                temperature: 0.5,
                top_p: 1,
                max_tokens: 4096,
            });
            const msg = response.choices?.[0]?.message;
            const text = (msg?.content ?? msg?.reasoning_content ?? '').trim();
            if (!text)
                throw new Error('Sarvam returned an empty response');
            return text;
        }
        catch (err) {
            const status = err?.status ?? err?.response?.status;
            const message = err?.message || 'Sarvam request failed';
            if (status === 429) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    message: 'Sarvam rate limited. Retry later.',
                    details: message,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            throw new common_1.ServiceUnavailableException(`Sarvam is currently unavailable. Details: ${message}`);
        }
    }
    async generateStructured(prompt, schema) {
        const text = await this.generateText(prompt, { schema });
        return { text };
    }
};
exports.SarvamProvider = SarvamProvider;
exports.SarvamProvider = SarvamProvider = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SarvamProvider);
//# sourceMappingURL=sarvam.provider.js.map