import * as PIXI from 'pixi.js';

export default class PixiWorld {
  private app: PIXI.Application;
  private stage!: PIXI.Container;
  private texture: string;
  private ballSize: number;
  private title: string;
  private color: number;
  private sheet: PIXI.Spritesheet;
  private counterText!: PIXI.BitmapText;
  private counter: number;
  public titleText!: PIXI.BitmapText;
  private particleContainer!: PIXI.Container;
  private canvas: HTMLCanvasElement;

  constructor(
    parent: HTMLCanvasElement,
    texture: string,
    ballSize: number,
    name: string,
    color: number,
    sheet: PIXI.Spritesheet
  ) {
    this.canvas = parent;
    this.title = name;
    this.color = color;
    this.texture = texture;
    this.ballSize = ballSize;
    this.sheet = sheet;
    this.counter = 0;
    this.app = new PIXI.Application();
  }

  async init(): Promise<void> {
    await this.app.init({
      canvas: this.canvas,
      resizeTo: this.canvas,
      width: window.innerWidth / 4,
      height: window.innerHeight,
      backgroundColor: 0x101935,
      backgroundAlpha: 1,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
      hello: true,
    });

    this.stage = this.app.stage;

    // In v8, we use a regular Container for particles (ParticleContainer API changed significantly)
    this.particleContainer = new PIXI.Container();
    this.app.stage.addChild(this.particleContainer);
    this.app.stage.sortableChildren = true;

    this.titleText = this.createTitleText();
    this.createLeftWall();
    this.createRightWall();
    this.counterText = this.createCounterText();
  }

  public get App(): PIXI.Application {
    return this.app;
  }

  public get Stage(): PIXI.Container {
    return this.stage;
  }

  public get ParticleContainer(): PIXI.Container {
    return this.particleContainer;
  }

  public createSphere(size: number): PIXI.Sprite {
    const sphere = PIXI.Sprite.from(this.sheet.textures[this.texture]);
    sphere.scale.set(size * this.ballSize);
    sphere.anchor.set(0.5);
    return sphere;
  }

  private createTitleText(): PIXI.BitmapText {
    const textSprite = new PIXI.BitmapText({
      text: this.title,
      style: {
        fontFamily: 'myFont',
        fontSize: 120,
        align: 'center' as const,
      },
    });
    textSprite.tint = this.color;
    textSprite.x = window.innerWidth / 8;
    textSprite.y = window.innerHeight / 8;
    textSprite.anchor.set(0.5);
    textSprite.zIndex = 0;
    textSprite.scale.set(0, 0);
    textSprite.roundPixels = true;

    this.app.stage.addChild(textSprite);
    return textSprite;
  }

  private createCounterText(): PIXI.BitmapText {
    const num = 0;
    const textSprite = new PIXI.BitmapText({
      text: num.toString(),
      style: {
        fontFamily: 'myFont',
        fontSize: window.innerWidth < 1000 ? 50 : 150,
        align: 'center' as const,
      },
    });
    textSprite.tint = 0xffffff;
    textSprite.x = window.innerWidth / 8;
    textSprite.y = window.innerHeight - window.innerHeight / 8;
    textSprite.anchor.set(0.5);
    textSprite.zIndex = 100;
    textSprite.scale.set(0, 0);

    this.app.stage.addChild(textSprite);
    return textSprite;
  }

  private createLeftWall(): void {
    const wall = new PIXI.Graphics();
    wall.rect(0, 0, 1, window.innerHeight);
    wall.fill(0x000000);
    wall.x = 0;
    wall.y = 0;
    this.app.stage.addChild(wall);
  }

  private createRightWall(): void {
    const wall = new PIXI.Graphics();
    wall.rect(0, 0, 1, window.innerHeight);
    wall.fill(0x000000);
    wall.x = window.innerWidth / 4;
    wall.y = 0;
    this.app.stage.addChild(wall);
  }

  public updateCounterText(num: number): void {
    let text = num.toString();
    while (text.length < 4) {
      text = '0' + text;
    }
    this.counterText.text = text;
  }

  public resize(): void {
    this.app.resize();
  }

  public getName(): string {
    return this.titleText.text;
  }

  public getCounterText(): PIXI.BitmapText {
    return this.counterText;
  }

  public getTitleText(): PIXI.BitmapText {
    return this.titleText;
  }
}
