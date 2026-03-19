import type { RetrievedChunk } from './retrieval.types';
export declare class MmrService {
    select(candidates: RetrievedChunk[], k: number, lambda?: number): RetrievedChunk[];
}
