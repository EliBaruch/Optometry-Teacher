import { Icon } from '@ui-kit';
import { TAGS, VITREOUS_LABEL, type EyeWork } from './model';

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
  return (
    <>
      <ul class="oph-check" aria-label={`Checklist, ${eyeName}`}>
        <li class={w.reflex ? 'is-done' : ''}><Icon name={w.reflex ? 'check' : 'minus'} size={14} /><span><b>Red reflex</b>{w.reflex ? ` ${w.reflex === 'normal' ? 'bright' : w.reflex === 'leukocoria' ? 'white' : w.reflex}` : ' not called'}</span></li>
        <li class={w.disc ? 'is-done' : ''}>
          <Icon name={w.disc ? 'check' : 'minus'} size={14} />
          <span><b>Optic disc</b> {status(!!w.disc, `C/D ${w.disc?.cdr.toFixed(2)}`, 'tap the nerve head')}</span>
          {w.disc && <button type="button" class="oph-link" onClick={() => onSheet('disc')}>edit</button>}
        </li>
        <li class={w.vessels ? 'is-done' : ''}>
          <Icon name={w.vessels ? 'check' : 'minus'} size={14} />
          <span><b>Vessels</b> {status(!!w.vessels, 'graded', 'grade A:V and signs')}</span>
          <button type="button" class="oph-link" onClick={() => onSheet('vessels')} data-testid="oph-open-vessels">{w.vessels ? 'edit' : 'grade'}</button>
        </li>
        <li class={maculaOk ? 'is-done' : ''}><Icon name={maculaOk ? 'check' : 'minus'} size={14} /><span><b>Macula</b> {status(maculaOk, 'assessed', 'tag it healthy or abnormal')}</span></li>
        <li class={w.vitreous ? 'is-done' : ''}>
          <Icon name={w.vitreous ? 'check' : 'minus'} size={14} />
          <span><b>Vitreous</b> {w.vitreous ? VITREOUS_LABEL[w.vitreous].toLowerCase() : 'optional'}</span>
          <button type="button" class="oph-link" onClick={() => onSheet('vitreous')}>{w.vitreous ? 'edit' : 'set'}</button>
        </li>
      </ul>
      <div class="oph-tags">
        <h3>Tags <em>{w.tags.length}</em></h3>
        {w.tags.length === 0 ? <p class="oph-tags__empty">Nothing tagged on the {eyeName} yet. Mark only what you can name: false tags cost points.</p> : (
          <ul>
            {w.tags.map((t) => (
              <li key={t.id}>
                <span>{TAGS[t.kind].label}</span>
                <button type="button" aria-label={`Remove ${TAGS[t.kind].label}`} onClick={() => onRemove(t.id)}><Icon name="close" size={12} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p class="oph-tip"><Icon name="info" size={13} /> {mode === 'direct' ? `Direct: upright, ~15×, field of about 2 disc diameters. Lens wheel ${needed > 0 ? 'plus' : needed < 0 ? 'minus' : 'plano'} for this eye's refraction.` : 'Indirect: inverted and reversed, ~3×, wide 45° field. Move your head to the image, not the other way round.'}</p>
    </>
  );
}
