import { Injectable, Logger, Inject } from '@nestjs/common';
import { RetrievalService } from '../retrieval/retrieval.service';
import { GoogleGenAI } from '@google/genai';
import { AI_PROVIDER } from '../../ai/ai.provider.interface';
import type { AIProvider } from '../../ai/ai.provider.interface';
import type { RagScope } from '../retrieval/retrieval.types';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private genai: GoogleGenAI | null;

  constructor(
    private retrievalService: RetrievalService,
    @Inject(AI_PROVIDER) private aiRouter: AIProvider,
  ) {
    this.genai = process.env.GEMINI_API_KEY
      ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
      : null;
  }

  // ─── shared: build context text from chunks ─────────────────────────────────
  private async buildContext(query: string, scope: RagScope) {
    const maxSources   = Number.parseInt(process.env.RAG_MAX_SOURCES    || '5',    10);
    const maxSrcChars  = Number.parseInt(process.env.RAG_SOURCE_MAX_CHARS || '1200', 10);
    const maxCtxChars  = Number.parseInt(process.env.RAG_CONTEXT_MAX_CHARS || '6000', 10);

    const chunks = await this.retrievalService.retrieveRelevantChunks(query, scope, maxSources);

    let used = 0;
    const parts: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const raw     = String(chunks[i].content || '');
      const clipped = raw.length > maxSrcChars ? raw.slice(0, maxSrcChars) : raw;
      const block   = `[Source ${i + 1}]:\n${clipped}`;
      if (used + block.length > maxCtxChars) break;
      parts.push(block);
      used += block.length;
    }

    return { contextText: parts.join('\n\n'), sources: chunks };
  }

  private buildSystemPrompt(contextText: string) {
    return `You are a helpful AI assistant for dental students, helping them study from their course materials.
Answer the user's question based strictly on the provided context materials.
If the answer is not contained in the context, say "I don't have enough information in the provided documents to answer that definitively.", but try to be as helpful as possible.
Always cite your sources using the [Source X] format when using information from the context.

CONTEXT MATERIALS:
${contextText || 'No specific context found for the selected scope.'}`;
  }

  // ─── STREAMING (SSE) — uses Gemini directly for true token streaming ─────────
  async generateResponse(
    query: string,
    scope: RagScope = {},
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ) {
    this.logger.log(`[Stream] query="${query}" scope=${JSON.stringify(scope)}`);

    const { contextText } = await this.buildContext(query, scope);
    const systemPrompt    = this.buildSystemPrompt(contextText);

    if (this.genai) {
      try {
        const geminiHistory = history.map(msg => ({
          role:  msg.role === 'assistant' ? 'model' as const : 'user' as const,
          parts: [{ text: msg.content }],
        }));

        return await this.genai.models.generateContentStream({
          model: 'gemini-2.0-flash',
          config: { systemInstruction: systemPrompt, temperature: 0.3 },
          contents: [
            ...geminiHistory,
            { role: 'user', parts: [{ text: query }] },
          ],
        });
      } catch (err: any) {
        const isRateLimit = err?.status === 429 || String(err?.message || '').includes('429');
        if (isRateLimit) {
          this.logger.warn('[Stream] Gemini rate-limited (429) — falling back to AI router');
        } else {
          this.logger.error('[Stream] Gemini error — falling back to AI router:', err?.message);
        }
        // Fall through to router fallback below
      }
    }

    // Gemini unavailable or rate-limited → fall back to AI router
    this.logger.warn('[Stream] Using AI router fallback (non-streaming)');
    const fullPrompt = `${systemPrompt}\n\nConversation history:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${query}`;
    const answer = await this.aiRouter.generateText(fullPrompt);

    // Yield a single chunk so the SSE loop works unchanged
    return (async function* () { yield { text: answer }; })();
  }

  // ─── NON-STREAMING (JSON) — uses AI router for full provider fallback ────────
  async chat(
    query: string,
    scope: RagScope = {},
    history: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<{ answer: string; sources: { id: string; content: string; sectionTitle?: string | null; relevanceScore: number }[] }> {
    this.logger.log(`[Chat] query="${query}" scope=${JSON.stringify(scope)}`);

    const { contextText, sources } = await this.buildContext(query, scope);
    const systemPrompt = this.buildSystemPrompt(contextText);

    const historyText = history.length
      ? `\n\nConversation so far:\n${history.map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join('\n')}`
      : '';

    const fullPrompt = `${systemPrompt}${historyText}\n\nStudent question: ${query}`;

    const answer = await this.aiRouter.generateText(fullPrompt);

    return {
      answer,
      sources: sources.map(s => ({
        id:             s.id,
        content:        s.content.slice(0, 300),
        sectionTitle:   s.sectionTitle,
        relevanceScore: s.relevanceScore,
      })),
    };
  }
}
