import type { GridPosition } from "../core/types";

export interface CameraState {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
  readonly targetZoom: number;
  readonly mode: "tactical" | "focus" | "replay";
}

export class CinematicCameraController {
  private state: CameraState = { x: 0, y: 0, zoom: 1, targetZoom: 1, mode: "tactical" };

  focus(position: GridPosition, zoom = 1.35): CameraState {
    this.state = {
      x: position.x,
      y: position.y,
      zoom: this.state.zoom,
      targetZoom: zoom,
      mode: "focus"
    };
    return this.state;
  }

  tactical(): CameraState {
    this.state = { ...this.state, targetZoom: 0.82, mode: "tactical" };
    return this.state;
  }

  update(deltaMs: number): CameraState {
    const t = Math.min(1, deltaMs / 240);
    this.state = {
      ...this.state,
      zoom: this.state.zoom + (this.state.targetZoom - this.state.zoom) * t
    };
    return this.state;
  }

  snapshot(): CameraState {
    return this.state;
  }
}
