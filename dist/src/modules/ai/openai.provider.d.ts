import { AIProvider } from './ai.provider.interface';
export declare class OpenAIProvider implements AIProvider {
    private readonly apiKey;
    constructor();
    generateText(prompt: string): Promise<string>;
    generateStructured(prompt: string, schema: any): Promise<any>;
}
