import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import type { AIProvider } from '../ai.provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.client = this.apiKey ? new OpenAI({ apiKey: this.apiKey }) : null;
  }

  async generateText(prompt: string, context?: any): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not set');
    }

    try {
      const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
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
      if (!text) throw new Error('OpenAI returned an empty response');
      return text;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const message = err?.message || 'OpenAI request failed';

      if (status === 429) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'OpenAI rate limited. Retry later.',
            details: message,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new ServiceUnavailableException(
        `OpenAI is currently unavailable. Details: ${message}`,
      );
    }
  }

  async generateStructured(prompt: string, schema: any): Promise<any> {
    const text = await this.generateText(prompt, { schema });
    return { text };
  }
}

