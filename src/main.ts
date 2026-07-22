import './style.css';
import 'bubble-rapier-text/styles.css'; // registers the Cherry Bomb One face
import PixiWorld from './PixiWorld';
import { Application, Assets, Container, Spritesheet } from 'pixi.js';
import { LetterField } from './celebrate/LetterField';
import { gemTextStyle, HOUSE_PALETTE, warmBubbleFace } from './celebrate/gemStyle';
import { centerWord } from './celebrate/layouts';
import * as RAPIER from '@dimforge/rapier2d-compat';
import { createSimClient } from 'rapier-on-worker';
import type { DropCommand, DropExtra, DropInit, DropLayout, DropPhysics } from './dropSim';
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
let physics: DropPhysics;
/** Lane order: Ruby, Amber, Pearl, Sapphire — the frame-dispatch fan-out. */
const sims: (Simulation | null)[] = [null, null, null, null];

let rubyMaxAmountDB: number = 0;
let amberMaxAmountDB: number = 0;
let pearlMaxAmountDB: number = 0;
let sapphireMaxAmountDB: number = 0;
let introField: LetterField;
let winningAmount: number;
let winningHouse: string;
let gameSpeed = 150;
const audio: HTMLAudioElement = new Audio('/epic-cinematic-trailer-113981.mp3');

async function getRandomData() {
  const smallScreen = window.innerWidth < 1000 ? -250 : 0;
  // Let LOADING finish its staggered rain and sit a beat before it morphs:
  // the shared letters (T, A...) then glide across, the rest bonk away solid,
  // and the missing ones stagger in.
  await new Promise((resolve) => setTimeout(resolve, 2200));
  introField.morphTo(centerWord('START'));
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
  introStage.sortableChildren = true;

  // LOADING rains in letter by letter — gem bubble glyphs cycling all four
  // house colours, draggable while everyone waits.
  introField = await LetterField.create(introApp, introStage, centerWord('LOADING'), {
    styleFor: gemTextStyle,
    palette: HOUSE_PALETTE,
    staggerMs: 80,
    interactive: true,
  });
}

async function loader() {
  await warmBubbleFace(); // canvas text never triggers @font-face on its own
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
  // START morphs to DROP! — then the letters fall off the bottom as the whole
  // intro stage slides away.
  introField.morphTo(centerWord('DROP!'));
  window.setTimeout(() => introField.exit(), 1400);
  if (introCanvas.requestFullscreen) {
    introCanvas.requestFullscreen();
  }

  dropContainer.innerHTML = `<canvas class="canvas" id="canvasA"></canvas>
<canvas class="canvas" id="canvasB"></canvas>
<canvas class="canvas" id="canvasC"></canvas>
<canvas class="canvas" id="canvasD"></canvas>`;

  introCanvas.style.zIndex = '-1';

  // Physics lives OFF the main thread: one worker hosts all four lane worlds
  // (rapier-on-worker harness). Created here so its WASM init overlaps the
  // 10s intro slide; frames are capacity-sized so spawning never re-layouts.
  const capacities = [rubyMaxAmountDB, amberMaxAmountDB, pearlMaxAmountDB, sapphireMaxAmountDB];
  let laneOffsets: number[] = [];
  physics = createSimClient<DropInit, null, DropCommand, DropLayout, DropExtra>({
    worker: new Worker(new URL('./dropSim.worker.ts', import.meta.url), { type: 'module' }),
    init: {
      fullWidth: window.innerWidth,
      height: window.innerHeight,
      ballSize,
      capacities,
    },
    onLayout: (l) => {
      laneOffsets = l.offsets;
    },
    onFrame: (f) => {
      const counts = f.extra?.counts;
      if (!counts) return;
      for (let l = 0; l < sims.length; l += 1) {
        sims[l]?.applyFrame(f.positions, laneOffsets[l] ?? 0, counts[l] ?? 0);
      }
    },
  });
  document.addEventListener('visibilitychange', () => physics.setRunning(!document.hidden));

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
    physics,
    0,
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
    physics,
    1,
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
    physics,
    2,
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
    physics,
    3,
    sapphireMaxAmountDB,
    winningHouse,
    gameSpeed,
    maxMultiplier
  );

  sims[0] = ruby;
  sims[1] = amber;
  sims[2] = pearl;
  sims[3] = sapphire;

  introCanvas.style.display = 'none';
  introField.destroy();
  introApp.destroy();

  // The four house titles are already raining in (each PixiWorld staggers its
  // gem letters as it boots). Give them a beat to settle, drop the counters in
  // from the top of each lane, then open the gates.
  await new Promise((resolve) => setTimeout(resolve, 1900));
  for (const sim of [ruby, amber, pearl, sapphire]) sim.App.enterCounter();
  await new Promise((resolve) => setTimeout(resolve, 700));
  Simulation.started = true;
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
