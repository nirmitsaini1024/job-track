import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeEmail, AiError } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  content: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const data = await analyzeEmail(body);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Paste an email or recruiter response first." },
        { status: 400 },
      );
    }
    if (error instanceof AiError && error.code === "empty") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof AiError && error.code === "config") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      {
        error:
          "Unable to analyze this email. Please try again or update the status manually.",
      },
      { status: 500 },
    );
  }
}
