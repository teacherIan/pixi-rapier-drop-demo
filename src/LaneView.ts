import { Container, Particle, ParticleContainer, Spritesheet, Texture } from 'pixi.js';
import { gsap } from './gsapSetup';
import GameStage from './GameStage';
import { LetterField } from './celebrate/LetterField';
import { GemDigitRow } from './celebrate/GemDigitRow';
import { gemTextStyle } from './celebrate/gemStyle';
import { laneTitle } from './celebrate/layouts';

/**
 * One lane's visuals, living inside the shared GameStage (one WebGL context).
 * The balls are a single ParticleContainer — all of a lane's orbs share one
 * spritesheet frame, so the whole lane batches to one draw call. The title is
 * laid out over the lane but parented into the full-screen titles layer, free
 * to fly across the whole board.
 */
export default class LaneView {
  private texture!: Texture;
  private ballSize!: number;
  private title!: string;
  private ballsContainer = new Container();
  private particles!: ParticleContainer;
  titleField!: LetterField;
  private counterRow!: GemDigitRow;

  private constructor() {}

  static async create(
    stage: GameStage,
    laneIndex: number,
    laneCount: number,
    textureName: string,
    name: string,
    color: number,
    sheet: Spritesheet,
    ballSize: number,
  ): Promise<LaneView> {
    const lv = new LaneView();
    lv.title = name;
    lv.texture = sheet.textures[textureName];
    lv.ballSize = ballSize;

    const laneW = stage.laneWidth;
    lv.ballsContainer.x = laneIndex * laneW;
    stage.ballsLayer.addChild(lv.ballsContainer);

    // All of a lane's balls share one orb frame (one spritesheet base texture),
    // so a single ParticleContainer batches the whole lane to one draw call.
    // Only position is dynamic: the orbs are round, so per-frame rotation is
    // imperceptible but would cost a modulo-heavy angle-lerp and a second GPU
    // upload for every ball. Each ball gets a fixed random spin at spawn for
    // variety instead.
    lv.particles = new ParticleContainer({
      dynamicProperties: { position: true, rotation: false, vertex: false, color: false, uvs: false },
      texture: lv.texture,
    });
    lv.ballsContainer.addChild(lv.particles);

    // The house title as gem bubble letters — laid out over this lane, but in
    // full-screen space so the letters can fly across the whole board.
    lv.titleField = await LetterField.create(
      stage.app,
      stage.titlesLayer,
      laneTitle(name.toUpperCase(), laneIndex, laneCount),
      { styleFor: gemTextStyle, palette: [color], staggerMs: 90 },
    );

    // The rolling point counter as gem digits, centred at the bottom of the lane.
    lv.counterRow = new GemDigitRow(color, window.innerWidth < 1000 ? 44 : 110);
    lv.counterRow.container.position.set((laneIndex + 0.5) * laneW, window.innerHeight - window.innerHeight / 8);
    stage.countersLayer.addChild(lv.counterRow.container);
    stage.app.ticker.add((t) => lv.counterRow.tick(t.deltaMS));

    return lv;
  }

  /** Mint a ball particle at lane-local (x, y). Returns it so the sim can
   * interpolate its pose each render frame. */
  spawnParticle(x: number, y: number, size: number): Particle {
    const p = new Particle({ texture: this.texture, anchorX: 0.5, anchorY: 0.5 });
    p.scaleX = size * this.ballSize;
    p.scaleY = size * this.ballSize;
    p.x = x;
    p.y = y;
    p.rotation = Math.random() * Math.PI * 2; // fixed random spin (static)
    this.particles.addParticle(p);
    return p;
  }

  updateCounterText(num: number): void {
    this.counterRow.set(num.toString().padStart(4, '0'));
  }

  enterCounter(): void {
    this.counterRow.enter(window.innerHeight - window.innerHeight / 8 + 140);
  }

  getName(): string {
    return this.title;
  }

  /** The title letters' container — the winner fade targets this. */
  getTitleContainer(): Container {
    return this.titleField.container;
  }

  /** Dim this whole lane (balls + counter + title) — the loser fade. */
  fadeLane(alpha: number, duration: number): void {
    gsap.to(this.ballsContainer, { pixi: { alpha }, duration });
    gsap.to(this.counterRow.container, { pixi: { alpha }, duration });
    gsap.to(this.titleField.container, { pixi: { alpha }, duration });
  }
}
