import { Injectable, Logger } from '@nestjs/common';
import { RetrievalService } from '../retrieval/retrieval.service';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private genai: GoogleGenAI;

  constructor(private retrievalService: RetrievalService) {
    this.genai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }

  async generateResponse(
    query: string,
    scope: { 
      nodeId?: string; 
      yearId?: string; 
      subjectId?: string;
      chapterId?: string;
      conceptId?: string;
    } = {},
    history: { role: 'user' | 'assistant', content: string }[] = [],
  ) {
    this.logger.log(`Retrieving context for query: "${query}"`);
    
    const maxSources = Number.parseInt(process.env.RAG_MAX_SOURCES || '5', 10);
    const maxSourceChars = Number.parseInt(process.env.RAG_SOURCE_MAX_CHARS || '1200', 10);
    const maxContextChars = Number.parseInt(process.env.RAG_CONTEXT_MAX_CHARS || '6000', 10);

    // Retrieve relevant chunks (selection happens in retrieval pipeline)
    const chunks = await this.retrievalService.retrieveRelevantChunks(query, scope, maxSources);
    
    let contextText = '';
    if (chunks && chunks.length > 0) {
      let used = 0;
      const parts: string[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const raw = String(chunks[i].content || '');
        const clipped = raw.length > maxSourceChars ? raw.slice(0, maxSourceChars) : raw;
        const block = `[Source ${i + 1}]:\n${clipped}`;
        if (used + block.length > maxContextChars) break;
        parts.push(block);
        used += block.length;
      }
      contextText = parts.join('\n\n');
    }

    const systemPrompt = `You are a helpful AI assistant for dental students, helping them study from their course materials.
Your goal is to answer the user's question based strictly on the provided context materials.
If the answer is not contained in the context, say "I don't have enough information in the provided documents to answer that definitively.", but try to be as helpful as possible based on the provided text.
Always cite your sources using the [Source X] format when using information from the context.

CONTEXT MATERIALS:
${contextText ? contextText : 'No specific context found.'}`;

    // Map history roles: Gemini uses 'user' and 'model' (not 'assistant')
    const geminiHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
      parts: [{ text: msg.content }],
    }));

    this.logger.log(`Generating response using Gemini...`);
    
    try {
      const response = await this.genai.models.generateContentStream({
        model: 'gemini-2.0-flash',
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.3,
        },
        contents: [
          ...geminiHistory,
          { role: 'user', parts: [{ text: query }] },
        ],
      });

      return response;
    } catch (error) {
      this.logger.error('Error generating response:', error);
      throw error;
    }
  }
}
