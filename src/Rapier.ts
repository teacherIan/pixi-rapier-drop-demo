import * as RAPIER from '@dimforge/rapier2d-compat';

const SLEEP_TIMEOUT_MS = 8000;

export class PhysisWorld {
  private ballSize: number;
  private physicsWorld: RAPIER.World;
  public spheres: RAPIER.RigidBody[];
  private creationTimes: Map<number, number> = new Map();

  constructor(ballSize: number) {
    this.ballSize = ballSize;
    this.spheres = [];
    const gravity = new RAPIER.Vector2(0.0, 9.81);
    this.physicsWorld = new RAPIER.World(gravity);
    this.createFloor();
    this.createLeftWall();
    this.createRightWall();
  }

  public createPhysicsSphere(x: number, y: number, size: number) {
    const sphere = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y)
      .setCanSleep(true);
    const rigidBody = this.physicsWorld.createRigidBody(sphere);
    const colliderDesc = RAPIER.ColliderDesc.ball(65 * this.ballSize * size);
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    collider.setRestitution(0.6);

    this.creationTimes.set(rigidBody.handle, performance.now());
    this.spheres.push(rigidBody);

    return rigidBody;
  }

  public freezeExpiredBodies() {
    const now = performance.now();
    for (const body of this.spheres) {
      if (body.bodyType() === RAPIER.RigidBodyType.Fixed) continue;
      const created = this.creationTimes.get(body.handle);
      if (created && now - created > SLEEP_TIMEOUT_MS) {
        body.setBodyType(RAPIER.RigidBodyType.Fixed, true);
      }
    }
  }

  public createFloor() {
    const floor = RAPIER.RigidBodyDesc.fixed().setTranslation(
      window.innerWidth / 2,
      window.innerHeight + 100
    );
    const rigidBody = this.physicsWorld.createRigidBody(floor);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(window.innerWidth, 100);
    this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public createLeftWall() {
    const wallDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(-5, window.innerHeight / 2);
    const rigidBody = this.physicsWorld.createRigidBody(wallDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(5, window.innerHeight * 5);
    this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public createRightWall() {
    const wallDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      window.innerWidth / 4 + 10,
      window.innerHeight / 2
    );
    const rigidBody = this.physicsWorld.createRigidBody(wallDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(10, window.innerHeight * 5);
    this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public stepWorld(delta: number) {
    this.physicsWorld.timestep = delta;
    this.physicsWorld.step();
    this.freezeExpiredBodies();
  }

  public get World(): RAPIER.World | undefined {
    return this.physicsWorld;
  }
}
