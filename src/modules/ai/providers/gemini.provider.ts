import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import type { AIProvider } from '../ai.provider.interface';

@Injectable()
export class GeminiProvider implements AIProvider {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  }

  async generateText(prompt: string, context?: any): Promise<string> {
    const finalPrompt =
      context === undefined
        ? prompt
        : `${prompt}\n\nCONTEXT (JSON):\n${JSON.stringify(context)}`;

    try {
      const resp = await this.ai.models.generateContent({
        model: this.model,
        contents: finalPrompt,
      });

      if (!resp?.text) {
        throw new Error('Gemini returned an empty response');
      }

      return resp.text;
    } catch (err: any) {
      const status = err?.status ?? err?.error?.code;
      const message =
        err?.error?.message || err?.message || 'Gemini request failed';

      if (status === 429 || String(message).includes('RESOURCE_EXHAUSTED')) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:
              'Gemini quota exceeded / rate limited. Enable billing/quota for your Gemini API project (or wait) and retry.',
            details: message,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new ServiceUnavailableException(
        `Gemini is currently unavailable. Details: ${message}`,
      );
    }
  }

  async generateStructured(prompt: string, schema: any): Promise<any> {
    const text = await this.generateText(prompt, { schema });
    return { text };
  }
}

