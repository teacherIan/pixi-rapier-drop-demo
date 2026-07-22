// Slot geometry for every text surface, on the library's viewport-derived
// layout. One shared measure (metricStyle + SPACE_FRAC) keeps measurement,
// rendering, and collision hulls in agreement.
import { CanvasTextMetrics } from 'pixi.js';
import { createLineLayout, metricStyle, SPACE_FRAC, type LayoutStrategy, type Measure } from 'bubble-rapier-text';

export const measure: Measure = (text, size) => {
  const style = metricStyle(size);
  let total = 0;
  for (const ch of text) {
    total += ch === ' ' ? size * SPACE_FRAC : CanvasTextMetrics.measureText(ch, style).width;
  }
  return total;
};

/** The intro's single centred word (LOADING / START / DROP!). */
export function centerWord(word: string): LayoutStrategy {
  return createLineLayout({
    lines: [{ text: word }],
    measure,
    baseSize: 170,
    widthBudget: 0.72,
    heightBudget: 0.5,
    maxScale: 1.4,
  });
}

/** A house title pinned high in its quarter-width canvas. */
export function houseTitle(word: string): LayoutStrategy {
  return createLineLayout({
    lines: [{ text: word }],
    measure,
    baseSize: 96,
    widthBudget: 0.86,
    heightBudget: 0.9,
    maxScale: 1.2,
    lineYs: (vh) => [vh * 0.12],
  });
}

/** The outro takeover: WINNER over the house's name. */
export function winnerLayout(house: string): LayoutStrategy {
  return createLineLayout({
    lines: [
      { text: 'WINNER', weight: 1 },
      { text: house, weight: 0.72 },
    ],
    measure,
    baseSize: 150,
    widthBudget: 0.8,
    heightBudget: 0.55,
    lineYs: (vh) => [vh * 0.3, vh * 0.46],
  });
}
