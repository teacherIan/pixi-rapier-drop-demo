import { Sprite } from 'pixi.js';
import PixiWorld from './PixiWorld';
import { gsap } from './gsapSetup';
import { OutroWorld } from './outro/OutroWorld';
import type { DropPhysics } from './dropSim';

const outroCanvas = document.getElementById(
  'outro-canvas'
) as HTMLCanvasElement;

export default class Simulation {
  public static started: boolean = false;
  public static simulationsFinished: number = 0;
  public static frozenLanes: number = 0;
  private app: PixiWorld;
  private physics: DropPhysics;
  private lane: number;
  private sprites: Sprite[] = [];
  private counter: number;
  private interval: number;
  private sphereCounter: number = 0;
  private finished: boolean;
  private winningHouse: string;

  constructor(
    app: PixiWorld,
    physics: DropPhysics,
    lane: number,
    counter: number,
    winningHouse: string,
    gameSpeed: number,
    maxMultiplier: number
  ) {
    this.counter = counter;
    this.app = app;
    this.physics = physics;
    this.lane = lane;
    this.finished = false;
    this.winningHouse = winningHouse;

    this.interval = window.setInterval(() => {
      if (!Simulation.started) {
        return;
      }

      if (this.sphereCounter >= this.counter) {
        clearInterval(this.interval);
        this.finish();
        return;
      }
      const remaining = this.counter - this.sphereCounter;
      const size = Math.min(
        Math.floor(Math.random() * maxMultiplier) + 1,
        remaining
      );
      if (size <= 0) return;

      this.createSphere(
        window.innerWidth / 8 + Math.random() * 100 - 50,
        -Math.random() * 100 - 10,
        size
      );
      this.sphereCounter += size;
      this.app.updateCounterText(this.sphereCounter);
      if (this.sphereCounter >= this.counter) {
        clearInterval(this.interval);
        this.finish();
      }
    }, gameSpeed);
  }

  /** The physics body lives in the worker; here we only mint the sprite. It
   * stays hidden until the worker's frames cover its index. */
  public createSphere(x: number, y: number, size: number) {
    const sprite = this.app.createSphere(size);
    sprite.visible = false;
    sprite.position.set(x, y);
    this.app.ParticleContainer.addChild(sprite);
    this.sprites.push(sprite);
    this.physics.sendCommand({ kind: 'spawn', lane: this.lane, x, y, size });
  }

  /** Copy this lane's region of a worker frame onto the sprites. `positions`
   * is only valid during the call (the buffer is recycled) — we consume it
   * synchronously, writing straight into the sprites. */
  public applyFrame(positions: Float32Array, offset: number, count: number) {
    const n = Math.min(count, this.sprites.length);
    for (let i = 0; i < n; i += 1) {
      const sprite = this.sprites[i];
      sprite.visible = true;
      sprite.position.set(positions[offset + i * 3], positions[offset + i * 3 + 1]);
      sprite.rotation = positions[offset + i * 3 + 2];
    }
  }

  /** All points delivered: fade the losers, raise the outro on the last lane,
   * and — after the same 12s linger the old version used — freeze this lane's
   * world in the worker (and the whole pump once every lane is done). */
  private finish() {
    if (this.finished) return;
    this.finished = true;
    Simulation.simulationsFinished++;

    if (this.winningHouse != this.App.getName()) {
      gsap.to(this.App.Stage, { pixi: { alpha: 0.1 }, duration: 5 });
    }

    if (this.winningHouse === this.App.getName()) {
      gsap.to(this.App.getTitleContainer(), {
        pixi: { alpha: 0.1 },
        duration: 5,
      });
    }

    if (Simulation.simulationsFinished >= 4) {
      outroCanvas.style.zIndex = '9999';
      outroCanvas.style.display = 'block';
      OutroWorld.create(outroCanvas as HTMLCanvasElement, this.winningHouse);
    }

    setTimeout(() => {
      this.physics.sendCommand({ kind: 'freezeLane', lane: this.lane });
      Simulation.frozenLanes++;
      // Every lane settled: stop the worker's free-run pump outright — the
      // outro doesn't need 60Hz physics frames of a still scene.
      if (Simulation.frozenLanes >= 4) this.physics.setRunning(false);
    }, 12000);
  }

  public get App(): PixiWorld {
    return this.app;
  }
}
