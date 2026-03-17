import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class EmbeddingService {
  private genai: GoogleGenAI;

  constructor() {
    this.genai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.genai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text.replace(/\n/g, ' '),
    });

    return response.embeddings![0].values!;
  }
}
