declare module 'gsap/PixiPlugin.js' {
  export const PixiPlugin: {
    registerPIXI(pixi: typeof import('pixi.js')): void;
  };
}
