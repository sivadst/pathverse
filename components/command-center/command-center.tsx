"use client";

import { Activity, Cpu, Gauge, Orbit, Play, RadioTower, Route, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimationScheduler } from "@engine/scheduler/animation-scheduler";
import { PixiGridRenderer } from "@engine/rendering/pixi-grid-renderer";
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

export function CommandCenter() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiGridRenderer | null>(null);
  const schedulerRef = useRef<AnimationScheduler | null>(null);
  const [booted, setBooted] = useState(false);
  const [rendererStats, setRendererStats] = useState({ drawCalls: 0, activeSprites: 0 });
  const { grid, selectedAlgorithm, battle, events, learning, telemetry, selectAlgorithm, runBattle } =
    useCommandCenterStore();

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
      setRendererStats(renderer.diagnostics());
    });

    return () => {
      schedulerRef.current?.stop();
      renderer.destroy();
    };
  }, [grid]);

  useEffect(() => {
    if (!booted || events.length === 0) return;
    rendererRef.current?.renderGrid(grid);
    schedulerRef.current?.load(events, 1.3);
    schedulerRef.current?.start();
  }, [booted, events, grid]);

  const selectedContestant = useMemo(
    () => battle?.contestants.find((contestant) => contestant.algorithm === selectedAlgorithm),
    [battle, selectedAlgorithm]
  );

  return (
    <main className="scanlines relative min-h-screen overflow-hidden px-4 py-4 text-slate-100 md:px-6">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(24,245,210,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(24,245,210,0.06)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
      <section className="relative grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-4 xl:grid-cols-[310px_1fr_330px]">
        <aside className="hud-panel z-10 flex flex-col gap-4 rounded-lg p-4">
          <SystemHeader booted={booted} />
          <AlgorithmDock selected={selectedAlgorithm} onSelect={selectAlgorithm} onRun={runBattle} />
          <MetricStrip
            items={[
              { icon: Gauge, label: "AVG FPS", value: telemetry.averageFps.toFixed(1) },
              { icon: Cpu, label: "HEAP MB", value: telemetry.peakHeapMb.toFixed(1) },
              { icon: Zap, label: "DRAW OPS", value: rendererStats.drawCalls.toString() }
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
            <StatusTile icon={RadioTower} label="Events" value={events.length.toString()} />
          </div>
        </section>

        <aside className="hud-panel z-10 flex flex-col gap-4 rounded-lg p-4">
          <TelemetryPanel />
          <LearningPanel epochs={learning.epochs.slice(-18)} confidence={learning.confidence} />
          <MetricStrip
            items={[
              { icon: Orbit, label: "SPRITES", value: rendererStats.activeSprites.toString() },
              { icon: Shield, label: "CONF", value: `${Math.round(learning.confidence * 100)}%` },
              { icon: Activity, label: "NODES", value: selectedContestant?.result.metrics.visitedNodes.toString() ?? "--" }
            ]}
          />
        </aside>
      </section>
    </main>
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
  onRun
}: {
  readonly selected: AlgorithmId;
  readonly onSelect: (algorithm: AlgorithmId) => void;
  readonly onRun: () => void;
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
