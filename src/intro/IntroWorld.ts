import { Application, Assets, Container, Sprite, Text, TextStyle, DisplacementFilter } from 'pixi.js';
import { gsap } from '../gsapSetup';

export default class IntroWorld {
  private app!: Application;
  private stage!: Container;

  private constructor() {}


  static async create(parent: HTMLCanvasElement): Promise<IntroWorld> {
    const world = new IntroWorld();

    world.app = new Application();
    await world.app.init({
      canvas: parent,
      width: window.innerWidth,
      height: window.innerHeight,
      background: 0x101935,
      backgroundAlpha: 1,
      resizeTo: parent,
      powerPreference: 'high-performance',
      resolution: Math.min(window.devicePixelRatio, 2),
    });

    world.stage = world.app.stage;
    document.body.appendChild(world.app.canvas as HTMLCanvasElement);

    await world.createDisplacementSprite();

    return world;
  }

  public getStage(): Container {
    return this.stage;
  }

  public getApp(): Application {
    return this.app;
  }

  public createText(text: string) {
    const style = new TextStyle({
      fontFamily: 'Caveat',
      fontWeight: '700',
      fontSize: window.innerWidth / 6,
      fill: '#101935',
      stroke: { color: '#ff6a00', width: 6 },
      dropShadow: {
        color: '#ff4500',
        blur: 35,
        angle: 0,
        distance: 0,
        alpha: 1,
      },
      letterSpacing: 5,
      padding: 40,
    });
    const richText = new Text({ text, style });
    richText.anchor.set(0.5);
    richText.x = this.app.screen.width / 2;
    richText.y = this.app.screen.height / 2;
    richText.scale.set(1.1, 1.2);

    gsap.to(richText.scale, {
      x: 1.15,
      y: 1.25,
      duration: 1.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    window.addEventListener('resize', () => {
      richText.x = this.app.screen.width / 2;
      richText.y = this.app.screen.height / 2;
    });

    return richText;
  }

  public async createDisplacementSprite() {
    const smallScreen = window.innerWidth < 1000 ? -300 : 0;
    const sheet = await Assets.load('/sprites.json');
    const backgroundSprite = Sprite.from(sheet.textures['Orb_08.png']);
    backgroundSprite.eventMode = 'dynamic';
    backgroundSprite.cursor = 'pointer';
    this.stage.addChild(backgroundSprite);
    backgroundSprite.width = window.innerHeight * 1.4 + smallScreen;
    backgroundSprite.height = window.innerHeight * 1.4 + smallScreen;
    backgroundSprite.anchor.set(0.5);
    backgroundSprite.x = this.app.screen.width / 2;
    backgroundSprite.y = this.app.screen.height / 2;

    const displacementMap = await Assets.load('/displacement_map_repeat.jpg');
    const displacementSprite = new Sprite(displacementMap);
    this.stage.addChild(displacementSprite);

    displacementSprite.texture.source.style.addressModeU = 'repeat';
    displacementSprite.texture.source.style.addressModeV = 'repeat';

    const displacementSpriteFilter = new DisplacementFilter({
      sprite: displacementSprite,
      scale: { x: 256, y: 256 },
    });

    window.addEventListener('resize', () => {
      setTimeout(() => {
        backgroundSprite.width = this.app.screen.height * 1.5;
        backgroundSprite.height = this.app.screen.height * 1.5;
        backgroundSprite.x = window.innerWidth / 2;
        backgroundSprite.y = window.innerHeight / 2;
      }, 100);
    });

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
