import { Application, Container, Graphics } from "pixi.js";
import type { GridModel, GridPosition, PathfinderEvent } from "../core/types";

export interface RendererDiagnostics {
  readonly drawCalls: number;
  readonly activeSprites: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
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

export class PixiGridRenderer {
  private app: Application | undefined;
  private readonly world = new Container();
  private readonly eventLayer = new Container();
  private grid: GridModel | undefined;
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
    this.world.addChild(this.eventLayer);
    this.app.stage.addChild(this.world);
  }

  renderGrid(grid: GridModel): void {
    if (!this.app) return;
    this.grid = grid;
    this.world.removeChildren();
    this.eventLayer.removeChildren();
    this.drawCalls = 0;

    const viewportWidth = this.app.renderer.width / this.app.renderer.resolution;
    const viewportHeight = this.app.renderer.height / this.app.renderer.resolution;
    this.cellSize = Math.max(4, Math.floor(Math.min(viewportWidth / grid.width, viewportHeight / grid.height)));
    const offsetX = Math.floor((viewportWidth - grid.width * this.cellSize) / 2);
    const offsetY = Math.floor((viewportHeight - grid.height * this.cellSize) / 2);

    const baseLayer = new Graphics();
    for (const cell of grid.cells) {
      const tint = colors[cell.kind];
      baseLayer.rect(offsetX + cell.x * this.cellSize, offsetY + cell.y * this.cellSize, this.cellSize - 1, this.cellSize - 1);
      baseLayer.fill({ color: tint, alpha: cell.kind === "empty" ? 0.54 : 0.92 });
      this.drawCalls += 1;
    }
    this.world.addChild(baseLayer);
    this.world.addChild(this.eventLayer);
  }

  applyEvents(events: readonly PathfinderEvent[]): void {
    if (!this.app || !this.grid) return;
    const viewportWidth = this.app.renderer.width / this.app.renderer.resolution;
    const viewportHeight = this.app.renderer.height / this.app.renderer.resolution;
    const offsetX = Math.floor((viewportWidth - this.grid.width * this.cellSize) / 2);
    const offsetY = Math.floor((viewportHeight - this.grid.height * this.cellSize) / 2);
    const batch = new Graphics();

    for (const event of events) {
      const color = event.type === "path" ? colors.path : event.type === "queued" ? colors.frontier : colors.visited;
      const alpha = event.type === "path" ? 0.94 : event.type === "visited" ? 0.52 : 0.38;
      this.drawCell(batch, event.position, offsetX, offsetY, color, alpha);
      this.drawCalls += 1;
    }

    this.eventLayer.addChild(batch);
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
      activeSprites: this.eventLayer.children.length + this.world.children.length,
      viewportWidth: renderer ? renderer.width / renderer.resolution : 0,
      viewportHeight: renderer ? renderer.height / renderer.resolution : 0
    };
  }

  destroy(): void {
    this.app?.destroy(true);
    this.app = undefined;
    this.world.removeChildren();
    this.eventLayer.removeChildren();
  }

  private drawCell(graphics: Graphics, position: GridPosition, offsetX: number, offsetY: number, color: number, alpha: number): void {
    const inset = Math.max(1, Math.floor(this.cellSize * 0.16));
    graphics
      .rect(
        offsetX + position.x * this.cellSize + inset,
        offsetY + position.y * this.cellSize + inset,
        Math.max(1, this.cellSize - inset * 2),
        Math.max(1, this.cellSize - inset * 2)
      )
      .fill({ color, alpha });
  }
}
