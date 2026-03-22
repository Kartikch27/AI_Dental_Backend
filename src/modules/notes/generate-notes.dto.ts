import { GenerationType } from '@prisma/client';

/**
 * Accepted style values and their aliases.
 * Users can send either the full enum name or any of the listed aliases.
 */
const STYLE_ALIASES: Record<string, GenerationType> = {
  // Canonical values
  EXAM_NOTES:           GenerationType.EXAM_NOTES,
  QUICK_NOTES:          GenerationType.QUICK_NOTES,
  DETAILED_EXPLANATION: GenerationType.DETAILED_EXPLANATION,
  BULLET_REVISION:      GenerationType.BULLET_REVISION,
  TEST_PAPER:           GenerationType.TEST_PAPER,
  SUMMARY:              GenerationType.SUMMARY,

  // Common short-hand aliases
  EXAM:                 GenerationType.EXAM_NOTES,
  QUICK:                GenerationType.QUICK_NOTES,
  DETAILED:             GenerationType.DETAILED_EXPLANATION,
  DETAIL:               GenerationType.DETAILED_EXPLANATION,
  BULLET:               GenerationType.BULLET_REVISION,
  BULLETS:              GenerationType.BULLET_REVISION,
  BULLET_POINTS:        GenerationType.BULLET_REVISION,
  BULLETPOINTS:         GenerationType.BULLET_REVISION,
  REVISION:             GenerationType.BULLET_REVISION,
  TEST:                 GenerationType.TEST_PAPER,
  PAPER:                GenerationType.TEST_PAPER,
  NOTES:                GenerationType.EXAM_NOTES,
  SHORT:                GenerationType.QUICK_NOTES,
};

export function resolveGenerationType(raw: string | undefined): GenerationType {
  if (!raw) {
    return GenerationType.SUMMARY;
  }
  const key = raw.trim().toUpperCase().replace(/[- ]/g, '_');
  const resolved = STYLE_ALIASES[key];
  if (!resolved) {
    const valid = Object.keys(STYLE_ALIASES)
      .filter(k => GenerationType[k as keyof typeof GenerationType])
      .join(', ');
    throw new Error(
      `Invalid style "${raw}". Valid values: ${valid}`,
    );
  }
  return resolved;
}
