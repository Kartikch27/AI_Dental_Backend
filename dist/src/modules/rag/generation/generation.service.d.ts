import { RetrievalService } from '../retrieval/retrieval.service';
import type { AIProvider } from '../../ai/ai.provider.interface';
import type { RagScope } from '../retrieval/retrieval.types';
export declare class GenerationService {
    private retrievalService;
    private aiRouter;
    private readonly logger;
    private genai;
    constructor(retrievalService: RetrievalService, aiRouter: AIProvider);
    private buildContext;
    private buildSystemPrompt;
    generateResponse(query: string, scope?: RagScope, history?: {
        role: 'user' | 'assistant';
        content: string;
    }[]): Promise<AsyncGenerator<import("@google/genai", { with: { "resolution-mode": "import" } }).GenerateContentResponse, any, any> | AsyncGenerator<{
        text: string;
    }, void, unknown>>;
    chat(query: string, scope?: RagScope, history?: {
        role: 'user' | 'assistant';
        content: string;
    }[]): Promise<{
        answer: string;
        sources: {
            id: string;
            content: string;
            sectionTitle?: string | null;
            relevanceScore: number;
        }[];
    }>;
}
