import { NextResponse } from "next/server";
import { analyzeResumeText } from "@/src/services/pathverse-intelligence";

interface ResumeRequest {
  readonly resumeText?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ResumeRequest;
  const resumeText = body.resumeText?.trim();

  if (!resumeText || resumeText.length < 40) {
    return NextResponse.json({ error: "Resume text must contain at least 40 characters." }, { status: 400 });
  }

  return NextResponse.json(analyzeResumeText(resumeText));
}
