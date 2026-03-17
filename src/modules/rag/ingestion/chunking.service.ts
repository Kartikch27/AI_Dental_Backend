import { Injectable } from '@nestjs/common';

@Injectable()
export class ChunkingService {
  chunkText(text: string, maxTokens = 500, overlap = 50): string[] {
    // Simple implementation for now: split by paragraph/sentences
    // In a production app, we would use a more robust token-count-based chunking
    const paragraphs = text.split(/\n\n+/);
    const chunks: string[] = [];
    let currentChunk = "";

    for (const p of paragraphs) {
      if ((currentChunk + p).length > maxTokens * 4) { // Estimating 4 chars per token
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = p.slice(-overlap * 4) + "\n\n"; // Add overlap
      }
      currentChunk += p + "\n\n";
    }
    
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
  }
}
