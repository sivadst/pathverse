import { NextResponse } from "next/server";
import { defaultGrowthProfile, generateRoadmap } from "@/src/services/pathverse-intelligence";
import type { CareerTrackId } from "@/src/types/product";

const tracks = new Set<CareerTrackId>([
  "ai-product-architect",
  "full-stack-ai",
  "growth-systems",
  "creative-technologist"
]);

interface RoadmapRequest {
  readonly track?: CareerTrackId;
}

export async function POST(request: Request) {
  const body = (await request.json()) as RoadmapRequest;
  const track = body.track && tracks.has(body.track) ? body.track : defaultGrowthProfile.targetTrack;

  return NextResponse.json({
    track,
    milestones: generateRoadmap(track, defaultGrowthProfile.skills)
  });
}
