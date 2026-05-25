export type AudioBus = "ambience" | "tactical" | "neural" | "convergence" | "alert"

export interface AudioTrigger {
  readonly id: string
  readonly bus: AudioBus
  readonly event: string
  readonly intensity: number
  readonly priority: number
  readonly timestamp: number
}

export interface AudioBusState {
  readonly bus: AudioBus
  readonly volume: number
  readonly active: boolean
}

export interface AudioReactiveSnapshot {
  readonly masterVolume: number
  readonly buses: readonly AudioBusState[]
  readonly activeTriggers: readonly AudioTrigger[]
  readonly neuralResonance: number
  readonly civilizationTension: number
  readonly timelineInstability: number
  readonly reactivePulse: number
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

const ALL_BUSES: readonly AudioBus[] = ["ambience", "tactical", "neural", "convergence", "alert"]

const INITIAL_BUS_VOLUMES: Readonly<Record<AudioBus, number>> = {
  ambience: 0.3,
  tactical: 0.15,
  neural: 0.2,
  convergence: 0.25,
  alert: 0.4
}

const TRIGGER_LIFETIME_MS = 3000
const MAX_TRIGGERS = 16

export class AudioReactiveEngine {
  private audioContext: AudioContext | undefined = undefined
  private masterGain: GainNode | undefined = undefined
  private readonly busGains: Map<AudioBus, GainNode> = new Map()
  private readonly oscillators: Map<string, OscillatorNode> = new Map()
  private readonly filters: Map<string, BiquadFilterNode> = new Map()
  private activeTriggers: AudioTrigger[] = []
  private triggerIdCounter = 0
  private initialized = false
  private muted = false
  private storedVolume = 1
  private neuralResonance = 0
  private civilizationTension = 0
  private timelineInstability = 0
  private ambiencePhase = 0
  private readonly MAX_OSCILLATORS = 8

  initialize(): boolean {
    if (this.initialized) return true
    const ContextClass = typeof AudioContext !== "undefined"
      ? AudioContext
      : typeof (globalThis as Record<string, unknown>)["webkitAudioContext"] !== "undefined"
        ? (globalThis as Record<string, unknown>)["webkitAudioContext"] as typeof AudioContext
        : undefined
    if (!ContextClass) return false

    this.audioContext = new ContextClass()
    this.masterGain = this.audioContext.createGain()
    this.masterGain.gain.value = 1
    this.masterGain.connect(this.audioContext.destination)

    for (const bus of ALL_BUSES) {
      const gain = this.audioContext.createGain()
      gain.gain.value = INITIAL_BUS_VOLUMES[bus]
      gain.connect(this.masterGain)
      this.busGains.set(bus, gain)
    }

    this.startAmbientDrones()
    this.initialized = true
    return true
  }

  react(
    neuralConfidence: number,
    neuralConvergence: number,
    strategicTension: number,
    convergenceScore: number,
    conflictIndex: number
  ): void {
    if (!this.audioContext || !this.initialized) return

    this.neuralResonance = clamp01((neuralConfidence + neuralConvergence) / 2)
    this.civilizationTension = clamp01((strategicTension + conflictIndex) / 2)
    this.timelineInstability = clamp01(1 - convergenceScore)
    this.ambiencePhase = (this.ambiencePhase + 0.01) % 1

    const droneFilter = this.filters.get("ambient-lowpass")
    if (droneFilter) {
      droneFilter.frequency.setTargetAtTime(
        200 + this.civilizationTension * 600,
        this.audioContext.currentTime,
        0.3
      )
    }

    const ambienceBus = this.busGains.get("ambience")
    if (ambienceBus) {
      ambienceBus.gain.setTargetAtTime(
        0.15 + this.neuralResonance * 0.2,
        this.audioContext.currentTime,
        0.5
      )
    }

    if (this.civilizationTension > 0.6 && !this.oscillators.has("tactical-hum")) {
      this.spawnTacticalHum()
    } else if (this.civilizationTension <= 0.6 && this.oscillators.has("tactical-hum")) {
      this.removeOscillator("tactical-hum")
      this.removeOscillator("tactical-lfo")
    }

    if (convergenceScore > 0.7 && !this.oscillators.has("convergence-rise")) {
      this.spawnConvergenceRise()
    } else if (convergenceScore <= 0.7 && this.oscillators.has("convergence-rise")) {
      this.removeOscillator("convergence-rise")
    }

    if (this.neuralResonance > 0.5 && !this.oscillators.has("neural-fm-carrier")) {
      this.spawnNeuralFmPulse()
    } else if (this.neuralResonance <= 0.5 && this.oscillators.has("neural-fm-carrier")) {
      this.removeOscillator("neural-fm-carrier")
      this.removeOscillator("neural-fm-mod")
    }

    const now = Date.now()
    this.activeTriggers = this.activeTriggers.filter((t) => now - t.timestamp < TRIGGER_LIFETIME_MS)
  }

  triggerEvent(bus: AudioBus, event: string, intensity: number, priority = 5): void {
    if (!this.initialized || this.muted || !this.audioContext) return

    this.triggerIdCounter += 1
    const trigger: AudioTrigger = {
      id: `trigger-${this.triggerIdCounter}`,
      bus,
      event,
      intensity: clamp01(intensity),
      priority,
      timestamp: Date.now()
    }

    this.activeTriggers.push(trigger)
    if (this.activeTriggers.length > MAX_TRIGGERS) {
      this.activeTriggers.sort((a, b) => b.priority - a.priority)
      this.activeTriggers = this.activeTriggers.slice(0, MAX_TRIGGERS)
    }

    const busGain = this.busGains.get(bus)
    if (!busGain) return
    const ctx = this.audioContext
    const now = ctx.currentTime

    switch (bus) {
      case "alert":
        this.spawnAlertBurst(ctx, busGain, now, trigger.intensity)
        break
      case "tactical":
        this.spawnTacticalPulse(ctx, busGain, now, trigger.intensity)
        break
      case "neural":
        this.spawnNeuralBlip(ctx, busGain, now)
        break
      case "convergence":
        this.spawnConvergenceSweep(ctx, busGain, now)
        break
      case "ambience":
        if (busGain) {
          busGain.gain.setTargetAtTime(
            clamp01(INITIAL_BUS_VOLUMES.ambience + trigger.intensity * 0.15),
            now, 0.2
          )
        }
        break
    }
  }

  setMasterVolume(volume: number): void {
    this.storedVolume = clamp01(volume)
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.value = this.storedVolume
    }
  }

  setBusVolume(bus: AudioBus, volume: number): void {
    const gain = this.busGains.get(bus)
    if (gain) gain.gain.value = clamp01(volume)
  }

  mute(): void {
    this.muted = true
    if (this.masterGain) this.masterGain.gain.value = 0
  }

  unmute(): void {
    this.muted = false
    if (this.masterGain) this.masterGain.gain.value = this.storedVolume
  }

  snapshot(): AudioReactiveSnapshot {
    const buses: readonly AudioBusState[] = ALL_BUSES.map((bus) => {
      const gain = this.busGains.get(bus)
      return { bus, volume: gain?.gain.value ?? 0, active: gain !== undefined }
    })
    const pulse = clamp01(
      this.neuralResonance * 0.4 + this.civilizationTension * 0.3 + this.timelineInstability * 0.3
    )
    return {
      masterVolume: this.muted ? 0 : this.storedVolume,
      buses,
      activeTriggers: [...this.activeTriggers],
      neuralResonance: this.neuralResonance,
      civilizationTension: this.civilizationTension,
      timelineInstability: this.timelineInstability,
      reactivePulse: pulse
    }
  }

  destroy(): void {
    for (const [key, osc] of this.oscillators) {
      try { osc.stop() } catch { /* already stopped */ }
      try { osc.disconnect() } catch { /* already disconnected */ }
      this.oscillators.delete(key)
    }
    for (const [key, filter] of this.filters) {
      try { filter.disconnect() } catch { /* already disconnected */ }
      this.filters.delete(key)
    }
    this.busGains.clear()
    if (this.audioContext) {
      void this.audioContext.close()
      this.audioContext = undefined
    }
    this.masterGain = undefined
    this.initialized = false
    this.activeTriggers = []
  }

  // ─── ambient drone layer ────────────────────────────────────────────

  private startAmbientDrones(): void {
    const ctx = this.audioContext
    const busGain = this.busGains.get("ambience")
    if (!ctx || !busGain) return

    // Drone 1: 55Hz sine through lowpass at 200Hz
    const lp = ctx.createBiquadFilter()
    lp.type = "lowpass"
    lp.frequency.value = 200
    lp.Q.value = 1
    this.filters.set("ambient-lowpass", lp)

    const drone1 = ctx.createOscillator()
    drone1.type = "sine"
    drone1.frequency.value = 55
    const drone1Gain = ctx.createGain()
    drone1Gain.gain.value = 0.1
    drone1.connect(drone1Gain).connect(lp).connect(busGain)
    drone1.start()
    this.oscillators.set("ambient-drone-1", drone1)

    // Drone 2: 82.5Hz sawtooth through bandpass at 165Hz
    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 165
    bp.Q.value = 2
    this.filters.set("ambient-bandpass", bp)

    const drone2 = ctx.createOscillator()
    drone2.type = "sawtooth"
    drone2.frequency.value = 82.5
    const drone2Gain = ctx.createGain()
    drone2Gain.gain.value = 0.08
    drone2.connect(drone2Gain).connect(bp).connect(busGain)
    drone2.start()
    this.oscillators.set("ambient-drone-2", drone2)

    // Drone 3: 110Hz triangle for harmonic depth
    const drone3 = ctx.createOscillator()
    drone3.type = "triangle"
    drone3.frequency.value = 110
    const drone3Gain = ctx.createGain()
    drone3Gain.gain.value = 0.04
    drone3.connect(drone3Gain).connect(busGain)
    drone3.start()
    this.oscillators.set("ambient-drone-3", drone3)
  }

  // ─── reactive layers ────────────────────────────────────────────────

  private spawnTacticalHum(): void {
    const ctx = this.audioContext
    const busGain = this.busGains.get("tactical")
    if (!ctx || !busGain) return
    if (!this.canSpawnOscillator()) this.evictOldestNonAmbience()

    const humGain = ctx.createGain()
    humGain.gain.value = 0.12

    // LFO modulating the hum gain for pulsing effect
    const lfo = ctx.createOscillator()
    lfo.type = "sine"
    lfo.frequency.value = 1.5
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.06
    lfo.connect(lfoGain).connect(humGain.gain)
    lfo.start()
    this.oscillators.set("tactical-lfo", lfo)

    const hum = ctx.createOscillator()
    hum.type = "sine"
    hum.frequency.value = 40
    hum.connect(humGain).connect(busGain)
    hum.start()
    this.oscillators.set("tactical-hum", hum)
  }

  private spawnConvergenceRise(): void {
    const ctx = this.audioContext
    const busGain = this.busGains.get("convergence")
    if (!ctx || !busGain) return
    if (!this.canSpawnOscillator()) this.evictOldestNonAmbience()

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = 220
    osc.detune.setValueAtTime(0, ctx.currentTime)
    osc.detune.linearRampToValueAtTime(100, ctx.currentTime + 4)

    const gain = ctx.createGain()
    gain.gain.value = 0.07
    osc.connect(gain).connect(busGain)
    osc.start()
    this.oscillators.set("convergence-rise", osc)
  }

  private spawnNeuralFmPulse(): void {
    const ctx = this.audioContext
    const busGain = this.busGains.get("neural")
    if (!ctx || !busGain) return
    if (!this.canSpawnOscillator()) this.evictOldestNonAmbience()

    // FM synthesis: modulator at 5Hz modulates carrier at 440Hz
    const modulator = ctx.createOscillator()
    modulator.type = "sine"
    modulator.frequency.value = 5
    const modGain = ctx.createGain()
    modGain.gain.value = 30

    const carrier = ctx.createOscillator()
    carrier.type = "sine"
    carrier.frequency.value = 440

    modulator.connect(modGain).connect(carrier.frequency)

    const carrierGain = ctx.createGain()
    carrierGain.gain.value = 0.05
    carrier.connect(carrierGain).connect(busGain)

    modulator.start()
    carrier.start()
    this.oscillators.set("neural-fm-mod", modulator)
    this.oscillators.set("neural-fm-carrier", carrier)
  }

  // ─── one-shot event bursts ──────────────────────────────────────────

  private spawnAlertBurst(ctx: AudioContext, busGain: GainNode, now: number, intensity: number): void {
    if (!this.canSpawnOscillator()) this.evictOldestNonAmbience()

    const bp = ctx.createBiquadFilter()
    bp.type = "bandpass"
    bp.frequency.value = 880
    bp.Q.value = 3

    const osc = ctx.createOscillator()
    osc.type = "square"
    osc.frequency.value = 880

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, now)
    env.gain.linearRampToValueAtTime(clamp01(intensity * 0.3), now + 0.01)
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.21)

    const id = `alert-${this.triggerIdCounter}`
    osc.connect(bp).connect(env).connect(busGain)
    osc.start(now)
    osc.stop(now + 0.51)
    this.oscillators.set(id, osc)

    setTimeout(() => this.removeOscillator(id), 520)
  }

  private spawnTacticalPulse(ctx: AudioContext, busGain: GainNode, now: number, intensity: number): void {
    if (!this.canSpawnOscillator()) this.evictOldestNonAmbience()

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.value = 60

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, now)
    env.gain.linearRampToValueAtTime(clamp01(intensity * 0.2), now + 0.1)
    env.gain.setValueAtTime(clamp01(intensity * 0.2), now + 0.5)
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.8)

    const id = `tactical-pulse-${this.triggerIdCounter}`
    osc.connect(env).connect(busGain)
    osc.start(now)
    osc.stop(now + 0.85)
    this.oscillators.set(id, osc)

    setTimeout(() => this.removeOscillator(id), 860)
  }

  private spawnNeuralBlip(ctx: AudioContext, busGain: GainNode, now: number): void {
    if (!this.canSpawnOscillator()) this.evictOldestNonAmbience()

    const osc = ctx.createOscillator()
    osc.type = "triangle"
    osc.frequency.value = 660

    const env = ctx.createGain()
    env.gain.setValueAtTime(0, now)
    env.gain.linearRampToValueAtTime(0.08, now + 0.05)
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.15)

    const id = `neural-blip-${this.triggerIdCounter}`
    osc.connect(env).connect(busGain)
    osc.start(now)
    osc.stop(now + 0.2)
    this.oscillators.set(id, osc)

    setTimeout(() => this.removeOscillator(id), 210)
  }

  private spawnConvergenceSweep(ctx: AudioContext, busGain: GainNode, now: number): void {
    if (!this.canSpawnOscillator()) this.evictOldestNonAmbience()

    const osc = ctx.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(330, now)
    osc.frequency.linearRampToValueAtTime(660, now + 0.5)

    const env = ctx.createGain()
    env.gain.setValueAtTime(0.1, now)
    env.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

    const id = `convergence-sweep-${this.triggerIdCounter}`
    osc.connect(env).connect(busGain)
    osc.start(now)
    osc.stop(now + 0.75)
    this.oscillators.set(id, osc)

    setTimeout(() => this.removeOscillator(id), 760)
  }

  // ─── oscillator management ──────────────────────────────────────────

  private canSpawnOscillator(): boolean {
    return this.oscillators.size < this.MAX_OSCILLATORS
  }

  private evictOldestNonAmbience(): void {
    for (const [key, osc] of this.oscillators) {
      if (!key.startsWith("ambient-")) {
        try { osc.stop() } catch { /* already stopped */ }
        try { osc.disconnect() } catch { /* already disconnected */ }
        this.oscillators.delete(key)
        return
      }
    }
  }

  private removeOscillator(key: string): void {
    const osc = this.oscillators.get(key)
    if (osc) {
      try { osc.stop() } catch { /* already stopped */ }
      try { osc.disconnect() } catch { /* already disconnected */ }
      this.oscillators.delete(key)
    }
    const filter = this.filters.get(key)
    if (filter) {
      try { filter.disconnect() } catch { /* already disconnected */ }
      this.filters.delete(key)
    }
  }
}
