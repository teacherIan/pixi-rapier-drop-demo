// The drop-lane physics as a rapier-on-worker sim: four independent Rapier
// worlds (one per house lane, same lane-local coordinates the main-thread
// version used), stepped off the main thread. Framework-free — Rapier only —
// so it imports straight into the worker.
//
// Frames are CAPACITY-sized (one epoch for the whole game): each lane owns a
// fixed [x, y, rot] × capacity region of the frame buffer, and the live body
// count per lane rides in `extra`. Spawning therefore never churns the
// buffer pool, no matter how many balls drop.
import * as RAPIER from '@dimforge/rapier2d-compat';
import type { SimClient, SimSetup, WorkerSim } from 'rapier-on-worker';

/** The main-thread handle to this sim (type-only — safe to import anywhere). */
export type DropPhysics = SimClient<null, DropCommand, DropLayout>;

export interface DropInit {
  /** window.innerWidth at game start — the historic wall/floor geometry is
   * expressed in it (lanes are a quarter of it wide). */
  fullWidth: number;
  /** window.innerHeight at game start. */
  height: number;
  /** The global ball-size factor chosen by setSettings. */
  ballSize: number;
  /** Per-lane body capacity (the house's point target is a safe upper bound:
   * every spawn scores at least 1). */
  capacities: number[];
}

export type DropCommand =
  | { kind: 'spawn'; lane: number; x: number; y: number; size: number }
  | { kind: 'freezeLane'; lane: number };

export interface DropLayout {
  capacities: number[];
  /** Float offset of each lane's region in the frame buffer. */
  offsets: number[];
}

export interface DropExtra {
  /** Live body count per lane. */
  counts: number[];
}

/** On-screen gravity in px/s². The old main-thread loop stepped world.timestep
 * = deltaTime*0.1 once per rendered frame — a 6x time warp (0.1 game-s per
 * 1/60 real-s) over a gentle 9.81 gravity. Warping time by k scales visible
 * acceleration by k², so the OLD balls fell at 9.81 * 6² ≈ 353 px/s². We now
 * step the world at the harness's real fixed dt (1/60) and bake that 353 in
 * directly: identical fall speed, but small per-step motion instead of 0.1s
 * leaps, so balls no longer jump ~70-110px between frames and dense piles
 * solve stably. */
const GRAVITY = 9.81 * 36;
/** Bodies older than this become Fixed — the historic broad-phase relief. */
const FREEZE_AFTER_MS = 8000;

interface Lane {
  world: RAPIER.World;
  bodies: RAPIER.RigidBody[];
  createdAt: number[];
  /** First body index that might still be dynamic (freeze scan cursor). */
  freezeCursor: number;
  frozen: boolean;
  capacity: number;
}

export async function createDropSim(init: DropInit): Promise<SimSetup<null, DropCommand, DropLayout, DropExtra>> {
  await RAPIER.init();
  const { fullWidth, height, ballSize } = init;

  const makeLane = (capacity: number): Lane => {
    const world = new RAPIER.World(new RAPIER.Vector2(0.0, GRAVITY));
    // Identical geometry to the old PhysisWorld (lane-local coordinates).
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(fullWidth / 2, height + 100));
    world.createCollider(RAPIER.ColliderDesc.cuboid(fullWidth, 100), floor);
    const left = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(-5, height / 2));
    world.createCollider(RAPIER.ColliderDesc.cuboid(5, height * 5), left);
    const right = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(fullWidth / 4 + 10, height / 2));
    world.createCollider(RAPIER.ColliderDesc.cuboid(10, height * 5), right);
    return { world, bodies: [], createdAt: [], freezeCursor: 0, frozen: false, capacity };
  };

  const lanes = init.capacities.map(makeLane);

  const offsets: number[] = [];
  let frameFloats = 0;
  for (const cap of init.capacities) {
    offsets.push(frameFloats);
    frameFloats += cap * 3;
  }

  const freezeExpired = (lane: Lane, now: number): void => {
    // Bodies spawn in time order, so everything before the cursor is already
    // frozen and everything after the first young body is younger still.
    while (lane.freezeCursor < lane.bodies.length) {
      const i = lane.freezeCursor;
      if (now - lane.createdAt[i] <= FREEZE_AFTER_MS) return;
      lane.bodies[i].setBodyType(RAPIER.RigidBodyType.Fixed, true);
      lane.freezeCursor += 1;
    }
  };

  const sim: WorkerSim<null, DropCommand, DropLayout, DropExtra> = {
    command(cmd) {
      const lane = lanes[cmd.lane];
      if (!lane) return null;
      if (cmd.kind === 'spawn') {
        if (lane.bodies.length >= lane.capacity) return null; // capacity is the contract
        const body = lane.world.createRigidBody(
          RAPIER.RigidBodyDesc.dynamic().setTranslation(cmd.x, cmd.y).setCanSleep(true),
        );
        const collider = lane.world.createCollider(RAPIER.ColliderDesc.ball(65 * ballSize * cmd.size), body);
        collider.setRestitution(0.6);
        lane.bodies.push(body);
        lane.createdAt.push(performance.now());
      } else if (cmd.kind === 'freezeLane') {
        lane.frozen = true;
      }
      return null; // frame shape never changes — capacity-sized regions
    },
    beginTick() {},
    step(dt) {
      const now = performance.now();
      for (const lane of lanes) {
        if (lane.frozen) continue;
        lane.world.timestep = dt;
        lane.world.step();
        freezeExpired(lane, now);
      }
    },
    fillFrame(out) {
      const counts: number[] = [];
      for (let l = 0; l < lanes.length; l += 1) {
        const lane = lanes[l];
        const base = offsets[l];
        for (let i = 0; i < lane.bodies.length; i += 1) {
          const p = lane.bodies[i].translation();
          out[base + i * 3] = p.x;
          out[base + i * 3 + 1] = p.y;
          out[base + i * 3 + 2] = lane.bodies[i].rotation();
        }
        counts.push(lane.bodies.length);
      }
      return { extra: { counts } };
    },
  };

  return { sim, layout: { layout: { capacities: init.capacities.slice(), offsets }, frameFloats } };
}
