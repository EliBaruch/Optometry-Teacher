# Lumen design system — "Daylight Clinic"

> The owner's brief: a **modern, bright, professional optometry clinic**. Daylight, not night.
> It should feel like a $1M product a 22-year-old who lives in modern apps and chatbots
> (Linear, Notion, Arc, ChatGPT, One Medical, Warby Parker) picks up and uses without thinking.
> **No rain, no darkness, no candles, no moody night, no gothic/observatory/stained-glass motifs.**
> Game logic, systems, content and the engagement design are unchanged — this is a visual
> (and tone-of-copy) redesign only.

Source of truth for values: `src/ui-kit/styles/tokens.css` (CSS) and `src/ui-kit/lib/palette.ts` (canvas/SVG).
Reference implementation: `src/ui-kit/components/{Button,GlassPanel,IconButton,Screen,Backdrop}.css`.

## 1. Look & feel
* **Canvas**: cool airy white `--lm-canvas #f4f7fa`, with soft daylight washes (teal/sky/lilac at ≤0.28 alpha).
* **Surfaces**: solid white cards `--lm-surface`, 1px border `--lm-border #e1e8ef`, soft cool shadows
  (`--lm-shadow-1/2/3`). Frosted white (`--lm-glass-bg` + blur) only for floating bars/overlays.
  Subtle inner fills `--lm-surface-2/3`. Radii 12–20px; pills for chips.
* **Brand**: Lumen teal. Fill `--lm-brand-600 #087882` (white text), accent text `--lm-brand-700`,
  tints `--lm-brand-50/100`. Focus ring `--lm-brand-500` + soft halo.
* **Ink**: `--lm-ink #0d1b2a` headings, `--lm-ink-2` body, `--lm-ink-3` secondary (AA on white),
  `--lm-ink-4` decorative only.
* **Gold is no longer the brand.** Real gold exists only for coins/rewards/legendary:
  `--lm-coin #e9a20b`, `--lm-coin-deep`, `--lm-coin-soft`.
* **System accents** (darker, legible on white): career violet `#7c3aed`, economy amber `#d98a06`,
  rivals green `#16a34a`, streaks orange `#ea580c`, gallery pink `#db2777`, code red `#dc2626`,
  lounge sky `#0284c7`. Use them as icon colour + ~8–12% tinted chip backgrounds, not as glows.
* **Clinical states**: normal `#0f9f8f`, abnormal `#d97706`, critical `#e11d48`, info `#0284c7`, each
  with a `-soft` background token.
* **Type**: display = **Plus Jakarta Sans** (700, tight tracking `--lm-tracking-display`), UI = **Inter**,
  numbers = **Space Grotesk** (tabular). No serif anywhere. No italic flourish words. Eyebrows are small
  caps-tracked teal labels, used sparingly. Hebrew uses Heebo for both display and UI.
* **Depth**: shadows, not glows. No `text-shadow` glow, no luminous gold filaments, no film grain,
  no vignettes, no `mix-blend-mode: screen/lighter` on light backgrounds (it vanishes).
* **Motion**: unchanged tokens; crisp and springy. Juice (confetti, particles, count-ups) stays — it
  just uses daylight colours (teal, sky, coral, sunny amber, lilac) painted with normal blending.

## 2. Legacy token names (already remapped — know what they mean now)
| old name | now means |
|---|---|
| `--lm-ivory`, `--lm-text` | primary ink text |
| `--lm-ivory-dim` | body ink |
| `--lm-muted`, `--lm-text-muted` | secondary ink |
| `--lm-gold`, `--lm-gold-500/300` | brand teal (accent) |
| `--lm-gold-200`, `--lm-gold-600` | brand teal **text** (dark, readable) |
| `--lm-gold-100` | brand teal tint (`brand-50`) |
| `--lm-text-on-gold` | white (text on brand fill) |
| `--lm-ink-900/850/800`, `--lm-aubergine-*`, `--lm-plum-*` | light canvas / surface greys |
| `--lm-glass-bg(-strong)` | white surface |
| `--lm-hairline`, `--lm-glass-border` | light grey borders |

Prefer the new semantic names (`--lm-surface`, `--lm-border`, `--lm-ink*`, `--lm-accent*`, `--lm-brand-*`,
`--lm-coin*`, `--lm-*-soft`) in code you touch. Never hardcode the old night colours:
`rgba(255,210,122,…)` (candle gold), `rgba(255,236,210,…)`/`rgba(255,245,230,…)` (ivory light),
`rgba(3,1,8,…)`/`rgba(6,3,13,…)` (night shadow), `#0b0716`, `#1a0f2e`, aubergine/plum purples.

## 3. Instrument viewports stay clinically true
Real exam optics are viewed in a dim room: slit-lamp beam, retinoscope reflex, ophthalmoscope/fundus view,
cobalt-blue fluorescein, pupil light tests, perimetry bowl, the projected acuity chart. Those
**canvas/SVG renderings and their immediate viewport stay as they are** (clinical accuracy). Present each
one as a crisp "screen" inside the bright UI: rounded 16–20px corners, a thin neutral frame/border,
soft shadow — like a camera preview inside a light-mode app. Everything *around* it (controls, labels,
readouts, dials, sliders, instructions, panels) is daylight.

## 4. Copy tone
Warm, modern, professional, a little witty. Daytime clinic. Replace night/candle/rain/after-hours/
midnight/gothic imagery in **UI copy** with bright clinic imagery (morning light, appointments,
the front desk, a fresh coffee, a full schedule). Patient case stories and clinical content are NOT
touched (a patient may still mention rain — that is their history). Every English copy change needs the
matching **Hebrew** change in the same strings file (see `docs/LOCALIZATION.md`: native Israeli Hebrew,
plural imperative, no translationese). Player-facing text must never mention sins/vices.

## 5. Checklist for every screen
1. Background is daylight; no dark full-bleed areas except instrument viewports.
2. Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 18px bold). Check muted text on tinted cards.
3. One primary action per view, teal; secondary = white bordered; tertiary = ghost.
4. Cards: white, 1px border, soft shadow, 16–20px radius; hover lifts 1–3px with a slightly deeper shadow.
5. Works at 375px wide and in RTL (Hebrew: `?lang=he`).
6. Focus visible; reduced motion honoured; no console errors.
