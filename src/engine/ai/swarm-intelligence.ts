import { getNeighbors, positionKey, samePosition } from "../core/grid";
import type { GridModel, GridPosition } from "../core/types";
import type { NeuralLearningSnapshot } from "./neural-learning-engine";

export interface SwarmAgent {
  readonly id: string;
  readonly position: GridPosition;
  readonly target: GridPosition;
  readonly confidence: number;
  readonly communicationRadius: number;
}

export interface SwarmSignal {
  readonly from: string;
  readonly to: string;
  readonly strength: number;
}

export interface SwarmSnapshot {
  readonly agents: readonly SwarmAgent[];
  readonly signals: readonly SwarmSignal[];
  readonly formationScore: number;
  readonly collisionRisk: number;
}

export class SwarmIntelligenceSystem {
  private agents: SwarmAgent[];

  constructor(grid: GridModel, count = 7) {
    this.agents = Array.from({ length: count }, (_, index) => ({
      id: `swarm-${index + 1}`,
      position: { x: grid.start.x, y: Math.min(grid.height - 1, grid.start.y + index) },
      target: grid.target,
      confidence: 0.2,
      communicationRadius: 7
    }));
  }

  step(grid: GridModel, neural: NeuralLearningSnapshot): SwarmSnapshot {
    const occupied = new Set<string>();
    this.agents = this.agents.map((agent) => {
      const next = this.chooseMove(grid, agent, neural, occupied);
      occupied.add(positionKey(next));
      return {
        ...agent,
        position: next,
        confidence: samePosition(next, agent.target) ? 1 : Math.min(1, agent.confidence + 0.025)
      };
    });

    return this.snapshot();
  }

  snapshot(): SwarmSnapshot {
    const signals: SwarmSignal[] = [];
    for (const from of this.agents) {
      for (const to of this.agents) {
        if (from.id === to.id) continue;
        const distance = Math.abs(from.position.x - to.position.x) + Math.abs(from.position.y - to.position.y);
        if (distance <= from.communicationRadius) {
          signals.push({ from: from.id, to: to.id, strength: 1 - distance / from.communicationRadius });
        }
      }
    }

    const positions = new Set(this.agents.map((agent) => positionKey(agent.position)));
    const collisionRisk = 1 - positions.size / Math.max(this.agents.length, 1);
    const averageConfidence = this.agents.reduce((sum, agent) => sum + agent.confidence, 0) / Math.max(this.agents.length, 1);
    return {
      agents: [...this.agents],
      signals,
      formationScore: Math.max(0, Math.min(1, averageConfidence - collisionRisk * 0.45)),
      collisionRisk
    };
  }

  private chooseMove(
    grid: GridModel,
    agent: SwarmAgent,
    neural: NeuralLearningSnapshot,
    occupied: ReadonlySet<string>
  ): GridPosition {
    const signalMap = new Map(neural.cellSignals.map((signal) => [positionKey(signal), signal]));
    const candidates = getNeighbors(grid, agent.position).filter((cell) => !occupied.has(positionKey(cell)));
    if (candidates.length === 0) return agent.position;

    return [...candidates].sort((a, b) => {
      const signalA = signalMap.get(positionKey(a));
      const signalB = signalMap.get(positionKey(b));
      const scoreA = (signalA?.prediction ?? 0) + (signalA?.confidence ?? 0) - Math.abs(a.x - agent.target.x) * 0.01;
      const scoreB = (signalB?.prediction ?? 0) + (signalB?.confidence ?? 0) - Math.abs(b.x - agent.target.x) * 0.01;
      return scoreB - scoreA;
    })[0] ?? agent.position;
  }
}
