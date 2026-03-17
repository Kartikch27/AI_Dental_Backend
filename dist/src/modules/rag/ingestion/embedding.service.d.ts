export declare class EmbeddingService {
    private openai;
    constructor();
    generateEmbedding(text: string): Promise<number[]>;
}
