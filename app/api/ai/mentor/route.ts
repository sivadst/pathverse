import { NextResponse } from "next/server";
import { answerMentorPrompt, defaultGrowthProfile } from "@/src/services/pathverse-intelligence";

interface MentorRequest {
  readonly prompt?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as MentorRequest;
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  return NextResponse.json({
    answer: answerMentorPrompt(prompt, defaultGrowthProfile),
    generatedAt: new Date().toISOString()
  });
}
