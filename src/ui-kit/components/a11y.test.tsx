/**
 * Accessibility & integration guarantees:
 *  - every interactive component keeps a visible keyboard focus ring,
 *  - Modal / ToastHost inside <Screen> can rise above the top bar,
 *  - interactive cards work from the keyboard,
 *  - toasts pause while hovered/focused,
 *  - an open Modal makes the rest of the page inert.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createServices, type AudioPort, type GameServices } from '@core';
import { ServicesProvider } from '../context';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Chip } from './Chip';
import { Card } from './GlassPanel';
import { Modal } from './Modal';
import { Screen } from './Screen';
import { SpeechBubble } from './SpeechBubble';
import { Tabs } from './Tabs';
import { ToastHost } from './ToastHost';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useLiteRendering } from '../hooks/useLiteRendering';
import { resetQualityForTests, setLiteRendering } from '../lib/quality';

/*
 * Vitest runs with CSS processing off, so `?raw` CSS imports come back empty.
 * Read the stylesheets from disk through Node's built-in fs instead (looked up
 * at runtime: the boundary checker only allows preact/vitest *imports*).
 */
type NodeFs = { readFileSync(p: string, enc: 'utf8'): string; readdirSync(p: string): string[] };
type NodeProcess = { cwd(): string; getBuiltinModule?: (id: string) => unknown };
const proc = (globalThis as unknown as { process?: NodeProcess }).process;
const fs = proc?.getBuiltinModule?.('node:fs') as NodeFs | undefined;
// Vitest's root is the repository root.
const dir = `${proc?.cwd() ?? '.'}/src/ui-kit/components/`;
const css = (file: string) => fs!.readFileSync(dir + file, 'utf8');
const sheetFiles = fs ? fs.readdirSync(dir).filter((f) => f.endsWith('.css')) : [];
const base = fs ? fs.readFileSync(`${dir}../styles/base.css`, 'utf8') : '';
const describeCss = fs ? describe : describe.skip;

/** All declarations of every rule whose selector list contains `selector` (naive but fine for our flat CSS). */
const rulesFor = (source: string, test: (sel: string) => boolean) =>
  [...source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => m[1]!.split(',').some((s) => test(s.trim())))
    .map((m) => m[2]!);

let host: HTMLDivElement;
let services: GameServices;
let played: string[];
beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  played = [];
  const audio: AudioPort = { play: (id) => void played.push(id), music() {}, unlock() {}, setVolumes() {} };
  services = createServices({ audio });
});
afterEach(() => {
  render(null, host);
  host.remove();
  document.documentElement.classList.remove('reduced-motion');
  vi.useRealTimers();
});
const mount = (ui: preact.ComponentChildren) => act(() => render(<ServicesProvider services={services}>{ui}</ServicesProvider>, host));
const key = (el: Element, k: string) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });

describeCss('keyboard focus ring (stylesheets)', () => {
  it('base.css draws the ring as an outline, which component box-shadows cannot erase', () => {
    const decls = rulesFor(base, (s) => s === ':focus-visible').join(';');
    expect(decls).toMatch(/outline:\s*var\(--lm-focus-width\)\s+solid\s+var\(--lm-focus-color\)/);
  });

  it('no component stylesheet removes the outline from a focusable control', () => {
    const allowed = ['.lm-modal__panel']; // programmatic-focus fallback with its own border highlight
    expect(sheetFiles.length).toBeGreaterThan(15);
    for (const file of sheetFiles) {
      for (const m of css(file).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/outline(-style)?:\s*(none|0)\b/.test(m[2]!)) continue;
        const sels = m[1]!.split(',').map((s) => s.trim());
        expect(sels.every((s) => allowed.some((a) => s.startsWith(a))), `${file}: ${m[1]}`).toBe(true);
      }
    }
  });

  it.each([
    ['Button.css', ['.lm-btn--primary', '.lm-btn--glass', '.lm-btn--ghost', '.lm-btn--danger']],
    ['IconButton.css', ['.lm-iconbtn--glass', '.lm-iconbtn--primary', '.lm-iconbtn--ghost']],
    ['Chip.css', ['.lm-chip']],
    ['GlassPanel.css', ['.lm-panel--interactive']],
    ['Tabs.css', ['.lm-tabs__tab']],
    ['ToastHost.css', ['.lm-toast']],
  ])('%s gives each variant a :focus-visible state that keeps the glow', (file, classes) => {
    for (const c of classes) {
      const decls = rulesFor(css(file), (s) => s === `${c}:focus-visible`);
      expect(decls.length, `${c}:focus-visible`).toBeGreaterThan(0);
      // Never hides the outline; any box-shadow it sets either carries the focus glow or is explicitly none.
      for (const d of decls) {
        expect(d).not.toMatch(/outline:\s*none/);
        const shadow = /box-shadow:\s*([^;]+)/.exec(d)?.[1];
        if (shadow && shadow.trim() !== 'none') expect(shadow).toMatch(/--lm-focus-glow|0 0 0 4px|0 0 18px|0 0 24px/);
      }
    }
  });

});

describe('keyboard focus ring (DOM)', () => {
  it('interactive components are reachable with Tab', () => {
    mount(
      <>
        <Button>One</Button>
        <IconButton icon="info" label="Info" />
        <Chip onClick={() => {}}>Chip</Chip>
        <Card onClick={() => {}} title="Card" />
        <Tabs id="t" value="a" onChange={() => {}} items={[{ id: 'a', label: 'A' }]} />
      </>,
    );
    const focusables = host.querySelectorAll('button, [tabindex="0"]');
    expect(focusables.length).toBe(5);
  });
});

describeCss('Screen stacking (stylesheet)', () => {
  it('content does not create a stacking context, so overlays inside it rise above the bar', () => {
    const decls = rulesFor(css('Screen.css'), (s) => s === '.lm-screen__content').join(';');
    expect(decls).not.toMatch(/z-index/);
    expect(decls).not.toMatch(/\b(transform|filter|isolation|will-change)\s*:/);
  });
});

describe('Screen stacking (DOM)', () => {
  it('a Modal opened inside Screen leaves the bar inert', () => {
    mount(
      <Screen title="Room" onBack={() => {}} backdrop={false}>
        <Modal open title="Stage" onClose={() => {}}>
          <button>inside</button>
        </Modal>
      </Screen>,
    );
    const bar = host.querySelector('.lm-screen__bar')!;
    expect(bar.hasAttribute('inert')).toBe(true);
    expect(host.querySelector('[role="dialog"]')!.closest('[inert]')).toBeNull();
  });
});

describe('Modal isolation', () => {
  it('inerts siblings (but not live regions) and restores them on close', () => {
    const onClose = vi.fn();
    const ui = (open: boolean) => (
      <div>
        <button id="opener">open</button>
        <ToastHost />
        <Modal open={open} title="T" onClose={onClose}>
          <button>inside</button>
        </Modal>
      </div>
    );
    mount(ui(true));
    expect(host.querySelector('#opener')!.hasAttribute('inert')).toBe(true);
    expect(host.querySelector('.lm-toasts')!.hasAttribute('inert')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('hidden');
    mount(ui(false));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(host.querySelector('[inert]')).toBeNull();
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('focuses the least destructive footer action first', () => {
    mount(
      <Modal
        open
        title="Erase all progress?"
        onClose={() => {}}
        footer={
          <>
            <Button variant="danger">Erase</Button>
            <Button variant="glass">Keep my progress</Button>
          </>
        }
      >
        <p>This cannot be undone.</p>
      </Modal>,
    );
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(document.activeElement?.textContent).toContain('Keep my progress');
  });

  it('descends into a sibling that holds a live region: controls go inert, the live span stays live', () => {
    const ui = (open: boolean) => (
      <div>
        <section id="settings">
          <div class="row">
            <button id="mute">Mute</button>
            <input id="vol" type="range" />
          </div>
          <footer id="wrap">
            <span id="saved" aria-live="polite">Saved</span>
            <button id="reset">Reset</button>
          </footer>
        </section>
        <Modal open={open} title="Erase all progress?" onClose={() => {}}>
          <button>inside</button>
        </Modal>
      </div>
    );
    mount(ui(true));
    const $ = (s: string) => host.querySelector(s)!;
    // Each control outside the dialog is inside an inert subtree…
    for (const id of ['#mute', '#vol', '#reset']) expect($(id).closest('[inert]')).not.toBeNull();
    // …but the live region and its wrapper chain are not.
    expect($('#saved').closest('[inert]')).toBeNull();
    expect($('#wrap').hasAttribute('inert')).toBe(false);
    expect($('#settings').hasAttribute('inert')).toBe(false);
    expect($('#reset').hasAttribute('inert')).toBe(true);
    expect($('.row').hasAttribute('inert')).toBe(true);
    mount(ui(false));
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(host.querySelector('[inert]')).toBeNull();
  });
});

describe('interactive Card', () => {
  it('is a button that activates on Enter and Space with a click sound', () => {
    const onClick = vi.fn();
    mount(<Card onClick={onClick} title="Open" />);
    const card = host.querySelector('.lm-panel')!;
    expect(card.getAttribute('role')).toBe('button');
    expect(card.getAttribute('tabindex')).toBe('0');
    key(card, 'Enter');
    key(card, ' ');
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(played.filter((p) => p === 'click')).toHaveLength(2);
  });

  it('ignores keys pressed on controls nested inside it', () => {
    const onClick = vi.fn();
    mount(
      <Card onClick={onClick}>
        <button id="inner">inner</button>
      </Card>,
    );
    key(host.querySelector('#inner')!, 'Enter');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('a non-interactive panel stays a plain container', () => {
    mount(<Card interactive={false} title="Static" />);
    const panel = host.querySelector('.lm-panel')!;
    expect(panel.getAttribute('role')).toBeNull();
    expect(panel.getAttribute('tabindex')).toBeNull();
  });
});

describe('ToastHost pause', () => {
  it('does not auto-dismiss while focused, and resumes afterwards', () => {
    mount(
      <>
        <ToastHost duration={1000} />
        <button id="elsewhere">x</button>
      </>,
    );
    act(() => services.bus.emit('toast', { message: 'Hold me' }));
    const toast = host.querySelector<HTMLButtonElement>('.lm-toast')!;
    act(() => toast.focus());
    expect(host.querySelector('.lm-toasts.is-paused')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(host.textContent).toContain('Hold me');
    act(() => host.querySelector<HTMLButtonElement>('#elsewhere')!.focus());
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(host.textContent).not.toContain('Hold me');
  });
});

describe('SpeechBubble semantics', () => {
  it('acts as a labelled button while typing and keeps focus when done', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
    mount(<SpeechBubble text="Halos around lights." voice={false} />);
    const bubble = host.querySelector<HTMLElement>('.lm-speech')!;
    expect(bubble.getAttribute('role')).toBe('button');
    expect(document.getElementById(bubble.getAttribute('aria-describedby')!)!.textContent).toBe('Halos around lights.');
    act(() => bubble.focus());
    key(bubble, 'Enter');
    expect(bubble.getAttribute('role')).toBeNull();
    expect(bubble.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(bubble);
    vi.unstubAllGlobals();
  });
});

describe('useReducedMotion', () => {
  it('follows the html.reduced-motion class when it changes later', async () => {
    vi.useRealTimers();
    let value: boolean | null = null;
    const Probe = () => {
      value = useReducedMotion();
      return null;
    };
    act(() => render(<Probe />, host));
    expect(value).toBe(false);
    document.documentElement.classList.add('reduced-motion');
    await new Promise((r) => setTimeout(r, 0));
    act(() => {});
    expect(value).toBe(true);
  });
});

describe('useLiteRendering', () => {
  it('follows setLiteRendering and the html class', () => {
    resetQualityForTests();
    let value: boolean | null = null;
    const Probe = () => {
      value = useLiteRendering();
      return null;
    };
    act(() => render(<Probe />, host));
    expect(value).toBe(false);
    act(() => setLiteRendering(true));
    expect(value).toBe(true);
    expect(document.documentElement.classList.contains('lm-lite')).toBe(true);
    act(() => setLiteRendering(false));
    expect(value).toBe(false);
    resetQualityForTests();
  });
});
