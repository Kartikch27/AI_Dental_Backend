import { Injectable } from '@nestjs/common';
import type { RetrievedChunk } from './retrieval.types';

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => t.length >= 3);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

@Injectable()
export class MmrService {
  /**
   * Maximal Marginal Relevance (MMR) selection to reduce redundancy.
   * Uses cheap text Jaccard similarity on tokens (no extra embedding calls).
   *
   * Score: lambda * relevance - (1-lambda) * maxSimToSelected
   */
  select(candidates: RetrievedChunk[], k: number, lambda = 0.7): RetrievedChunk[] {
    if (k <= 0) return [];
    if (candidates.length <= k) return candidates.slice(0, k);

    const l = Number.isFinite(lambda) ? Math.max(0, Math.min(1, lambda)) : 0.7;
    const tokenSets = new Map<string, Set<string>>();
    for (const c of candidates) {
      tokenSets.set(c.id, new Set(tokenize(c.content)));
    }

    const selected: RetrievedChunk[] = [];
    const remaining = new Map<string, RetrievedChunk>(candidates.map(c => [c.id, c]));

    // Seed with best relevance
    const first = candidates[0];
    selected.push(first);
    remaining.delete(first.id);

    while (selected.length < k && remaining.size > 0) {
      let best: RetrievedChunk | null = null;
      let bestScore = -Infinity;

      for (const cand of remaining.values()) {
        const candSet = tokenSets.get(cand.id) || new Set<string>();
        let maxSim = 0;
        for (const sel of selected) {
          const selSet = tokenSets.get(sel.id) || new Set<string>();
          maxSim = Math.max(maxSim, jaccard(candSet, selSet));
          if (maxSim >= 0.95) break;
        }

        const rel = cand.relevanceScore ?? 0;
        const score = l * rel - (1 - l) * maxSim;
        if (score > bestScore) {
          bestScore = score;
          best = cand;
        }
      }

      if (!best) break;
      selected.push(best);
      remaining.delete(best.id);
    }

    return selected;
  }
}

