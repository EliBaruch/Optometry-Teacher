import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { formatSnellen, type SceneProps, type Settings } from '@core';
import { Button, Divider, GlassPanel, Icon, Modal, Screen, cx, useReducedMotion, useSignal } from '@ui-kit';
import { HoldButton, SwitchRow, VolumeSlider } from './controls';
import { DEFAULT_NAME, NAME_MAX, countRecords, sanitizeName, saveFileName, settingsOnly, sizeLabel, validateImport } from './logic';
import './settings.css';

type VolumeKey = 'masterVolume' | 'sfxVolume' | 'musicVolume';
type Pending = { json: string; records: number; hasSettings: boolean; fileName: string };

export function SettingsScene({ services }: SceneProps) {
  const settings = useSignal(services.settings);
  const reduced = useReducedMotion();
  const patch = (p: Partial<Settings>) => services.settings.update((s) => ({ ...s, ...p }));

  /* ── sound ─────────────────────────────────────────────────────────── */
  const beforeMute = useRef<Record<VolumeKey, number>>({ masterVolume: 0.8, sfxVolume: 0.9, musicVolume: 0.5 });
  const toggleMute = (k: VolumeKey) => {
    const cur = services.settings.get()[k];
    if (cur > 0) {
      beforeMute.current[k] = cur;
      patch({ [k]: 0 });
    } else {
      patch({ [k]: beforeMute.current[k] || 0.6 });
      services.audio.play('pop', { volume: 0.7 });
    }
  };
  const preview = (k: VolumeKey, v: number) => {
    if (v <= 0) return;
    if (k === 'sfxVolume') services.audio.play('lens-click', { pitch: 0.8 + v * 0.5 });
    else if (k === 'masterVolume') services.audio.play('sparkle', { pitch: 0.9 + v * 0.3 });
  };

  /* ── identity ──────────────────────────────────────────────────────── */
  const [draft, setDraft] = useState(settings.playerName);
  const [savedTick, setSavedTick] = useState(0);
  useEffect(() => setDraft(settings.playerName), [settings.playerName]);
  const commitName = () => {
    const next = sanitizeName(draft);
    setDraft(next);
    if (next !== services.settings.get().playerName) {
      patch({ playerName: next });
      services.audio.play('success', { volume: 0.6 });
      setSavedTick((n) => n + 1);
    }
  };

  /* ── data ──────────────────────────────────────────────────────────── */
  const [dataVersion, setDataVersion] = useState(0);
  const exportInfo = useMemo(() => {
    const raw = services.save.exportAll();
    return { records: countRecords(raw), bytes: new Blob([raw]).size };
  }, [dataVersion]);
  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSettingsToo, setResetSettingsToo] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const burstAt = (el: Element | null, color = '#ffd27a') => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'sparks', count: 18, color });
  };

  const doExport = (e: MouseEvent) => {
    const raw = services.save.exportAll();
    const url = URL.createObjectURL(new Blob([JSON.stringify(JSON.parse(raw), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = saveFileName(services.clock.now());
    document.body.appendChild(a);
    a.click();
    a.remove();
    timers.current.push(setTimeout(() => URL.revokeObjectURL(url), 1500));
    burstAt(e.currentTarget as Element);
    services.audio.play('sparkle');
    services.bus.emit('toast', { message: 'Save file downloaded', icon: 'check', tone: 'good' });
    setDataVersion((n) => n + 1);
  };

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      failImport('That file is too large to be a Lumen save.');
      return;
    }
    const check = validateImport(await file.text());
    if (!check.ok) {
      failImport(check.error);
      return;
    }
    setImportError(null);
    services.audio.play('reveal', { volume: 0.7 });
    setPending({ json: check.json, records: check.records, hasSettings: check.hasSettings, fileName: file.name });
  };
  const failImport = (msg: string) => {
    setImportError(msg);
    services.audio.play('error');
    services.fx.shake(4, 220);
  };

  const confirmImport = () => {
    if (!pending) return;
    const before = services.save.exportAll();
    services.save.resetAll();
    if (!pending.hasSettings) {
      const keep = settingsOnly(before);
      if (keep) services.save.importAll(keep);
    }
    services.save.importAll(pending.json);
    location.reload();
  };

  const confirmReset = () => {
    const before = services.save.exportAll();
    services.save.resetAll();
    if (!resetSettingsToo) {
      const keep = settingsOnly(before);
      if (keep) services.save.importAll(keep);
    }
    services.audio.play('thud');
    location.reload();
  };

  const back = () => services.router.back();
  const metricSample = formatSnellen(0.3, settings.metricVA);
  const otherSample = formatSnellen(0.3, !settings.metricVA);
  const d = (i: number) => ({ '--lm-delay': `${reduced ? 0 : 80 + i * 70}ms` });

  return (
    <Screen title="Settings" eyebrow="The instrument room" onBack={back} escToBack backdrop="calm" hud={false} class="settings-scene" contentClass="settings-content">
      <div class="settings-hero lm-enter" style={d(0)}>
        <p class="settings-hero__lede">Tune the clinic to suit you — every change applies the moment you make it.</p>
        <Divider />
      </div>

      <div class="settings-grid">
        <div class="settings-col">
          <GlassPanel as="section" class="settings-panel lm-enter" style={d(1)} icon="sound-on" eyebrow="Sound" title="Audio mix" accent="#ffd27a">
            <div class="settings-stack">
              <VolumeSlider id="vol-master" label="Master" hint="Everything you hear" icon="sound-on" value={settings.masterVolume}
                onInput={(v) => patch({ masterVolume: v })} onCommit={(v) => preview('masterVolume', v)} onToggleMute={() => toggleMute('masterVolume')} />
              <VolumeSlider id="vol-sfx" label="Effects" hint="Instruments, chimes & clicks" icon="sparkle" value={settings.sfxVolume} accent="#5eead4"
                disabled={settings.masterVolume === 0}
                onInput={(v) => patch({ sfxVolume: v })} onCommit={(v) => preview('sfxVolume', v)} onToggleMute={() => toggleMute('sfxVolume')} />
              <VolumeSlider id="vol-music" label="Music" hint="Generative ambience for each room" icon="play" value={settings.musicVolume} accent="#a78bfa"
                disabled={settings.masterVolume === 0}
                onInput={(v) => patch({ musicVolume: v })} onToggleMute={() => toggleMute('musicVolume')} />
            </div>
          </GlassPanel>

          <GlassPanel as="section" class="settings-panel lm-enter" style={d(2)} icon="eye" eyebrow="Comfort" title="Display & accessibility" accent="#38bdf8">
            <div class="settings-stack settings-stack--switches">
              <SwitchRow id="sw-motion" icon="sparkle" label="Reduced motion" checked={settings.reducedMotion}
                description="Calms parallax, particles, screen shake and transitions."
                onChange={(v) => patch({ reducedMotion: v })}
                preview={<span class={cx('settings-orbit', settings.reducedMotion && 'is-still')}><span /></span>} />
              <SwitchRow id="sw-metric" icon="chart" label="Metric acuity" checked={settings.metricVA}
                description={<>Record visual acuity as <b class="lm-num">6/x</b> metres instead of <b class="lm-num">20/x</b> feet.</>}
                onChange={(v) => patch({ metricVA: v })}
                preview={<span class="settings-va"><span class="lm-num">{metricSample}</span><small class="lm-num">{otherSample}</small></span>} />
              <SwitchRow id="sw-contrast" icon="eye" label="High contrast" checked={settings.highContrast}
                description="Opaque panels, brighter text and stronger outlines."
                onChange={(v) => patch({ highContrast: v })}
                preview={<span class="settings-contrast"><span /><span /></span>} />
            </div>
          </GlassPanel>
        </div>

        <div class="settings-col">
          <GlassPanel as="section" class="settings-panel lm-enter" style={d(3)} icon="user" eyebrow="Identity" title="Your name on the door" accent="#a78bfa">
            <form class="settings-name" onSubmit={(e) => { e.preventDefault(); commitName(); (document.activeElement as HTMLElement | null)?.blur(); }}>
              <label class="lm-sr-only" for="player-name">Player name</label>
              <div class="settings-name__plate">
                <span class="settings-name__brass" aria-hidden="true" />
                <input id="player-name" class="settings-name__input" value={draft} maxLength={NAME_MAX} autoComplete="nickname" spellcheck={false}
                  placeholder={DEFAULT_NAME}
                  onInput={(e) => setDraft((e.currentTarget as HTMLInputElement).value)}
                  onBlur={commitName}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setDraft(services.settings.get().playerName);
                    }
                  }} />
                <span key={savedTick} class={cx('settings-name__saved', savedTick > 0 && 'is-shown')} aria-live="polite">
                  {savedTick > 0 && <><Icon name="check" /> Saved</>}
                </span>
              </div>
              <p class="settings-note">Patients, colleagues and your profile will greet you by this name.</p>
            </form>
          </GlassPanel>

          <GlassPanel as="section" class="settings-panel lm-enter" style={d(4)} icon="book" eyebrow="Records" title="Your progress" accent="#f5b942">
            <p class="settings-note">
              Progress lives only in this browser
              {exportInfo.records > 0 ? (
                <> — <span class="lm-num">{exportInfo.records}</span> records, <span class="lm-num">{sizeLabel(exportInfo.bytes)}</span>. </>
              ) : '. '}
              Keep a copy, or carry it to another device.
            </p>
            <div class="settings-actions">
              <Button icon="arrow-right" onClick={doExport} sfx={false}>Export save</Button>
              <Button icon="refresh" onClick={() => fileInput.current?.click()}>Import save</Button>
              <input ref={fileInput} type="file" accept=".json,application/json" class="lm-sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
            </div>
            <p class={cx('settings-error', importError && 'is-shown')} role="alert">
              {importError && <><Icon name="warning" /> {importError}</>}
            </p>
            <div class="settings-danger">
              <div>
                <div class="settings-danger__title">Start afresh</div>
                <p class="settings-note">Erase rank, coins, collection and learning history on this device.</p>
              </div>
              <Button variant="danger" icon="alert" onClick={() => setResetOpen(true)}>Reset progress</Button>
            </div>
          </GlassPanel>

          <GlassPanel as="section" class="settings-panel settings-about lm-enter" style={d(5)} icon="info" eyebrow="About" title="Lumen — The Eye Clinic" accent="#5eead4">
            <div class="settings-disclaimer" role="note">
              <Icon name="alert" class="settings-disclaimer__icon" />
              <div>
                <strong>Educational game — not medical advice.</strong>
                <p>
                  Lumen teaches clinical reasoning with simplified, fictional patients. It does not replace professional training,
                  supervision or an eye examination. If you have eye symptoms, see an optometrist or ophthalmologist — sudden vision
                  loss, a painful red eye, new flashes with a shadow or curtain, or new double vision need same-day care.
                </p>
              </div>
            </div>
            <dl class="settings-credits">
              <div><dt>Clinical content</dt><dd>Written against EyeWiki (AAO), StatPearls and national optometric guidance; each Codex entry cites its source.</dd></div>
              <div><dt>Art & sound</dt><dd>Every portrait, iris, fundus, chart and note is generated live in your browser — no stock images or samples.</dd></div>
              <div><dt>Type</dt><dd>Fraunces, Inter and Space Grotesk, under the SIL Open Font License.</dd></div>
              <div><dt>Built with</dt><dd>Preact, TypeScript and the Web Audio API.</dd></div>
            </dl>
            <div class="settings-actions">
              <Button size="sm" variant="ghost" icon="play" onClick={() => {
                patch({ onboarded: false });
                services.bus.emit('toast', { message: 'The welcome tour will play next time you open the clinic', icon: 'info', tone: 'info' });
              }}>Replay welcome tour</Button>
            </div>
          </GlassPanel>
        </div>
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)} eyebrow="Restore" title="Load this save?" icon="refresh" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
          <Button variant="primary" icon="check" onClick={confirmImport} sfx="success">Restore & reload</Button>
        </>}>
        {pending && (
          <div class="settings-modal">
            <p><b>{pending.fileName}</b> holds <b class="lm-num">{pending.records}</b> records.</p>
            <p class="settings-note">It will replace the progress currently on this device, then the clinic will reopen.{!pending.hasSettings && ' Your sound and display settings will be kept.'}</p>
          </div>
        )}
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} eyebrow="Start afresh" title="Erase all progress?" icon="alert" size="sm" accent="#f43f5e">
        <div class="settings-modal">
          <p>Rank, coins, rivals, collection, streaks and your learning history will be permanently erased from this device. This cannot be undone.</p>
          <p class="settings-note">Tip: export a save first if you might want it back.</p>
          <label class="settings-check">
            <input type="checkbox" checked={resetSettingsToo} onChange={(e) => setResetSettingsToo((e.currentTarget as HTMLInputElement).checked)} />
            <span class="settings-check__box" aria-hidden="true"><Icon name="check" /></span>
            Also reset sound, display and name
          </label>
          <div class="settings-modal__foot">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>Keep my progress</Button>
            <HoldButton label="Hold to erase" icon="alert" onConfirm={confirmReset} />
          </div>
        </div>
      </Modal>
    </Screen>
  );
}
