import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider } from '../ai.provider.interface';

@Injectable()
export class AnthropicProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly client: Anthropic | null;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';
    this.client = this.apiKey ? new Anthropic({ apiKey: this.apiKey }) : null;
  }

  async generateText(prompt: string, context?: any): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('ANTHROPIC_API_KEY is not set');
    }

    try {
      const system =
        context === undefined
          ? undefined
          : `Context (JSON):\n${JSON.stringify(context)}`;

      const resp = await this.client.messages.create({
        model: this.model,
        max_tokens: Number.parseInt(process.env.ANTHROPIC_MAX_TOKENS || '1024', 10),
        temperature: 0.4,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
      });

      const text =
        resp.content
          ?.filter(p => p.type === 'text')
          .map(p => (p.type === 'text' ? p.text : ''))
          .join('')
          .trim() || '';

      if (!text) throw new Error('Anthropic returned an empty response');
      return text;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const message = err?.message || 'Anthropic request failed';

      if (status === 429) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Anthropic rate limited. Retry later.',
            details: message,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new ServiceUnavailableException(
        `Anthropic is currently unavailable. Details: ${message}`,
      );
    }
  }

  async generateStructured(prompt: string, schema: any): Promise<any> {
    const text = await this.generateText(prompt, { schema });
    return { text };
  }
}

