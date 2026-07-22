import { Application, Container, Sprite, Graphics, Spritesheet } from 'pixi.js';
import { LetterField } from './celebrate/LetterField';
import { GemDigitRow } from './celebrate/GemDigitRow';
import { gemTextStyle } from './celebrate/gemStyle';
import { houseTitle } from './celebrate/layouts';

export default class PixiWorld {
  private app!: Application;
  private stage!: Container;
  private texture: string;
  private ballSize: number;
  private title: string;
  private sheet: Spritesheet;
  private counterRow!: GemDigitRow;
  public titleField!: LetterField;
  private particleContainer!: Container;

  private constructor(
    texture: string,
    ballSize: number,
    name: string,
    sheet: Spritesheet
  ) {
    this.title = name;
    this.texture = texture;
    this.ballSize = ballSize;
    this.sheet = sheet;
  }

  static async create(
    parent: HTMLCanvasElement,
    texture: string,
    ballSize: number,
    name: string,
    color: number,
    sheet: Spritesheet
  ): Promise<PixiWorld> {
    const world = new PixiWorld(texture, ballSize, name, sheet);

    world.app = new Application();
    await world.app.init({
      canvas: parent,
      resizeTo: parent,
      width: window.innerWidth / 4,
      height: window.innerHeight,
      background: 0x101935,
      backgroundAlpha: 1,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    world.stage = world.app.stage;
    world.stage.sortableChildren = true;
    world.particleContainer = new Container();
    world.app.stage.addChild(world.particleContainer);
    world.createLeftWall();
    world.createRightWall();

    // The house name as GEM bubble letters — real physics bodies that stagger
    // in from off-screen one by one and settle high in the lane.
    world.titleField = await LetterField.create(world.app, world.stage, houseTitle(name.toUpperCase()), {
      styleFor: gemTextStyle,
      palette: [color],
      staggerMs: 90,
    });

    // The rolling point counter as gem digits in fixed cells; it drops in
    // (staggered, with a candy overshoot) once the race starts.
    world.counterRow = new GemDigitRow(color, window.innerWidth < 1000 ? 44 : 110);
    world.counterRow.container.position.set(window.innerWidth / 8, window.innerHeight - window.innerHeight / 8);
    world.counterRow.container.zIndex = 600;
    world.app.stage.addChild(world.counterRow.container);
    world.app.ticker.add((t) => world.counterRow.tick(t.deltaMS));

    return world;
  }

  public get App(): Application {
    return this.app;
  }

  public get Stage(): Container {
    return this.stage;
  }

  public get ParticleContainer(): Container {
    return this.particleContainer;
  }

  public createSphere(size: number): Sprite {
    const sphere = Sprite.from(this.sheet.textures[this.texture]);
    sphere.scale.set(size * this.ballSize);
    sphere.anchor.set(0.5);
    return sphere;
  }

  private createLeftWall() {
    const wall = new Graphics();
    wall.rect(0, 0, 1, window.innerHeight).fill(0x000000);
    wall.x = 0;
    wall.y = 0;
    this.app.stage.addChild(wall);
  }

  private createRightWall() {
    const wall = new Graphics();
    wall.rect(0, 0, 1, window.innerHeight).fill(0x000000);
    wall.x = window.innerWidth / 4;
    wall.y = 0;
    this.app.stage.addChild(wall);
  }

  public updateCounterText(num: number) {
    this.counterRow.set(num.toString().padStart(4, '0'));
  }

  /** Drop the counter digits in from the top of the lane. */
  public enterCounter() {
    this.counterRow.enter(window.innerHeight - window.innerHeight / 8 + 140);
  }

  public resize() {
    this.App.resize();
  }

  public getName(): string {
    return this.title;
  }

  /** The title letters' container — the winner fade targets this. */
  public getTitleContainer(): Container {
    return this.titleField.container;
  }
}
