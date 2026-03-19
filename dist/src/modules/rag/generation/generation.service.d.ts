import { RetrievalService } from '../retrieval/retrieval.service';
export declare class GenerationService {
    private retrievalService;
    private readonly logger;
    private genai;
    constructor(retrievalService: RetrievalService);
    generateResponse(query: string, scope?: {
        nodeId?: string;
        yearId?: string;
        subjectId?: string;
        chapterId?: string;
        conceptId?: string;
    }, history?: {
        role: 'user' | 'assistant';
        content: string;
    }[]): Promise<AsyncGenerator<import("@google/genai", { with: { "resolution-mode": "import" } }).GenerateContentResponse, any, any>>;
}
