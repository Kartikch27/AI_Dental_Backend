import { Injectable } from '@nestjs/common';
import type { AIProvider } from '../ai.provider.interface';

@Injectable()
export class MockProvider implements AIProvider {
  async generateText(prompt: string): Promise<string> {
    return `[Mock AI Response]\n\nPrompt preview:\n${prompt.slice(0, 300)}\n`;
  }

  async generateStructured(prompt: string, schema: any): Promise<any> {
    return {
      mock: true,
      promptPreview: prompt.slice(0, 200),
      schema,
    };
  }
}

