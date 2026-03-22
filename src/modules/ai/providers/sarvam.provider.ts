import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { AIProvider } from '../ai.provider.interface';

/**
 * Provider 5 = sarvam
 * Model: sarvam-105b (multilingual, great for Indian languages + English)
 * Docs: https://docs.sarvam.ai
 */
@Injectable()
export class SarvamProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor() {
    this.apiKey = process.env.SARVAM_API_KEY || '';
    this.model = process.env.SARVAM_MODEL || 'sarvam-105b';
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generateText(prompt: string, context?: any): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('SARVAM_API_KEY is not set');
    }

    const messages: Array<{ role: string; content: string }> = [];

    if (context !== undefined) {
      messages.push({
        role: 'system',
        content: `Context (JSON):\n${JSON.stringify(context)}`,
      });
    }
    messages.push({ role: 'user', content: prompt });

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
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
      // sarvam-105b is a reasoning model: content may be null, answer is in reasoning_content
      const text = (msg?.content ?? msg?.reasoning_content ?? '').trim();
      if (!text) throw new Error('Sarvam returned an empty response');
      return text;
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      const message = err?.message || 'Sarvam request failed';

      if (status === 429) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Sarvam rate limited. Retry later.',
            details: message,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new ServiceUnavailableException(
        `Sarvam is currently unavailable. Details: ${message}`,
      );
    }
  }

  async generateStructured(prompt: string, schema: any): Promise<any> {
    const text = await this.generateText(prompt, { schema });
    return { text };
  }
}
