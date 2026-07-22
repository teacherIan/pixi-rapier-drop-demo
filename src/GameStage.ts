import { Application, Container, Graphics } from 'pixi.js';

/**
 * The whole board on ONE WebGL context. Four separate Applications used to mean
 * four contexts (4x GPU/context overhead, no cross-lane batching) AND clipped
 * the physics letters into 25%-wide boxes so they couldn't fly across the
 * screen. One Application fixes both: lanes are just sub-containers, and the
 * bubble letters live in full-screen space.
 *
 * Layers, back to front: balls (per-lane ParticleContainers) → lane divider
 * walls → counters → titles (on top so a flung letter passes over everything).
 */
export default class GameStage {
  app!: Application;
  readonly ballsLayer = new Container();
  readonly countersLayer = new Container();
  readonly titlesLayer = new Container();
  private walls = new Graphics();
  private laneCount = 4;

  static async create(canvas: HTMLCanvasElement, laneCount: number): Promise<GameStage> {
    const gs = new GameStage();
    gs.laneCount = laneCount;
    gs.app = new Application();
    await gs.app.init({
      textureGCActive: false, // pixi 8.19 pool double-return (see bubble-rapier-text 0.8.2)
      canvas,
      resizeTo: canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      background: 0x101935,
      backgroundAlpha: 1,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    gs.app.stage.sortableChildren = true;
    gs.ballsLayer.zIndex = 0;
    gs.walls.zIndex = 1;
    gs.countersLayer.zIndex = 2;
    gs.titlesLayer.zIndex = 10;
    gs.app.stage.addChild(gs.ballsLayer, gs.walls, gs.countersLayer, gs.titlesLayer);
    gs.drawWalls();
    return gs;
  }

  /** Lane width in CSS px. */
  get laneWidth(): number {
    return window.innerWidth / this.laneCount;
  }

  private drawWalls(): void {
    const h = window.innerHeight;
    const laneW = this.laneWidth;
    this.walls.clear();
    for (let i = 1; i < this.laneCount; i += 1) {
      this.walls.rect(i * laneW - 0.5, 0, 1, h).fill(0x000000);
    }
  }
}
