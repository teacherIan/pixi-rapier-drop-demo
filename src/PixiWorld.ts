import { Application, Container, Sprite, Text, TextStyle, Graphics, Spritesheet } from 'pixi.js';

export default class PixiWorld {
  private app!: Application;
  private stage!: Container;
  private texture: string;
  private ballSize: number;
  private title: string;
  private color: number;
  private sheet: Spritesheet;
  private counterText!: Text;
  public titleText!: Text;
  private particleContainer!: Container;

  private constructor(
    texture: string,
    ballSize: number,
    name: string,
    color: number,
    sheet: Spritesheet
  ) {
    this.title = name;
    this.color = color;
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
    const world = new PixiWorld(texture, ballSize, name, color, sheet);

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
    world.particleContainer = new Container();
    world.app.stage.addChild(world.particleContainer);
    world.titleText = world.createTitleText();
    world.createLeftWall();
    world.createRightWall();
    world.counterText = world.createCounterText();

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

  private createTitleText(): Text {
    const style = new TextStyle({
      fontFamily: 'ARCADECLASSIC',
      fontSize: 120,
      align: 'center',
      fill: this.color,
      stroke: { color: '#000000', width: 6 },
    });
    const textSprite = new Text({ text: this.title, style });

    textSprite.x = window.innerWidth / 8;
    textSprite.y = window.innerHeight / 8;
    textSprite.anchor.set(0.5);
    textSprite.zIndex = 0;
    textSprite.scale.set(0, 0);
    textSprite.roundPixels = true;

    this.app.stage.addChild(textSprite);
    return textSprite;
  }

  private createCounterText(): Text {
    const style = new TextStyle({
      fontFamily: 'ARCADECLASSIC',
      fontSize: window.innerWidth < 1000 ? 50 : 150,
      align: 'center',
      fill: 0xffffff,
      stroke: { color: '#000000', width: 4 },
    });
    const textSprite = new Text({ text: '0', style });

    textSprite.x = window.innerWidth / 8;
    textSprite.y = window.innerHeight - window.innerHeight / 8;
    textSprite.anchor.set(0.5);
    textSprite.zIndex = 100;
    textSprite.scale.set(0, 0);

    this.app.stage.addChild(textSprite);
    return textSprite;
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
    let text = num.toString();
    while (text.length < 4) {
      text = '0' + text;
    }
    this.counterText.text = text;
  }

  public resize() {
    this.App.resize();
  }

  public getName(): string {
    return this.titleText.text;
  }

  public getCounterText(): Text {
    return this.counterText;
  }

  public getTitleText(): Text {
    return this.titleText;
  }
}
