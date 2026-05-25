import type { GridPosition } from "../core/types"
import type { CivilizationSnapshot, CivilizationStrategy } from "./civilization-engine"
import type { WarfareSnapshot, DiplomaticPosture } from "./faction-warfare"

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export type TemporalEventKind =
  | "alliance" | "betrayal" | "war_declared" | "peace_treaty"
  | "expansion" | "collapse" | "research_breakthrough" | "trade_pact"
  | "ideology_shift" | "strategic_pivot" | "epoch_change"

export type EpochMood = "golden_age" | "dark_age" | "expansion" | "stagnation" | "conflict"

export interface TemporalEvent {
  readonly id: string
  readonly tick: number
  readonly kind: TemporalEventKind
  readonly factionIds: readonly string[]
  readonly description: string
  readonly impact: number
  readonly position?: GridPosition
}

export interface IdeologySnapshot {
  readonly factionId: string
  readonly tick: number
  readonly aggression: number
  readonly cooperation: number
  readonly innovation: number
  readonly logistics: number
}

export interface CivilizationEpoch {
  readonly id: string
  readonly startTick: number
  readonly endTick: number
  readonly dominantFaction: string
  readonly keyEvents: readonly string[]
  readonly mood: EpochMood
}

export interface EvolutionTreeNode {
  readonly factionId: string
  readonly epochId: string
  readonly strategyPath: readonly CivilizationStrategy[]
  readonly branchPoint?: number
}

export interface TemporalMemorySnapshot {
  readonly events: readonly TemporalEvent[]
  readonly ideologyTimeline: readonly IdeologySnapshot[]
  readonly epochs: readonly CivilizationEpoch[]
  readonly evolutionTree: readonly EvolutionTreeNode[]
  readonly currentEpoch: CivilizationEpoch
  readonly replayRange: { readonly start: number; readonly end: number }
  readonly totalEvents: number
  readonly currentEpochMood: EpochMood
  readonly betrayalCount: number
  readonly ideologyDriftRate: number
}

const IMPACT: Readonly<Record<TemporalEventKind, number>> = {
  alliance: 0.4, betrayal: -0.8, war_declared: -0.6, peace_treaty: 0.5,
  expansion: 0.3, collapse: -0.5, research_breakthrough: 0.6, trade_pact: 0.35,
  ideology_shift: -0.1, strategic_pivot: 0.0, epoch_change: 0.2
}

const MAJOR_KINDS = new Set<TemporalEventKind>(["alliance", "betrayal", "war_declared", "peace_treaty", "collapse", "expansion", "epoch_change"])

export class TemporalMemoryEngine {
  private events: TemporalEvent[] = []
  private ideologyTimeline: IdeologySnapshot[] = []
  private epochs: CivilizationEpoch[] = []
  private currentEpoch: CivilizationEpoch = {
    id: "epoch-0", startTick: 0, endTick: 0, dominantFaction: "", keyEvents: [], mood: "stagnation"
  }
  private evolutionTree: EvolutionTreeNode[] = []
  private eventIdCounter = 0
  private epochIdCounter = 1
  private lastPostures = new Map<string, DiplomaticPosture>()
  private lastStrategies = new Map<string, CivilizationStrategy>()
  private lastTerritories = new Map<string, number>()
  private lastDominantFaction: string | undefined
  private readonly ideologySnapshotInterval = 8
  private readonly maxEvents = 500

  record(civilization: CivilizationSnapshot, warfare: WarfareSnapshot): TemporalMemorySnapshot {
    const tick = civilization.tick
    const nameMap = new Map(civilization.populations.map((p) => [p.factionId, p.name]))
    const pendingEvents: TemporalEvent[] = []

    const emit = (kind: TemporalEventKind, factionIds: readonly string[], description: string, position?: GridPosition): void => {
      pendingEvents.push({
        id: `temporal-event-${this.eventIdCounter++}`,
        tick, kind, factionIds, description,
        impact: IMPACT[kind],
        ...(position ? { position } : {})
      })
    }

    // Strategy changes
    for (const pop of civilization.populations) {
      const prev = this.lastStrategies.get(pop.factionId)
      if (prev !== undefined && prev !== pop.strategy) {
        emit("strategic_pivot", [pop.factionId], `${pop.name} shifted strategy from ${prev} to ${pop.strategy}`, pop.capital)
      }
    }

    // Diplomatic posture changes
    for (const rel of warfare.diplomacy) {
      const key = `${rel.fromFactionId}→${rel.toFactionId}`
      const prev = this.lastPostures.get(key)
      if (prev !== undefined && prev !== rel.posture) {
        const fromName = nameMap.get(rel.fromFactionId) ?? rel.fromFactionId
        const toName = nameMap.get(rel.toFactionId) ?? rel.toFactionId
        if ((prev === "neutral" || prev === "rival") && rel.posture === "allied") {
          emit("alliance", [rel.fromFactionId, rel.toFactionId], `${fromName} and ${toName} formed an alliance`)
        } else if (prev === "allied" && (rel.posture === "rival" || rel.posture === "war")) {
          emit("betrayal", [rel.fromFactionId, rel.toFactionId], `${fromName} betrayed alliance with ${toName}`)
        }
        if (rel.posture === "war" && prev !== "war") {
          emit("war_declared", [rel.fromFactionId, rel.toFactionId], `${fromName} declared war on ${toName}`)
        }
        if (prev === "war" && (rel.posture === "neutral" || rel.posture === "allied")) {
          emit("peace_treaty", [rel.fromFactionId, rel.toFactionId], `${fromName} and ${toName} signed a peace treaty`)
        }
      }
    }

    // Territory changes
    for (const pop of civilization.populations) {
      const prevSize = this.lastTerritories.get(pop.factionId)
      if (prevSize !== undefined && prevSize > 0) {
        const ratio = pop.territory.length / prevSize
        if (ratio < 0.85) emit("collapse", [pop.factionId], `${pop.name} territory collapsed by ${Math.round((1 - ratio) * 100)}%`, pop.capital)
        else if (ratio > 1.2) emit("expansion", [pop.factionId], `${pop.name} territory expanded by ${Math.round((ratio - 1) * 100)}%`, pop.capital)
      }
    }

    // Dominant faction change
    if (warfare.dominantFactionId !== undefined && warfare.dominantFactionId !== this.lastDominantFaction && this.lastDominantFaction !== undefined) {
      const name = nameMap.get(warfare.dominantFactionId) ?? warfare.dominantFactionId
      emit("epoch_change", [warfare.dominantFactionId], `${name} rose to dominance`)
    }

    // Probabilistic events
    for (const pop of civilization.populations) {
      if (pop.traits.innovation > 0.7 && pop.strategy === "research" && Math.random() < 0.1) {
        emit("research_breakthrough", [pop.factionId], `${pop.name} achieved a research breakthrough`)
      }
    }
    const cooperativeFactions = civilization.populations.filter((p) => p.traits.cooperation > 0.65)
    if (cooperativeFactions.length >= 2 && Math.random() < 0.08) {
      const ids = cooperativeFactions.slice(0, 2).map((p) => p.factionId)
      const names = ids.map((id) => nameMap.get(id) ?? id)
      emit("trade_pact", ids, `${names[0]} and ${names[1]} established a trade pact`)
    }

    // Append events to ring buffer
    for (const event of pendingEvents) this.events.push(event)
    while (this.events.length > this.maxEvents) this.events.shift()

    // Ideology snapshots
    if (tick % this.ideologySnapshotInterval === 0) {
      for (const pop of civilization.populations) {
        this.ideologyTimeline.push({
          factionId: pop.factionId, tick,
          aggression: pop.traits.aggression, cooperation: pop.traits.cooperation,
          innovation: pop.traits.innovation, logistics: pop.traits.logistics
        })
      }
    }

    // Epoch transitions
    const recentMajor = this.events.filter((e) => e.tick >= tick - 10 && MAJOR_KINDS.has(e.kind)).length
    const dominantChanged = warfare.dominantFactionId !== undefined && warfare.dominantFactionId !== this.lastDominantFaction && this.lastDominantFaction !== undefined
    const epochAge = tick - this.currentEpoch.startTick
    if (dominantChanged || recentMajor >= 3 || epochAge >= 50) {
      const epochEvents = this.events.filter((e) => e.tick >= this.currentEpoch.startTick && e.tick <= tick)
      const mood = this.computeEpochMood(epochEvents, civilization)
      const closedEpoch: CivilizationEpoch = {
        ...this.currentEpoch,
        endTick: tick,
        dominantFaction: warfare.dominantFactionId ?? this.currentEpoch.dominantFaction,
        keyEvents: epochEvents.filter((e) => MAJOR_KINDS.has(e.kind)).map((e) => e.id),
        mood
      }
      this.epochs.push(closedEpoch)
      this.currentEpoch = {
        id: `epoch-${this.epochIdCounter++}`, startTick: tick, endTick: tick,
        dominantFaction: warfare.dominantFactionId ?? "", keyEvents: [], mood: "stagnation"
      }
    }

    // Evolution tree
    for (const pop of civilization.populations) {
      const existing = this.evolutionTree.find((n) => n.factionId === pop.factionId && n.epochId === this.currentEpoch.id)
      const prev = this.lastStrategies.get(pop.factionId)
      if (existing) {
        const path = existing.strategyPath
        if (path[path.length - 1] !== pop.strategy) {
          const updated: EvolutionTreeNode = {
            ...existing,
            strategyPath: [...path, pop.strategy],
            branchPoint: tick
          }
          const idx = this.evolutionTree.indexOf(existing)
          this.evolutionTree[idx] = updated
        }
      } else {
        this.evolutionTree.push({
          factionId: pop.factionId, epochId: this.currentEpoch.id,
          strategyPath: [pop.strategy],
          ...(prev !== undefined && prev !== pop.strategy ? { branchPoint: tick } : {})
        })
      }
    }

    // Update last-known state
    for (const rel of warfare.diplomacy) this.lastPostures.set(`${rel.fromFactionId}→${rel.toFactionId}`, rel.posture)
    for (const pop of civilization.populations) {
      this.lastStrategies.set(pop.factionId, pop.strategy)
      this.lastTerritories.set(pop.factionId, pop.territory.length)
    }
    this.lastDominantFaction = warfare.dominantFactionId

    return this.snapshot()
  }

  snapshot(): TemporalMemorySnapshot {
    const betrayalCount = this.events.filter((e) => e.kind === "betrayal").length
    const driftRate = this.computeIdeologyDriftRate()
    const first = this.events[0]?.tick ?? 0
    const last = this.events[this.events.length - 1]?.tick ?? 0
    return {
      events: this.events,
      ideologyTimeline: this.ideologyTimeline,
      epochs: this.epochs,
      evolutionTree: this.evolutionTree,
      currentEpoch: this.currentEpoch,
      replayRange: { start: first, end: last },
      totalEvents: this.events.length,
      currentEpochMood: this.currentEpoch.mood,
      betrayalCount,
      ideologyDriftRate: driftRate
    }
  }

  getEventsInRange(startTick: number, endTick: number): readonly TemporalEvent[] {
    return this.events.filter((e) => e.tick >= startTick && e.tick <= endTick)
  }

  getEpochHistory(): readonly CivilizationEpoch[] {
    return [...this.epochs, this.currentEpoch]
  }

  private computeEpochMood(epochEvents: readonly TemporalEvent[], civilization: CivilizationSnapshot): EpochMood {
    const conflict = epochEvents.filter((e) => e.kind === "war_declared" || e.kind === "betrayal").length
    const cooperation = epochEvents.filter((e) => e.kind === "alliance" || e.kind === "trade_pact" || e.kind === "peace_treaty").length
    const expansions = epochEvents.filter((e) => e.kind === "expansion").length
    const collapses = epochEvents.filter((e) => e.kind === "collapse").length
    const avgCohesion = civilization.populations.reduce((s, p) => s + p.cohesion, 0) / Math.max(civilization.populations.length, 1)
    if (conflict > cooperation) return "conflict"
    if (expansions > collapses) return "expansion"
    if (avgCohesion > 0.72) return "golden_age"
    if (avgCohesion < 0.35) return "dark_age"
    return "stagnation"
  }

  private computeIdeologyDriftRate(): number {
    if (this.ideologyTimeline.length < 2) return 0
    const factionIds = new Set(this.ideologyTimeline.map((s) => s.factionId))
    let totalDrift = 0
    let comparisons = 0
    for (const fid of factionIds) {
      const snapshots = this.ideologyTimeline.filter((s) => s.factionId === fid)
      const recent = snapshots.slice(-5)
      for (let i = 1; i < recent.length; i++) {
        const prev = recent[i - 1]!
        const curr = recent[i]!
        totalDrift +=
          Math.abs(curr.aggression - prev.aggression) +
          Math.abs(curr.cooperation - prev.cooperation) +
          Math.abs(curr.innovation - prev.innovation) +
          Math.abs(curr.logistics - prev.logistics)
        comparisons++
      }
    }
    return comparisons > 0 ? clamp01(totalDrift / (comparisons * 4)) : 0
  }
}

export class TemporalMemoryStore {
  private readonly storageKey = "pathverse.temporal-memory.v1"
  private readonly dbName = "pathverse-temporal"
  private readonly dbVersion = 1

  saveQuick(snapshot: TemporalMemorySnapshot): void {
    if (typeof localStorage === "undefined") return
    const lightweight = {
      events: snapshot.events.slice(-50),
      currentEpoch: snapshot.currentEpoch,
      currentEpochMood: snapshot.currentEpochMood,
      betrayalCount: snapshot.betrayalCount,
      ideologyDriftRate: snapshot.ideologyDriftRate,
      totalEvents: snapshot.totalEvents
    }
    try { localStorage.setItem(this.storageKey, JSON.stringify(lightweight)) } catch { /* quota exceeded — silent */ }
  }

  loadQuick(): TemporalMemorySnapshot | undefined {
    if (typeof localStorage === "undefined") return undefined
    try {
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return undefined
      const data = JSON.parse(raw) as {
        events: readonly TemporalEvent[]
        currentEpoch: CivilizationEpoch
        currentEpochMood: EpochMood
        betrayalCount: number
        ideologyDriftRate: number
        totalEvents: number
      }
      return {
        events: data.events,
        ideologyTimeline: [],
        epochs: [],
        evolutionTree: [],
        currentEpoch: data.currentEpoch,
        replayRange: {
          start: data.events[0]?.tick ?? 0,
          end: data.events[data.events.length - 1]?.tick ?? 0
        },
        totalEvents: data.totalEvents,
        currentEpochMood: data.currentEpochMood,
        betrayalCount: data.betrayalCount,
        ideologyDriftRate: data.ideologyDriftRate
      }
    } catch { return undefined }
  }

  async saveArchive(snapshot: TemporalMemorySnapshot): Promise<void> {
    if (typeof indexedDB === "undefined") return
    try {
      const db = await this.openDb()
      const tx = db.transaction(["events", "epochs", "ideology"], "readwrite")
      const eventsStore = tx.objectStore("events")
      const epochsStore = tx.objectStore("epochs")
      const ideologyStore = tx.objectStore("ideology")
      eventsStore.clear()
      epochsStore.clear()
      ideologyStore.clear()
      for (const event of snapshot.events) eventsStore.put(event)
      for (const epoch of snapshot.epochs) epochsStore.put(epoch)
      for (const entry of snapshot.ideologyTimeline) ideologyStore.put(entry)
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    } catch { /* IndexedDB unavailable or failed — silent */ }
  }

  async loadArchive(): Promise<TemporalMemorySnapshot | undefined> {
    if (typeof indexedDB === "undefined") return undefined
    try {
      const db = await this.openDb()
      const tx = db.transaction(["events", "epochs", "ideology"], "readonly")
      const events = await this.getAllFromStore<TemporalEvent>(tx.objectStore("events"))
      const epochs = await this.getAllFromStore<CivilizationEpoch>(tx.objectStore("epochs"))
      const ideology = await this.getAllFromStore<IdeologySnapshot>(tx.objectStore("ideology"))
      db.close()
      const currentEpoch = epochs[epochs.length - 1] ?? {
        id: "epoch-0", startTick: 0, endTick: 0, dominantFaction: "", keyEvents: [], mood: "stagnation" as EpochMood
      }
      return {
        events, ideologyTimeline: ideology, epochs, evolutionTree: [],
        currentEpoch,
        replayRange: {
          start: events[0]?.tick ?? 0,
          end: events[events.length - 1]?.tick ?? 0
        },
        totalEvents: events.length,
        currentEpochMood: currentEpoch.mood,
        betrayalCount: events.filter((e) => e.kind === "betrayal").length,
        ideologyDriftRate: 0
      }
    } catch { return undefined }
  }

  async clear(): Promise<void> {
    if (typeof localStorage !== "undefined") {
      try { localStorage.removeItem(this.storageKey) } catch { /* silent */ }
    }
    if (typeof indexedDB === "undefined") return
    try {
      const db = await this.openDb()
      const tx = db.transaction(["events", "epochs", "ideology"], "readwrite")
      tx.objectStore("events").clear()
      tx.objectStore("epochs").clear()
      tx.objectStore("ideology").clear()
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
      db.close()
    } catch { /* silent */ }
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains("events")) db.createObjectStore("events", { keyPath: "id" })
        if (!db.objectStoreNames.contains("epochs")) db.createObjectStore("epochs", { keyPath: "id" })
        if (!db.objectStoreNames.contains("ideology")) db.createObjectStore("ideology", { autoIncrement: true })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private getAllFromStore<T>(store: IDBObjectStore): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  }
}
