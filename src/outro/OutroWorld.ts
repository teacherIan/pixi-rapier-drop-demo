import * as PIXI from 'pixi.js';
import { PixelateFilter, AsciiFilter } from 'pixi-filters';
import { gsap } from 'gsap';
//@ts-ignore
import { PixiPlugin } from 'gsap/PixiPlugin.js';

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

export class OutroWorld {
  private App: PIXI.Application;
  private img: string;
  private initialized: boolean = false;

  constructor(parent: HTMLCanvasElement, img: string) {
    this.App = new PIXI.Application();
    this.img = img;
    this.initApp(parent);
  }

  private async initApp(parent: HTMLCanvasElement): Promise<void> {
    await this.App.init({
      canvas: document.getElementById('outro-canvas') as HTMLCanvasElement,
      resizeTo: parent,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x101935,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    this.App.stage.sortableChildren = true;
    this.initialized = true;

    await this.createBackgroundImage();
    this.createConfetti();
  }

  public async createBackgroundImage(): Promise<void> {
    const bg = await PIXI.Assets.load('/' + this.img.toLowerCase() + 'Dark.jpg');
    const image = PIXI.Sprite.from(bg);
    image.width = 0;
    image.height = 0;
    image.alpha = 1;
    image.zIndex = 0;

    const asciiFilter = new AsciiFilter({ size: 6 });
    const displacementMap = await PIXI.Assets.load('/displacement_map_repeat.jpg');

    const displacementSprite = new PIXI.Sprite(displacementMap);
    image.addChild(displacementSprite);

    const displacementSpriteFilter = new PIXI.DisplacementFilter({
      sprite: displacementSprite,
      scale: { x: 600, y: 300 },
    });

    displacementSpriteFilter.padding = 100;
    displacementSprite.texture.source.wrapMode = 'repeat';

    const filter = new PixelateFilter(6);
    image.filters = [asciiFilter, displacementSpriteFilter];

    this.App.stage.addChild(image);
    gsap.to(image, {
      pixi: {
        height: window.innerHeight - window.innerHeight / 4,
        width: window.innerWidth,
        alpha: 1,
      },
      duration: 10,
    });

    this.App.ticker.add(() => {
      displacementSprite.x += 1;
    });
  }

  private createConfetti(): void {
    const confettiContainer = new PIXI.Container();
    this.App.stage.addChild(confettiContainer);

    const characters = ['🥳', '🎉', '✨'];

    // Create textures from text
    const textures = characters.map((c) => {
      const counterStyle = new PIXI.TextStyle({
        fontSize: window.innerWidth < 1000 ? 50 : 100,
      });

      const confettiIcon = new PIXI.Text({ text: c, style: counterStyle });
      return this.App.renderer.generateTexture(confettiIcon);
    });

    const confettiAmount = 70;
    const confetti = new Array(confettiAmount)
      .fill(null)
      .map((_, i) => {
        return {
          character: characters[i % characters.length],
          x: Math.random() * window.innerWidth - 10,
          y: -200 - Math.random() * 1000,
          r: 0.1 + Math.random(),
        };
      })
      .sort((a, b) => a.r - b.r);

    for (let i = 0; i < confettiAmount; i++) {
      const confettiIconSprite = new PIXI.Sprite(textures[i % textures.length]);
      confettiIconSprite.x = confetti[i].x;
      confettiIconSprite.y = confetti[i].y;
      confettiIconSprite.zIndex = confetti[i].r;
      confettiIconSprite.scale.set(confetti[i].r);
      confettiIconSprite.cullable = true;

      confettiContainer.addChild(confettiIconSprite);
    }

    this.App.ticker.add((ticker) => {
      confettiContainer.children.forEach((confettiIcon) => {
        confettiIcon.y += 0.1 * confettiIcon.zIndex * ticker.deltaTime * 10;
        if (confettiIcon.y > window.innerHeight) confettiIcon.y = -100;
      });
    });
  }
}
