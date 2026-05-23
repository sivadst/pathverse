# PATHVERSE AI

PATHVERSE AI is a realtime navigation operating system foundation built around GPU-accelerated visualization, production pathfinding primitives, algorithm battles, telemetry, and adaptive AI training signals.

## Phase 1 Architecture

- **Core engine:** strict TypeScript grid models, binary `MinHeap`, ring-buffer queue, shared pathfinder contracts, reusable event streams.
- **Pathfinding:** A*, Dijkstra, BFS, DFS, Greedy Best First Search, and Bidirectional Search with metrics and visualization events.
- **Simulation:** battle orchestrator ranks algorithms by path quality, speed, and exploration efficiency.
- **Rendering:** PixiJS/WebGL command-grid renderer with batched event overlays and renderer diagnostics.
- **Telemetry:** FPS, render timing, heap sampling, memory estimates, algorithm efficiency scoring, and benchmark hooks.
- **AI signals:** Deep-Q-learning-inspired exploration/exploitation agent with reward curves, visit heatmaps, and confidence tracking.
- **UI:** Next.js 15 command center with cinematic HUD panels, live metrics, algorithm controls, and WebGL visualization.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
```

## Commit Strategy

```bash
git add .
git commit -m "feat(engine): implement high performance pathfinding core"
git push origin main
```

## Phase 1 Files

- `src/engine/core/*` contains shared models, grid helpers, heap, and queue infrastructure.
- `src/engine/algorithms/*` contains production pathfinder implementations.
- `src/engine/battle/*` runs synchronized algorithm battles.
- `src/engine/scheduler/*` streams events through `requestAnimationFrame`.
- `src/engine/telemetry/*` records runtime diagnostics and algorithm scoring.
- `src/engine/rendering/*` owns the PixiJS/WebGL renderer.
- `src/engine/ai/*` contains the learning agent.
- `components/command-center/*` and `app/*` expose the operating surface.
- `tests/engine/*` validates the heap, pathfinders, and battle orchestrator.

## Phase 1.5 Cinematic Rendering Evolution

- **GPU particles:** `GpuParticleEngine` uses Pixi's particle container path for batched event sparks.
- **Neon trails:** `NeonTrailSystem` draws algorithm motion trails without involving React in the render loop.
- **Glow pipeline:** Pixi blur filtering is applied once to the glow layer for a bloom-style pass.
- **CRT overlay:** the renderer owns scanline and viewport border effects inside the Pixi scene.
- **Adaptive quality:** `AdaptiveRenderQuality` responds to FPS, render time, and dropped-frame ratio.
- **Split-screen races:** `renderBattleGrid` creates synchronized lanes for the top battle contestants.
- **Race scheduler:** `RaceScheduler` advances all algorithm event streams on the same animation clock.
- **HUD diagnostics:** frame p95, render timing, dropped-frame ratio, particles, quality mode, lanes, and sprites are visible in the command center.

## Phase 2 Neural Intelligence Evolution

- **Neural learning engine:** `NeuralLearningEngine` adds state-action Q memory, exploration/exploitation, reward adaptation, obstacle memory, confidence scoring, convergence tracking, and best-path prediction.
- **Neural memory:** `NeuralMemoryStore` persists learned Q-values, visits, rewards, obstacle memory, failures, and best path snapshots in browser storage.
- **Live cognition rendering:** `NeuralVisualizationLayer` renders confidence heatmaps, reward gradients, prediction fields, reward propagation waves, and future-path estimation inside the Pixi renderer.
- **Swarm intelligence:** `SwarmIntelligenceSystem` simulates multiple communicating agents with collision avoidance, formation scoring, and distributed routing behavior.
- **Enterprise AI telemetry:** telemetry now includes neural confidence, convergence, memory size, reward trend, prediction cells, swarm signal count, formation score, and collision risk.
- **Command center OS:** the UI adds a cinematic boot console, trainable neural core controls, neural diagnostics, swarm diagnostics, and a draggable holographic operations panel.
- **Camera foundation:** `CinematicCameraController` provides tactical/focus/replay camera state for future world-scale simulation and replay flyovers.

## Next Phases

1. FastAPI backend with async repository/service architecture.
2. Redis-backed WebSocket rooms for multiplayer algorithm races.
3. PostgreSQL telemetry persistence with Alembic migrations.
4. JWT/RBAC security layer and protected simulation APIs.
5. Docker, Nginx, GitHub Actions, and production health checks.
