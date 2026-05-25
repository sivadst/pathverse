"use client";

import {
  Activity,
  Brain,
  Cpu,
  Database,
  Gauge,
  Globe2,
  Layers3,
  Move,
  Network,
  Orbit,
  Play,
  RadioTower,
  Route,
  Shield,
  Sparkles,
  Terminal,
  Waypoints,
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimationScheduler } from "@engine/scheduler/animation-scheduler";
import { PixiGridRenderer } from "@engine/rendering/pixi-grid-renderer";
import { RaceScheduler } from "@engine/scheduler/race-scheduler";
import {
  commandCenterAlgorithms,
  commandCenterTelemetry,
  useCommandCenterStore
} from "@engine/state/use-command-center-store";
import type { AlgorithmId } from "@engine/core/types";

const labels: Record<AlgorithmId, string> = {
  astar: "A*",
  dijkstra: "Dijkstra",
  bfs: "BFS",
  dfs: "DFS",
  greedy: "Greedy",
  bidirectional: "Bi-Search"
};

const bootLogs = [
  "INITIALIZING PATHVERSE OS",
  "GPU LINK ESTABLISHED",
  "NEURAL ROUTING ENGINE ONLINE",
  "SWARM INTELLIGENCE ACTIVE",
  "SIMULATION MATRIX SYNCHRONIZED"
];

export function CommandCenter() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiGridRenderer | null>(null);
  const schedulerRef = useRef<AnimationScheduler | null>(null);
  const raceSchedulerRef = useRef<RaceScheduler | null>(null);
  const [booted, setBooted] = useState(false);
  const [rendererStats, setRendererStats] = useState({
    drawCalls: 0,
    activeSprites: 0,
    activeParticles: 0,
    qualityMode: "cinematic",
    splitScreenLanes: 1
  });
  const {
    grid,
    selectedAlgorithm,
    battle,
    events,
    learning,
    swarm,
    civilization,
    megacity,
    warfare,
    prediction,
    personality,
    thought,
    shell,
    telemetry,
    selectAlgorithm,
    runBattle,
    trainNeural,
    stepCivilization,
    runCommand,
    refreshTelemetry
  } =
    useCommandCenterStore();
  const neuralRef = useRef(learning.neural);
  const swarmRef = useRef(swarm);
  const civilizationRef = useRef({ civilization, megacity, warfare, prediction });
  const [bootComplete, setBootComplete] = useState(false);
  const completeBoot = useCallback(() => setBootComplete(true), []);

  useEffect(() => {
    const renderer = new PixiGridRenderer();
    rendererRef.current = renderer;
    const host = hostRef.current;
    if (!host) return;
    void renderer.mount(host).then(() => {
      renderer.renderGrid(grid);
      setRendererStats(renderer.diagnostics());
      setBooted(true);
    });

    schedulerRef.current = new AnimationScheduler(commandCenterTelemetry, (batch) => {
      renderer.applyEvents(batch);
      renderer.updateQuality(commandCenterTelemetry.snapshot());
      setRendererStats(renderer.diagnostics());
      refreshTelemetry();
    });
    raceSchedulerRef.current = new RaceScheduler(commandCenterTelemetry, (batches) => {
      renderer.applyRaceEvents(batches);
      renderer.updateQuality(commandCenterTelemetry.snapshot());
      setRendererStats(renderer.diagnostics());
      refreshTelemetry();
    });

    return () => {
      schedulerRef.current?.stop();
      raceSchedulerRef.current?.stop();
      renderer.destroy();
    };
  }, [grid, refreshTelemetry]);

  useEffect(() => {
    neuralRef.current = learning.neural;
    rendererRef.current?.renderNeuralSnapshot(learning.neural);
  }, [learning.neural]);

  useEffect(() => {
    swarmRef.current = swarm;
    rendererRef.current?.renderSwarmSnapshot(swarm);
  }, [swarm]);

  useEffect(() => {
    civilizationRef.current = { civilization, megacity, warfare, prediction };
    rendererRef.current?.renderCivilizationSnapshot(civilization, megacity, prediction, warfare);
  }, [civilization, megacity, prediction, warfare]);

  useEffect(() => {
    rendererRef.current?.renderThoughtSnapshot(thought);
  }, [thought]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      stepCivilization();
    }, 1400);
    return () => window.clearInterval(interval);
  }, [stepCivilization]);

  useEffect(() => {
    if (!booted || events.length === 0) return;
    schedulerRef.current?.stop();
    raceSchedulerRef.current?.stop();

    if (battle) {
      rendererRef.current?.renderBattleGrid(grid, battle);
      rendererRef.current?.renderNeuralSnapshot(neuralRef.current);
      rendererRef.current?.renderSwarmSnapshot(swarmRef.current);
      rendererRef.current?.renderCivilizationSnapshot(
        civilizationRef.current.civilization,
        civilizationRef.current.megacity,
        civilizationRef.current.prediction,
        civilizationRef.current.warfare
      );
      raceSchedulerRef.current?.load(
        battle.contestants.slice(0, 4).map((contestant, lane) => ({
          algorithm: contestant.algorithm,
          lane,
          events: contestant.result.events
        })),
        1.25
      );
      raceSchedulerRef.current?.start();
      return;
    }

    rendererRef.current?.renderGrid(grid);
    rendererRef.current?.renderNeuralSnapshot(neuralRef.current);
    rendererRef.current?.renderSwarmSnapshot(swarmRef.current);
    rendererRef.current?.renderCivilizationSnapshot(
      civilizationRef.current.civilization,
      civilizationRef.current.megacity,
      civilizationRef.current.prediction,
      civilizationRef.current.warfare
    );
    schedulerRef.current?.load(events, 1.3);
    schedulerRef.current?.start();
  }, [battle, booted, events, grid]);

  const selectedContestant = useMemo(
    () => battle?.contestants.find((contestant) => contestant.algorithm === selectedAlgorithm),
    [battle, selectedAlgorithm]
  );

  return (
    <main className="scanlines relative min-h-screen overflow-hidden px-4 py-4 text-slate-100 md:px-6">
      {!bootComplete && <BootSequence onComplete={completeBoot} />}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(24,245,210,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(24,245,210,0.06)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
      <section className="relative grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-4 xl:grid-cols-[310px_1fr_330px]">
        <aside className="hud-panel z-10 flex flex-col gap-4 rounded-lg p-4">
          <SystemHeader booted={booted} />
          <AlgorithmDock
            selected={selectedAlgorithm}
            onSelect={selectAlgorithm}
            onRun={runBattle}
            onTrain={() => trainNeural(24)}
            onSimulate={stepCivilization}
          />
          <MetricStrip
            items={[
              { icon: Gauge, label: "AVG FPS", value: telemetry.averageFps.toFixed(1) },
              { icon: Cpu, label: "P95 MS", value: telemetry.p95FrameMs.toFixed(1) },
              { icon: Zap, label: "RENDER", value: telemetry.averageRenderMs.toFixed(1) }
            ]}
          />
        </aside>

        <section className="relative z-10 min-h-[520px] overflow-hidden rounded-lg border border-cobalt/25 bg-void/50 shadow-hud">
          <div ref={hostRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute left-5 top-5">
            <div className="font-mono text-xs uppercase tracking-[0.22em] text-plasma/80">PATHVERSE AI COMMAND GRID</div>
            <h1 className="mt-2 text-3xl font-semibold text-white md:text-5xl">Realtime Navigation OS</h1>
          </div>
          <div className="absolute bottom-4 left-4 right-4 grid gap-3 md:grid-cols-3">
            <StatusTile icon={Route} label="Winner" value={battle ? labels[battle.winner.algorithm] : "Standby"} />
            <StatusTile icon={Activity} label="Path Cost" value={selectedContestant?.result.metrics.pathCost.toFixed(0) ?? "--"} />
            <StatusTile icon={RadioTower} label="Race Events" value={battle ? battle.contestants.reduce((sum, contestant) => sum + contestant.result.events.length, 0).toString() : events.length.toString()} />
          </div>
        </section>

        <aside className="hud-panel z-10 flex flex-col gap-4 rounded-lg p-4">
          <TelemetryPanel />
          <RenderDiagnosticsPanel stats={rendererStats} droppedFrameRatio={telemetry.droppedFrameRatio} />
          <NeuralDiagnosticsPanel />
          <CivilizationPanel />
          <ConsciousnessPanel />
          <LearningPanel epochs={learning.epochs.slice(-18)} confidence={learning.confidence} />
          <MetricStrip
            items={[
              { icon: Orbit, label: "SPRITES", value: rendererStats.activeSprites.toString() },
              { icon: Sparkles, label: "PARTICLES", value: rendererStats.activeParticles.toString() },
              { icon: Layers3, label: "LANES", value: rendererStats.splitScreenLanes.toString() }
            ]}
          />
        </aside>
      </section>
      <DraggableHudPanel title="NEURAL OPS" initial={{ x: 28, y: 96 }}>
        <div className="grid grid-cols-2 gap-2">
          <StatusTile icon={Brain} label="Confidence" value={`${Math.round(learning.neural.confidence * 100)}%`} compact />
          <StatusTile icon={Database} label="Memory" value={(telemetry.neural?.memoryEntries ?? 0).toString()} compact />
          <StatusTile icon={Network} label="Swarm" value={`${Math.round(swarm.formationScore * 100)}%`} compact />
          <StatusTile icon={Shield} label="Risk" value={`${Math.round(swarm.collisionRisk * 100)}%`} compact />
        </div>
      </DraggableHudPanel>
      <DraggableHudPanel title="CIVILIZATION OPS" initial={{ x: 28, y: 360 }}>
        <div className="grid grid-cols-2 gap-2">
          <StatusTile icon={Globe2} label="Population" value={`${Math.round(civilization.totalPopulation / 1000)}K`} compact />
          <StatusTile icon={Waypoints} label="Future" value={`${Math.round(prediction.convergenceScore * 100)}%`} compact />
          <StatusTile icon={Shield} label="Tension" value={`${Math.round(warfare.strategicTension * 100)}%`} compact />
          <StatusTile icon={Network} label="Voice" value={personality.systemMood.toUpperCase()} compact />
        </div>
      </DraggableHudPanel>
      <CommandShell entries={shell} onCommand={runCommand} />
    </main>
  );
}

function BootSequence({ onComplete }: { readonly onComplete: () => void }) {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLine((current) => {
        if (current >= bootLogs.length) {
          window.clearInterval(interval);
          window.setTimeout(onComplete, 360);
          return current;
        }
        return current + 1;
      });
    }, 360);
    return () => window.clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/95"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-[min(620px,calc(100vw-2rem))] border border-plasma/30 bg-black/40 p-6 shadow-hud">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.24em] text-plasma">
          <Terminal size={16} />
          PATHVERSE BOOT CONSOLE
        </div>
        <div className="mt-6 grid gap-3 font-mono text-sm">
          {bootLogs.slice(0, line).map((entry) => (
            <motion.div key={entry} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="text-slate-200">
              {entry}...
            </motion.div>
          ))}
        </div>
        <div className="mt-6 h-1 overflow-hidden bg-white/10">
          <motion.div className="h-full bg-plasma" animate={{ width: `${Math.min(100, (line / bootLogs.length) * 100)}%` }} />
        </div>
      </div>
    </motion.div>
  );
}

function RenderDiagnosticsPanel({
  stats,
  droppedFrameRatio
}: {
  readonly stats: {
    readonly drawCalls: number;
    readonly activeParticles: number;
    readonly qualityMode: string;
    readonly splitScreenLanes: number;
  };
  readonly droppedFrameRatio: number;
}) {
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-plasma">Render Pipeline</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <StatusTile icon={Shield} label="Quality" value={stats.qualityMode.toUpperCase()} compact />
        <StatusTile icon={Layers3} label="Split" value={`${stats.splitScreenLanes}x`} compact />
        <StatusTile icon={Sparkles} label="GPU FX" value={stats.activeParticles.toString()} compact />
        <StatusTile icon={Gauge} label="Drops" value={`${Math.round(droppedFrameRatio * 100)}%`} compact />
      </div>
    </div>
  );
}

function NeuralDiagnosticsPanel() {
  const telemetry = useCommandCenterStore((state) => state.telemetry);
  const neural = telemetry.neural;
  const swarm = telemetry.swarm;
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-reactor">Neural Diagnostics</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <StatusTile icon={Brain} label="Converge" value={`${Math.round((neural?.convergence ?? 0) * 100)}%`} compact />
        <StatusTile icon={Database} label="Memory" value={(neural?.memoryEntries ?? 0).toString()} compact />
        <StatusTile icon={Activity} label="Reward" value={(neural?.rewardTrend ?? 0).toFixed(0)} compact />
        <StatusTile icon={Network} label="Signals" value={(swarm?.signalCount ?? 0).toString()} compact />
      </div>
    </div>
  );
}

function CivilizationPanel() {
  const telemetry = useCommandCenterStore((state) => state.telemetry);
  const civilization = telemetry.civilization;
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-reactor">Civilization Systems</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <StatusTile icon={Globe2} label="Civ Tick" value={(civilization?.tick ?? 0).toString()} compact />
        <StatusTile icon={Network} label="Drones" value={(civilization?.droneRoutes ?? 0).toString()} compact />
        <StatusTile icon={Shield} label="Conflict" value={`${Math.round((civilization?.strategicTension ?? 0) * 100)}%`} compact />
        <StatusTile icon={Waypoints} label="Branches" value={(civilization?.timelineBranches ?? 0).toString()} compact />
      </div>
    </div>
  );
}

function ConsciousnessPanel() {
  const telemetry = useCommandCenterStore((state) => state.telemetry);
  const consciousness = telemetry.consciousness;
  const temporalMemory = telemetry.temporalMemory;
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-plasma">Consciousness Telemetry</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <StatusTile icon={Brain} label="Reason" value={`${Math.round((consciousness?.reasoningIntensity ?? 0) * 100)}%`} compact />
        <StatusTile icon={Gauge} label="Uncertainty" value={`${Math.round((consciousness?.uncertaintyIndex ?? 0) * 100)}%`} compact />
        <StatusTile icon={Activity} label="Pulses" value={(consciousness?.thoughtPulseCount ?? 0).toString()} compact />
        <StatusTile icon={Database} label="Memory" value={(temporalMemory?.totalEvents ?? 0).toString()} compact />
      </div>
    </div>
  );
}

function SystemHeader({ booted }: { readonly booted: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-reactor">PATHVERSE CORE</div>
        <span className={`h-2.5 w-2.5 rounded-full ${booted ? "bg-plasma shadow-[0_0_14px_#18f5d2]" : "bg-alarm"}`} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        WebGL renderer, heap-backed algorithms, telemetry, and AI training signals online.
      </p>
    </div>
  );
}

function AlgorithmDock({
  selected,
  onSelect,
  onRun,
  onTrain,
  onSimulate
}: {
  readonly selected: AlgorithmId;
  readonly onSelect: (algorithm: AlgorithmId) => void;
  readonly onRun: () => void;
  readonly onTrain: () => void;
  readonly onSimulate: () => void;
}) {
  return (
    <div className="grid gap-3">
      <button
        type="button"
        onClick={onRun}
        className="flex h-11 items-center justify-center gap-2 rounded-md border border-plasma/40 bg-plasma/10 font-mono text-sm uppercase text-plasma shadow-hud transition hover:bg-plasma/20"
      >
        <Play size={16} />
        Run Battle
      </button>
      <button
        type="button"
        onClick={onTrain}
        className="flex h-10 items-center justify-center gap-2 rounded-md border border-reactor/40 bg-reactor/10 font-mono text-xs uppercase text-reactor transition hover:bg-reactor/20"
      >
        <Brain size={15} />
        Train Neural Core
      </button>
      <button
        type="button"
        onClick={onSimulate}
        className="flex h-10 items-center justify-center gap-2 rounded-md border border-cobalt/40 bg-cobalt/10 font-mono text-xs uppercase text-cobalt transition hover:bg-cobalt/20"
      >
        <Globe2 size={15} />
        Simulate Civilization
      </button>
      <div className="grid grid-cols-2 gap-2">
        {commandCenterAlgorithms.map((algorithm) => (
          <button
            key={algorithm}
            type="button"
            onClick={() => onSelect(algorithm)}
            className={`h-10 rounded-md border px-2 text-sm transition ${
              selected === algorithm
                ? "border-reactor bg-reactor/15 text-reactor"
                : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-plasma/40"
            }`}
          >
            {labels[algorithm]}
          </button>
        ))}
      </div>
    </div>
  );
}

function CommandShell({
  entries,
  onCommand
}: {
  readonly entries: readonly { readonly id: string; readonly command: string; readonly output: string }[];
  readonly onCommand: (command: string) => void;
}) {
  const [command, setCommand] = useState("");
  return (
    <div className="hud-panel absolute bottom-5 left-5 right-5 z-20 hidden rounded-lg p-3 xl:block">
      <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-plasma">
        <Terminal size={13} />
        Command Shell
      </div>
      <div className="grid max-h-24 gap-1 overflow-hidden font-mono text-xs text-slate-300">
        {entries.slice(-4).map((entry) => (
          <div key={entry.id}>
            <span className="text-reactor">&gt; {entry.command}</span>
            <span className="ml-2 text-slate-400">{entry.output}</span>
          </div>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!command.trim()) return;
          onCommand(command);
          setCommand("");
        }}
      >
        <input
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 font-mono text-sm text-white outline-none focus:border-plasma/60"
          placeholder="simulate | predict | train | battle"
        />
        <button type="submit" className="h-9 rounded-md border border-plasma/40 px-4 font-mono text-xs uppercase text-plasma">
          Execute
        </button>
      </form>
    </div>
  );
}

function DraggableHudPanel({
  title,
  initial,
  children
}: {
  readonly title: string;
  readonly initial: { readonly x: number; readonly y: number };
  readonly children: React.ReactNode;
}) {
  const [position, setPosition] = useState(initial);
  const dragOffset = useRef({ x: 0, y: 0 });

  return (
    <div
      className="hud-panel absolute z-20 hidden w-72 rounded-lg p-3 xl:block"
      style={{ left: position.x, top: position.y }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        setPosition({ x: event.clientX - dragOffset.current.x, y: event.clientY - dragOffset.current.y });
      }}
    >
      <div
        className="mb-3 flex cursor-move items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-plasma"
        onPointerDown={(event) => {
          dragOffset.current = { x: event.clientX - position.x, y: event.clientY - position.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
      >
        <Move size={13} />
        {title}
      </div>
      {children}
    </div>
  );
}

function TelemetryPanel() {
  const telemetry = useCommandCenterStore((state) => state.telemetry);
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-plasma">Algorithm Telemetry</div>
      <div className="mt-3 grid gap-2">
        {telemetry.algorithms.slice(0, 6).map((entry) => (
          <div key={entry.algorithm} className="grid grid-cols-[82px_1fr_52px] items-center gap-2 text-sm">
            <span className="text-slate-300">{labels[entry.algorithm]}</span>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-plasma" style={{ width: `${Math.min(100, entry.efficiencyScore / 80)}%` }} />
            </div>
            <span className="text-right font-mono text-reactor">{entry.efficiencyScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LearningPanel({ epochs, confidence }: { readonly epochs: readonly { reward: number }[]; readonly confidence: number }) {
  const maxReward = Math.max(1, ...epochs.map((epoch) => Math.abs(epoch.reward)));
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-reactor">AI Learning Curve</div>
      <div className="mt-4 flex h-28 items-end gap-1 border-b border-l border-white/10 px-2">
        {epochs.map((epoch, index) => (
          <motion.div
            key={`${epoch.reward}-${index}`}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(8, (Math.abs(epoch.reward) / maxReward) * 100)}%` }}
            className="w-full rounded-t-sm bg-cobalt"
          />
        ))}
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className="h-full rounded-full bg-reactor" style={{ width: `${Math.round(confidence * 100)}%` }} />
      </div>
    </div>
  );
}

function MetricStrip({
  items
}: {
  readonly items: readonly { icon: React.ComponentType<{ size?: number }>; label: string; value: string }[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <StatusTile key={item.label} icon={item.icon} label={item.label} value={item.value} compact />
      ))}
    </div>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  compact = false
}: {
  readonly icon: React.ComponentType<{ size?: number }>;
  readonly label: string;
  readonly value: string;
  readonly compact?: boolean;
}) {
  return (
    <div className={`rounded-md border border-white/10 bg-white/[0.045] ${compact ? "p-2" : "p-3"}`}>
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        <Icon size={compact ? 13 : 15} />
        <span>{label}</span>
      </div>
      <div className={`${compact ? "mt-2 text-lg" : "mt-3 text-2xl"} font-mono text-white`}>{value}</div>
    </div>
  );
}
