// The house-points text treatment: bubble letters cut from GEMSTONE — each
// glyph is filled with a procedurally-baked faceted-gem tile in its house's
// colour (ruby, amber, pearl, sapphire), with a diagonal glint and a few
// sparkles. The same role the sprinkle tile plays for the celebration app,
// re-imagined for a school whose points are gems.
//
// Metrics come from the library's metricStyle so measurement, layout, and
// collision hulls can never disagree with what's drawn — this module only
// swaps the fill.
import { FillPattern, Matrix, Texture, TextStyle } from 'pixi.js';
import { metricStyle } from 'bubble-rapier-text';

export const HOUSE_COLORS = {
  ruby: 0xc11c22,
  amber: 0xe46725,
  pearl: 0xdfe3ee, // true white facets read as blank — a cool moonstone base keeps depth
  sapphire: 0x1271b5,
} as const;

/** The intro deals all four houses, letter by letter. */
export const HOUSE_PALETTE = [
  HOUSE_COLORS.ruby,
  HOUSE_COLORS.amber,
  HOUSE_COLORS.pearl,
  HOUSE_COLORS.sapphire,
] as const;

// Deterministic per-tile RNG — facet layouts must not depend on load order.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(color: number, toward: number, f: number): number {
  const r = (color >> 16) & 0xff, g = (color >> 8) & 0xff, b = color & 0xff;
  const tr = (toward >> 16) & 0xff, tg = (toward >> 8) & 0xff, tb = toward & 0xff;
  const m = (a: number, t: number) => Math.round(a + (t - a) * f);
  return (m(r, tr) << 16) | (m(g, tg) << 8) | m(b, tb);
}
const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

// One 128px tile per colour: a jittered triangular facet grid. Grid vertices on
// the tile EDGES stay un-jittered, so the pattern tiles without seams.
const tileCache = new Map<number, Texture>();
function gemTile(color: number): Texture {
  const cached = tileCache.get(color);
  if (cached) return cached;

  const S = 128;
  const N = 4; // 4x4 grid → 32 facets
  const cell = S / N;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const rand = mulberry32(color ^ 0x9e3779b9);

  // Vertex lattice, jittered INSIDE, pinned on the borders (seamless repeat).
  const vx: number[][] = [];
  const vy: number[][] = [];
  for (let j = 0; j <= N; j++) {
    vx[j] = [];
    vy[j] = [];
    for (let i = 0; i <= N; i++) {
      const edgeX = i === 0 || i === N;
      const edgeY = j === 0 || j === N;
      vx[j][i] = i * cell + (edgeX ? 0 : (rand() - 0.5) * cell * 0.55);
      vy[j][i] = j * cell + (edgeY ? 0 : (rand() - 0.5) * cell * 0.55);
    }
  }

  // Each cell splits into two triangles; facet shade leans on its light angle:
  // up-left facets catch the light, down-right facets fall into shadow.
  const shade = (cx: number, cy: number, flip: boolean) => {
    const lightness = 1 - (cx + cy) / (2 * S); // 1 at top-left → 0 at bottom-right
    const f = 0.18 + lightness * 0.42 + (flip ? -0.08 : 0.08) + (rand() - 0.5) * 0.12;
    return f >= 0.32 ? css(mix(color, 0xffffff, f - 0.32 + 0.08)) : css(mix(color, 0x000000, 0.32 - f));
  };
  const tri = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(cx, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(mix(color, 0xffffff, 0.6));
    ctx.globalAlpha = 0.18; // hairline facet edges
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x0 = vx[j][i], y0 = vy[j][i];
      const x1 = vx[j][i + 1], y1 = vy[j][i + 1];
      const x2 = vx[j + 1][i], y2 = vy[j + 1][i];
      const x3 = vx[j + 1][i + 1], y3 = vy[j + 1][i + 1];
      const mx = (x0 + x3) / 2, my = (y0 + y3) / 2;
      tri(x0, y0, x1, y1, x3, y3, shade(mx, my, false));
      tri(x0, y0, x2, y2, x3, y3, shade(mx, my, true));
    }
  }

  // The glint: one soft diagonal light band per tile.
  const g = ctx.createLinearGradient(0, S, S, 0);
  g.addColorStop(0.35, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  g.addColorStop(0.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  // Sparkles: a few 4-point stars.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let k = 0; k < 4; k++) {
    const x = rand() * S, y = rand() * S, r = 2 + rand() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  }

  const tex = Texture.from(canvas);
  tileCache.set(color, tex);
  return tex;
}

/**
 * The gem bubble style: metricStyle's exact metrics with a faceted-gem fill.
 * `seed` offsets the pattern per glyph so neighbouring letters cut their gems
 * differently. Matches the library styleFor(color, size, seq) shape, so the
 * same factory serves the framework-free driver and any future component use.
 */
export function gemTextStyle(color: number, size: number, seed: number): TextStyle {
  const pattern = new FillPattern(gemTile(color), 'repeat');
  const k = Math.max(0.85, size / 220);
  const m = new Matrix();
  m.scale(k, k);
  m.translate((seed * 41) % 128, (seed * 59) % 128);
  pattern.setTransform(m);
  const style = metricStyle(size);
  style.fill = pattern;
  return style;
}

/** Warm the bubble face before any canvas bake — canvas text never triggers a
 * css @font-face fetch on its own. Races a timeout rather than wedging. */
export function warmBubbleFace(): Promise<unknown> {
  return Promise.race([
    document.fonts.load('400 120px "Cherry Bomb One"'),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]).catch(() => undefined);
}
