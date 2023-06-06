import * as PIXI from 'pixi.js';
import { PixelateFilter } from '@pixi/filter-pixelate';
import { AsciiFilter } from '@pixi/filter-ascii';
import { gsap } from 'gsap';
//@ts-ignore
import { PixiPlugin } from 'gsap/PixiPlugin.js';

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

PIXI.Filter.defaultResolution = 2;

export class OutroWorld {
  private App;
  private img;

  constructor(parent: HTMLCanvasElement, img: string) {
    this.App = new PIXI.Application({
      view: document.getElementById('outro-canvas') as HTMLCanvasElement,
      resizeTo: parent,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x101935,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });
    this.img = img;
    this.App.stage.sortableChildren = true;

    this.createBackgroundImage().then(() => {
      this.createConfetti();
    });
  }

  public async createBackgroundImage() {
    //@ts-ignore
    let bg = await PIXI.Assets.load('/' + this.img.toLowerCase() + 'Dark.jpg');
    const image = PIXI.Sprite.from(bg);
    image.width = 0;
    image.height = 0;
    image.alpha = 1;
    image.zIndex = 0;

    const asciiFilter = new AsciiFilter();
    asciiFilter.size = 6; //6
    let displacementMap = await PIXI.Assets.load(
      '/displacement_map_repeat.jpg'
    );

    const displacementSprite = new PIXI.Sprite(displacementMap);
    image.addChild(displacementSprite);
    const displacementSpriteFilter = new PIXI.DisplacementFilter(
      displacementSprite
    );

    displacementSpriteFilter.autoFit = false;
    displacementSpriteFilter.scale.x = 600;
    displacementSpriteFilter.scale.y = 300;
    displacementSpriteFilter.padding = 100;

    displacementSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;

    const filter = new PixelateFilter();
    filter.size = 6;
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

    this.App.ticker.add((delta) => {
      displacementSprite.x += 1;
      // displacementSprite.y += 1;
    });
  }

  private createConfetti() {
    let confettiContainer = new PIXI.Container();
    this.App.stage.addChild(confettiContainer);

    let characters = ['🥳', '🎉', '✨'];
    //turn characters into textures
    let textures = characters.map((c) => {
      const counterStyle = new PIXI.TextStyle({
        fontSize: 100,
      });

      const confettiIcon = new PIXI.Text(c, counterStyle);
      return this.App.renderer.generateTexture(confettiIcon);
    });

    let confettiAmount = 70;
    let confetti = new Array(confettiAmount)
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

    this.App.ticker.add((delta) => {
      confettiContainer.children.forEach((confettiIcon) => {
        confettiIcon.y += 0.1 * confettiIcon.zIndex * delta * 10;
        if (confettiIcon.y > window.innerHeight) confettiIcon.y = -100;
      });
    });
  }
}
