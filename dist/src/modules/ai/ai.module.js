"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIModule = void 0;
const common_1 = require("@nestjs/common");
const ai_provider_interface_1 = require("./ai.provider.interface");
const ai_config_1 = require("./ai.config");
const ai_router_1 = require("./ai.router");
const anthropic_provider_1 = require("./providers/anthropic.provider");
const gemini_provider_1 = require("./providers/gemini.provider");
const groq_provider_1 = require("./providers/groq.provider");
const mock_provider_1 = require("./providers/mock.provider");
const openai_provider_1 = require("./providers/openai.provider");
let AIModule = class AIModule {
};
exports.AIModule = AIModule;
exports.AIModule = AIModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            gemini_provider_1.GeminiProvider,
            openai_provider_1.OpenAIProvider,
            groq_provider_1.GroqProvider,
            anthropic_provider_1.AnthropicProvider,
            mock_provider_1.MockProvider,
            {
                provide: ai_provider_interface_1.AI_PROVIDER,
                useFactory: (gemini, openai, groq, anthropic, mock) => {
                    const order = (0, ai_config_1.getAiProviderOrder)();
                    return new ai_router_1.AIRouter(order, { gemini, openai, groq, anthropic, mock });
                },
                inject: [gemini_provider_1.GeminiProvider, openai_provider_1.OpenAIProvider, groq_provider_1.GroqProvider, anthropic_provider_1.AnthropicProvider, mock_provider_1.MockProvider],
            },
        ],
        exports: [ai_provider_interface_1.AI_PROVIDER],
    })
], AIModule);
//# sourceMappingURL=ai.module.js.map