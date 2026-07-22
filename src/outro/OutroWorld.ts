import { Application, Assets, Container, Sprite, Text, TextStyle, DisplacementFilter } from 'pixi.js';
import { LetterField } from '../celebrate/LetterField';
import { gemTextStyle, HOUSE_COLORS } from '../celebrate/gemStyle';
import { winnerLayout } from '../celebrate/layouts';
import { AsciiFilter } from 'pixi-filters';
import { gsap } from '../gsapSetup';

export class OutroWorld {
  private app!: Application;
  private img: string;

  private constructor(img: string) {
    this.img = img;
  }

  static async create(parent: HTMLCanvasElement, img: string): Promise<OutroWorld> {
    const world = new OutroWorld(img);

    world.app = new Application();
    await world.app.init({
      canvas: document.getElementById('outro-canvas') as HTMLCanvasElement,
      resizeTo: parent,
      width: window.innerWidth,
      height: window.innerHeight,
      background: 0x101935,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    await world.createBackgroundImage();
    world.createConfetti();
    await world.createWinnerText();

    return world;
  }

  private async createBackgroundImage() {
    const bg = await Assets.load('/' + this.img.toLowerCase() + 'Dark.jpg');
    const image = Sprite.from(bg);
    image.width = 0;
    image.height = 0;
    image.alpha = 1;
    image.zIndex = 0;

    const displacementMap = await Assets.load('/displacement_map_repeat.jpg');
    const displacementSprite = new Sprite(displacementMap);
    this.app.stage.addChild(displacementSprite);

    displacementSprite.texture.source.style.addressModeU = 'repeat';
    displacementSprite.texture.source.style.addressModeV = 'repeat';

    const displacementSpriteFilter = new DisplacementFilter({
      sprite: displacementSprite,
      scale: { x: 300, y: 150 },
    });

    const asciiFilter = new AsciiFilter();
    image.filters = [asciiFilter, displacementSpriteFilter];

    this.app.stage.addChild(image);
    gsap.to(image, {
      pixi: {
        height: window.innerHeight - window.innerHeight / 4,
        width: window.innerWidth,
        alpha: 1,
      },
      duration: 10,
    });

    this.app.ticker.add(() => {
      displacementSprite.x += 1;
    });
  }

  // WINNER + the house's name, as that house's gem letters — they stagger in
  // from off-screen and settle over the ascii-melted gem while the confetti
  // falls. Draggable: the kiosk crowd can fling the word around.
  private async createWinnerText() {
    const house = this.img.toLowerCase() as keyof typeof HOUSE_COLORS;
    const color = HOUSE_COLORS[house] ?? 0xffffff;
    this.app.stage.sortableChildren = true;
    await LetterField.create(this.app, this.app.stage, winnerLayout(this.img.toUpperCase()), {
      styleFor: gemTextStyle,
      palette: [color],
      staggerMs: 110,
      interactive: true,
    });
  }

  private createConfetti() {
    const confettiContainer = new Container();
    this.app.stage.addChild(confettiContainer);

    const characters = ['🥳', '🎉', '✨'];
    const textures = characters.map((c) => {
      const style = new TextStyle({
        fontSize: window.innerWidth < 1000 ? 50 : 100,
      });
      const confettiIcon = new Text({ text: c, style });
      return this.app.renderer.generateTexture(confettiIcon);
    });

    const confettiAmount = 70;
    const confetti = new Array(confettiAmount)
      .fill(null)
      .map((_, i) => ({
        character: characters[i % characters.length],
        x: Math.random() * window.innerWidth - 10,
        y: -200 - Math.random() * 1000,
        r: 0.1 + Math.random(),
      }))
      .sort((a, b) => a.r - b.r);

    for (let i = 0; i < confettiAmount; i++) {
      const confettiIconSprite = new Sprite(textures[i % textures.length]);
      confettiIconSprite.x = confetti[i].x;
      confettiIconSprite.y = confetti[i].y;
      confettiIconSprite.zIndex = confetti[i].r;
      confettiIconSprite.scale.set(confetti[i].r);
      confettiIconSprite.cullable = true;
      confettiContainer.addChild(confettiIconSprite);
    }

    this.app.ticker.add((ticker) => {
      const delta = ticker.deltaTime;
      confettiContainer.children.forEach((confettiIcon) => {
        confettiIcon.y += 0.1 * confettiIcon.zIndex * delta * 10;
        if (confettiIcon.y > window.innerHeight) confettiIcon.y = -100;
      });
    });
  }
}
