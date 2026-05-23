import type { TelemetrySnapshot } from "../telemetry/telemetry-engine";

export type RenderQualityMode = "cinematic" | "balanced" | "performance";

export interface RenderQualityProfile {
  readonly mode: RenderQualityMode;
  readonly maxParticles: number;
  readonly glowStrength: number;
  readonly trailSegments: number;
  readonly effectResolution: number;
  readonly eventBatchLimit: number;
}

const profiles: Record<RenderQualityMode, RenderQualityProfile> = {
  cinematic: {
    mode: "cinematic",
    maxParticles: 900,
    glowStrength: 5,
    trailSegments: 180,
    effectResolution: 0.75,
    eventBatchLimit: 180
  },
  balanced: {
    mode: "balanced",
    maxParticles: 520,
    glowStrength: 3,
    trailSegments: 110,
    effectResolution: 0.55,
    eventBatchLimit: 120
  },
  performance: {
    mode: "performance",
    maxParticles: 240,
    glowStrength: 1.5,
    trailSegments: 64,
    effectResolution: 0.35,
    eventBatchLimit: 72
  }
};

export class AdaptiveRenderQuality {
  private profile: RenderQualityProfile = profiles.cinematic;

  get current(): RenderQualityProfile {
    return this.profile;
  }

  evaluate(snapshot: TelemetrySnapshot): RenderQualityProfile {
    const recent = snapshot.frames.slice(-90);
    if (recent.length < 24) return this.profile;

    const averageFps = recent.reduce((sum, frame) => sum + frame.fps, 0) / recent.length;
    const averageRenderMs = recent.reduce((sum, frame) => sum + frame.renderMs, 0) / recent.length;
    const longFrames = recent.filter((frame) => frame.deltaMs > 22).length / recent.length;

    if (averageFps < 48 || averageRenderMs > 10 || longFrames > 0.24) {
      this.profile = profiles.performance;
    } else if (averageFps < 57 || averageRenderMs > 6 || longFrames > 0.12) {
      this.profile = profiles.balanced;
    } else if (averageFps > 59 && averageRenderMs < 4 && longFrames < 0.05) {
      this.profile = profiles.cinematic;
    }

    return this.profile;
  }
}
