import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import type { AIProvider } from '../ai.provider.interface';

@Injectable()
export class GroqProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    this.model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    this.client = this.apiKey
      ? new OpenAI({
          apiKey: this.apiKey,
          baseURL: 'https://api.groq.com/openai/v1',
        })
      : null;
  }

  async generateText(prompt: string, context?: any): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('GROQ_API_KEY is not set');
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
      if (!text) throw new Error('Groq returned an empty response');
      return text;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const message = err?.message || 'Groq request failed';

      if (status === 429) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Groq rate limited. Retry later.',
            details: message,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new ServiceUnavailableException(
        `Groq is currently unavailable. Details: ${message}`,
      );
    }
  }

  async generateStructured(prompt: string, schema: any): Promise<any> {
    const text = await this.generateText(prompt, { schema });
    return { text };
  }
}

