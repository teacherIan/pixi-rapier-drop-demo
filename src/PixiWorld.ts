import * as PIXI from 'pixi.js';

PIXI.Filter.defaultResolution = 2;

export default class PixiWorld {
  private app: PIXI.Application;
  private stage: PIXI.Container;
  private texture: string;
  private ballSize: number;
  private title: string;
  private color: number;
  private sheet;
  private counterText: PIXI.BitmapText;
  private counter: number;
  public titleText: PIXI.BitmapText;
  private particleContainer: PIXI.ParticleContainer;

  constructor(
    parent: HTMLCanvasElement,
    texture: string,
    ballSize: number,
    name: string,
    color: number,
    sheet: any
  ) {
    this.title = name;
    this.color = color;
    this.texture = texture;
    this.ballSize = ballSize;
    this.sheet = sheet;
    this.counter = 0;
    this.particleContainer = new PIXI.ParticleContainer(10000, {
      scale: true,
      position: true,
      rotation: true,
      uvs: true,
      alpha: true,
    });
    this.app = new PIXI.Application({
      view: parent,
      resizeTo: parent,
      width: window.innerWidth / 4,
      height: window.innerHeight,
      backgroundColor: 0x101935,
      backgroundAlpha: 1,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });
    this.stage = this.app.stage;
    this.App.stage.addChild(this.particleContainer);
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

  public get ParticleContainer(): PIXI.ParticleContainer {
    return this.particleContainer;
  }

  public createSphere(size: number): PIXI.Sprite {
    const sphere = PIXI.Sprite.from(this.sheet.textures[this.texture]);
    sphere.scale.set(size * this.ballSize);
    sphere.anchor.set(0.5);
    return sphere;
  }

  private createTitleText() {
    const textSprite: PIXI.BitmapText = new PIXI.BitmapText(this.title, {
      fontName: 'myFont',
      fontSize: 120,
      align: 'center',
      tint: this.color,
    });

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
    let num = 0;
    const textSprite: PIXI.BitmapText = new PIXI.BitmapText(num.toString(), {
      fontName: 'myFont',
      fontSize: 150,
      align: 'center',
      tint: 0xffffff,
      // letterSpacing: 50,
    });

    textSprite.x = window.innerWidth / 8;
    textSprite.y = window.innerHeight - window.innerHeight / 8;
    textSprite.anchor.set(0.5);
    textSprite.zIndex = 100;
    // textSprite.scale.y = 2;

    textSprite.scale.set(0, 0);

    this.app.stage.addChild(textSprite);
    return textSprite;
  }

  private createLeftWall() {
    const wall = new PIXI.Graphics();
    wall.beginFill(0x000000);
    wall.drawRect(0, 0, 1, window.innerHeight);
    wall.endFill();
    wall.x = 0;
    wall.y = 0;
    this.app.stage.addChild(wall);
  }

  private createRightWall() {
    const wall = new PIXI.Graphics();
    wall.beginFill(0x000000);
    wall.drawRect(0, 0, 1, window.innerHeight);
    wall.endFill();
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

  public getCounterText(): PIXI.BitmapText {
    return this.counterText;
  }

  public getTitleText(): PIXI.BitmapText {
    return this.titleText;
  }
}
