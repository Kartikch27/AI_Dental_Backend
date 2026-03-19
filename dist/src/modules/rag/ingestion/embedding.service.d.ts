export declare class EmbeddingService {
    private genai;
    private openai;
    private provider;
    constructor();
    generateEmbeddingBatch(texts: string[], concurrency?: number): Promise<number[][]>;
    generateEmbedding(text: string, attempt?: number): Promise<number[]>;
}
