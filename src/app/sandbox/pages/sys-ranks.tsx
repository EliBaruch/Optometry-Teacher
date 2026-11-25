import { useEffect, useMemo, useState } from 'preact/hooks';
import { defineStrings, pickStrings } from '@core';
import type { ClinicalCase, GameServices, LearningPort, MiniGameResult, TestId } from '@core';
import { asComponent, Button, GlassPanel, HudSlot, Screen, ToastHost, useSignal } from '@ui-kit';
import ranks from '../../../systems/ranks';
import { ACHIEVEMENTS } from '../../../systems/ranks/model/achievements';
import { buildEnv } from '../../../systems/ranks/engine';
import { levelInfo, xpAtLevel } from '../../../systems/ranks/model/ladder';
import { emptyDx, initialState, ranksSlot, type RanksState } from '../../../systems/ranks/model/state';
import type { SandboxPage } from '../Sandbox';

/**
 * Career (ranks) preview:
 *   ?sandbox=page/sys-ranks                 widgets + controls
 *   ?sandbox=page/sys-ranks&demo=1          seeded mid-career save
 *   ?sandbox=page/sys-ranks&demo=1&view=career[&tab=trophies|ladder]
 * Cases are played through the real CaseSession so the score is the core's.
 */

const T = defineStrings({
  en: {
    career: 'Career', eyebrow: 'System sandbox', simulate: 'Simulate', real: 'Real case sessions',
    perfect: 'Perfect S case', good: 'Good case', miss: 'Missed diagnosis', emergency: 'Emergency triaged',
    review: 'Second Opinion case', practice: 'Flawless practice', tier: 'Tier level-up', promo: 'Promotion',
    seed: 'Seed demo career', reset: 'Reset', open: 'Open Career scene', daily: 'Daily gift',
    promoReason: 'Promotion review', mentor: 'Mentor feedback',
    meta: (xp: number, cases: number, tr: number, total: number, loaded: number) => `XP ${xp} · cases ${cases} · trophies ${tr}/${total} · ${loaded} cases loaded`,
  },
  he: {
    career: 'קריירה', eyebrow: 'ארגז חול למערכת', simulate: 'סימולציה', real: 'סבבי מקרים אמיתיים',
    perfect: 'מקרה S מושלם', good: 'מקרה טוב', miss: 'אבחנה שפוספסה', emergency: 'מקרה דחוף שהופנה נכון',
    review: 'מקרה של חוות דעת שנייה', practice: 'אימון ללא רבב', tier: 'עלייה בשלב', promo: 'קידום',
    seed: 'מילוי קריירה לדוגמה', reset: 'איפוס', open: 'פתיחת מסך הקריירה', daily: 'מתנה יומית',
    promoReason: 'ועדת קידום', mentor: 'משוב מהמנטור',
    meta: (xp: number, cases: number, tr: number, total: number, loaded: number) => `XP ${xp} · מקרים ${cases} · גביעים ${tr}/${total} · ${loaded} מקרים נטענו`,
  },
});

type Quality = 'perfect' | 'good' | 'miss';

function playCase(services: GameServices, kase: ClinicalCase, q: Quality, modeId = 'shift') {
  const s = services.session;
  s.start(kase, modeId);
  if (q !== 'miss') kase.history.filter((h) => h.relevance === 'key').forEach((h) => s.ask(h.id));
  const tests: TestId[] = q === 'perfect' ? kase.essentialTests : q === 'good' ? kase.essentialTests.slice(0, Math.max(1, kase.essentialTests.length - 1)) : kase.essentialTests.slice(0, 1);
  if (q === 'good' && !tests.includes('color-vision') && !kase.helpfulTests.includes('color-vision')) tests.push('color-vision');
  for (const t of tests) {
    const r: MiniGameResult = { testId: t, accuracy: q === 'perfect' ? 1 : 0.72, timeMs: 20000, findings: [], perfect: q === 'perfect' };
    s.recordTest(r);
  }
  const wrong = kase.differentials.find((d) => d !== kase.diagnosis) ?? 'healthy-eyes';
  s.submit(q === 'miss' ? wrong : kase.diagnosis, q === 'good' && kase.urgency !== 'routine' ? 'routine' : kase.urgency, q === 'perfect' ? 'certain' : 'fairly-sure');
}

/** Demo spaced-mastery values so the sky shows every star state. */
function demoMastery(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  ids.forEach((id, i) => m.set(id, i % 5 === 0 ? 0.92 : i % 3 === 0 ? 0.5 : i % 7 === 0 ? 0.1 : 0.2));
  return m;
}

function seedDemo(services: GameServices): Map<string, number> {
  const dx = services.registries.diagnoses.all().map((d) => d.id).sort();
  const picked = dx.filter((_, i) => i % 4 !== 3);
  const mastery = demoMastery(picked);
  const s: RanksState = { ...initialState() };
  s.xp = xpAtLevel(10) + 640;
  s.cases = 96; s.correct = 81; s.perfect = 7; s.sGrades = 23; s.urgencyCorrect = 77;
  s.bestCorrectStreak = 12; s.bestPerfectStreak = 2; s.fullHistory = 31; s.lean = 8; s.swift = 2;
  s.certainCorrect = 11; s.reviewCorrect = 4; s.rareCorrect = 2; s.eagleEye = 1; s.practice = 6; s.comebacks = 3;
  s.triaged = ['acute-angle-closure', 'retinal-detachment', 'crao'];
  s.runs = { shift: 9, daily: 3 };
  s.tests = { tonometry: { done: 30, perfect: 4 }, 'slit-lamp': { done: 41, perfect: 2 }, ophthalmoscopy: { done: 22, perfect: 1 }, 'visual-acuity': { done: 60, perfect: 12 } };
  picked.forEach((id, i) => {
    const m = mastery.get(id) ?? 0;
    s.dx[id] = { ...emptyDx(), seen: 2 + (i % 4), correct: 1 + (i % 4), missed: i % 3 === 0 ? 1 : 0, best: m > 0.8 ? 'S' : i % 2 ? 'A' : 'B', bestStars: i % 7 === 0 ? 2 : 0 };
  });
  // Unlock what this save has earned (dated over the last weeks), a couple still "new".
  const env = buildEnv(services, s);
  const now = services.clock.now();
  ACHIEVEMENTS.forEach((a, i) => {
    const [cur, max] = a.progress(s, { ...env, stars: (id) => ((mastery.get(id) ?? 0) >= 0.8 ? 3 : (mastery.get(id) ?? 0) >= 0.35 ? 2 : s.dx[id] ? 1 : 0) });
    if (max > 0 && cur >= max) s.achievements[a.id] = now - (i + 1) * 86400000 * 1.7;
  });
  s.unseen = Object.keys(s.achievements).slice(-2);
  ranksSlot(services).set(s);
  return mastery;
}

/** Park XP just short of the next tier / rank, then grant the rest so the real engine stages the moment. */
function bumpTo(services: GameServices, what: 'tier' | 'rank') {
  const t = pickStrings(T, services.locale);
  const slot = ranksSlot(services);
  const i = levelInfo(slot.get().xp);
  const target = what === 'rank' && i.nextRank ? i.xp + i.toNextRank : i.levelEndXp;
  slot.update((s) => ({ ...s, xp: Math.max(s.xp, target - 40) }));
  services.bus.emit('xp:grant', { amount: 60, reason: what === 'rank' ? t.promoReason : t.mentor });
}

function SysRanksPage({ services }: { services: GameServices }) {
  const q = new URLSearchParams(location.search);
  const t = pickStrings(T, services.locale);
  const route = useSignal(services.router.current);
  const st = useSignal(ranksSlot(services));
  const [log, setLog] = useState<string[]>([]);
  const cases = useMemo(() => services.registries.cases.all(), [services]);
  const [demo, setDemo] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    const off = ranks.install(services);
    const offLog = services.bus.onAny((e, p) => {
      if (e === 'reward:granted' || e === 'achievement:unlocked' || e === 'rank:changed') {
        const v = p as { label?: string; title?: string; value?: string };
        setLog((l) => [`${e} · ${v.label ?? v.title ?? ''} ${v.value ?? ''}`, ...l].slice(0, 14));
      }
    });
    if (q.get('demo')) setDemo(seedDemo(services));
    if (q.get('view') === 'career') services.router.replace('career', q.get('tab') ? { tab: q.get('tab') } : {});
    return () => {
      offLog();
      off();
    };
  }, []);

  // Demo mastery overlay: the learning port reports seeded values for seeded diagnoses.
  useEffect(() => {
    if (!demo) return;
    const real: LearningPort = services.learning;
    services.learning = {
      ...real,
      record: (id, quality) => real.record(id, quality),
      mastery: (id) => demo.get(id) ?? real.mastery(id),
      seen: (id) => demo.has(id) || real.seen(id),
    };
    ranksSlot(services).update((s) => ({ ...s }));
    return () => {
      services.learning = real;
    };
  }, [demo]);

  const pick = (pred: (c: ClinicalCase) => boolean) => {
    const pool = cases.filter(pred);
    return pool[Math.floor(Math.random() * pool.length)] ?? cases[0];
  };
  const run = (q: Quality, pred: (c: ClinicalCase) => boolean = () => true, mode?: string) => {
    const k = pick(pred);
    if (k) playCase(services, k, q, mode);
  };

  if (route.id === 'career') {
    const scene = services.registries.scenes.get('career');
    if (scene) {
      const C = asComponent(scene.component);
      return (
        <>
          <C services={services} params={route.params} />
          <ToastHost />
        </>
      );
    }
  }

  return (
    <Screen title={t.career} eyebrow={t.eyebrow} backdrop="results" class="sb-ranks">
      <style>{CSS}</style>
      <div class="sb-ranks__grid">
        <GlassPanel title={t.simulate} eyebrow={t.real} icon="play" class="sb-ranks__ctl">
          <div class="sb-ranks__btns">
            <Button variant="primary" icon="star" onClick={() => run('perfect')} data-sb="perfect">{t.perfect}</Button>
            <Button icon="check" onClick={() => run('good')} data-sb="good">{t.good}</Button>
            <Button icon="x" onClick={() => run('miss')} data-sb="miss">{t.miss}</Button>
            <Button icon="lightning" onClick={() => run('perfect', (c) => !!c.emergency || c.urgency === 'emergency')} data-sb="emergency">{t.emergency}</Button>
            <Button icon="refresh" onClick={() => run('perfect', () => true, 'review')} data-sb="review">{t.review}</Button>
            <Button icon="target" onClick={() => services.bus.emit('practice:completed', { testId: 'tonometry', result: { testId: 'tonometry', accuracy: 1, timeMs: 9000, findings: [], perfect: true } })} data-sb="practice">{t.practice}</Button>
            <Button icon="plus" onClick={() => services.bus.emit('xp:grant', { amount: 250, reason: t.daily })} data-sb="grant">xp:grant +250</Button>
            <Button icon="trophy" onClick={() => bumpTo(services, 'tier')} data-sb="tierup">{t.tier}</Button>
            <Button icon="crown" onClick={() => bumpTo(services, 'rank')} data-sb="rankup">{t.promo}</Button>
            <Button icon="sparkle" onClick={() => setDemo(seedDemo(services))} data-sb="demo">{t.seed}</Button>
            <Button variant="ghost" icon="refresh" onClick={() => { ranksSlot(services).set(initialState()); setDemo(null); }} data-sb="reset">{t.reset}</Button>
            <Button variant="glass" trailingIcon="arrow-right" onClick={() => services.router.go('career')} data-sb="open">{t.open}</Button>
          </div>
          <div class="sb-ranks__meta lm-num" dir="auto">{t.meta(st.xp, st.cases, Object.keys(st.achievements).length, ACHIEVEMENTS.length, cases.length)}</div>
          <ol class="sb-ranks__log">{log.map((l, i) => <li key={i}>{l}</li>)}</ol>
        </GlassPanel>
        <div class="sb-ranks__col">
          <HudSlot slot="results-extra" />
          <HudSlot slot="hub-sidebar" />
        </div>
        <div class="sb-ranks__col">
          <HudSlot slot="profile" />
        </div>
      </div>
      <ToastHost />
    </Screen>
  );
}

const CSS = `
.sb-ranks__grid { display: grid; grid-template-columns: minmax(0, 340px) minmax(0, 1fr) minmax(0, 1fr); gap: 20px; max-width: 1360px; margin: 0 auto; align-items: start; }
.sb-ranks__col, .sb-ranks__col .hud-slot { display: flex; flex-direction: column; gap: 16px; }
.sb-ranks__btns { display: flex; flex-wrap: wrap; gap: 8px; }
.sb-ranks__meta { margin-top: 12px; font-size: 12px; color: var(--lm-muted); }
.sb-ranks__log { margin: 10px 0 0; padding-inline-start: 18px; font-size: 11px; color: var(--lm-muted); max-height: 220px; overflow: auto; }
@media (max-width: 1100px) { .sb-ranks__grid { grid-template-columns: 1fr; } }
`;

const page: SandboxPage = { id: 'sys-ranks', title: 'System · Career', component: SysRanksPage };
export default page;
