/**
 * Tap-vs-gesture discrimination for touch/mouse viewers. A tap is a single
 * pointer that goes down and up without travelling; any moment with two or
 * more pointers down (pinch) poisons the whole gesture until every pointer
 * has lifted and a fresh pointerdown starts a new one.
 */
export interface TapGesture {
  down(id: number): void;
  /** Report travel (CSS px) of a pointer. */
  move(id: number, dist: number): void;
  /** Returns true when this release completes a clean tap. */
  up(id: number, cancelled?: boolean): boolean;
  /** Pointers currently down. */
  readonly count: number;
}

export function createTapGesture(slop = 6): TapGesture {
  const down = new Set<number>();
  let travelled = 0;
  let gestured = false;
  return {
    get count() {
      return down.size;
    },
    down(id) {
      if (down.size === 0) {
        travelled = 0;
        gestured = false;
      }
      down.add(id);
      if (down.size > 1) gestured = true;
    },
    move(id, dist) {
      if (down.has(id)) travelled += Math.abs(dist);
    },
    up(id, cancelled = false) {
      if (!down.has(id)) return false;
      down.delete(id);
      if (cancelled) gestured = true;
      return down.size === 0 && !gestured && travelled < slop;
    },
  };
}
