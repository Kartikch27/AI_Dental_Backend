import { type AIProvider } from '../../ai/ai.provider.interface';
import type { RetrievedChunk } from './retrieval.types';
export declare class RerankService {
    private ai;
    constructor(ai: AIProvider);
    rerank(query: string, candidates: RetrievedChunk[]): Promise<RetrievedChunk[]>;
}
