import type { JSX } from 'preact';

/**
 * Lumen line-icon set. 24×24 grid, 1.75px round strokes, `currentColor`.
 * Hand-tuned: optical centre ~ (12,12), 2px safe margin. Small solid details
 * use <Dot> (filled) so they survive at 16px.
 */
const Dot = (p: { x: number; y: number; r?: number }) => <circle cx={p.x} cy={p.y} r={p.r ?? 1.05} fill="currentColor" stroke="none" />;

const g = (...children: JSX.Element[]) => <>{children}</>;

export const GLYPHS = {
  // ─── Clinical tests (names match core TestId) ─────────────────────────
  'visual-acuity': g(
    <rect x="4.5" y="2.5" width="15" height="19" rx="2.2" />,
    <path d="M9.6 5.6v4.6M9.6 5.6h4.6M9.6 7.9h3.4M9.6 10.2h4.6" />,
    <path d="M8 14h1.8M11.1 14h1.8M14.2 14h1.8" />,
    <path d="M9.2 17.6h1.2M11.4 17.6h1.2M13.6 17.6h1.2" />,
  ),
  pinhole: g(
    <circle cx="12" cy="9.5" r="6.75" />,
    <path d="M12 16.25V21.5" />,
    <Dot x={12} y={9.5} r={1.35} />,
    <circle cx="12" cy="9.5" r="3.6" stroke-dasharray="0.01 2.83" stroke-width="1.9" />,
  ),
  retinoscopy: g(
    <rect x="8.5" y="2.5" width="7" height="6.5" rx="1.8" />,
    <path d="M10 9h4v2.5h-4z" />,
    <rect x="9.75" y="11.5" width="4.5" height="10" rx="1.6" />,
    <path d="M11.2 14.5h1.6M11.2 17h1.6" />,
    <path d="M15.5 5.75h5M16 3.4l3.6-1.2M16 8.1l3.6 1.2" />,
  ),
  phoropter: g(
    <path d="M5.5 5.5h13" />,
    <path d="M9 5.5v3M15 5.5v3" />,
    <circle cx="7" cy="13.5" r="4.75" />,
    <circle cx="17" cy="13.5" r="4.75" />,
    <circle cx="7" cy="13.5" r="1.8" />,
    <circle cx="17" cy="13.5" r="1.8" />,
    <path d="M11.75 13.5h.5" />,
    <Dot x={12} y={3} r={1} />,
  ),
  keratometry: g(
    <circle cx="12" cy="12" r="8.25" />,
    <circle cx="12" cy="12" r="4.25" />,
    <path d="M12 1.75v3M12 19.25v3M1.75 12h3M19.25 12h3" />,
    <path d="M10.6 12h2.8M12 10.6v2.8" />,
  ),
  pupils: g(
    <path d="M4.3 20.4 3.6 19.7a1.6 1.6 0 0 1 0-2.26l6.1-6.1 2.96 2.96-6.1 6.1a1.6 1.6 0 0 1-2.26 0z" />,
    <path d="M9.7 11.34 11.4 9.6l2.96 2.96-1.74 1.74" />,
    <path d="M15 8.9l3-3M15.9 12.6h3.6M11.4 5.9V2.4" />,
  ),
  'cover-test': g(
    <path d="M1.75 11c1.5-2.45 3.2-3.6 4.9-3.6s3.4 1.15 4.9 3.6c-1.5 2.45-3.2 3.6-4.9 3.6s-3.4-1.15-4.9-3.6z" />,
    <circle cx="6.65" cy="11" r="1.55" />,
    <circle cx="17" cy="9.25" r="5" />,
    <path d="M17 14.25v7.25" />,
    <path d="M14 11.2l5.1-5.1M15.4 13.4l4.8-4.8" />,
  ),
  motility: g(
    <path d="M5 5v14M19 7.25V19M5 12h14" />,
    <circle cx="19" cy="4.5" r="2.25" />,
    <Dot x={19} y={4.5} r={0.75} />,
    <Dot x={5} y={19} r={1.25} />,
  ),
  convergence: g(
    <circle cx="12" cy="4.5" r="2" />,
    <path d="M7 16.6 10.9 7.1M17 16.6 13.1 7.1" />,
    <circle cx="6" cy="19" r="2.1" />,
    <circle cx="18" cy="19" r="2.1" />,
    <Dot x={6} y={19} r={0.8} />,
    <Dot x={18} y={19} r={0.8} />,
  ),
  'color-vision': g(
    <circle cx="12" cy="12" r="9.25" />,
    <Dot x={8.2} y={8.6} r={1.25} />,
    <Dot x={11.6} y={6.8} r={1.05} />,
    <Dot x={15.4} y={8.4} r={1.3} />,
    <Dot x={7} y={12.4} r={1.05} />,
    <circle cx="10.6" cy="11" r="1.25" />,
    <circle cx="14" cy="12" r="1.25" />,
    <circle cx="11.2" cy="14.8" r="1.25" />,
    <Dot x={17} y={12.6} r={1.05} />,
    <Dot x={8.4} y={16} r={1.2} />,
    <Dot x={14.6} y={16.6} r={1.1} />,
  ),
  amsler: g(
    <rect x="3.5" y="3.5" width="17" height="17" rx="2.2" />,
    <path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17" />,
    <path d="M3.5 14.8h4.2c1.1 0 1.6-1.3 2.6-1.3s1.3 1.3 2.2 1.3h8" />,
    <Dot x={12} y={12} r={1.3} />,
  ),
  'visual-fields': g(
    <ellipse cx="12" cy="12" rx="9.5" ry="8" />,
    <ellipse cx="12" cy="12" rx="5.25" ry="4.25" />,
    <path d="M12 2.5v3M12 18.5v3M1.5 12h3M19.5 12h3" />,
    <Dot x={12} y={12} r={1} />,
    <ellipse cx="15.6" cy="12.6" rx="1" ry="1.35" fill="currentColor" stroke="none" />,
  ),
  'slit-lamp': g(
    <path d="M3.5 21h17" />,
    <path d="M7.5 21v-3h9v3" />,
    <rect x="4.5" y="7.5" width="7" height="5.5" rx="1.6" />,
    <path d="M6 7.5V4.5M10 7.5V4.5" />,
    <path d="M8 13v5" />,
    <path d="M17.5 18V6.5M15.5 6.5h4" />,
    <path d="M17 9.5 12.6 12M17.6 10.6l-4.4 2.5" />,
  ),
  fluorescein: g(
    <path d="M11 3.5c3 3.8 5.5 6.8 5.5 10a5.5 5.5 0 0 1-11 0c0-3.2 2.5-6.2 5.5-10z" />,
    <path d="M8.4 14.2a2.7 2.7 0 0 0 2.2 2.6" />,
    <path d="M17.5 4.8l1.6-1.6M19 8.2h2.4M18.2 11.6l1.6.8" />,
  ),
  tonometry: g(
    <path d="M3.5 11a5.5 5.5 0 0 1 11 0h-2a3.5 3.5 0 0 0-7 0z" />,
    <path d="M9.5 13a5.5 5.5 0 0 0 11 0h-2a3.5 3.5 0 0 1-7 0z" />,
    <path d="M2 12h1.5M20.5 12H22" />,
  ),
  ophthalmoscopy: g(
    <rect x="6.5" y="2.5" width="11" height="9.5" rx="3" />,
    <circle cx="12" cy="7.25" r="2" />,
    <path d="M17.5 5.2h1.2a1 1 0 0 1 1 1v2.1a1 1 0 0 1-1 1h-1.2" />,
    <path d="M10 12h4v8.5a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z" />,
    <path d="M10 15.2h4M10 17.8h4" />,
  ),

  // ─── Economy & rewards ────────────────────────────────────────────────
  coin: g(
    <circle cx="12" cy="12" r="9" />,
    <circle cx="12" cy="12" r="6.5" stroke-opacity="0.45" />,
    <path d="M12 8l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="currentColor" stroke-width="1" />,
  ),
  gem: g(
    <path d="M6.5 3.5h11l4 5L12 20.5 2.5 8.5z" />,
    <path d="M2.5 8.5h19M9.2 3.5 7.6 8.5 12 20.5M14.8 3.5l1.6 5L12 20.5" />,
  ),
  star: g(<path d="M12 3l2.47 6.2 6.66.43-5.14 4.27 1.65 6.47L12 16.8l-5.64 3.57 1.65-6.47-5.14-4.27 6.66-.43z" />),
  trophy: g(
    <path d="M7 3.5h10v5.5a5 5 0 0 1-10 0z" />,
    <path d="M7 5.5H4.6a.6.6 0 0 0-.6.6C4 8.6 5.5 10.6 7.6 10.8M17 5.5h2.4a.6.6 0 0 1 .6.6c0 2.5-1.5 4.5-3.6 4.7" />,
    <path d="M12 14v3.5M8.5 21h7M9.5 17.5h5l.7 3.5H8.8z" />,
  ),
  flame: g(
    <path d="M12 21.5c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 2.8-5.6 3.6-9.3 1.9 1.3 2.8 3.2 2.9 5 1-1 1.6-2.2 1.7-3.8 2.6 2 4.8 4.8 4.8 8.1 0 3.6-2.6 6.2-6.5 6.2z" />,
    <path d="M12 21.5c-1.6 0-2.7-1.1-2.7-2.7 0-1.9 1.6-2.8 2.7-4.6 1.1 1.8 2.7 2.7 2.7 4.6 0 1.6-1.1 2.7-2.7 2.7z" />,
  ),
  gift: g(
    <rect x="3.5" y="8.5" width="17" height="4" rx="1.2" />,
    <path d="M5 12.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7.5M12 8.5V21" />,
    <path d="M12 8.5C10.6 5.2 7 4.4 7 6.6c0 1.6 2.4 1.9 5 1.9 2.6 0 5-.3 5-1.9 0-2.2-3.6-1.4-5 1.9z" />,
  ),
  crate: g(
    <rect x="3" y="6.5" width="18" height="14" rx="1.6" />,
    <path d="M3 11h18M7.5 11v9.5M16.5 11v9.5" />,
    <rect x="10" y="8.75" width="4" height="4.5" rx="1" />,
    <path d="M6 6.5 7.5 3.5h9L18 6.5" />,
  ),
  crown: g(
    <path d="M4 18 3 7.5l5 4 4-7 4 7 5-4L20 18z" />,
    <path d="M4.5 21h15" />,
    <Dot x={12} y={14.6} r={1.05} />,
  ),
  sparkle: g(
    <path d="M11 3c.6 4.4 2.6 6.4 7 7-4.4.6-6.4 2.6-7 7-.6-4.4-2.6-6.4-7-7 4.4-.6 6.4-2.6 7-7z" />,
    <path d="M18.5 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3z" />,
  ),
  lightning: g(<path d="M13.2 2.5 4.5 13.5h6.6l-1.3 8 8.7-11h-6.6z" />),
  heart: g(<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />),

  // ─── People & places ──────────────────────────────────────────────────
  eye: g(
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />,
    <circle cx="12" cy="12" r="3.25" />,
    <Dot x={12} y={12} r={1.1} />,
  ),
  chart: g(
    <rect x="4.5" y="4" width="15" height="17.5" rx="2.2" />,
    <rect x="9" y="2.5" width="6" height="3.2" rx="1.1" />,
    <path d="M8.3 10.5h7.4M8.3 14h7.4M8.3 17.5h4.4" />,
  ),
  stats: g(<path d="M4 20.5h16M6.5 20.5v-6M11 20.5V9M15.5 20.5v-8.5M20 4l-6 5-3-2.5-5 4" />),
  user: g(<circle cx="12" cy="8" r="4" />, <path d="M4.5 21c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" />),
  users: g(
    <circle cx="9" cy="8.5" r="3.5" />,
    <path d="M2.5 20.5c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2" />,
    <path d="M15.5 5.2a3.4 3.4 0 0 1 0 6.6M18 14.6c2.1.8 3.5 2.9 3.5 5.9" />,
  ),
  book: g(
    <path d="M12 6.5C10 5 7.5 4.5 3.5 4.5v14c4 0 6.5.5 8.5 2 2-1.5 4.5-2 8.5-2v-14c-4 0-6.5.5-8.5 2z" />,
    <path d="M12 6.5v14" />,
  ),
  home: g(<path d="M3.5 10.5 12 3.5l8.5 7M5.5 9v11.5h13V9" />, <path d="M10 20.5v-5.5h4v5.5" />),
  target: g(<circle cx="12" cy="12" r="9" />, <circle cx="12" cy="12" r="5" />, <Dot x={12} y={12} r={1.4} />),
  clock: g(<circle cx="12" cy="12" r="9" />, <path d="M12 7v5l3.5 2.2" />),
  lock: g(<rect x="5" y="10.5" width="14" height="10.5" rx="2.5" />, <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3M12 14.5v2.5" />),
  unlock: g(<rect x="5" y="10.5" width="14" height="10.5" rx="2.5" />, <path d="M8 10.5V7.5a4 4 0 0 1 7.75-1.4M12 14.5v2.5" />),

  // ─── Controls ─────────────────────────────────────────────────────────
  'chevron-left': g(<path d="M14.5 5.5 8 12l6.5 6.5" />),
  'chevron-right': g(<path d="M9.5 5.5 16 12l-6.5 6.5" />),
  'arrow-right': g(<path d="M4.5 12h15M13.5 6l6 6-6 6" />),
  close: g(<path d="M6 6l12 12M18 6 6 18" />),
  check: g(<path d="M5 12.5 9.5 17 19 7.5" />),
  x: g(<circle cx="12" cy="12" r="9" />, <path d="M9 9l6 6M15 9l-6 6" />),
  plus: g(<path d="M12 5v14M5 12h14" />),
  minus: g(<path d="M5 12h14" />),
  menu: g(<path d="M4 7h16M4 12h16M4 17h10" />),
  settings: g(
    <path d="M18.81 9.65 19.06 10.57 21.22 10.79V13.21L19.06 13.43 18.47 15.15 18 15.98 19.37 17.67 17.67 19.37 15.98 18 14.35 18.81 13.43 19.06 13.21 21.22H10.79L10.57 19.06 8.85 18.47 8.02 18 6.33 19.37 4.63 17.67 6 15.98 5.19 14.35 4.94 13.43 2.78 13.21V10.79L4.94 10.57 5.53 8.85 6 8.02 4.63 6.33 6.33 4.63 8.02 6 9.65 5.19 10.57 4.94 10.79 2.78H13.21L13.43 4.94 15.15 5.53 15.98 6 17.67 4.63 19.37 6.33 18 8.02z" />,
    <circle cx="12" cy="12" r="3" />,
  ),
  'sound-on': g(
    <path d="M4 9.5h3l4.5-4v13L7 14.5H4z" />,
    <path d="M15 9a4.2 4.2 0 0 1 0 6M17.8 6.3a8 8 0 0 1 0 11.4" />,
  ),
  'sound-off': g(<path d="M4 9.5h3l4.5-4v13L7 14.5H4z" />, <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />),
  play: g(<path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.4-6.8a.8.8 0 0 0 0-1.4L9.2 4.5a.8.8 0 0 0-1.2.7z" />),
  pause: g(<rect x="6.5" y="5" width="3.75" height="14" rx="1.2" />, <rect x="13.75" y="5" width="3.75" height="14" rx="1.2" />),
  refresh: g(
    <path d="M19.5 11A7.7 7.7 0 0 0 5.8 6.6L4 8.5" />,
    <path d="M4 4v4.5h4.5" />,
    <path d="M4.5 13a7.7 7.7 0 0 0 13.7 4.4l1.8-1.9" />,
    <path d="M20 20v-4.5h-4.5" />,
  ),
  info: g(<circle cx="12" cy="12" r="9" />, <path d="M12 11v5.5" />, <Dot x={12} y={7.8} r={1.15} />),
  warning: g(
    <path d="M10.3 4.2a2 2 0 0 1 3.4 0l7.7 13.3a2 2 0 0 1-1.7 3H4.3a2 2 0 0 1-1.7-3z" />,
    <path d="M12 9.5V14" />,
    <Dot x={12} y={17.1} r={1.15} />,
  ),
  alert: g(
    <path d="M8.3 2.5h7.4l5.3 5.3v7.4l-5.3 5.3H8.3L3 15.2V7.8z" />,
    <path d="M12 7.5V13" />,
    <Dot x={12} y={16.3} r={1.15} />,
  ),
} satisfies Record<string, JSX.Element>;
