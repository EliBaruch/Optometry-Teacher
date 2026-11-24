# Sinsight — Architecture

> **Rule zero: nothing is a monolith.** Every feature is a plugin in its own folder. Delete the
> folder (or list it in `src/app/plugins.config.ts`) and the game still builds and runs.
> `npm run check:boundaries` enforces this on every build.

## Layers

```
src/
├── core/        Engine & contracts. Pure TS, zero UI/framework deps. The shared language.
├── ui-kit/      Design system (tokens, components, hooks). Depends on core.
├── render/      Procedural art: FX layer, patient avatars, eye & fundus painters. Depends on core.
├── audio/       Procedural WebAudio SFX + generative music (AudioPort adapter). Depends on core.
├── learning/    Spaced repetition / mastery (LearningPort adapter). Depends on core.
├── content/     Pure data: diagnoses/ and cases/. Depends on core types only.
├── modes/<m>/   Game modes (run rules + case picking). Depends on core.
├── minigames/<g>/  One folder per clinical test mini-game.  → core, ui-kit, render
├── sins/<s>/    One folder per engagement system (the 7 sins). → core, ui-kit, render
├── scenes/<s>/  Screens (title, hub, exam room, results…).     → core, ui-kit, render
└── app/         Composition root: discovery, adapters, shell, sandbox. May import anything.
```

| layer | may import |
|---|---|
| core | nothing |
| render, audio, learning, ui-kit, content, modes | core |
| minigames/*, sins/*, scenes/* | core, ui-kit, render — **and only their own folder** (no sibling plugins) |
| app | anything |

Third-party packages outside `app/`: `preact` only.

## How plugins connect (without knowing each other)

* **Registries** (`services.registries.*`): minigames, cases, diagnoses, sins, scenes, modes, hud, hub.
  `src/app/discover.ts` auto-discovers folders by convention, loads each independently
  (`Promise.allSettled`) and registers its `default` export. A plugin that throws is skipped.
* **Event bus** (`services.bus`, catalogue in `core/events.ts`): e.g. the exam scene emits
  `case:completed`; Greed pays coins, Pride grants XP, Gluttony bumps the streak — none of them
  know the others exist. Handlers are isolated: one throwing handler can't break the rest.
* **Ports** (`core/ports.ts`): `AudioPort`, `FxPort`, `LearningPort`. Null adapters exist for each,
  so any adapter can be removed/replaced in `app/main.tsx`.
* **HUD slots & hub entries**: scenes render `<HudSlot slot="topbar-left"/>`; sins register widgets
  into slots. The hub renders every registered `HubEntry` + every `ModeModule`.
* **Persistence**: `services.save.slot(namespace, initial, {version, migrate})` — each module owns a
  namespaced, versioned slice. No shared save blob to corrupt.
* **Clinical model** (`core/clinical.ts`): content *produces* `PatientFindings`; mini-games
  *consume* the slices they need. `buildFindings(age, sparsePatch)` gives a normal exam + overrides.

## Plugin contracts (see `core/*.ts` for the source of truth)

| plugin | file | default export |
|---|---|---|
| mini-game | `src/minigames/<test-id>/index.ts` | `MiniGameModule` (`mount(host, ctx, done) → cleanup`, `report()`, `practice()`) |
| sin | `src/sins/<sin>/index.ts` | `SinModule` (`install(services) → uninstall`) |
| scene | `src/scenes/<id>/index.ts(x)` | `SceneModule` or `SceneModule[]` |
| mode | `src/modes/<id>/index.ts` | `ModeModule` |
| cases | `src/content/cases/*.ts` | `ClinicalCase[]` |
| diagnoses | `src/content/diagnoses/*.ts` | `Diagnosis[]` |

Mini-games are framework-agnostic: they receive a DOM `host` and may use canvas, SVG, or Preact
(`render(<Game/>, host)`). They must clean up everything they create.

## Developer tools

```bash
npm run dev                                   # game at http://localhost:5173
npm run check:mod -- src/minigames/tonometry  # typecheck, report only your module
npm run check:boundaries                      # architecture guard
npm run verify                                # typecheck + boundaries + tests + build
node scripts/shot.cjs "?sandbox=minigame/tonometry" out.png   # screenshot one plugin in isolation
```

Sandbox URLs: `?sandbox=index`, `?sandbox=minigame/<id>[&case=<caseId>]`, `?sandbox=scene/<id>`,
`?sandbox=page/<name>` (pages are files in `src/app/sandbox/pages/`).
