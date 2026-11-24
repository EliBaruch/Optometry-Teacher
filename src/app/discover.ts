import type { ClinicalCase, Diagnosis, GameServices, MiniGameModule, ModeModule, SceneModule, SinModule } from '@core';
import { DISABLED_PLUGINS } from './plugins.config';

type Mod = Record<string, unknown>;
type Loader = () => Promise<Mod>;

/*
 * Plugins are discovered by folder convention and loaded independently:
 * a plugin that fails to load or register is logged and skipped — it can
 * never take the rest of the game down with it.
 */
const GLOBS = {
  diagnoses: import.meta.glob<Mod>('../content/diagnoses/**/*.ts'),
  cases: import.meta.glob<Mod>('../content/cases/**/*.ts'),
  minigames: import.meta.glob<Mod>(['../minigames/*/index.ts', '../minigames/*/index.tsx']),
  scenes: import.meta.glob<Mod>(['../scenes/*/index.ts', '../scenes/*/index.tsx']),
  modes: import.meta.glob<Mod>('../modes/*/index.ts'),
  sins: import.meta.glob<Mod>(['../sins/*/index.ts', '../sins/*/index.tsx']),
};

export type PluginKind = keyof typeof GLOBS;

/** "../minigames/tonometry/index.ts" -> "minigames/tonometry" */
export function pluginKey(path: string): string {
  return path.replace(/^\.\.\//, '').replace(/\/index\.tsx?$/, '').replace(/\.tsx?$/, '');
}

function enabled(path: string): boolean {
  if (/\.test\.tsx?$/.test(path)) return false;
  const key = pluginKey(path);
  return !DISABLED_PLUGINS.some((d) => key === d || key.startsWith(d + '/'));
}

async function load<T>(kind: PluginKind, only?: (key: string) => boolean): Promise<{ key: string; item: T }[]> {
  const entries = Object.entries(GLOBS[kind] as Record<string, Loader>).filter(
    ([p]) => enabled(p) && (!only || only(pluginKey(p))),
  );
  const settled = await Promise.allSettled(entries.map(([, loader]) => loader()));
  const out: { key: string; item: T }[] = [];
  settled.forEach((res, i) => {
    const key = pluginKey(entries[i]![0]);
    if (res.status === 'rejected') {
      console.error(`[discover] plugin ${key} failed to load`, res.reason);
      return;
    }
    const exp = res.value.default;
    if (exp === undefined) return; // helper file without default export
    for (const item of (Array.isArray(exp) ? exp : [exp]) as T[]) out.push({ key, item });
  });
  return out;
}

function safely(key: string, fn: () => void) {
  try {
    fn();
  } catch (err) {
    console.error(`[discover] failed to register ${key}`, err);
  }
}

export interface DiscoveryReport {
  minigames: number;
  sins: number;
  scenes: number;
  modes: number;
  cases: number;
  diagnoses: number;
}

export interface DiscoverOptions {
  /** Restrict which plugins load (sandbox). Content is always loaded. */
  filter?: Partial<Record<PluginKind, (key: string) => boolean>>;
}

export async function discoverPlugins(services: GameServices, opts: DiscoverOptions = {}) {
  const r = services.registries;
  const f = opts.filter ?? {};
  const [dx, cs, mg, sc, md, sn] = await Promise.all([
    load<Diagnosis>('diagnoses', f.diagnoses),
    load<ClinicalCase>('cases', f.cases),
    load<MiniGameModule>('minigames', f.minigames),
    load<SceneModule>('scenes', f.scenes),
    load<ModeModule>('modes', f.modes),
    load<SinModule>('sins', f.sins),
  ]);
  dx.forEach(({ key, item }) => safely(key, () => r.diagnoses.register(item)));
  cs.forEach(({ key, item }) => safely(key, () => r.cases.register(item)));
  mg.forEach(({ key, item }) => safely(key, () => r.minigames.register(item)));
  sc.forEach(({ key, item }) => safely(key, () => r.scenes.register(item)));
  md.forEach(({ key, item }) => safely(key, () => r.modes.register(item)));
  const uninstalls: (() => void)[] = [];
  sn.forEach(({ key, item }) =>
    safely(key, () => {
      r.sins.register(item);
      uninstalls.push(item.install(services));
    }),
  );
  const report: DiscoveryReport = {
    minigames: r.minigames.all().length,
    sins: r.sins.all().length,
    scenes: r.scenes.all().length,
    modes: r.modes.all().length,
    cases: r.cases.all().length,
    diagnoses: r.diagnoses.all().length,
  };
  return { report, uninstall: () => uninstalls.forEach((u) => u()) };
}
