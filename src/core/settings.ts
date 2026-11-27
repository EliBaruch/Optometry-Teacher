export interface Settings {
  /** The player's own name; '' until they set one. The clinic never calls the player "Doctor". */
  playerName: string;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  reducedMotion: boolean;
  /** Show VA as 6/x instead of 20/x */
  metricVA: boolean;
  highContrast: boolean;
  /** Has the player finished onboarding? */
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  playerName: '',
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.5,
  reducedMotion: false,
  metricVA: false,
  highContrast: false,
  onboarded: false,
};

/**
 * Older saves stored a placeholder title instead of a name ("Doctor", or its Hebrew
 * rendering). Those are not names: treat them as "no name yet".
 */
const LEGACY_PLACEHOLDER_NAMES = new Set(['doctor', 'דוקטור', 'dr', 'dr.', 'ד״ר']);

/** The player's chosen name, or '' when they have not set one (legacy placeholders count as unset). */
export function playerNameOf(raw: string | null | undefined): string {
  const name = (raw ?? '').trim();
  return LEGACY_PLACEHOLDER_NAMES.has(name.toLowerCase()) ? '' : name;
}
