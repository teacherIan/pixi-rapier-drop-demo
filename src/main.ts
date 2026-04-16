import './style.css';
import PixiWorld from './PixiWorld';
import { Application, Assets, Container, Spritesheet, Text } from 'pixi.js';
import * as RAPIER from '@dimforge/rapier2d-compat';
import { PhysisWorld } from './Rapier';
import Simulation from './Simulation';
import IntroWorld from './intro/IntroWorld';
import { gsap } from './gsapSetup';

const introCanvas = document.getElementById('intro-canvas') as HTMLCanvasElement;
const dropContainer = document.querySelector('.container') as HTMLElement;

let ballSize = 0.5;
let maxMultiplier = 1;

let clicked = false;

let sheet: Spritesheet;
let introWorld: IntroWorld;
let introStage: Container;
let introApp: Application;
let ruby: Simulation,
  amber: Simulation,
  pearl: Simulation,
  sapphire: Simulation;

let rubyMaxAmountDB: number = 0;
let amberMaxAmountDB: number = 0;
let pearlMaxAmountDB: number = 0;
let sapphireMaxAmountDB: number = 0;
let text: Text;
let winningAmount: number;
let winningHouse: string;
let gameSpeed = 150;
const audio: HTMLAudioElement = new Audio('/epic-cinematic-trailer-113981.mp3');

async function getRandomData() {
  const smallScreen = window.innerWidth < 1000 ? -250 : 0;
  text.text = 'START';
  rubyMaxAmountDB = Math.floor(Math.random() * 3000) + 1000 + smallScreen;
  amberMaxAmountDB = Math.floor(Math.random() * 3000) + 1000 + smallScreen;
  pearlMaxAmountDB = Math.floor(Math.random() * 3000) + 1000 + smallScreen;
  sapphireMaxAmountDB = Math.floor(Math.random() * 3000) + 1000 + smallScreen;

  winningAmount = Math.max(
    rubyMaxAmountDB,
    amberMaxAmountDB,
    pearlMaxAmountDB,
    sapphireMaxAmountDB
  );
  if (winningAmount === rubyMaxAmountDB) {
    winningHouse = 'Ruby';
  } else if (winningAmount === amberMaxAmountDB) {
    winningHouse = 'Amber';
  } else if (winningAmount === pearlMaxAmountDB) {
    winningHouse = 'Pearl';
  } else if (winningAmount === sapphireMaxAmountDB) {
    winningHouse = 'Sapphire';
  }
  setSettings(winningAmount);
}

function startGame() {
  introCanvas.addEventListener('click', () => {
    gameLogic();
  });

  introCanvas.addEventListener('touchstart', () => {
    gameLogic();
  });
}

async function startIntroScene() {
  introWorld = await IntroWorld.create(introCanvas as HTMLCanvasElement);
  introStage = introWorld.getStage();
  introApp = introWorld.getApp();

  text = introWorld.createText('LOADING');
  introStage.addChild(text);
  text.zIndex = 100;
}

async function loader() {
  await Assets.load('/ArcadeClassic.ttf');
  await Assets.load('/SSIS__logo.png');
  sheet = await Assets.load('/sprites.json');
  await Assets.load('/displacement_map_repeat.jpg');
  Assets.add({ alias: 'introBackground', src: '/SSIS__logo.png' });
  await Assets.load('introBackground');
  await RAPIER.init();
}

function setSettings(max: number) {
  if (max > 100) {
    gameSpeed = 200;
    ballSize = 0.4;
  }

  if (max > 150) {
    gameSpeed = 200;
    ballSize = 0.3;
  }
  if (max > 200) {
    ballSize = 0.2;
    maxMultiplier = 2;
    gameSpeed = 100;
  }
  if (max > 1000) {
    gameSpeed = 50;
    maxMultiplier = 2;
    ballSize = 0.1;
  }

  if (max > 1600) {
    gameSpeed = 40;
    maxMultiplier = 3;
    ballSize = 0.075;
  }

  if (max > 2200) {
    gameSpeed = 40;
    maxMultiplier = 3;
    ballSize = 0.065;
  }
  const smallScreenDiff = window.innerWidth < 1000 ? -1 : 0;

  if (max > 2600) {
    gameSpeed = 20;
    maxMultiplier = 4 + smallScreenDiff;
    ballSize = 0.05;
  }
  if (max > 4000) {
    gameSpeed = 16;
    maxMultiplier = 4 + smallScreenDiff;
    ballSize = 0.04;
  }
  if (max > 5000) {
    gameSpeed = 16;
    maxMultiplier = 4 + smallScreenDiff;
    ballSize = 0.03;
  }
  if (max > 6000) {
    gameSpeed = 5;
    maxMultiplier = 5 + smallScreenDiff;
    ballSize = 0.02;
  }

  if (window.innerHeight < 1000) {
    ballSize -= 0.005;
  }
  if (window.innerWidth < 1000) {
    ballSize -= 0.019;
  }
}

async function gameLogic() {
  audio.play();
  if (clicked) return;
  clicked = true;
  text.text = `DROP!`;
  if (introCanvas.requestFullscreen) {
    introCanvas.requestFullscreen();
  }

  dropContainer.innerHTML = `<canvas class="canvas" id="canvasA"></canvas>
<canvas class="canvas" id="canvasB"></canvas>
<canvas class="canvas" id="canvasC"></canvas>
<canvas class="canvas" id="canvasD"></canvas>`;

  introCanvas.style.zIndex = '-1';

  await gsap.to(introStage, {
    pixi: { x: window.innerWidth + 1000 },
    duration: 10,
    ease: 'expo.in',
  });

  ruby = new Simulation(
    await PixiWorld.create(
      document.getElementById('canvasA') as HTMLCanvasElement,
      'Orb_08.png',
      ballSize,
      'Ruby',
      0xc11c22,
      sheet
    ),
    new PhysisWorld(ballSize),
    rubyMaxAmountDB,
    winningHouse,
    gameSpeed,
    maxMultiplier
  );

  amber = new Simulation(
    await PixiWorld.create(
      document.getElementById('canvasB') as HTMLCanvasElement,
      'Orb_09.png',
      ballSize,
      'Amber',
      0xe46725,
      sheet
    ),
    new PhysisWorld(ballSize),
    amberMaxAmountDB,
    winningHouse,
    gameSpeed,
    maxMultiplier
  );

  pearl = new Simulation(
    await PixiWorld.create(
      document.getElementById('canvasC') as HTMLCanvasElement,
      'Orb_20.png',
      ballSize,
      'Pearl',
      0xffffff,
      sheet
    ),
    new PhysisWorld(ballSize),
    pearlMaxAmountDB,
    winningHouse,
    gameSpeed,
    maxMultiplier
  );

  sapphire = new Simulation(
    await PixiWorld.create(
      document.getElementById('canvasD') as HTMLCanvasElement,
      'Orb_11.png',
      ballSize,
      'Sapphire',
      0x1271b5,
      sheet
    ),
    new PhysisWorld(ballSize),
    sapphireMaxAmountDB,
    winningHouse,
    gameSpeed,
    maxMultiplier
  );

  introCanvas.style.display = 'none';
  introApp.destroy();

  const timeline = gsap.timeline();
  timeline.to(ruby.App.titleText, {
    pixi: {
      scaleY: window.innerWidth < 1000 ? 0.9 : 1.3,
      scaleX:
        window.innerWidth < 1600
          ? window.innerWidth < 1000
            ? 0.35
            : 1.4
          : 1.5,
    },
    duration: 1.7,
    ease: 'bounce',
  });
  timeline.to(amber.App.titleText, {
    pixi: {
      scaleY: window.innerWidth < 1000 ? 0.9 : 1.3,
      scaleX:
        window.innerWidth < 1600
          ? window.innerWidth < 1000
            ? 0.3
            : 1.1
          : 1.2,
    },
    duration: 1.7,
    ease: 'bounce',
  });
  timeline.to(pearl.App.titleText, {
    pixi: {
      scaleY: window.innerWidth < 1000 ? 0.9 : 1.3,
      scaleX:
        window.innerWidth < 1600
          ? window.innerWidth < 1000
            ? 0.3
            : 1.1
          : 1.2,
    },
    duration: 1.7,
    ease: 'bounce',
  });
  timeline.to(sapphire.App.titleText, {
    pixi: {
      scaleY: window.innerWidth < 1000 ? 0.9 : 1.3,
      scaleX:
        window.innerWidth < 1600
          ? window.innerWidth < 1000
            ? 0.2
            : 0.7
          : 0.8,
    },
    duration: 1.7,
    ease: 'bounce',
  });

  await timeline.play();
  Simulation.started = true;

  gsap.to(
    [
      sapphire.App.getCounterText(),
      ruby.App.getCounterText(),
      pearl.App.getCounterText(),
      amber.App.getCounterText(),
    ],
    {
      pixi: {
        scaleX: window.innerWidth < 1600 ? 0.9 : 1,
        scaleY: 2,
      },
      duration: 10,
    }
  );
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loader();
    await startIntroScene();
    await getRandomData();
    startGame();
  } catch (err) {
    console.error(err);
  }
});
