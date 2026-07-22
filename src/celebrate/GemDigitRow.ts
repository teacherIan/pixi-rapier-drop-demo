// GemDigitRow — the rolling house counter as gem bubble digits. Digits sit in
// FIXED-WIDTH cells (the widest digit's advance) so the roll never jitters,
// and the row ENTERS by dropping its glyphs in from above the canvas one after
// another with a candy overshoot. Deliberately NOT physics: it rolls every few
// frames, and a morph per tick would be a permanent explosion.
import { CanvasTextMetrics, Container, Text } from 'pixi.js';
import { metricStyle } from 'bubble-rapier-text';
import { gemTextStyle } from './gemStyle';

const STAGGER_MS = 80;
const FALL_MS = 650;
const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export class GemDigitRow {
  readonly container = new Container();
  private cells: Text[] = [];
  private cellW: number;
  private current = '';
  private enterElapsed = -1;
  private enterDrop = 0;

  constructor(
    private color: number,
    private fontSize: number,
    digits = 4,
  ) {
    const style = metricStyle(fontSize);
    let widest = 1;
    for (const d of '0123456789') {
      widest = Math.max(widest, CanvasTextMetrics.measureText(d, style).width);
    }
    this.cellW = widest;
    this.set('0'.repeat(digits));
  }

  set(text: string): void {
    if (text === this.current) return;
    this.current = text;
    while (this.cells.length > text.length) this.cells.pop()!.destroy({ style: true });
    [...text].forEach((ch, i) => {
      if (i >= this.cells.length) {
        const t = new Text({ text: ch, style: gemTextStyle(this.color, this.fontSize, i * 7 + 3) });
        t.anchor.set(0.5);
        t.resolution = 2;
        this.container.addChild(t);
        this.cells.push(t);
      } else if (this.cells[i].text !== ch) {
        this.cells[i].text = ch;
      }
    });
    const total = this.cells.length * this.cellW;
    this.cells.forEach((t, i) => t.position.set(-total / 2 + this.cellW * (i + 0.5), 0));
  }

  /** Begin the staggered drop-in from `dropPx` above the row's seat. */
  enter(dropPx: number): void {
    this.enterElapsed = 0;
    this.enterDrop = dropPx;
    this.tick(0);
  }

  /** Advance the entrance; call every frame (no-op once settled). */
  tick(dtMs: number): void {
    if (this.enterElapsed < 0) return;
    this.enterElapsed += dtMs;
    let settled = true;
    this.cells.forEach((t, i) => {
      const k = (this.enterElapsed - i * STAGGER_MS) / FALL_MS;
      if (k < 1) settled = false;
      t.position.y = k <= 0 ? -this.enterDrop : k >= 1 ? 0 : -this.enterDrop * (1 - easeOutBack(k));
    });
    if (settled) this.enterElapsed = -1;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
