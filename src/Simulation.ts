import * as PIXI from 'pixi.js';
import * as RAPIER from '@dimforge/rapier2d-compat';
import { PhysisWorld } from './Rapier';
import PixiWorld from './PixiWorld';
import { gsap } from 'gsap';
import { OutroWorld } from './outro/OutroWorld';
const outroCanvas = document.getElementById(
  'outro-canvas'
) as HTMLCanvasElement;
//@ts-ignore
import { PixiPlugin } from 'gsap/PixiPlugin.js';
gsap.registerPlugin(PixiPlugin);

interface IObject {
  render: PIXI.Sprite;
  physics: RAPIER.RigidBody;
}

export default class Simulation {
  public static started: boolean = false;
  public static simulationsFinished: number = 0;
  public static simulationCounter: number = 0;
  private app: PixiWorld;
  private world: PhysisWorld;
  private sphereArr: IObject[] = [];
  private counter;
  private interval: number;
  private sphereCounter: number = 0;
  private finished: boolean;
  private winningHouse: string;
  private isFinished: boolean;
  private gameSpeed: number;
  private maxMultiplier: number;

  constructor(
    app: PixiWorld,
    world: PhysisWorld,
    counter: number,
    winningHouse: string,
    gameSpeed: number,
    maxMultiplier: number
  ) {
    this.maxMultiplier = maxMultiplier;
    this.isFinished = false;
    this.counter = counter;
    this.app = app;
    this.world = world;
    this.gameSpeed = gameSpeed;

    this.finished = false;
    this.winningHouse = winningHouse;

    this.interval = window.setInterval(() => {
      if (!Simulation.started) {
        return;
      }

      // if (random < 0.2) return;
      if (this.sphereCounter >= this.counter) {
        clearInterval(this.interval);
      }
      let remaining = this.counter - this.sphereCounter;
      let size = Math.min(
        Math.floor(Math.random() * maxMultiplier) + 1,
        remaining
      );

      this.createSphere(
        window.innerWidth / 8 + Math.random() * 100 - 50,
        -Math.random() * 100 - 10,
        size
      );
      this.sphereCounter += size;
      this.app.updateCounterText(this.sphereCounter);
    }, gameSpeed);

    this.app.App.ticker.add((delta: number) => {
      this.sphereArr.forEach((sphere) => {
        sphere.render.x = sphere.physics.translation().x;
        sphere.render.y = sphere.physics.translation().y;
        sphere.render.rotation = sphere.physics.rotation();
      });

      if (!this.isFinished) {
        this.world.stepWorld(delta * 0.1);
        this.app.App.render();
      }

      if (this.counter <= this.sphereCounter && !this.finished) {
        Simulation.simulationsFinished++;
        this.finished = true;
        if (this.winningHouse != this.App.getName()) {
          gsap.to(this.App.Stage, { pixi: { alpha: 0.1 }, duration: 5 });
        }

        if (this.winningHouse === this.App.getName()) {
          gsap.to(this.App.getTitleText(), {
            pixi: { alpha: 0.1 },
            duration: 5,
          });
        }

        if (Simulation.simulationsFinished >= 4) {
          console.log('All Finished');

          outroCanvas.style.zIndex = '9999';
          outroCanvas.style.display = 'block';
          let outroWorld = new OutroWorld(
            outroCanvas as HTMLCanvasElement,
            this.winningHouse
          );
        }
        setTimeout(() => {
          this.isFinished = true;
          // this.app.App.ticker.destroy();
          console.log('Destroy ticker');
        }, 12000);
      }
    });
  }

  public createSphere(x: number, y: number, size: number) {
    const sphere = this.app.createSphere(size);
    this.app.ParticleContainer.addChild(sphere);
    const physicsSphere = this.world.createPhysicsSphere(x, y, size);
    this.sphereArr.push({ render: sphere, physics: physicsSphere });
  }

  public get App(): PixiWorld {
    return this.app;
  }
}
