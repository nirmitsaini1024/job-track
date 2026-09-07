import { getOpenRouterModel } from "./models";

export class AiError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "timeout"
      | "rate_limit"
      | "invalid"
      | "config"
      | "empty"
      | "unknown" = "unknown",
  ) {
    super(message);
    this.name = "AiError";
  }
}

export type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: ChatContent;
};

type OpenRouterResponse = {
  error?: { message?: string; code?: number | string };
  choices?: Array<{
    message?: { content?: string | Array<{ type?: string; text?: string }> };
  }>;
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 60_000;

export async function completeJson(params: {
  messages: ChatMessage[];
  jsonSchema: Record<string, unknown>;
  schemaName: string;
}): Promise<unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new AiError("OPENROUTER_API_KEY is not configured.", "config");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "http://localhost:3000",
        "X-Title": "Job Application Tracker",
      },
      body: JSON.stringify({
        model: getOpenRouterModel(),
        messages: params.messages,
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: params.schemaName,
            strict: true,
            schema: params.jsonSchema,
          },
        },
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new AiError(
        "The AI provider is rate limited. Try again shortly.",
        "rate_limit",
      );
    }

    const bodyText = await response.text();

    if (!response.ok) {
      const providerMessage = extractProviderMessage(bodyText);

      if (response.status === 401) {
        throw new AiError(
          "OpenRouter rejected the API key. Check OPENROUTER_API_KEY in .env and restart the dev server.",
          "config",
        );
      }

      if (response.status === 403) {
        throw new AiError(
          providerMessage ||
            "OpenRouter denied this request. Verify your key permissions, account credits, and model access.",
          "config",
        );
      }

      throw new AiError(
        providerMessage ||
          `AI request failed (${response.status}). ${bodyText.slice(0, 180)}`,
        response.status >= 400 && response.status < 500 ? "invalid" : "unknown",
      );
    }

    let data: OpenRouterResponse;
    try {
      data = JSON.parse(bodyText) as OpenRouterResponse;
    } catch {
      throw new AiError("The AI returned an invalid response.", "invalid");
    }

    if (data.error?.message) {
      throw new AiError(data.error.message, "unknown");
    }

    const raw: MessageContent = data.choices?.[0]?.message?.content;
    const text = normalizeContent(raw);
    if (!text) {
      throw new AiError("The AI returned an empty response.", "invalid");
    }

    return parseJson(text);
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiError("The AI request timed out.", "timeout");
    }
    throw new AiError("Unable to reach the AI provider.", "unknown");
  } finally {
    clearTimeout(timeout);
  }
}

type MessageContent =
  | string
  | Array<{ type?: string; text?: string }>
  | undefined;

function normalizeContent(content: MessageContent): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("\n");
  }
  return "";
}

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced?.[1]?.trim() ?? trimmed;
  try {
    return JSON.parse(payload);
  } catch {
    throw new AiError("The AI returned invalid JSON.", "invalid");
  }
}

function extractProviderMessage(bodyText: string): string | null {
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: {
        message?: string;
        metadata?: { raw?: string };
      };
    };
    if (parsed.error?.message) {
      const raw = parsed.error.metadata?.raw;
      if (raw) {
        try {
          const nested = JSON.parse(raw) as { error?: { message?: string } };
          if (nested.error?.message) {
            return nested.error.message;
          }
        } catch {
          // ignore nested parse failures
        }
      }
      return parsed.error.message;
    }
  } catch {
    // ignore
  }
  return null;
}
