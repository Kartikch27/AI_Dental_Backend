import { HttpException } from '@nestjs/common';
import type { AIProvider } from './ai.provider.interface';
import type { AIProviderId } from './ai.config';

function isRetryableProviderError(err: unknown): boolean {
  if (err instanceof HttpException) {
    const status = err.getStatus();
    return status === 429 || (status >= 500 && status <= 599);
  }

  const msg = (err as any)?.message ? String((err as any).message) : '';
  return (
    msg.includes('quota') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('rate limit') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
}

export class AIRouter implements AIProvider {
  constructor(
    private readonly order: AIProviderId[],
    private readonly providers: Record<AIProviderId, AIProvider>,
  ) {}

  async generateText(prompt: string, context?: any): Promise<string> {
    let lastErr: unknown;

    for (const id of this.order) {
      const provider = this.providers[id];
      if (!provider) continue;

      try {
        return await provider.generateText(prompt, context);
      } catch (err) {
        lastErr = err;
        if (!isRetryableProviderError(err)) throw err;
      }
    }

    throw lastErr ?? new Error('No AI providers available');
  }

  async generateStructured(prompt: string, schema: any): Promise<any> {
    let lastErr: unknown;

    for (const id of this.order) {
      const provider = this.providers[id];
      if (!provider) continue;

      try {
        return await provider.generateStructured(prompt, schema);
      } catch (err) {
        lastErr = err;
        if (!isRetryableProviderError(err)) throw err;
      }
    }

    throw lastErr ?? new Error('No AI providers available');
  }
}

