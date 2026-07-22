// The app's worker entry: the rapier-on-worker harness driving the drop sim.
// Everything interesting lives in dropSim.ts (the sim) and the package (the
// loop, the pool, the protocol).
import { runSimWorker } from 'rapier-on-worker';
import { createDropSim } from './dropSim';

runSimWorker(createDropSim);
