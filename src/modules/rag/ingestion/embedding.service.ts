import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private genai: GoogleGenAI | null;
  private openai: OpenAI | null;
  private provider: 'gemini' | 'openai';

  constructor() {
    if (process.env.GEMINI_API_KEY) {
      this.provider = 'gemini';
      this.genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      this.openai = null;
      return;
    }

    if (process.env.OPENAI_API_KEY) {
      this.provider = 'openai';
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.genai = null;
      return;
    }

    // No embedding provider configured.
    this.provider = 'gemini';
    this.genai = null;
    this.openai = null;
  }

  /**
   * Generates embeddings for multiple texts concurrently.
   * Uses a concurrency limit to avoid rate-limit errors.
   */
  async generateEmbeddingBatch(texts: string[], concurrency = 3): Promise<number[][]> {
    const results: number[][] = new Array(texts.length);

    for (let i = 0; i < texts.length; i += concurrency) {
      const slice = texts.slice(i, i + concurrency);
      const embeddings = await Promise.all(slice.map((t) => this.generateEmbedding(t)));
      embeddings.forEach((emb, j) => { results[i + j] = emb; });
    }

    return results;
  }

  async generateEmbedding(text: string, attempt = 0): Promise<number[]> {
    const input = text.replace(/\n/g, ' ');

    if (this.provider === 'gemini') {
      if (!this.genai) {
        throw new ServiceUnavailableException(
          'Embedding provider GEMINI is selected but GEMINI_API_KEY is not set.',
        );
      }
      try {
        const response = await this.genai.models.embedContent({
          model: 'gemini-embedding-001',
          contents: input,
        });
        return response.embeddings![0].values!;
      } catch (err: any) {
        const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('RESOURCE_EXHAUSTED');
        if (is429 && attempt < 6) {
          // Exponential backoff: 4s, 8s, 16s, 32s, 64s, 120s
          const delay = Math.min(4000 * Math.pow(2, attempt), 120_000);
          await new Promise((r) => setTimeout(r, delay));
          return this.generateEmbedding(text, attempt + 1);
        }
        throw err;
      }
    }

    if (!this.openai) {
      throw new ServiceUnavailableException(
        'Embedding provider OPENAI is selected but OPENAI_API_KEY is not set.',
      );
    }

    // Must match RagChunk vector(3072) dimension (OpenAI large = 3072 dims).
    const model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';
    const resp = await this.openai.embeddings.create({
      model,
      input,
    });

    const vec = resp.data?.[0]?.embedding;
    if (!vec || !Array.isArray(vec)) {
      throw new ServiceUnavailableException('OpenAI embeddings returned empty vector');
    }
    return vec;
  }
}
