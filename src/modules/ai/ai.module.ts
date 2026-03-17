import { Module, Global } from '@nestjs/common';
import { OpenAIProvider } from './openai.provider';
import { AI_PROVIDER } from './ai.provider.interface';

@Global()
@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      useClass: OpenAIProvider,
    },
  ],
  exports: [AI_PROVIDER],
})
export class AIModule {}
