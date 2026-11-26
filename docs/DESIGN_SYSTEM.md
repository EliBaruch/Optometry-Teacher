# Lumen design system — "Clinic Glass"

> The owner's brief: a **modern, bright, professional optometry clinic**. Daylight, not night.
> It must look like a $1M product that a 22-year-old who lives in modern apps and chatbots uses
> without thinking. Inspiration, explicitly named by the owner:
> * **Apple Liquid Glass** (iOS/macOS 26): layered translucent glass over a living, colourful backdrop;
>   bright specular rims; big continuous corner radii; controls that float as glass capsules detached
>   from the edges; springy, fluid motion.
> * **Monday.com**: joyful, vivid colour-coded status labels and pills; friendly bold type; clear boards;
>   colour carries meaning at a glance.
> * **McKinsey & Co.**: editorial authority — deep navy ink, electric blue accent, huge confident headlines,
>   generous whitespace, thin hairline rules, numbered sections, big data numerals, zero clutter.
> * Also: **Linear** (precision, crisp details), **Stripe** (mesh gradients behind glass), **Arc**, **Notion**.
> **No rain, no darkness, no candles, no night, no gothic/observatory/stained-glass/brass motifs, no serif.**
> Game logic, systems, content and engagement design are unchanged — visual and UI-copy-tone redesign only.

Source of truth for values: `src/ui-kit/styles/tokens.css` (CSS) and `src/ui-kit/lib/palette.ts` (canvas/SVG).
Reference implementations: `src/ui-kit/components/{Button,GlassPanel,IconButton,Screen,Backdrop}.css`,
`src/ui-kit/styles/base.css` (`.lm-glass`, `.lm-label` utilities).

## 1. Materials
* **Backdrop**: a luminous daylight mesh (azure, aqua, lilac, peach blobs on `#eef2fa`) — the glass needs
  colour behind it to look like glass. Provided by `<Backdrop>` / the body background. Don't paint opaque
  full-bleed slabs over it.
* **Liquid Glass** (primary surface for cards, panels, toolbars, chips, HUD widgets, sheets):
  `background: var(--lm-glass); backdrop-filter: var(--lm-glass-blur); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow);`
  (= `.lm-glass` utility). Stronger/opaque variant for dense reading areas & modals: `--lm-glass-bg-strong`.
  Radii 18–32px for cards, pills for controls. The specular rim (`--lm-glass-highlight`) is what makes it read
  as glass — keep it.
* **Opaque white** (`--lm-surface`) only where legibility demands it: inputs, long text, data tables inside glass.
* **Floating controls**: top bars are not slabs; HUD items float as individual glass capsules.

## 2. Colour
* **Ink**: deep navy `--lm-ink #0a1633` (headings), `--lm-ink-2` body, `--lm-ink-3` secondary (AA), `--lm-ink-4` decorative only.
* **Brand**: electric azure. Fill `--lm-brand-600 #2257f0` / `--lm-accent-gradient` (white text); accent text
  `--lm-brand-700`; tints `--lm-brand-50/100`. Primary actions = azure capsules with a liquid top highlight.
* **Vivid status palette (Monday)**: `--lm-vivid-green/lime/yellow/orange/red/pink/purple/blue/sky/teal`. Use as
  **fills of labels, pills, progress segments, tags, avatars, charts** with **navy text** on them (`.lm-label`,
  `--label: var(--lm-vivid-green)`), never white text on the light vivids. Colour-code meaning consistently:
  green = done/normal, orange = attention/abnormal, red = critical/urgent, blue = info/in progress,
  purple = career/mastery, pink = gallery, yellow = rewards.
* **Deep accents** for text/icons on white: career `#7c3aed`, economy `#d97706`, rivals `#059669`, streaks `#ea580c`,
  gallery `#db2777`, code red `#e11d48`, lounge `#0284c7`. Clinical: normal `#059669`, abnormal `#d97706`,
  critical `#e11d48`, info `#2257f0`, each with a `-soft` background.
* **Gold is only for coins/rewards/legendary**: `--lm-coin`, `--lm-coin-deep`, `--lm-coin-soft`.

## 3. Type (editorial)
* Display = **Plus Jakarta Sans** 700–800, tight tracking `--lm-tracking-display`. Big, confident headlines
  (McKinsey). UI = **Inter**. Numbers = **Space Grotesk** tabular — use BIG numerals for stats/scores.
* Eyebrows: small, tracked, azure or ink-3; can be numbered ("01 — Instruments"). Hairline rules
  (`--lm-rule`) to separate sections editorially. No italics flourishes, no serif, no text glows.
* Hebrew: Heebo for display and UI (tracking/caps neutralised automatically).

## 4. Legacy token names (already remapped — know what they mean now)
| old name | now means |
|---|---|
| `--lm-ivory`, `--lm-text` | navy ink text |
| `--lm-ivory-dim` | body ink |
| `--lm-muted`, `--lm-text-muted` | secondary ink |
| `--lm-gold`, `--lm-gold-500/300` | brand azure (accent) |
| `--lm-gold-200`, `--lm-gold-600` | brand azure **text** (dark, readable) |
| `--lm-gold-100` | azure tint (`brand-50`) |
| `--lm-text-on-gold` | white (text on brand fill) |
| `--lm-ink-900/850/800`, `--lm-aubergine-*`, `--lm-plum-*` | light canvas / surface greys |
| `--lm-glass-bg(-strong)` | translucent white glass |
| `--lm-hairline`, `--lm-glass-border` | rules / rims |

Prefer the new names (`--lm-glass`, `--lm-surface`, `--lm-border`, `--lm-rule`, `--lm-ink*`, `--lm-accent*`,
`--lm-brand-*`, `--lm-vivid-*`, `--lm-coin*`, `--lm-*-soft`). Never hardcode old night colours
(`rgba(255,210,122,…)`, `rgba(255,236,210,…)`, `rgba(3,1,8,…)`, `#0b0716`, `#1a0f2e`, aubergine/plum purples)
or the abandoned first-pass teal (`#087882`, `#0b929b`, `rgba(8,120,130,…)`).

## 5. Instrument viewports stay clinically true
Slit-lamp beam, retinoscope reflex, ophthalmoscope/fundus, cobalt-blue fluorescein, dim-room pupil tests,
perimetry bowl, the projected acuity chart: these renderings stay as they are (clinical accuracy). Present
each as a crisp rounded "screen" (20–24px radius) set inside a glass frame — like a camera viewfinder in
iOS. Everything around it (controls, readouts, dials, instructions) is Clinic Glass. Device hardware looks
like modern premium clinical devices (white / silver / graphite, azure accents), never brass.

## 6. Copy tone
Warm, modern, professional, a little witty; a bright daytime clinic. Replace night/candle/rain/after-hours/
midnight/gothic imagery in **UI copy**. Patient case stories and clinical content are NOT touched. Every
English copy change needs the matching **Hebrew** change in the same strings file (`docs/LOCALIZATION.md`:
native Israeli Hebrew, plural imperative). Player-facing text never mentions sins/vices.

## 7. Checklist for every screen
1. Daylight mesh behind; glass surfaces with specular rims; no dark areas except instrument viewports.
2. Contrast ≥ 4.5:1 for text (≥ 3:1 for ≥ 18px bold) — check text on glass over the brightest/most
   saturated part of the mesh, and navy text on vivid labels.
3. One azure primary capsule per view; secondary = glass capsule; tertiary = ghost.
4. Meaning carried by vivid colour-coded labels/pills (Monday); big numerals for stats (McKinsey).
5. Hover: lift 1–3px + deeper shadow; press: spring down. Motion fluid, reduced-motion honoured.
6. Works at 375px wide and in RTL (Hebrew: `?lang=he`); focus visible; no console errors.
