import { Container, Graphics } from "pixi.js";

export class CrtOverlay {
  readonly container = new Container();
  private readonly scanlines = new Graphics();
  private width = 0;
  private height = 0;

  constructor() {
    this.container.label = "crt-scanline-shader-overlay";
    this.container.addChild(this.scanlines);
  }

  resize(width: number, height: number): void {
    if (this.width === width && this.height === height) return;
    this.width = width;
    this.height = height;
    this.scanlines.clear();
    for (let y = 0; y < height; y += 5) {
      this.scanlines.rect(0, y, width, 1);
      this.scanlines.fill({ color: 0x9fffee, alpha: 0.045 });
    }
    this.scanlines.rect(0, 0, width, height);
    this.scanlines.stroke({ color: 0x18f5d2, alpha: 0.16, width: 1 });
  }
}
