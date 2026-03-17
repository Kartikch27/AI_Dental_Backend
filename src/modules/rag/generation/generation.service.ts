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
    
    // Retrieve top 5 most relevant chunks
    const chunks = await this.retrievalService.retrieveRelevantChunks(query, scope, 5);
    
    let contextText = '';
    if (chunks && chunks.length > 0) {
      contextText = chunks.map((chunk, index) => {
        return `[Source ${index + 1}]:\n${chunk.content}`;
      }).join('\n\n');
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
