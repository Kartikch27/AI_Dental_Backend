import { EmbeddingService } from '../ingestion/embedding.service';
import { Injectable } from '@nestjs/common';
import { LexicalRetrieverService } from './lexical-retriever.service';
import { MmrService } from './mmr.service';
import { RerankService } from './rerank.service';
import type { RagScope, RetrievedChunk } from './retrieval.types';
import { VectorRetrieverService } from './vector-retriever.service';

@Injectable()
export class RetrievalService {
  constructor(
    private embeddingService: EmbeddingService,
    private vectorRetriever: VectorRetrieverService,
    private lexicalRetriever: LexicalRetrieverService,
    private rerankService: RerankService,
    private mmrService: MmrService,
  ) {}

  private normalize01(values: number[]) {
    if (!values.length) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (max - min < 1e-9) return values.map(() => 1);
    return values.map(v => (v - min) / (max - min));
  }

  async retrieveRelevantChunks(query: string, scope: RagScope, limit = 5): Promise<RetrievedChunk[]> {
    const mode = (process.env.RAG_RETRIEVAL_MODE || 'hybrid').toLowerCase(); // vector|hybrid
    const enableRerank = (process.env.RAG_ENABLE_RERANK || 'false').toLowerCase() === 'true';
    const alpha = Number.parseFloat(process.env.RAG_HYBRID_ALPHA || '0.7'); // weight for vector
    const enableMmr = (process.env.RAG_ENABLE_MMR || 'true').toLowerCase() === 'true';
    const mmrLambda = Number.parseFloat(process.env.RAG_MMR_LAMBDA || '0.7');
    const enablePrf = (process.env.RAG_ENABLE_PRF || 'true').toLowerCase() === 'true';

    const vectorCandidates = Math.max(
      limit,
      Number.parseInt(process.env.RAG_VECTOR_CANDIDATES || String(limit * 8), 10),
    );
    const lexicalCandidates = Math.max(
      limit,
      Number.parseInt(process.env.RAG_LEXICAL_CANDIDATES || String(limit * 8), 10),
    );
    const rerankCandidates = Math.max(
      limit,
      Number.parseInt(process.env.RAG_RERANK_CANDIDATES || String(limit * 4), 10),
    );
    const mmrCandidates = Math.max(
      limit,
      Number.parseInt(process.env.RAG_MMR_CANDIDATES || String(limit * 6), 10),
    );

    // 1) Vector retrieval
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);
    const vectorString = `[${queryEmbedding.join(',')}]`;
    const vectorRows = await this.vectorRetriever.searchByVector(vectorString, scope, vectorCandidates);

    if (mode === 'vector') {
      const out = vectorRows
        .map(r => ({
          ...r,
          vectorScore: r.vectorScore,
          relevanceScore: r.vectorScore,
        }))
        .slice(0, limit) as RetrievedChunk[];
      return out;
    }

    // 2) Lexical retrieval
    const lexicalRows1 = await this.lexicalRetriever.searchByLexical(query, scope, lexicalCandidates);

    // PRF (Pseudo-Relevance Feedback): cheap query expansion using top lexical hits
    // Improves recall without extra embeddings or LLM calls.
    const lexicalRows = enablePrf
      ? await (async () => {
          const prfDocs = Number.parseInt(process.env.RAG_PRF_DOCS || '3', 10);
          const prfTerms = Number.parseInt(process.env.RAG_PRF_TERMS || '8', 10);
          const stop = new Set([
            'the','and','for','with','from','that','this','what','when','where','which','who','why','how',
            'are','was','were','been','being','into','onto','over','under','within','without','between',
            'your','you','our','their','they','them','his','her','she','him','its','it','can','could','should',
            'may','might','will','would','also','than','then','there','here','have','has','had','does','did','done',
          ]);

          const counts = new Map<string, number>();
          const sample = lexicalRows1.slice(0, Math.max(0, prfDocs));
          for (const r of sample) {
            const tokens = String(r.content || '')
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, ' ')
              .split(/\s+/)
              .filter(Boolean)
              .filter(t => t.length >= 4 && !stop.has(t));
            for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
          }
          const extras = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, Math.max(0, prfTerms))
            .map(([t]) => t);

          if (!extras.length) return lexicalRows1;
          const expandedQuery = `${query} ${extras.join(' ')}`;
          const lexicalRows2 = await this.lexicalRetriever.searchByLexical(expandedQuery, scope, lexicalCandidates);

          // Merge by max lexicalRaw per id
          const byId = new Map<string, any>();
          for (const r of [...lexicalRows1, ...lexicalRows2]) {
            const prev = byId.get(r.id);
            if (!prev || Number(r.lexicalRaw || 0) > Number(prev.lexicalRaw || 0)) byId.set(r.id, r);
          }
          return Array.from(byId.values());
        })()
      : lexicalRows1;

    const lexicalNorm = this.normalize01(lexicalRows.map(r => Number(r.lexicalRaw || 0)));
    const lexicalById = new Map<string, number>();
    lexicalRows.forEach((r, i) => lexicalById.set(r.id, lexicalNorm[i] ?? 0));

    // 3) Hybrid merge (union + weighted score)
    const merged = new Map<string, RetrievedChunk>();
    for (const r of vectorRows) {
      merged.set(r.id, {
        id: r.id,
        content: r.content,
        documentId: r.documentId,
        chunkIndex: r.chunkIndex,
        pageNumber: r.pageNumber,
        sectionTitle: r.sectionTitle,
        vectorScore: r.vectorScore,
        lexicalScore: lexicalById.get(r.id) ?? 0,
        relevanceScore: 0,
      });
    }
    for (const r of lexicalRows) {
      const existing = merged.get(r.id);
      const lex = lexicalById.get(r.id) ?? 0;
      if (existing) {
        existing.lexicalScore = Math.max(existing.lexicalScore ?? 0, lex);
      } else {
        merged.set(r.id, {
          id: r.id,
          content: r.content,
          documentId: r.documentId,
          chunkIndex: r.chunkIndex,
          pageNumber: r.pageNumber,
          sectionTitle: r.sectionTitle,
          vectorScore: 0,
          lexicalScore: lex,
          relevanceScore: 0,
        });
      }
    }

    const alphaClamped = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 0.7;
    const mergedList = Array.from(merged.values()).map(c => {
      const v = c.vectorScore ?? 0;
      const l = c.lexicalScore ?? 0;
      const score = alphaClamped * v + (1 - alphaClamped) * l;
      return { ...c, relevanceScore: Math.max(0, Math.min(1, score)) };
    });

    mergedList.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // 3.5) MMR diversification (reduces redundant chunks, better coverage)
    const diversified = enableMmr
      ? this.mmrService.select(mergedList.slice(0, mmrCandidates), limit, mmrLambda)
      : mergedList.slice(0, limit);

    // 4) Optional rerank (best practice for quality)
    if (enableRerank) {
      const top = diversified.slice(0, rerankCandidates);
      const reranked = await this.rerankService.rerank(query, top);
      return reranked.slice(0, limit);
    }

    return diversified.slice(0, limit);
  }
}
