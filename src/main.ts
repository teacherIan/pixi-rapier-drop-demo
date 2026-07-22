import './style.css';
import 'bubble-rapier-text/styles.css'; // registers the Cherry Bomb One face
import GameStage from './GameStage';
import LaneView from './LaneView';
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
let physics: DropPhysics;
/** Lane order: Ruby, Amber, Pearl, Sapphire — the frame-dispatch fan-out. */
const sims: (Simulation | null)[] = [null, null, null, null];
const views: (LaneView | null)[] = [null, null, null, null];

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
  // Hold LOADING long enough to be clearly read before it morphs. The letters
  // rain in and settle on springs (~1.3s), so the readable window is the dwell
  // MINUS the entrance — 3500ms leaves ~2s of settled, readable "LOADING"
  // before the shared letters (T, A...) glide across into START and the rest
  // bonk away. (Was 2200ms, which left the word barely legible before morphing.)
  await new Promise((resolve) => setTimeout(resolve, 3500));
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
  if (clicked) return;
  clicked = true;
  // After the guard (a second click must not double-play), and swallow the
  // autoplay-policy rejection so it isn't an unhandled promise error.
  audio.play().catch(() => {});
  // START morphs to DROP! — hold it readable, THEN let the letters fall off the
  // bottom as the whole intro stage slides away. 2200ms (was 1400) leaves DROP!
  // legible after its morph settles instead of exiting mid-morph.
  introField.morphTo(centerWord('DROP!'));
  window.setTimeout(() => introField.exit(), 2200);
  if (introCanvas.requestFullscreen) {
    introCanvas.requestFullscreen();
  }

  dropContainer.innerHTML = `<canvas class="canvas" id="game-canvas"></canvas>`;

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
    onError: (msg) => {
      // A worker/WASM init failure would otherwise silently hang the whole
      // board (no READY, no frames). Surface it.
      console.error('[drop] physics worker failed to start:', msg);
    },
    onFrame: (f) => {
      const counts = f.extra?.counts;
      if (!counts) return;
      for (let l = 0; l < sims.length; l += 1) {
        sims[l]?.setSnapshot(f.positions, laneOffsets[l] ?? 0, counts[l] ?? 0);
      }
    },
  });
  // Pause the worker pump on a hidden tab — but never re-START it once the game
  // has ended (all lanes frozen), or a tab hide/show would resurrect the 60Hz
  // pump on a static scene and never stop it again.
  document.addEventListener('visibilitychange', () => {
    if (Simulation.frozenLanes >= 4) return;
    physics.setRunning(!document.hidden);
  });

  await gsap.to(introStage, {
    pixi: { x: window.innerWidth + 1000 },
    duration: 10,
    ease: 'expo.in',
  });

  // ONE WebGL context for the whole board — lanes are sub-containers, and the
  // bubble letters live in full-screen space (free to fly across the board
  // instead of being clipped to a 25%-wide box).
  const stage = await GameStage.create(
    document.getElementById('game-canvas') as HTMLCanvasElement,
    4
  );

  const laneSpecs: Array<[string, string, number]> = [
    ['Orb_08.png', 'Ruby', 0xc11c22],
    ['Orb_09.png', 'Amber', 0xe46725],
    ['Orb_20.png', 'Pearl', 0xffffff],
    ['Orb_11.png', 'Sapphire', 0x1271b5],
  ];
  const targets = [rubyMaxAmountDB, amberMaxAmountDB, pearlMaxAmountDB, sapphireMaxAmountDB];
  for (let i = 0; i < laneSpecs.length; i += 1) {
    const [texture, name, color] = laneSpecs[i];
    const view = await LaneView.create(stage, i, laneSpecs.length, texture, name, color, sheet, ballSize);
    views[i] = view;
    sims[i] = new Simulation(stage, view, physics, i, targets[i], winningHouse, gameSpeed, maxMultiplier);
  }

  introCanvas.style.display = 'none';
  introField.destroy();
  introWorld.destroy(); // removes the resize listener before destroying the app

  // The four house titles are already raining in (each LaneView staggers its
  // gem letters as it boots). Give them a beat to settle, drop the counters in
  // from the top of each lane, then open the gates.
  await new Promise((resolve) => setTimeout(resolve, 1900));
  for (const view of views) view?.enterCounter();
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
