import { Particle } from 'pixi.js';
import GameStage from './GameStage';
import LaneView from './LaneView';
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
  private stage: GameStage;
  private view: LaneView;
  private physics: DropPhysics;
  private lane: number;
  private particles: Particle[] = [];
  private counter: number;
  private interval: number;
  private sphereCounter: number = 0;
  private finished: boolean;
  private winningHouse: string;

  constructor(
    stage: GameStage,
    view: LaneView,
    physics: DropPhysics,
    lane: number,
    counter: number,
    winningHouse: string,
    gameSpeed: number,
    maxMultiplier: number
  ) {
    this.stage = stage;
    this.view = view;
    this.counter = counter;
    this.physics = physics;
    this.lane = lane;
    this.finished = false;
    this.winningHouse = winningHouse;
    void this.stage;

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
      this.view.updateCounterText(this.sphereCounter);
      if (this.sphereCounter >= this.counter) {
        clearInterval(this.interval);
        this.finish();
      }
    }, gameSpeed);
  }

  /** Mint the render particle at its (off-screen) spawn point AND tell the
   * worker to create the matching physics body; the worker's frames then drive
   * the particle. Both must happen in the same body order so the frame's
   * per-body slot lines up with `particles[i]`. */
  public createSphere(x: number, y: number, size: number) {
    this.particles.push(this.view.spawnParticle(x, y, size));
    this.physics.sendCommand({ kind: 'spawn', lane: this.lane, x, y, size });
  }

  /** Write this lane's region of a worker frame straight onto the particles.
   * Frames arrive at ~45Hz (faster than the render), so a direct write is both
   * the freshest and the cheapest option — no per-render interpolation, which
   * only pays off once the render outruns delivery. `positions` is valid only
   * during the call (the buffer is recycled). */
  public setSnapshot(positions: Float32Array, offset: number, count: number) {
    const n = Math.min(count, this.particles.length);
    for (let i = 0; i < n; i += 1) {
      const p = this.particles[i];
      p.x = positions[offset + i * 3];
      p.y = positions[offset + i * 3 + 1];
      // slot i*3+2 is rotation — unused (orbs render with a fixed spawn spin).
    }
  }

  /** All points delivered: fade the losers, raise the outro on the last lane,
   * and — after the same 12s linger — freeze this lane's world in the worker
   * (and the whole pump once every lane is done). */
  private finish() {
    if (this.finished) return;
    this.finished = true;
    Simulation.simulationsFinished++;

    if (this.winningHouse != this.view.getName()) {
      this.view.fadeLane(0.1, 5);
    } else {
      gsap.to(this.view.getTitleContainer(), { pixi: { alpha: 0.1 }, duration: 5 });
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
}
