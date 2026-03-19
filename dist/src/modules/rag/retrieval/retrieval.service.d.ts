import { EmbeddingService } from '../ingestion/embedding.service';
import { LexicalRetrieverService } from './lexical-retriever.service';
import { MmrService } from './mmr.service';
import { RerankService } from './rerank.service';
import type { RagScope, RetrievedChunk } from './retrieval.types';
import { VectorRetrieverService } from './vector-retriever.service';
export declare class RetrievalService {
    private embeddingService;
    private vectorRetriever;
    private lexicalRetriever;
    private rerankService;
    private mmrService;
    constructor(embeddingService: EmbeddingService, vectorRetriever: VectorRetrieverService, lexicalRetriever: LexicalRetrieverService, rerankService: RerankService, mmrService: MmrService);
    private normalize01;
    retrieveRelevantChunks(query: string, scope: RagScope, limit?: number): Promise<RetrievedChunk[]>;
}
