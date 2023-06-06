import './style.css';
const outroCanvas = document.getElementById(
  'outro-canvas'
) as HTMLCanvasElement;
import pixiWorld from './PixiWorld';
import * as PIXI from 'pixi.js';
import * as RAPIER from '@dimforge/rapier2d-compat';
import { PhysisWorld } from './Rapier';
import Simulation from './Simulation';
import IntroWorld from './intro/IntroWorld';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../db/db';
const introCanvas = document.getElementById(
  'intro-canvas'
) as HTMLCanvasElement;
import { gsap } from 'gsap';
//@ts-ignore
import { PixiPlugin } from 'gsap/PixiPlugin.js';
import { OutroWorld } from './outro/OutroWorld';
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);
const dropContainer = document.querySelector('.container') as HTMLElement;

//options
let ballSize = 0.5;
let maxMultiplier = 1;

//variables

let clicked = false;

let sheet: PIXI.Spritesheet;
let bitmapFonts: PIXI.BitmapFont;
let introWorld: IntroWorld;
let introStage: PIXI.Container;
let introApp: PIXI.Application;
let ruby: Simulation,
  amber: Simulation,
  pearl: Simulation,
  sapphire: Simulation;

let rubyMaxAmountDB: number = 0;
let amberMaxAmountDB: number = 0;
let pearlMaxAmountDB: number = 0;
let sapphireMaxAmountDB: number = 0;
let total: number = 0;
let text: PIXI.Text;
let winningAmount: number;
let winningHouse: string;
let textures;
let gameSpeed = 150;
let audio: HTMLAudioElement = new Audio('/epic-cinematic-trailer-113981.mp3');

async function getPracticeData() {
  text.text = 'START';
  rubyMaxAmountDB = 200;
  amberMaxAmountDB = 240;
  pearlMaxAmountDB = 280;
  sapphireMaxAmountDB = 320;

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

async function getRandomData() {
  text.text = 'START';
  rubyMaxAmountDB = Math.floor(Math.random() * 3000) + 1000;
  amberMaxAmountDB = Math.floor(Math.random() * 3000) + 1000;
  pearlMaxAmountDB = Math.floor(Math.random() * 3000) + 1000;
  sapphireMaxAmountDB = Math.floor(Math.random() * 3000) + 1000;

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

async function getData() {
  let querySnapshot = await getDocs(collection(db, 'points'));

  querySnapshot.forEach((doc) => {
    if (doc.data().house === 'Ruby') {
      rubyMaxAmountDB += parseInt(doc.data().points);
    } else if (doc.data().house === 'Amber') {
      amberMaxAmountDB += parseInt(doc.data().points);
    } else if (doc.data().house === 'Pearl') {
      pearlMaxAmountDB += parseInt(doc.data().points);
    } else if (doc.data().house === 'Sapphire') {
      sapphireMaxAmountDB += parseInt(doc.data().points);
    }
    total += parseInt(doc.data().points);
  });

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

  //update text depending on if a connection to the database was established
  return new Promise((resolve, reject) => {
    if (querySnapshot.empty) {
      text.text = 'DB Error';
      reject('Not loaded');
    } else {
      text.text = 'START';
      resolve('data loaded');
    }
  });
}

function startGame() {
  //start with keyboard
  // document.addEventListener('keyup', () => {
  //   gameLogic();
  // });

  introCanvas.addEventListener('click', () => {
    gameLogic();
  });
}

function startIntroScene() {
  PIXI.BitmapFont.from('myFont', {
    fontFamily: 'ARCADECLASSIC',
    fontSize: 200,
    fill: 0xffffff,
    align: 'center',
    stroke: '#000000',
    strokeThickness: 10,
    dropShadow: true,
    dropShadowColor: '#000000',
    dropShadowBlur: 1,
  });
  introWorld = new IntroWorld(introCanvas as HTMLCanvasElement);
  introStage = introWorld.getStage();
  introApp = introWorld.getApp();

  text = introWorld.createText('LOADING');
  // getPracticeData(); // no external db

  introStage.addChild(text);
  text.zIndex = 100;
}

//functions
async function loader() {
  await PIXI.Assets.load('/ArcadeClassic.ttf');
  await PIXI.Assets.load('/SSIS__logo.png');
  sheet = await PIXI.Assets.load('/sprites.json');
  await PIXI.Assets.load('/displacement_map_repeat.jpg');
  PIXI.Assets.add('introBackground', '/SSIS__logo.png');
  await PIXI.Assets.load('introBackground');
  await RAPIER.init();

  return new Promise((resolve, reject) => {
    resolve('Loaded');
  });
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
    gameSpeed = 200;
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
    ballSize = 0.07;
  }
  if (max > 2200) {
    gameSpeed = 40;
    maxMultiplier = 3;
    ballSize = 0.065;
  }
  if (max > 2600) {
    gameSpeed = 20;
    maxMultiplier = 4;
    ballSize = 0.05;
  }
  if (max > 4000) {
    gameSpeed = 16;
    maxMultiplier = 4;
    ballSize = 0.04;
  }
  if (max > 5000) {
    gameSpeed = 16;
    maxMultiplier = 4;
    ballSize = 0.03;
  }
  if (max > 6000) {
    gameSpeed = 5;
    maxMultiplier = 5;
    ballSize = 0.02;
  }

  if (window.innerHeight < 1000) {
    ballSize -= 0.005;
  }
}

function gameLogic() {
  audio.play();
  if (clicked) return;
  clicked = true;
  text.text = `DROP!`;
  if (introCanvas.requestFullscreen) {
    introCanvas.requestFullscreen();
    introCanvas.width = window.innerWidth;
    introCanvas.height = window.innerHeight;
  }

  dropContainer.innerHTML = `<canvas class="canvas" id="canvasA"></canvas>
<canvas class="canvas" id="canvasB"></canvas>
<canvas class="canvas" id="canvasC"></canvas>
<canvas class="canvas" id="canvasD"></canvas>`;

  introCanvas.style.zIndex = '-1';
  gsap
    .to(introStage, {
      pixi: {
        x: window.innerWidth + 100,
      },
      duration: 10,
      ease: 'expo.in',
    })
    .then(() => {
      // introStage.destroy();

      ruby = new Simulation(
        new pixiWorld(
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
        new pixiWorld(
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
        new pixiWorld(
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
        new pixiWorld(
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
    })
    .then(() => {
      introCanvas.style.display = 'none';
      introApp.destroy();

      let timeline = gsap.timeline();
      timeline.to(ruby.App.titleText, {
        pixi: {
          scaleY: 1.3,
          scaleX: window.innerWidth < 1600 ? 1.4 : 1.5,
        },
        duration: 1.7,
        ease: 'bounce',
      });
      timeline.to(amber.App.titleText, {
        pixi: {
          scaleY: 1.3,
          scaleX: window.innerWidth < 1600 ? 1.1 : 1.2,
        },
        duration: 1.7,
        ease: 'bounce',
      });

      timeline.to(pearl.App.titleText, {
        pixi: {
          scaleY: 1.3,
          scaleX: window.innerWidth < 1600 ? 1.1 : 1.2,
        },
        duration: 1.7,
        ease: 'bounce',
      });

      timeline.to(sapphire.App.titleText, {
        pixi: {
          scaleY: 1.3,
          scaleX: window.innerWidth < 1600 ? 0.7 : 0.8,
        },
        duration: 1.7,
        ease: 'bounce',
      });
      timeline
        .play()
        .then(() => {
          Simulation.started = true;
        })
        .then(() => {
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
        });
    });
}

/*
Experience
*/

//start intro scene after fonts are loaded
loader()
  .then(() => {
    startIntroScene();
  })
  .then(() => {
    getRandomData()
      .then(() => {
        startGame();
      })
      .catch((err) => {
        console.log(err);
      });
  });
//allows game to start after data is loaded.  Promise is rejected
