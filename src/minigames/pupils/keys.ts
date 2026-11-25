/** Keyboard bindings for the exam. Returns an unbind function. */
export interface KeyActions {
  active(): boolean;
  aim(eye: 'OD' | 'OS'): void;
  swing(): void;
  toggleRoom(): void;
  toggleNear(): void;
  gaugeBy(dir: 1 | -1): void;
  record(): void;
  otherEye(): void;
}

export function bindKeys(root: HTMLElement, a: KeyActions): () => void {
  const down = (e: KeyboardEvent) => {
    if (!a.active() || e.ctrlKey || e.metaKey || e.altKey) return;
    const onCtl = !!(e.target as HTMLElement).closest('button, [role=slider]');
    const k = e.key;
    const take = () => e.preventDefault();
    if ((k === 'ArrowLeft' || k === 'ArrowUp') && !onCtl) { take(); a.aim('OD'); }
    else if ((k === 'ArrowRight' || k === 'ArrowDown') && !onCtl) { take(); a.aim('OS'); }
    else if (k === ' ' && !onCtl) { take(); a.swing(); }
    else if (k === 'b' || k === 'B') a.toggleRoom();
    else if (k === 'n' || k === 'N') a.toggleNear();
    else if (k === '+' || k === '=') a.gaugeBy(1);
    else if (k === '-' || k === '_') a.gaugeBy(-1);
    else if ((k === 'Enter' && !onCtl) || k === 'm' || k === 'M') { take(); a.record(); }
    else if (k === 'o' || k === 'O') a.otherEye();
  };
  root.addEventListener('keydown', down);
  return () => root.removeEventListener('keydown', down);
}
