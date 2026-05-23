import type { GridPosition } from "../core/types"

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))
const clampRange = (min: number, max: number, value: number): number => Math.max(min, Math.min(max, value))

// ── Types ────────────────────────────────────────────────────────────────────

export type CameraMode = "tactical" | "focus" | "replay" | "orbit" | "flyover" | "dramatic"
export type EasingFunction = (t: number) => number

export interface CameraKeyframe {
  readonly x: number
  readonly y: number
  readonly zoom: number
  readonly rotation: number
  readonly duration: number
}

export interface CameraSequence {
  readonly id: string
  readonly keyframes: readonly CameraKeyframe[]
  readonly loop: boolean
}

export interface CameraState {
  readonly x: number
  readonly y: number
  readonly zoom: number
  readonly targetZoom: number
  readonly rotation: number
  readonly mode: CameraMode
  readonly shake: number
  readonly focusTarget?: GridPosition
  readonly sequenceProgress?: number
}

// ── Easing Functions ─────────────────────────────────────────────────────────

export const easeInOutCubic: EasingFunction = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export const easeOutElastic: EasingFunction = (t: number): number => {
  if (t === 0 || t === 1) return t
  const c4 = (2 * Math.PI) / 3
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}

export const easeInOutQuart: EasingFunction = (t: number): number => {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
}

// ── Cinematic Camera Controller ──────────────────────────────────────────────

export class CinematicCameraController {
  private state: CameraState = {
    x: 0, y: 0, zoom: 1, targetZoom: 1, rotation: 0, mode: "tactical", shake: 0
  }

  private sequence: CameraSequence | undefined = undefined
  private sequenceStartTime = 0
  private sequenceKeyframeIndex = 0

  private orbitAngle = 0
  private orbitCenter: GridPosition = { x: 0, y: 0 }
  private orbitRadius = 12
  private orbitSpeed = 0.4

  private readonly shakeDecay = 0.92
  private targetX = 0
  private targetY = 0
  private targetRotation = 0

  focus(position: GridPosition, zoom = 1.35): CameraState {
    this.targetX = position.x
    this.targetY = position.y
    this.state = {
      ...this.state,
      targetZoom: zoom,
      mode: "focus",
      focusTarget: position
    }
    return this.state
  }

  tactical(): CameraState {
    this.targetX = 0
    this.targetY = 0
    this.targetRotation = 0
    this.state = {
      ...this.state,
      targetZoom: 0.82,
      mode: "tactical",
      focusTarget: undefined,
      sequenceProgress: undefined
    }
    return this.state
  }

  orbit(center: GridPosition, radius = 12, speed = 0.4): CameraState {
    this.orbitAngle = 0
    this.orbitCenter = center
    this.orbitRadius = radius
    this.orbitSpeed = speed
    this.targetX = center.x + radius
    this.targetY = center.y
    this.state = {
      ...this.state,
      targetZoom: 1.1,
      mode: "orbit",
      focusTarget: center
    }
    return this.state
  }

  flyover(seq: CameraSequence): CameraState {
    this.sequence = seq
    this.sequenceStartTime = 0
    this.sequenceKeyframeIndex = 0
    const first = seq.keyframes[0]
    if (first) {
      this.targetX = first.x
      this.targetY = first.y
      this.targetRotation = first.rotation
      this.state = {
        ...this.state,
        targetZoom: first.zoom,
        mode: "flyover",
        sequenceProgress: 0,
        focusTarget: undefined
      }
    } else {
      this.state = { ...this.state, mode: "flyover", sequenceProgress: 0 }
    }
    return this.state
  }

  dramatic(position: GridPosition, shakeIntensity = 0.6): CameraState {
    this.targetX = position.x
    this.targetY = position.y
    this.state = {
      ...this.state,
      targetZoom: 1.8,
      mode: "dramatic",
      shake: clamp01(shakeIntensity),
      focusTarget: position
    }
    return this.state
  }

  replay(): CameraState {
    this.state = {
      ...this.state,
      targetZoom: 1.0,
      mode: "replay",
      focusTarget: undefined,
      sequenceProgress: undefined
    }
    return this.state
  }

  triggerShake(intensity: number): void {
    this.state = { ...this.state, shake: clamp01(intensity) }
  }

  trackFaction(capitalPosition: GridPosition, territorySize: number): CameraState {
    const zoom = clampRange(0.6, 1.8, 1.4 - territorySize * 0.008)
    this.targetX = capitalPosition.x
    this.targetY = capitalPosition.y
    this.state = {
      ...this.state,
      targetZoom: zoom,
      mode: "focus",
      focusTarget: capitalPosition
    }
    return this.state
  }

  update(deltaMs: number): CameraState {
    const lerpT = Math.min(1, deltaMs / 280)

    // ── Mode-specific pre-lerp logic ──
    if (this.state.mode === "orbit") {
      this.orbitAngle += this.orbitSpeed * deltaMs / 1000
      this.targetX = this.orbitCenter.x + Math.cos(this.orbitAngle) * this.orbitRadius
      this.targetY = this.orbitCenter.y + Math.sin(this.orbitAngle) * this.orbitRadius
    }

    if (this.state.mode === "flyover" && this.sequence) {
      this.sequenceStartTime += deltaMs
      this.advanceSequence()
    }

    if (this.state.mode === "dramatic" && this.state.shake < 0.05) {
      this.tactical()
      return this.state
    }

    // ── Lerp position / zoom / rotation ──
    const nextX = this.state.x + (this.targetX - this.state.x) * lerpT
    const nextY = this.state.y + (this.targetY - this.state.y) * lerpT
    const nextZoom = this.state.zoom + (this.state.targetZoom - this.state.zoom) * lerpT
    const nextRotation = this.state.rotation + (this.targetRotation - this.state.rotation) * lerpT

    // ── Shake decay ──
    const nextShake = this.state.shake * this.shakeDecay

    this.state = {
      ...this.state,
      x: nextX,
      y: nextY,
      zoom: nextZoom,
      rotation: nextRotation,
      shake: nextShake < 0.001 ? 0 : nextShake
    }
    return this.state
  }

  snapshot(): CameraState {
    return this.state
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private advanceSequence(): void {
    const seq = this.sequence
    if (!seq || seq.keyframes.length === 0) return

    const keyframes = seq.keyframes
    let elapsed = this.sequenceStartTime
    let idx = 0

    // Walk through keyframes to find the current one
    while (idx < keyframes.length - 1 && elapsed > keyframes[idx].duration) {
      elapsed -= keyframes[idx].duration
      idx++
    }

    // Compute total duration for progress tracking
    let totalDuration = 0
    for (let i = 0; i < keyframes.length; i++) {
      totalDuration += keyframes[i].duration
    }

    if (idx >= keyframes.length - 1) {
      // Reached or passed last keyframe
      if (seq.loop) {
        this.sequenceStartTime = elapsed
        this.sequenceKeyframeIndex = 0
        return
      }
      // Done — snap to last keyframe and switch to tactical
      const last = keyframes[keyframes.length - 1]
      this.targetX = last.x
      this.targetY = last.y
      this.targetRotation = last.rotation
      this.state = {
        ...this.state,
        targetZoom: last.zoom,
        sequenceProgress: 1
      }
      this.sequence = undefined
      this.tactical()
      return
    }

    this.sequenceKeyframeIndex = idx
    const current = keyframes[idx]
    const next = keyframes[idx + 1]
    const t = easeInOutCubic(clamp01(elapsed / current.duration))

    this.targetX = current.x + (next.x - current.x) * t
    this.targetY = current.y + (next.y - current.y) * t
    this.targetRotation = current.rotation + (next.rotation - current.rotation) * t
    this.state = {
      ...this.state,
      targetZoom: current.zoom + (next.zoom - current.zoom) * t,
      sequenceProgress: clamp01(this.sequenceStartTime / (totalDuration || 1))
    }
  }
}
