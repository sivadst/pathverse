import { describe, expect, it } from "vitest";
import { AdaptiveRenderQuality } from "@engine/rendering/render-quality";
import type { TelemetrySnapshot } from "@engine/telemetry/telemetry-engine";

const snapshotWithFrames = (fps: number, renderMs: number, deltaMs: number): TelemetrySnapshot => ({
  frames: Array.from({ length: 90 }, (_, frame) => ({
    frame,
    fps,
    deltaMs,
    renderMs,
    heapMb: 12,
    timestamp: frame
  })),
  algorithms: [],
  averageFps: fps,
  p95FrameMs: deltaMs,
  averageRenderMs: renderMs,
  droppedFrameRatio: deltaMs > 22 ? 1 : 0,
  peakHeapMb: 12
});

describe("AdaptiveRenderQuality", () => {
  it("keeps cinematic effects when frames are stable", () => {
    const quality = new AdaptiveRenderQuality();

    expect(quality.evaluate(snapshotWithFrames(60, 2.4, 16.2)).mode).toBe("cinematic");
  });

  it("drops to performance mode on sustained slow frames", () => {
    const quality = new AdaptiveRenderQuality();

    expect(quality.evaluate(snapshotWithFrames(42, 12, 27)).mode).toBe("performance");
  });
});
