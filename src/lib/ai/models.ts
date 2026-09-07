export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-5-nano-2025-08-07";

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
}
