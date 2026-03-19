"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRouter = void 0;
const common_1 = require("@nestjs/common");
function isRetryableProviderError(err) {
    if (err instanceof common_1.HttpException) {
        const status = err.getStatus();
        return status === 429 || (status >= 500 && status <= 599);
    }
    const msg = err?.message ? String(err.message) : '';
    return (msg.includes('quota') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('rate limit') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT'));
}
class AIRouter {
    order;
    providers;
    constructor(order, providers) {
        this.order = order;
        this.providers = providers;
    }
    async generateText(prompt, context) {
        let lastErr;
        for (const id of this.order) {
            const provider = this.providers[id];
            if (!provider)
                continue;
            try {
                return await provider.generateText(prompt, context);
            }
            catch (err) {
                lastErr = err;
                if (!isRetryableProviderError(err))
                    throw err;
            }
        }
        throw lastErr ?? new Error('No AI providers available');
    }
    async generateStructured(prompt, schema) {
        let lastErr;
        for (const id of this.order) {
            const provider = this.providers[id];
            if (!provider)
                continue;
            try {
                return await provider.generateStructured(prompt, schema);
            }
            catch (err) {
                lastErr = err;
                if (!isRetryableProviderError(err))
                    throw err;
            }
        }
        throw lastErr ?? new Error('No AI providers available');
    }
}
exports.AIRouter = AIRouter;
//# sourceMappingURL=ai.router.js.map