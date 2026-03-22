import { Module, Global } from '@nestjs/common';
import { AI_PROVIDER } from './ai.provider.interface';
import { getAiProviderOrder } from './ai.config';
import { AIRouter } from './ai.router';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { MockProvider } from './providers/mock.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { SarvamProvider } from './providers/sarvam.provider';

@Global()
@Module({
  providers: [
    GeminiProvider,
    OpenAIProvider,
    GroqProvider,
    AnthropicProvider,
    SarvamProvider,
    MockProvider,
    {
      provide: AI_PROVIDER,
      useFactory: (
        gemini: GeminiProvider,
        openai: OpenAIProvider,
        groq: GroqProvider,
        anthropic: AnthropicProvider,
        sarvam: SarvamProvider,
        mock: MockProvider,
      ) => {
        const order = getAiProviderOrder();
        return new AIRouter(order, { gemini, openai, groq, anthropic, sarvam, mock });
      },
      inject: [GeminiProvider, OpenAIProvider, GroqProvider, AnthropicProvider, SarvamProvider, MockProvider],
    },
  ],
  exports: [AI_PROVIDER],
})
export class AIModule {}
