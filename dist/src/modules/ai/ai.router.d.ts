import type { AIProvider } from './ai.provider.interface';
import type { AIProviderId } from './ai.config';
export declare class AIRouter implements AIProvider {
    private readonly order;
    private readonly providers;
    constructor(order: AIProviderId[], providers: Record<AIProviderId, AIProvider>);
    generateText(prompt: string, context?: any): Promise<string>;
    generateStructured(prompt: string, schema: any): Promise<any>;
}
