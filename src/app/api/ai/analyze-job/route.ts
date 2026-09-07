import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeJob, AiError } from "@/lib/ai";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

const textSchema = z.object({
  text: z.string().optional(),
  source: z.string().optional(),
  applicationUrl: z.string().optional(),
});

function userFacingAiError(error: unknown) {
  if (
    error instanceof AiError &&
    (error.code === "empty" ||
      error.code === "config" ||
      error.code === "invalid" ||
      error.code === "rate_limit" ||
      error.code === "timeout")
  ) {
    return error.message;
  }
  return "Unable to analyze this job. Please try again or enter the details manually.";
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const text = String(form.get("text") ?? "");
      const source = String(form.get("source") ?? "") || undefined;
      const applicationUrl = String(form.get("applicationUrl") ?? "") || undefined;
      const file = form.get("image");

      let image: { mimeType: string; base64: string } | undefined;
      if (file instanceof File && file.size > 0) {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
          return NextResponse.json(
            { error: "Upload a JPEG, PNG, WebP, or GIF image." },
            { status: 400 },
          );
        }
        if (file.size > MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: "Image must be 5MB or smaller." },
            { status: 400 },
          );
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        image = { mimeType: file.type, base64: buffer.toString("base64") };
      }

      const result = await analyzeJob({ text, source, applicationUrl, image });
      return NextResponse.json({ data: result });
    }

    const json = textSchema.parse(await request.json());
    const result = await analyzeJob(json);
    return NextResponse.json({ data: result });
  } catch (error) {
    const status = error instanceof AiError && error.code === "empty" ? 400 : 500;
    return NextResponse.json({ error: userFacingAiError(error) }, { status });
  }
}
