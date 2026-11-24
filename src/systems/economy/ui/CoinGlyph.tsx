import { useId } from 'preact/hooks';

/** A minted lumen: gold disc, milled rim and an engraved four-point star. */
export function CoinGlyph(props: { size?: number; class?: string; spin?: boolean }) {
  const id = 'eco-coin-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const s = props.size ?? 22;
  return (
    <svg
      viewBox="0 0 32 32" width={s} height={s} aria-hidden="true" focusable="false"
      class={`eco-coin${props.spin ? ' eco-coin--spin' : ''}${props.class ? ' ' + props.class : ''}`}
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="38%" cy="30%" r="75%">
          <stop offset="0" stop-color="#fff6d8" />
          <stop offset="0.35" stop-color="#ffd77e" />
          <stop offset="0.8" stop-color="#e09a2e" />
          <stop offset="1" stop-color="#9a5f10" />
        </radialGradient>
        <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff0c2" />
          <stop offset="0.5" stop-color="#c98a24" />
          <stop offset="1" stop-color="#6e420a" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill={`url(#${id}-rim)`} />
      <circle cx="16" cy="16" r="15" fill="none" stroke="#5a3606" stroke-opacity=".55" stroke-width="1" stroke-dasharray="1.1 1.3" />
      <circle cx="16" cy="16" r="12" fill={`url(#${id}-face)`} />
      <circle cx="16" cy="16" r="12" fill="none" stroke="#fff3cf" stroke-opacity=".5" stroke-width=".6" />
      <path
        d="M16 7.2 C16.7 12.6 19.4 15.3 24.8 16 C19.4 16.7 16.7 19.4 16 24.8 C15.3 19.4 12.6 16.7 7.2 16 C12.6 15.3 15.3 12.6 16 7.2 Z"
        fill="#8a540c" fill-opacity=".85"
      />
      <path
        d="M16 8.6 C16.6 13.2 18.8 15.4 23.4 16 C18.8 16.6 16.6 18.8 16 23.4 C15.4 18.8 13.2 16.6 8.6 16 C13.2 15.4 15.4 13.2 16 8.6 Z"
        fill="#fff1c4"
      />
      <ellipse cx="11.5" cy="9.5" rx="4.5" ry="2.2" fill="#fff" opacity=".45" transform="rotate(-30 11.5 9.5)" />
    </svg>
  );
}
