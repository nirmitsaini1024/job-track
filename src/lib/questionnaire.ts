/**
 * Normalize question text so near-duplicates collapse to one bank entry.
 * Strips optional tags, asterisks, and parenthetical hints like "(attach links)".
 */
export function normalizeQuestionKey(question: string) {
  return question
    .toLowerCase()
    .replace(/^\s*\[?\s*optional\s*\]?\s*-?\s*/gi, "")
    .replace(/\[?\s*optional\s*\]?/gi, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[*_]+/g, " ")
    .replace(/[“”"']/g, "")
    .replace(/[^a-z0-9?\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean display wording: drop optional markers, keep useful parentheticals. */
export function cleanQuestionWording(question: string) {
  return question
    .replace(/^\s*\[?\s*optional\s*\]?\s*-?\s*/gi, "")
    .replace(/\s*\[?\s*optional\s*\]?/gi, "")
    .replace(/\s*\*\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\?/g, "?")
    .trim();
}

/** Prefer the richest wording when merging similar questions. */
export function pickCanonicalQuestion(...candidates: string[]) {
  const cleaned = [...candidates]
    .map((q) => cleanQuestionWording(q))
    .filter(Boolean);

  return cleaned.sort((a, b) => {
    const score = (value: string) =>
      value.length +
      (/github|website|app links|words max|attach/i.test(value) ? 40 : 0);
    return score(b) - score(a);
  })[0];
}
