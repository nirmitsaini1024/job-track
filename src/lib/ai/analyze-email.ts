import { AiError, completeJson } from "./client";
import { EMAIL_SYSTEM_PROMPT, EMAIL_USER_PROMPT } from "./prompts";
import {
  emailAnalysisJsonSchema,
  emailAnalysisSchema,
  type EmailAnalysis,
} from "./schemas";

export async function analyzeEmail(input: {
  content: string;
}): Promise<EmailAnalysis> {
  const content = input.content.trim();
  if (!content) {
    throw new AiError("Paste an email or recruiter response first.", "empty");
  }

  const raw = await completeJson({
    schemaName: "email_analysis",
    jsonSchema: emailAnalysisJsonSchema as unknown as Record<string, unknown>,
    messages: [
      { role: "system", content: EMAIL_SYSTEM_PROMPT },
      { role: "user", content: `${EMAIL_USER_PROMPT}\n\n${content}` },
    ],
  });

  const parsed = emailAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiError("The AI returned data in an unexpected format.", "invalid");
  }

  return parsed.data;
}
