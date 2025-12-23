import * as RAPIER from '@dimforge/rapier2d-compat';

export class PhysisWorld {
  private ballSize: number;
  private physicsWorld: RAPIER.World;
  public spheres: RAPIER.RigidBody[];

  constructor(ballSize: number) {
    this.ballSize = ballSize;
    this.spheres = [];
    const gravity = new RAPIER.Vector2(0.0, 9.81);
    this.physicsWorld = new RAPIER.World(gravity);
    this.createFloor();
    this.createLeftWall();
    this.createRightWall();
  }

  public createPhysicsSphere(x: number, y: number, size: number): RAPIER.RigidBody {
    const sphere: RAPIER.RigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y);
    const rigidBody = this.physicsWorld.createRigidBody(sphere);
    const colliderDesc = RAPIER.ColliderDesc.ball(65 * this.ballSize * size);
    const collider = this.physicsWorld.createCollider(colliderDesc, rigidBody);
    collider.setRestitution(0.6);

    // In Rapier 0.14+, setBodyType uses RigidBodyType enum
    setTimeout(() => {
      rigidBody.setBodyType(RAPIER.RigidBodyType.Fixed, true);
    }, 16000);

    this.spheres.push(rigidBody);
    return rigidBody;
  }

  public createFloor(): void {
    const floor: RAPIER.RigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      window.innerWidth / 2,
      window.innerHeight + 100
    );
    const rigidBody = this.physicsWorld.createRigidBody(floor);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(window.innerWidth, 100);
    this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public createLeftWall(): void {
    const floor: RAPIER.RigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      -5,
      window.innerHeight / 2
    );
    const rigidBody = this.physicsWorld.createRigidBody(floor);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(5, window.innerHeight * 5);
    this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public createRightWall(): void {
    const floor: RAPIER.RigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      window.innerWidth / 4 + 10,
      window.innerHeight / 2
    );
    const rigidBody = this.physicsWorld.createRigidBody(floor);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(10, window.innerHeight * 5);
    this.physicsWorld.createCollider(colliderDesc, rigidBody);
  }

  public stepWorld(delta: number): void {
    this.physicsWorld.timestep = delta;
    this.physicsWorld.step();
  }

  public get World(): RAPIER.World {
    return this.physicsWorld;
  }
}
