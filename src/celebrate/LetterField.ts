// LetterField — bubble-rapier-text WITHOUT React: the library's framework-free
// physics (its README's documented path) driven from this app's own PIXI
// tickers. Each glyph is a PIXI.Text on a Rapier rigid body with the library's
// hand-authored collision hull; letters STAGGER in one at a time (each pops
// into existence off-screen and flies to its slot on the springs), morph
// word-to-word via planClaims (matching glyphs glide, the rest bonk away,
// missing ones fly in), and exit by falling off the bottom.
import { Application, Container, Text, TextStyle } from 'pixi.js';
import {
  createCelebrateWorld,
  stepCelebrate,
  addLetter,
  retargetLetter,
  scatterLetter,
  cullDiscarded,
  removeLetter,
  removeWalls,
  exitCelebrate,
  startLetterDrag,
  moveDrag,
  releaseDrag,
  solidifyLetter,
  planClaims,
  hullForGlyph,
  scaleHull,
  type CelebrateWorld,
  type LayoutStrategy,
} from 'bubble-rapier-text';

// The LAYOUT slot (with per-slot font size). The package's index exports the
// transition planner's minimal Slot under that name, so derive this one.
type LayoutSlot = ReturnType<LayoutStrategy>['slots'][number];

// Untangle thresholds, scaled by the layout's fit (mirrors the component).
const STUCK_DIST = 48;
const UNGHOST_DIST = 22;
const FIXED_DT = 1 / 60;
const GRAB_PAD = 1.15;
// A non-interactive field settled this many frames stops stepping — otherwise
// the four house-title worlds burn 60fps of physics for the whole page life.
const IDLE_FRAMES = 30;

export interface LetterFieldOpts {
  /** Style factory — gemTextStyle for this app. */
  styleFor: (color: number, size: number, seq: number) => TextStyle;
  /** Per-letter colours, cycled in deal order. */
  palette: readonly number[];
  /** ms between letter arrivals in a staggered entrance / fly-in. */
  staggerMs?: number;
  /** Letters can be grabbed and flung (the intro's toy). */
  interactive?: boolean;
}

interface RenderLetter {
  ch: string;
  text: Text;
  hw: number;
  hh: number;
  color: number;
  seq: number;
}

export class LetterField {
  private world!: CelebrateWorld;
  private letters: RenderLetter[] = [];
  /** The letters' render container (host effects may fade/move it). */
  readonly container = new Container();
  private seq = 0;
  private acc = 0;
  private timers: number[] = [];
  private destroyed = false;
  private tickerFn = () => this.tick();
  /** Aborted in destroy() to remove all pointer listeners at once. */
  private pointerAbort = new AbortController();

  private constructor(
    private app: Application,
    private opts: LetterFieldOpts,
  ) {}

  /** Create the field and staggered-rain the layout's letters in. */
  static async create(app: Application, parent: Container, layout: LayoutStrategy, opts: LetterFieldOpts): Promise<LetterField> {
    const f = new LetterField(app, opts);
    parent.addChild(f.container);
    f.container.zIndex = 500;
    const { slots, fit } = layout(app.screen.width, app.screen.height);
    f.world = await createCelebrateWorld([], app.screen.width, app.screen.height, STUCK_DIST * fit, UNGHOST_DIST * fit);
    f.staggerIn(slots);
    app.ticker.add(f.tickerFn);
    if (opts.interactive) f.bindPointer();
    return f;
  }

  /** One letter every staggerMs: pop into existence off-screen, fly to slot. */
  private staggerIn(slots: LayoutSlot[]): void {
    slots.forEach((slot, i) => {
      const t = window.setTimeout(() => {
        if (this.destroyed) return;
        this.spawn(slot);
      }, i * (this.opts.staggerMs ?? 70));
      this.timers.push(t);
    });
  }

  private spawn(slot: LayoutSlot): void {
    const seq = this.seq++;
    const color = this.opts.palette[seq % this.opts.palette.length];
    const text = new Text({ text: slot.ch, style: this.opts.styleFor(color, slot.size, seq) });
    text.anchor.set(0.5);
    this.container.addChild(text);
    const hw = Math.max(8, text.width * 0.42);
    const hh = Math.max(8, text.height * 0.4);
    const colliders = scaleHull(hullForGlyph(slot.ch, hw / slot.size, hh / slot.size), slot.size);
    addLetter(this.world, { colliders, hw, hh, slotX: slot.x, slotY: slot.y });
    this.letters.push({ ch: slot.ch, text, hw, hh, color, seq });
  }

  /** Morph the live word into a new one: matching glyphs GLIDE to their new
   * slots, the rest bonk off solid, missing letters stagger-fly in. */
  morphTo(layout: LayoutStrategy): void {
    if (this.destroyed) return;
    this.world.settledFrames = 0; // revive the loop if this field had idled (see tick)
    const next = layout(this.app.screen.width, this.app.screen.height);
    removeWalls(this.world);
    this.world.stuckDist = STUCK_DIST * next.fit;
    this.world.unghostDist = UNGHOST_DIST * next.fit;

    const view = this.world.letters.map((L, i) => {
      const p = L.body.translation();
      return { ch: this.letters[i].ch, x: p.x, y: p.y, discarded: L.discarded };
    });
    const { claimed, plan } = planClaims(view, next.slots);

    for (const { slot, survivor } of plan) {
      if (survivor < 0) continue;
      const r = this.letters[survivor];
      const replaced = r.text.style;
      r.text.style = this.opts.styleFor(r.color, slot.size, r.seq);
      if (replaced instanceof TextStyle) replaced.destroy();
      r.hw = Math.max(8, r.text.width * 0.42);
      r.hh = Math.max(8, r.text.height * 0.4);
      retargetLetter(this.world, survivor, slot.x, slot.y);
      r.text.zIndex = 1;
    }
    for (let i = 0; i < this.world.letters.length; i++) {
      if (!claimed.has(i)) {
        scatterLetter(this.world, i, { solid: true });
        this.letters[i].text.zIndex = 0;
      }
    }
    const missing = plan.filter((p) => p.survivor < 0);
    missing.forEach(({ slot }, i) => {
      const t = window.setTimeout(() => {
        if (this.destroyed) return;
        this.spawn(slot);
      }, i * (this.opts.staggerMs ?? 70));
      this.timers.push(t);
    });
  }

  /** Drop every letter off the bottom (the hand-off exit). */
  exit(): void {
    if (!this.destroyed) exitCelebrate(this.world);
  }

  private tick(): void {
    if (this.destroyed) return;
    // A non-interactive field (a house title) that has come to rest needs no
    // more physics — skip stepping AND the per-letter position writes. An
    // interactive field keeps stepping so a pointer grab always finds a live
    // world; a morph/scatter resets settledFrames and revives this one.
    if (!this.opts.interactive && this.world.settledFrames > IDLE_FRAMES && !this.world.drag) {
      this.acc = 0;
      return;
    }
    const dtMs = Math.min(50, this.app.ticker.deltaMS);
    this.acc += dtMs / 1000;
    let steps = 0;
    while (this.acc >= FIXED_DT && steps < 3) {
      stepCelebrate(this.world, FIXED_DT);
      this.acc -= FIXED_DT;
      steps++;
    }
    for (let i = 0; i < this.world.letters.length; i++) {
      const b = this.world.letters[i].body;
      const p = b.translation();
      const r = this.letters[i];
      r.text.position.set(p.x, p.y);
      r.text.rotation = b.rotation();
    }
    const culled = cullDiscarded(this.world);
    for (const i of culled) {
      this.letters[i].text.destroy({ style: true });
      this.letters.splice(i, 1);
    }
  }

  private bindPointer(): void {
    const el = this.app.canvas as HTMLCanvasElement;
    const toWorld = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * this.app.screen.width,
        y: ((e.clientY - rect.top) / rect.height) * this.app.screen.height,
      };
    };
    const signal = this.pointerAbort.signal;
    el.addEventListener('pointerdown', (e) => {
      if (this.destroyed) return;
      const { x, y } = toWorld(e);
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < this.world.letters.length; i++) {
        const L = this.world.letters[i];
        if (L.discarded) continue;
        const p = L.body.translation();
        const r = this.letters[i];
        if (Math.abs(x - p.x) < r.hw * GRAB_PAD && Math.abs(y - p.y) < r.hh * GRAB_PAD) {
          const d = (x - p.x) ** 2 + (y - p.y) ** 2;
          if (d < bestD) { bestD = d; best = i; }
        }
      }
      if (best < 0) return;
      solidifyLetter(this.world, best);
      const p = this.world.letters[best].body.translation();
      const rot = this.world.letters[best].body.rotation();
      const c = Math.cos(rot), s = Math.sin(rot);
      const dx = x - p.x, dy = y - p.y;
      startLetterDrag(this.world, best, c * dx + s * dy, -s * dx + c * dy, x, y);
    }, { passive: true, signal });
    el.addEventListener('pointermove', (e) => {
      if (!this.world.drag) return;
      const { x, y } = toWorld(e);
      moveDrag(this.world, x, y);
    }, { passive: true, signal });
    const end = () => releaseDrag(this.world);
    el.addEventListener('pointerup', end, { passive: true, signal });
    el.addEventListener('pointercancel', end, { passive: true, signal });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pointerAbort.abort(); // remove the canvas pointer listeners
    for (const t of this.timers) window.clearTimeout(t);
    this.app.ticker.remove(this.tickerFn);
    releaseDrag(this.world);
    for (let i = this.letters.length - 1; i >= 0; i--) {
      this.letters[i].text.destroy({ style: true });
      removeLetter(this.world, i);
    }
    this.letters = [];
    this.world.world.free();
    this.container.destroy({ children: true });
  }
}
