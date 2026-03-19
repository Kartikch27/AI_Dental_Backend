import { Module, Global } from '@nestjs/common';
import { AI_PROVIDER } from './ai.provider.interface';
import { getAiProviderOrder } from './ai.config';
import { AIRouter } from './ai.router';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { MockProvider } from './providers/mock.provider';
import { OpenAIProvider } from './providers/openai.provider';

@Global()
@Module({
  providers: [
    GeminiProvider,
    OpenAIProvider,
    GroqProvider,
    AnthropicProvider,
    MockProvider,
    {
      provide: AI_PROVIDER,
      useFactory: (
        gemini: GeminiProvider,
        openai: OpenAIProvider,
        groq: GroqProvider,
        anthropic: AnthropicProvider,
        mock: MockProvider,
      ) => {
        const order = getAiProviderOrder();
        return new AIRouter(order, { gemini, openai, groq, anthropic, mock });
      },
      inject: [GeminiProvider, OpenAIProvider, GroqProvider, AnthropicProvider, MockProvider],
    },
  ],
  exports: [AI_PROVIDER],
})
export class AIModule {}
