export type AIProviderId = 'groq' | 'anthropic' | 'gemini' | 'openai' | 'mock';

/**
 * Provider labels (use either the id or the numeric label in .env):
 * - 0 = groq
 * - 1 = anthropic
 * - 2 = gemini
 * - 3 = openai
 * - 4 = mock
 */
export const AI_PROVIDER_LABELS: ReadonlyArray<{
  index: 0 | 1 | 2 | 3 | 4;
  id: AIProviderId;
  envKey?: string;
}> = [
  { index: 0, id: 'groq', envKey: 'GROQ_API_KEY' },
  { index: 1, id: 'anthropic', envKey: 'ANTHROPIC_API_KEY' },
  { index: 2, id: 'gemini', envKey: 'GEMINI_API_KEY' },
  { index: 3, id: 'openai', envKey: 'OPENAI_API_KEY' },
  { index: 4, id: 'mock' },
] as const;

const PROVIDER_ID_BY_INDEX = new Map<string, AIProviderId>(
  AI_PROVIDER_LABELS.map(p => [String(p.index), p.id]),
);

function parseProviderToken(token: string): AIProviderId | null {
  const t = token.trim().toLowerCase();
  if (!t) return null;

  if (/^\d+$/.test(t)) {
    return PROVIDER_ID_BY_INDEX.get(t) ?? null;
  }

  if (
    t === 'groq' ||
    t === 'anthropic' ||
    t === 'gemini' ||
    t === 'openai' ||
    t === 'mock'
  ) {
    return t;
  }

  return null;
}

export function parseProviderList(value: string | undefined): AIProviderId[] {
  if (!value) return [];
  return value
    .split(',')
    .map(parseProviderToken)
    .filter((v): v is AIProviderId => Boolean(v));
}

export function getAiProviderOrder(): AIProviderId[] {
  const primaryRaw = (process.env.AI_PRIMARY_PROVIDER || '').trim();
  const fallbacks = parseProviderList(process.env.AI_FALLBACK_PROVIDERS);

  const inferredPrimary: AIProviderId | null = (() => {
    const parsedPrimary = parseProviderToken(primaryRaw);
    if (parsedPrimary) return parsedPrimary;

    // Infer from env keys in label order (0..4)
    for (const p of AI_PROVIDER_LABELS) {
      if (!p.envKey) continue;
      if (process.env[p.envKey]) return p.id;
    }

    return 'mock';
  })();

  const order = [inferredPrimary, ...fallbacks].filter(Boolean) as AIProviderId[];

  // Ensure uniqueness, preserve order, and always have a safe fallback.
  const unique = Array.from(new Set(order));
  if (!unique.includes('mock')) unique.push('mock');
  return unique;
}

