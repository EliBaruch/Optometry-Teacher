import type { ComponentChildren, Ref } from 'preact';
import { otherEye, type Eye, type MiniGameContext } from '@core';
import { Icon } from '@ui-kit';
import { Bowl, type BowlProps } from './Bowl';
import { Console, type ConsoleProps } from './Console';
import { Debrief } from './Debrief';
import { Pathway } from './Pathway';
import { Picker } from './Picker';
import type { Localisation, Pattern } from './interpret';
import type { ExamScore, TechniqueScore } from './scoring';
import { useVf } from './useVf';

export interface TestPaneProps {
  tab: 'bowl' | 'plot';
  eye: Eye;
  sideRef: Ref<HTMLElement>;
  bowl: Omit<BowlProps, 'eye'>;
  printout: ComponentChildren;
  view: 'grey' | 'numeric';
  onView: (v: 'grey' | 'numeric') => void;
  console: ConsoleProps;
}

/** The test phase: the perimeter bowl on the left, live printout + operator console on the right. */
export function TestPane({ tab, eye, sideRef, bowl, printout, view, onView, console: cp }: TestPaneProps) {
  const t = useVf();
  return (
    <div class={`vf__body is-tab-${tab}`}>
      <section class="vf__stage">
        <Bowl eye={eye} {...bowl} />
      </section>
      <aside class="vf__side" ref={sideRef}>
        <div class="vf-printwrap">
          {printout}
          <div class="vf-viewtoggle" role="group" aria-label={t.printView}>
            <button type="button" class={view === 'grey' ? 'is-on' : ''} aria-pressed={view === 'grey'} onClick={() => onView('grey')}>{t.grey}</button>
            <button type="button" class={view === 'numeric' ? 'is-on' : ''} aria-pressed={view === 'numeric'} onClick={() => onView('numeric')}>{t.numeric}</button>
          </div>
        </div>
        <Console {...cp} />
      </aside>
    </div>
  );
}

export interface InterpretPaneProps {
  eye: Eye;
  picks: Record<Eye, Pattern | null>;
  loc: Localisation | null;
  practice: boolean;
  onPick: (p: Pattern) => void;
  onLoc: (l: Localisation) => void;
  onEye: (e: Eye) => void;
}

/** Interpret phase: name each eye's pattern, then place the lesion on the pathway. */
export function InterpretPane({ eye, picks, loc, practice, onPick, onLoc, onEye }: InterpretPaneProps) {
  const t = useVf();
  return (
    <>
      <div class="vf-section">
        <h3>{t.patternOf(eye, t.eyeName[eye])}</h3>
        <Picker eye={eye} value={picks[eye]} onChange={onPick} />
        {picks[eye] && !picks[otherEye(eye)] && (
          <button type="button" class="vf-next" onClick={() => onEye(otherEye(eye))}>
            {t.nextEye(otherEye(eye))} <Icon name="arrow-right" size={13} class="vf-flip" />
          </button>
        )}
      </div>
      <div class="vf-section">
        <h3>{practice ? t.challenge : ''}{t.whereLesion}</h3>
        <Pathway value={loc} onChange={onLoc} />
      </div>
    </>
  );
}

export interface DebriefPaneProps {
  ctx: MiniGameContext;
  picks: Record<Eye, Pattern | null>;
  loc: Localisation | null;
  truthLoc: Localisation;
  scores: { technique: Record<Eye, TechniqueScore>; classify: Record<Eye, number>; exam: ExamScore };
}

export function DebriefPane({ ctx, picks, loc, truthLoc, scores }: DebriefPaneProps) {
  return (
    <>
      <Debrief ctx={ctx} picks={picks} classify={scores.classify} technique={scores.technique} loc={loc} truthLoc={truthLoc} score={scores.exam} />
      <div class="vf-section vf-section--path">
        <Pathway value={loc} truth={truthLoc} disabled />
      </div>
    </>
  );
}
