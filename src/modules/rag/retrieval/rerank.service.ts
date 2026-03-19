import { Injectable } from '@nestjs/common';
import { AI_PROVIDER, type AIProvider } from '../../ai/ai.provider.interface';
import { Inject } from '@nestjs/common';
import type { RetrievedChunk } from './retrieval.types';

function safeJsonArray(value: string): string[] | null {
  try {
    const start = value.indexOf('[');
    const end = value.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return null;
    const parsed = JSON.parse(value.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter(x => typeof x === 'string');
    return ids.length ? ids : null;
  } catch {
    return null;
  }
}

@Injectable()
export class RerankService {
  constructor(@Inject(AI_PROVIDER) private ai: AIProvider) {}

  async rerank(query: string, candidates: RetrievedChunk[]): Promise<RetrievedChunk[]> {
    const compact = candidates.map(c => ({
      id: c.id,
      text: c.content.slice(0, 700),
    }));

    const prompt = `You are a reranking model for Retrieval-Augmented Generation (RAG).
Given a user query and candidate chunks, return a JSON array of chunk ids ordered from most relevant to least relevant.
Only output JSON. No extra text.

Query:
${query}

Candidates (JSON):
${JSON.stringify(compact)}
`;

    const out = await this.ai.generateText(prompt);
    const orderedIds = safeJsonArray(out);
    if (!orderedIds) return candidates;

    const byId = new Map(candidates.map(c => [c.id, c] as const));
    const used = new Set<string>();
    const reranked: RetrievedChunk[] = [];

    for (const id of orderedIds) {
      const c = byId.get(id);
      if (!c) continue;
      used.add(id);
      reranked.push(c);
    }

    for (const c of candidates) {
      if (!used.has(c.id)) reranked.push(c);
    }

    return reranked;
  }
}

