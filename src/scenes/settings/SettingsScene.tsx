import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { formatSnellen, type SceneProps, type Settings } from '@core';
import { Button, Divider, GlassPanel, Icon, Modal, Screen, cx, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { S } from './strings';
import { HoldButton, SwitchRow, TransferGlyph, VolumeSlider } from './controls';
import { NAME_MAX, countRecords, sanitizeName, saveFileName, settingsOnly, sizeLabel, validateImport } from './logic';
import './settings.css';

type VolumeKey = 'masterVolume' | 'sfxVolume' | 'musicVolume';
type Pending = { json: string; records: number; hasSettings: boolean; fileName: string };

export function SettingsScene({ services }: SceneProps) {
  const t = useStrings(S);
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
  const shown = (n: string) => (n === 'Doctor' ? t.defaultName : n);
  const [draft, setDraft] = useState(shown(settings.playerName));
  const [savedTick, setSavedTick] = useState(0);
  useEffect(() => setDraft(shown(settings.playerName)), [settings.playerName]);
  const commitName = () => {
    const next = sanitizeName(draft, t.defaultName);
    setDraft(next);
    if (next !== shown(services.settings.get().playerName)) {
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

  const burstAt = (el: Element | null, color = '#2257f0') => {
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
    services.bus.emit('toast', { message: t.downloaded, icon: 'check', tone: 'good' });
    setDataVersion((n) => n + 1);
  };

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      failImport(t.tooLarge);
      return;
    }
    const check = validateImport(await file.text(), { empty: t.errEmpty, json: t.errJson, notSave: t.errNot, none: t.errNone, damaged: t.errDamaged });
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

  /**
   * Replace the stored progress and reopen the clinic. Modules debounce their
   * saves (~250 ms), so a write queued just before this could land after the
   * swap: apply once now, then re-apply after the debounce window and reload.
   */
  const [restarting, setRestarting] = useState(false);
  const replaceAndReload = (apply: () => void) => {
    if (restarting) return;
    setRestarting(true);
    apply();
    timers.current.push(setTimeout(() => {
      apply();
      location.reload();
    }, 400));
  };

  const confirmImport = () => {
    if (!pending) return;
    const before = services.save.exportAll();
    const incoming = pending;
    services.audio.play('success');
    replaceAndReload(() => {
      services.save.resetAll();
      if (!incoming.hasSettings) {
        const keep = settingsOnly(before);
        if (keep) services.save.importAll(keep);
      }
      services.save.importAll(incoming.json);
    });
  };

  const confirmReset = () => {
    const keep = resetSettingsToo ? null : settingsOnly(services.save.exportAll());
    services.audio.play('thud');
    services.fx.flash('#e11d48', 220);
    replaceAndReload(() => {
      services.save.resetAll();
      if (keep) services.save.importAll(keep);
    });
  };

  const back = () => services.router.back();
  const metricSample = formatSnellen(0.3, settings.metricVA);
  const otherSample = formatSnellen(0.3, !settings.metricVA);
  const d = (i: number) => ({ '--lm-delay': `${reduced ? 0 : 80 + i * 70}ms` });

  return (
    <Screen title={t.title} eyebrow={t.eyebrow} onBack={back} escToBack backdrop="calm" hud={false} class="settings-scene" contentClass="settings-content">
      <div class="settings-hero lm-enter" style={d(0)}>
        <p class="settings-hero__lede">{t.lede}</p>
        <Divider />
      </div>

      <div class="settings-grid">
        <div class="settings-col">
          <GlassPanel as="section" class="settings-panel lm-enter" style={d(1)} icon="sound-on" eyebrow={t.soundEyebrow} title={t.soundTitle} accent="#2257f0">
            <div class="settings-stack">
              <VolumeSlider id="vol-master" label={t.master} hint={t.masterHint} icon="sound-on" value={settings.masterVolume}
                onInput={(v) => patch({ masterVolume: v })} onCommit={(v) => preview('masterVolume', v)} onToggleMute={() => toggleMute('masterVolume')} />
              <VolumeSlider id="vol-sfx" label={t.effects} hint={t.effectsHint} icon="sparkle" value={settings.sfxVolume} accent="#059669"
                disabled={settings.masterVolume === 0}
                onInput={(v) => patch({ sfxVolume: v })} onCommit={(v) => preview('sfxVolume', v)} onToggleMute={() => toggleMute('sfxVolume')} />
              <VolumeSlider id="vol-music" label={t.music} hint={t.musicHint} icon="play" value={settings.musicVolume} accent="#7c3aed"
                disabled={settings.masterVolume === 0}
                onInput={(v) => patch({ musicVolume: v })} onToggleMute={() => toggleMute('musicVolume')} />
            </div>
          </GlassPanel>

          <GlassPanel as="section" class="settings-panel lm-enter" style={d(2)} icon="eye" eyebrow={t.comfortEyebrow} title={t.comfortTitle} accent="#0284c7">
            <div class="settings-stack settings-stack--switches">
              <SwitchRow id="sw-motion" icon="sparkle" tint="#7c3aed" label={t.reducedMotion} checked={settings.reducedMotion}
                description={t.reducedMotionDesc}
                onChange={(v) => patch({ reducedMotion: v })}
                preview={<span class={cx('settings-orbit', settings.reducedMotion && 'is-still')}><span /></span>} />
              <SwitchRow id="sw-metric" icon="chart" tint="#0284c7" label={t.metric} checked={settings.metricVA}
                description={<>{t.metricDescA}<bdi><b class="lm-num">{t.metricA}</b></bdi>{t.metricDescB}<bdi><b class="lm-num">{t.metricB}</b></bdi>{t.metricDescC}</>}
                onChange={(v) => patch({ metricVA: v })}
                preview={<span class="settings-va" dir="ltr"><span class="lm-num">{metricSample}</span><small class="lm-num">{otherSample}</small></span>} />
              <SwitchRow id="sw-contrast" icon="eye" tint="#059669" label={t.contrast} checked={settings.highContrast}
                description={t.contrastDesc}
                onChange={(v) => patch({ highContrast: v })}
                preview={<span class="settings-contrast"><span /><span /></span>} />
            </div>
          </GlassPanel>
        </div>

        <div class="settings-col">
          <GlassPanel as="section" class="settings-panel lm-enter" style={d(3)} icon="user" eyebrow={t.identityEyebrow} title={t.identityTitle} accent="#7c3aed">
            <form class="settings-name" onSubmit={(e) => { e.preventDefault(); commitName(); (document.activeElement as HTMLElement | null)?.blur(); }}>
              <label class="lm-sr-only" for="player-name">{t.nameLabel}</label>
              <div class="settings-name__plate">
                
                <input id="player-name" class="settings-name__input" value={draft} maxLength={NAME_MAX} autoComplete="nickname" spellcheck={false}
                  placeholder={t.defaultName}
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
                  {savedTick > 0 && <><Icon name="check" /> {t.saved}</>}
                </span>
              </div>
              <p class="settings-note">{t.nameNote}</p>
            </form>
          </GlassPanel>

          <GlassPanel as="section" class="settings-panel lm-enter" style={d(4)} icon="book" eyebrow={t.recordsEyebrow} title={t.recordsTitle} accent="#d97706">
            <p class="settings-note">
              {t.progressOnly}
              {exportInfo.records > 0 ? (
                <> — <span class="lm-num">{exportInfo.records}</span> {t.recordCount(exportInfo.records)}, <bdi class="lm-num">{sizeLabel(exportInfo.bytes)}</bdi>. </>
              ) : '. '}
              {t.keepCopy}
            </p>
            <div class="settings-actions">
              <Button onClick={doExport} sfx={false}><TransferGlyph dir="down" />{t.exportSave}</Button>
              <Button onClick={() => fileInput.current?.click()}><TransferGlyph dir="up" />{t.importSave}</Button>
              <input ref={fileInput} type="file" accept=".json,application/json" class="lm-sr-only" tabIndex={-1} aria-hidden="true" onChange={onFile} />
            </div>
            <p class={cx('settings-error', importError && 'is-shown')} role="alert">
              {importError && <><Icon name="warning" /> {importError}</>}
            </p>
            <div class="settings-danger">
              <div>
                <div class="settings-danger__title">{t.afreshTitle}</div>
                <p class="settings-note">{t.afreshNote}</p>
              </div>
              <Button variant="danger" icon="alert" onClick={() => setResetOpen(true)}>{t.resetBtn}</Button>
            </div>
          </GlassPanel>

          <GlassPanel as="section" class="settings-panel settings-about lm-enter" style={d(5)} icon="info" eyebrow={t.aboutEyebrow} title={t.aboutTitle} accent="#059669">
            <div class="settings-disclaimer" role="note">
              <Icon name="alert" class="settings-disclaimer__icon" />
              <div>
                <strong>{t.disclaimerHead}</strong>
                <p>{t.disclaimer}</p>
              </div>
            </div>
            <dl class="settings-credits">
              {t.credits.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{isolateLatin(v)}</dd></div>)}
            </dl>
            <div class="settings-actions">
              <Button size="sm" variant="ghost" icon="play" onClick={() => {
                patch({ onboarded: false });
                services.bus.emit('toast', { message: t.tourToast, icon: 'info', tone: 'info' });
              }}>{t.replayTour}</Button>
            </div>
          </GlassPanel>
        </div>
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)} eyebrow={t.restoreEyebrow} title={t.loadTitle} icon="refresh" size="sm"
        footer={<>
          <Button variant="ghost" onClick={() => setPending(null)}>{t.cancel}</Button>
          <Button variant="primary" icon="check" onClick={confirmImport} sfx="success">{t.restoreBtn}</Button>
        </>}>
        {pending && (
          <div class="settings-modal">
            <p><bdi><b>{pending.fileName}</b></bdi> {t.holds} <b class="lm-num">{pending.records}</b> {t.recordCount(pending.records)}.</p>
            <p class="settings-note">{t.replaceNote}{!pending.hasSettings && t.keepSettings}</p>
          </div>
        )}
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} eyebrow={t.afreshTitle} title={t.eraseTitle} icon="alert" size="sm" accent="#e11d48">
        <div class="settings-modal">
          <p>{t.eraseBody}</p>
          <p class="settings-note">{t.eraseTip}</p>
          <label class="settings-check">
            <input type="checkbox" checked={resetSettingsToo} onChange={(e) => setResetSettingsToo((e.currentTarget as HTMLInputElement).checked)} />
            <span class="settings-check__box" aria-hidden="true"><Icon name="check" /></span>
            {t.alsoReset}
          </label>
          <div class="settings-modal__foot">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>{t.keepProgress}</Button>
            <HoldButton label={t.holdErase} icon="alert" onConfirm={confirmReset} />
          </div>
        </div>
      </Modal>
      {restarting && (
        <div class="settings-restart" role="status" aria-live="assertive">
          <span class="settings-restart__lens" aria-hidden="true" />
          <p>{t.reopening}</p>
        </div>
      )}
    </Screen>
  );
}

/**
 * Wrap Latin runs (font and library names) in <bdi dir="ltr"> so Hebrew prefixes such as "ו-"
 * and trailing punctuation stay on the correct side in the RTL edition. No-op for pure-Latin text.
 */
function isolateLatin(text: string) {
  if (!/[\u0590-\u05FF]/.test(text)) return text;
  const parts = text.split(/([A-Za-z][A-Za-z0-9 .'()]*[A-Za-z0-9)])/g);
  return parts.map((p, i) => (i % 2 ? <bdi key={i} dir="ltr">{p}</bdi> : p));
}
