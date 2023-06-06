import * as RAPIER from '@dimforge/rapier2d-compat';
import * as PIXI from 'pixi.js';

export class PhysisWorld {
  private ballSize;
  private physicsWorld: RAPIER.World;
  public spheres: RAPIER.RigidBody[];
  constructor(ballSize: number) {
    this.ballSize = ballSize;
    this.spheres = [];
    const gravity = new RAPIER.Vector2(0.0, 9.81);
    this.physicsWorld = new RAPIER.World(gravity);
    // this.createPhysicsSphere(window.innerWidth / 4, 0);
    this.createFloor();
    this.createLeftWall();
    this.createRightWall();
  }

  public createPhysicsSphere(x: number, y: number, size: number) {
    const sphere: RAPIER.RigidBodyDesc =
      RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y);
    const rigidBody = this.physicsWorld?.createRigidBody(sphere);
    const rigidBodyHandle = rigidBody.handle;
    const colliderDesc = RAPIER.ColliderDesc.ball(65 * this.ballSize * size);
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    collider.setRestitution(0.6);
    setTimeout(() => {
      rigidBody.setBodyType(1, true);
    }, 16000);

    this.spheres.push(rigidBody as RAPIER.RigidBody);

    return rigidBody;
  }

  public createFloor() {
    const floor: RAPIER.RigidBodyDesc =
      RAPIER.RigidBodyDesc.fixed().setTranslation(
        window.innerWidth / 2,
        window.innerHeight + 100
      );
    const rigidBody = this.physicsWorld.createRigidBody(floor);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(window.innerWidth, 100);
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public createLeftWall() {
    const floor: RAPIER.RigidBodyDesc =
      RAPIER.RigidBodyDesc.fixed().setTranslation(-5, window.innerHeight / 2);
    const rigidBody = this.physicsWorld.createRigidBody(floor);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(5, window.innerHeight * 5);
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public createRightWall() {
    const floor: RAPIER.RigidBodyDesc =
      RAPIER.RigidBodyDesc.fixed().setTranslation(
        window.innerWidth / 4 + 10,
        window.innerHeight / 2
      );
    const rigidBody = this.physicsWorld.createRigidBody(floor);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(10, window.innerHeight * 5);
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public stepWorld(delta: number) {
    this.physicsWorld.timestep = delta;
    this.physicsWorld.step();
  }

  public get World(): RAPIER.World | undefined {
    return this.physicsWorld;
  }
}
