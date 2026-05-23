import { Application, BlurFilter, Container, Graphics } from "pixi.js";
import type { AlgorithmId, BattleResult, GridModel, GridPosition, PathfinderEvent } from "../core/types";
import { CrtOverlay } from "./crt-overlay";
import { GpuParticleEngine } from "./gpu-particle-engine";
import { NeonTrailSystem } from "./neon-trail-system";
import { AdaptiveRenderQuality, type RenderQualityMode, type RenderQualityProfile } from "./render-quality";

export interface RendererDiagnostics {
  readonly drawCalls: number;
  readonly activeSprites: number;
  readonly activeParticles: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly qualityMode: RenderQualityMode;
  readonly splitScreenLanes: number;
}

export interface PixiGridRendererOptions {
  readonly backgroundColor?: number;
  readonly resolution?: number;
}

const colors = {
  empty: 0x13212a,
  wall: 0x04070a,
  weight: 0x3c3146,
  start: 0x18f5d2,
  target: 0xffce3a,
  visited: 0x4e8cff,
  frontier: 0x7c5cff,
  path: 0xff4d6d
};

const algorithmColors: Record<AlgorithmId, number> = {
  astar: 0x18f5d2,
  dijkstra: 0xffce3a,
  bfs: 0x4e8cff,
  dfs: 0xff4d6d,
  greedy: 0x8cff5a,
  bidirectional: 0xd45cff
};

interface ViewportLayout {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly algorithm?: AlgorithmId;
}

export class PixiGridRenderer {
  private app: Application | undefined;
  private readonly world = new Container();
  private readonly baseLayer = new Container();
  private readonly glowLayer = new Container();
  private readonly eventLayer = new Container();
  private readonly hudLayer = new Container();
  private readonly crtOverlay = new CrtOverlay();
  private readonly quality = new AdaptiveRenderQuality();
  private readonly bloomFilter = new BlurFilter({ strength: 3, quality: 3, resolution: 0.55 });
  private readonly particleEngine = new GpuParticleEngine(this.quality.current);
  private readonly trailSystem = new NeonTrailSystem(this.quality.current);
  private grid: GridModel | undefined;
  private layouts: readonly ViewportLayout[] = [];
  private cellSize = 12;
  private drawCalls = 0;

  async mount(host: HTMLElement, options: PixiGridRendererOptions = {}): Promise<void> {
    this.destroy();
    this.app = new Application();
    await this.app.init({
      resizeTo: host,
      antialias: false,
      backgroundAlpha: 0,
      backgroundColor: options.backgroundColor ?? 0x05070a,
      resolution: options.resolution ?? Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      preference: "webgl"
    });
    host.appendChild(this.app.canvas);
    this.world.sortableChildren = false;
    this.glowLayer.filters = [this.bloomFilter];
    this.glowLayer.addChild(this.eventLayer);
    this.glowLayer.addChild(this.trailSystem.container);
    this.particleEngine.attach(this.glowLayer);
    this.world.addChild(this.baseLayer, this.glowLayer, this.hudLayer, this.crtOverlay.container);
    this.app.stage.addChild(this.world);
    this.app.ticker.add((ticker) => {
      this.updateEffects(ticker.deltaMS);
    });
  }

  renderGrid(grid: GridModel): void {
    if (!this.app) return;
    this.grid = grid;
    this.baseLayer.removeChildren();
    this.eventLayer.removeChildren();
    this.hudLayer.removeChildren();
    this.trailSystem.clear();
    this.particleEngine.clear();
    this.drawCalls = 0;

    const viewportWidth = this.app.renderer.width / this.app.renderer.resolution;
    const viewportHeight = this.app.renderer.height / this.app.renderer.resolution;
    this.crtOverlay.resize(viewportWidth, viewportHeight);
    const layout = this.createLayout(grid, 0, 0, viewportWidth, viewportHeight);
    this.layouts = [layout];
    this.cellSize = layout.cellSize;
    this.drawGridInto(layout, grid);
  }

  renderBattleGrid(grid: GridModel, battle: BattleResult): void {
    if (!this.app) return;
    this.grid = grid;
    this.baseLayer.removeChildren();
    this.eventLayer.removeChildren();
    this.hudLayer.removeChildren();
    this.trailSystem.clear();
    this.particleEngine.clear();
    this.drawCalls = 0;

    const viewportWidth = this.app.renderer.width / this.app.renderer.resolution;
    const viewportHeight = this.app.renderer.height / this.app.renderer.resolution;
    this.crtOverlay.resize(viewportWidth, viewportHeight);
    const contestants = battle.contestants.slice(0, 4);
    const columns = contestants.length > 2 ? 2 : contestants.length;
    const rows = contestants.length > 2 ? 2 : 1;
    const laneWidth = viewportWidth / Math.max(columns, 1);
    const laneHeight = viewportHeight / Math.max(rows, 1);

    this.layouts = contestants.map((contestant, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const layout = this.createLayout(grid, column * laneWidth, row * laneHeight, laneWidth, laneHeight, contestant.algorithm);
      this.drawGridInto(layout, grid);
      this.drawLaneHud(layout, contestant.algorithm, contestant.rank);
      return layout;
    });
    this.cellSize = this.layouts[0]?.cellSize ?? 12;
  }

  applyRaceEvents(batches: readonly { readonly lane: number; readonly events: readonly PathfinderEvent[] }[]): void {
    for (const batch of batches) {
      this.applyEvents(batch.events, batch.lane);
    }
  }

  applyEvents(events: readonly PathfinderEvent[], lane = 0): void {
    if (!this.app || !this.grid) return;
    const layout = this.layouts[lane] ?? this.layouts[0];
    if (!layout) return;
    const batch = new Graphics();
    const limitedEvents = events.slice(0, this.quality.current.eventBatchLimit);

    for (const event of limitedEvents) {
      const color =
        event.type === "path" ? colors.path : event.type === "queued" ? algorithmColors[event.algorithm] : colors.visited;
      const alpha = event.type === "path" ? 0.94 : event.type === "visited" ? 0.52 : 0.38;
      this.drawCell(batch, event.position, layout, color, alpha);
      this.drawCalls += 1;
    }

    this.eventLayer.addChild(batch);
    this.trailSystem.ingest(limitedEvents, this.projectPosition, lane);
    this.particleEngine.burstFromEvents(limitedEvents, this.projectPosition, lane);
    if (this.eventLayer.children.length > 240) {
      this.eventLayer.removeChildAt(0);
    }
  }

  highlightPath(path: readonly GridPosition[]): void {
    this.applyEvents(path.map((position, depth) => ({
      algorithm: "astar",
      type: "path",
      position,
      cost: depth,
      depth,
      timestamp: performance.now()
    })));
  }

  diagnostics(): RendererDiagnostics {
    const renderer = this.app?.renderer;
    return {
      drawCalls: this.drawCalls,
      activeSprites: this.eventLayer.children.length + this.world.children.length + this.hudLayer.children.length,
      activeParticles: this.particleEngine.activeCount,
      viewportWidth: renderer ? renderer.width / renderer.resolution : 0,
      viewportHeight: renderer ? renderer.height / renderer.resolution : 0,
      qualityMode: this.quality.current.mode,
      splitScreenLanes: this.layouts.length
    };
  }

  destroy(): void {
    this.app?.destroy(true);
    this.app = undefined;
    this.baseLayer.removeChildren();
    this.eventLayer.removeChildren();
    this.hudLayer.removeChildren();
    this.trailSystem.clear();
    this.particleEngine.clear();
  }

  setQuality(profile: RenderQualityProfile): void {
    this.particleEngine.setQuality(profile);
    this.trailSystem.setQuality(profile);
    this.bloomFilter.strength = profile.glowStrength;
    this.bloomFilter.resolution = profile.effectResolution;
  }

  updateQuality(snapshot: Parameters<AdaptiveRenderQuality["evaluate"]>[0]): void {
    this.setQuality(this.quality.evaluate(snapshot));
  }

  private updateEffects(deltaMs: number): void {
    this.trailSystem.update(deltaMs);
    this.particleEngine.update(deltaMs);
  }

  private createLayout(
    grid: GridModel,
    x: number,
    y: number,
    width: number,
    height: number,
    algorithm?: AlgorithmId
  ): ViewportLayout {
    const padding = Math.max(18, Math.min(width, height) * 0.06);
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2 - 34);
    const cellSize = Math.max(3, Math.floor(Math.min(availableWidth / grid.width, availableHeight / grid.height)));
    const gridWidth = grid.width * cellSize;
    const gridHeight = grid.height * cellSize;
    const layout = {
      x: Math.floor(x + (width - gridWidth) / 2),
      y: Math.floor(y + (height - gridHeight) / 2 + 14),
      width: gridWidth,
      height: gridHeight,
      cellSize
    };
    return algorithm ? { ...layout, algorithm } : layout;
  }

  private drawGridInto(layout: ViewportLayout, grid: GridModel): void {
    const baseLayer = new Graphics();
    for (const cell of grid.cells) {
      const tint = colors[cell.kind];
      baseLayer.rect(layout.x + cell.x * layout.cellSize, layout.y + cell.y * layout.cellSize, layout.cellSize - 1, layout.cellSize - 1);
      baseLayer.fill({ color: tint, alpha: cell.kind === "empty" ? 0.36 : 0.88 });
      this.drawCalls += 1;
    }
    baseLayer.rect(layout.x - 7, layout.y - 7, layout.width + 14, layout.height + 14);
    baseLayer.stroke({ color: layout.algorithm ? algorithmColors[layout.algorithm] : 0x18f5d2, alpha: 0.35, width: 1 });
    this.baseLayer.addChild(baseLayer);
  }

  private drawLaneHud(layout: ViewportLayout, algorithm: AlgorithmId, rank: number): void {
    const hud = new Graphics();
    const color = algorithmColors[algorithm];
    hud.rect(layout.x - 7, layout.y - 34, Math.min(190, layout.width + 14), 22);
    hud.fill({ color, alpha: 0.16 });
    hud.stroke({ color, alpha: 0.48, width: 1 });
    hud.rect(layout.x - 2, layout.y - 26, 14 + rank * 8, 6);
    hud.fill({ color, alpha: 0.76 });
    this.hudLayer.addChild(hud);
  }

  private readonly projectPosition = (position: GridPosition, lane: number): { readonly x: number; readonly y: number } => {
    const layout = this.layouts[lane] ?? this.layouts[0];
    if (!layout) return { x: 0, y: 0 };
    return {
      x: layout.x + position.x * layout.cellSize + layout.cellSize / 2,
      y: layout.y + position.y * layout.cellSize + layout.cellSize / 2
    };
  };

  private drawCell(graphics: Graphics, position: GridPosition, layout: ViewportLayout, color: number, alpha: number): void {
    const inset = Math.max(1, Math.floor(layout.cellSize * 0.16));
    graphics
      .rect(
        layout.x + position.x * layout.cellSize + inset,
        layout.y + position.y * layout.cellSize + inset,
        Math.max(1, layout.cellSize - inset * 2),
        Math.max(1, layout.cellSize - inset * 2)
      )
      .fill({ color, alpha });
  }
}
