import type { AIProvider } from '../ai.provider.interface';
export declare class MockProvider implements AIProvider {
    generateText(prompt: string): Promise<string>;
    generateStructured(prompt: string, schema: any): Promise<any>;
}
