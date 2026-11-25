import { LOCALISATIONS, LOCALISATION_LABEL, LOCALISATION_SUB, type Localisation } from './interpret';

export interface PathwayProps {
  value: Localisation | null;
  truth?: Localisation | null;
  onChange?: (l: Localisation) => void;
  disabled?: boolean;
}

/**
 * The visual pathway seen from above (patient facing up the page, so the
 * patient's left is on the left): eyes → optic nerves → chiasm → tracts →
 * LGN → radiations → occipital cortex. Segments light up for the chosen site.
 */
export function Pathway({ value, truth, onChange, disabled }: PathwayProps) {
  const state = (seg: Localisation) => {
    if (truth) {
      if (seg === truth) return 'is-truth';
      if (seg === value) return 'is-wrong';
      return '';
    }
    return seg === value ? 'is-on' : '';
  };
  const click = (l: Localisation) => () => !disabled && onChange?.(l);
  return (
    <div class="vf-path">
      <svg viewBox="0 0 220 150" class="vf-path__svg" aria-hidden="true">
        <defs>
          <radialGradient id="vf-path-eye" cx="40%" cy="35%" r="70%">
            <stop offset="0" stop-color="#f6efe4" />
            <stop offset="1" stop-color="#a99bbd" />
          </radialGradient>
        </defs>
        <text x="16" y="12" class="vf-path__lr">L</text>
        <text x="198" y="12" class="vf-path__lr">R</text>
        <g class={`vf-path__seg ${state('prechiasmal')}`} onClick={click('prechiasmal')}>
          <path d="M78 26 C82 40 92 52 104 62 M142 26 C138 40 128 52 116 62" />
          <circle cx="74" cy="18" r="11" class="vf-path__eye" />
          <circle cx="146" cy="18" r="11" class="vf-path__eye" />
          <circle cx="74" cy="18" r="4" class="vf-path__iris" />
          <circle cx="146" cy="18" r="4" class="vf-path__iris" />
        </g>
        <g class={`vf-path__seg ${state('chiasm')}`} onClick={click('chiasm')}>
          <path d="M101 60 L119 74 M119 60 L101 74" class="vf-path__x" />
          <ellipse cx="110" cy="67" rx="13" ry="9" class="vf-path__hit" />
        </g>
        <g class={`vf-path__seg ${state('retro-left')}`} onClick={click('retro-left')}>
          <path d="M104 73 C96 82 86 88 78 94" />
          <ellipse cx="76" cy="96" rx="5" ry="4" class="vf-path__node" />
          <path d="M74 99 C58 112 62 126 82 138 M77 100 C72 114 76 126 88 138" class="vf-path__rad" />
          <path d="M70 140 Q88 148 104 140" class="vf-path__cortex" />
        </g>
        <g class={`vf-path__seg ${state('retro-right')}`} onClick={click('retro-right')}>
          <path d="M116 73 C124 82 134 88 142 94" />
          <ellipse cx="144" cy="96" rx="5" ry="4" class="vf-path__node" />
          <path d="M146 99 C162 112 158 126 138 138 M143 100 C148 114 144 126 132 138" class="vf-path__rad" />
          <path d="M150 140 Q132 148 116 140" class="vf-path__cortex" />
        </g>
      </svg>
      <div class="vf-path__opts" role="radiogroup" aria-label="Where is the lesion?">
        {LOCALISATIONS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={value === l}
            disabled={disabled}
            class={`vf-loc ${state(l)}`}
            onClick={click(l)}
            data-testid={`vf-loc-${l}`}
          >
            <strong>{LOCALISATION_LABEL[l]}</strong>
            <small>{LOCALISATION_SUB[l]}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
