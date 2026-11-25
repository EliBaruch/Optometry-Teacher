import { Icon } from '@ui-kit';
import { type EyeWork } from './model';
import { useLocale, useT } from './locale';
import { fix } from './strings';

export type SheetTarget = 'disc' | 'vessels' | 'vitreous';

export interface ExamSideProps {
  eyeName: string;
  work: EyeWork;
  maculaOk: boolean;
  mode: 'direct' | 'indirect';
  /** spherical-equivalent hint for the lens wheel, dioptres */
  needed: number;
  onSheet: (s: SheetTarget) => void;
  onRemove: (tagId: number) => void;
}

const status = (done: boolean, text: string, hint: string) => (done ? text : hint);

/** Per-eye checklist, tag chips and the instrument tip. */
export function ExamSide({ eyeName, work: w, maculaOk, mode, needed, onSheet, onRemove }: ExamSideProps) {
  const t = useT();
  const loc = useLocale();
  return (
    <>
      <ul class="oph-check" aria-label={t.checklistAria(eyeName)}>
        <li class={w.reflex ? 'is-done' : ''}><Icon name={w.reflex ? 'check' : 'minus'} size={14} /><span><b>{t.ckReflex}</b>{w.reflex ? ` ${t.reflexWord[w.reflex]}` : t.ckNotCalled}</span></li>
        <li class={w.disc ? 'is-done' : ''}>
          <Icon name={w.disc ? 'check' : 'minus'} size={14} />
          <span><b>{t.ckDisc}</b> {status(!!w.disc, `C/D ${w.disc?.cdr.toFixed(2)}`, t.ckDiscTodo)}</span>
          {w.disc && <button type="button" class="oph-link" onClick={() => onSheet('disc')}>{t.edit}</button>}
        </li>
        <li class={w.vessels ? 'is-done' : ''}>
          <Icon name={w.vessels ? 'check' : 'minus'} size={14} />
          <span><b>{t.ckVessels}</b> {status(!!w.vessels, t.ckVesselsDone, t.ckVesselsTodo)}</span>
          <button type="button" class="oph-link" onClick={() => onSheet('vessels')} data-testid="oph-open-vessels">{w.vessels ? t.edit : t.grade}</button>
        </li>
        <li class={maculaOk ? 'is-done' : ''}><Icon name={maculaOk ? 'check' : 'minus'} size={14} /><span><b>{t.ckMacula}</b> {status(maculaOk, t.ckMaculaDone, t.ckMaculaTodo)}</span></li>
        <li class={w.vitreous ? 'is-done' : ''}>
          <Icon name={w.vitreous ? 'check' : 'minus'} size={14} />
          <span><b>{t.ckVitreous}</b> {w.vitreous ? t.vitreousShort[w.vitreous] : t.ckOptional}</span>
          <button type="button" class="oph-link" onClick={() => onSheet('vitreous')}>{w.vitreous ? t.edit : t.set}</button>
        </li>
      </ul>
      <div class="oph-tags">
        <h3>{t.tagsHeading} <em>{w.tags.length}</em></h3>
        {w.tags.length === 0 ? <p class="oph-tags__empty">{t.tagsEmpty(eyeName)}</p> : (
          <ul>
            {w.tags.map((tg) => (
              <li key={tg.id}>
                <span>{t.tags[tg.kind].label}</span>
                <button type="button" aria-label={t.removeTag(t.tags[tg.kind].label)} onClick={() => onRemove(tg.id)}><Icon name="close" size={12} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p class="oph-tip"><Icon name="info" size={13} /> {fix(loc, mode === 'direct' ? t.tipDirect(needed > 0 ? t.plus : needed < 0 ? t.minus : t.plano) : t.tipIndirect)}</p>
    </>
  );
}
