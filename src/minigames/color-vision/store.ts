import { createRng } from '@core';
import type { Vec3 } from './color';
import { packCircles, type Dot } from './packing';
import { paintPlate } from './paint';
import { dotColors, perceivedColors, type EyeVision, type Plate } from './plates';

/** Lazily builds and caches each plate's dots, inks and painted canvas. */
export class PlateStore {
  private dotCache = new Map<number, Dot[]>();
  private inkCache = new Map<number, Vec3[]>();
  private art = new Map<string, HTMLCanvasElement>();

  constructor(readonly plates: readonly Plate[], private readonly seeds: readonly number[]) {}

  dots(i: number): Dot[] {
    let d = this.dotCache.get(i);
    if (!d) {
      d = packCircles(createRng(this.seeds[i]! ^ 0x5bd1e995), { rMax: 0.05, rMin: 0.0105, tiers: 8, attempts: 2600 });
      this.dotCache.set(i, d);
    }
    return d;
  }

  colors(i: number): Vec3[] {
    let c = this.inkCache.get(i);
    if (!c) {
      c = dotColors(this.plates[i]!, this.dots(i), createRng(this.seeds[i]!));
      this.inkCache.set(i, c);
    }
    return c;
  }

  /** Painted plate; with `view`, as that eye perceives it (teaching simulation). */
  canvas(i: number, view?: EyeVision, viewKey = ''): HTMLCanvasElement {
    const key = `${i}|${viewKey}`;
    let c = this.art.get(key);
    if (!c) {
      const ink = view ? perceivedColors(this.colors(i), view) : this.colors(i);
      c = paintPlate(this.dots(i), ink);
      this.art.set(key, c);
    }
    return c;
  }

  has(i: number): boolean {
    return this.art.has(`${i}|`);
  }

  dispose(): void {
    this.dotCache.clear();
    this.inkCache.clear();
    this.art.forEach((c) => {
      c.width = 0;
      c.height = 0;
    });
    this.art.clear();
  }
}
