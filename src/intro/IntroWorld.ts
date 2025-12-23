import * as PIXI from 'pixi.js';
import { ShockwaveFilter, AsciiFilter, AdvancedBloomFilter, PixelateFilter } from 'pixi-filters';

export default class IntroWorld {
  private app: PIXI.Application;
  private stage!: PIXI.Container;
  private element!: HTMLCanvasElement;
  private parent: HTMLCanvasElement;

  constructor(parent: HTMLCanvasElement) {
    this.parent = parent;
    this.app = new PIXI.Application();
  }

  async init(): Promise<void> {
    await this.app.init({
      canvas: this.parent,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x101935,
      backgroundAlpha: 1,
      resizeTo: this.parent,
      powerPreference: 'high-performance',
      resolution: Math.min(window.devicePixelRatio, 2),
    });

    this.stage = this.app.stage;
    this.element = document.body.appendChild(this.app.canvas as HTMLCanvasElement);
    this.createDisplacementSprite();
    this.app.stage.sortableChildren = true;
  }

  public getStage(): PIXI.Container {
    return this.stage;
  }

  public getApp(): PIXI.Application {
    return this.app;
  }

  public createText(text: string): PIXI.Text {
    const style = new PIXI.TextStyle({
      fontFamily: 'Impact',
      fontSize: window.innerWidth / 4 + 15,
      fill: '#ffffff',
      stroke: { color: '#000000', width: 5 },
      dropShadow: {
        alpha: 1,
        angle: Math.PI / 6,
        blur: 5,
        color: '#000000',
        distance: 5,
      },
      letterSpacing: 10,
    });

    const richText = new PIXI.Text({ text, style });
    richText.x = window.innerWidth / 2;
    richText.y = window.innerHeight / 2;
    richText.anchor.set(0.5);
    richText.scale.y = 1.5;
    richText.scale.x = 1.2;
    richText.alpha = 1;
    richText.tint = 0xffffff;

    this.app.ticker.add(() => {
      // richText.rotation += 0.0005;
    });

    window.addEventListener('resize', () => {
      console.log('Resize event');
      richText.x = window.innerWidth / 2;
      richText.y = window.innerHeight / 2;
      this.element.width = window.innerWidth / 2;
      this.element.height = window.innerHeight / 2;
    });

    return richText;
  }

  public async createDisplacementSprite(): Promise<PIXI.Sprite> {
    const smallScreen = window.innerWidth < 1000 ? -300 : 0;
    const sheet = await PIXI.Assets.load('/sprites.json');
    const backgroundSprite = PIXI.Sprite.from(sheet.textures['Orb_08.png']);

    backgroundSprite.eventMode = 'dynamic';
    backgroundSprite.cursor = 'pointer';
    this.stage.addChild(backgroundSprite);
    backgroundSprite.width = window.innerHeight * 1.4 + smallScreen;
    backgroundSprite.height = window.innerHeight * 1.4 + smallScreen;
    backgroundSprite.anchor.set(0.5);
    backgroundSprite.x = this.app.screen.width / 2;
    backgroundSprite.y = this.app.screen.height / 2;

    const displacementMap = await PIXI.Assets.load('/displacement_map_repeat.jpg');
    const displacementSprite = new PIXI.Sprite(displacementMap);
    this.stage.addChild(displacementSprite);

    const displacementSpriteFilter = new PIXI.DisplacementFilter({
      sprite: displacementSprite,
      scale: { x: 256, y: 256 },
    });

    window.addEventListener('resize', () => {
      console.log('Resize event');
      setTimeout(() => {
        backgroundSprite.width = this.app.screen.height * 1.5;
        backgroundSprite.height = this.app.screen.height * 1.5;
        backgroundSprite.x = window.innerWidth / 2;
        backgroundSprite.y = window.innerHeight / 2;
      }, 100);
    });

    displacementSpriteFilter.padding = 100;
    displacementSprite.texture.source.wrapMode = 'repeat';

    const asciiFilter = new AsciiFilter({ size: 6 });

    const bloomFilter = new AdvancedBloomFilter({
      threshold: 0.5,
      bloomScale: 0.5,
      brightness: 50,
      blur: 0.0,
      quality: 1.0,
    });

    const pixelateFilter = new PixelateFilter(6);

    backgroundSprite.filters = [displacementSpriteFilter];

    let currentTime = 0;

    this.app.ticker.add(() => {
      backgroundSprite.rotation += 0.0005;
      displacementSprite.x += 0.5;
      displacementSprite.y += 0.5;
      currentTime += 0.001;
      displacementSpriteFilter.scale.x = Math.cos(currentTime) * 300;
    });

    return displacementSprite;
  }
}
