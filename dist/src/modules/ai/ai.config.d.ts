export type AIProviderId = 'groq' | 'anthropic' | 'gemini' | 'openai' | 'mock';
export declare const AI_PROVIDER_LABELS: ReadonlyArray<{
    index: 0 | 1 | 2 | 3 | 4;
    id: AIProviderId;
    envKey?: string;
}>;
export declare function parseProviderList(value: string | undefined): AIProviderId[];
export declare function getAiProviderOrder(): AIProviderId[];
