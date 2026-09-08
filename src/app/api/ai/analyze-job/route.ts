import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserProfile } from "@/db/queries/profiles";
import { analyzeJob, AiError } from "@/lib/ai";
import { buildResumeProfileText } from "@/lib/ai/resume-context";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 180;

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

async function readImages(form: FormData) {
  const images: Array<{ mimeType: string; base64: string }> = [];
  const files = form.getAll("images").concat(form.getAll("image"));

  for (const file of files) {
    if (!(file instanceof File) || file.size <= 0) continue;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      throw new AiError("Upload a JPEG, PNG, WebP, or GIF image.", "invalid");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new AiError("Each image must be 5MB or smaller.", "invalid");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    images.push({ mimeType: file.type, base64: buffer.toString("base64") });
  }

  return images;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const profile = await getUserProfile(session.userId);
    const resumeData = buildResumeProfileText(profile) || null;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const text = String(form.get("text") ?? "");
      const source = String(form.get("source") ?? "") || undefined;
      const applicationUrl = String(form.get("applicationUrl") ?? "") || undefined;
      const images = await readImages(form);

      const result = await analyzeJob({
        text,
        source,
        applicationUrl,
        images,
        resumeData,
      });
      return NextResponse.json({ data: result });
    }

    const json = textSchema.parse(await request.json());
    const result = await analyzeJob({ ...json, resumeData });
    return NextResponse.json({ data: result });
  } catch (error) {
    const status =
      error instanceof AiError &&
      (error.code === "empty" || error.code === "invalid")
        ? 400
        : 500;
    return NextResponse.json({ error: userFacingAiError(error) }, { status });
  }
}
