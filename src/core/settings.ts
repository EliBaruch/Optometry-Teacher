export interface Settings {
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
  playerName: 'Doctor',
  masterVolume: 0.8,
  sfxVolume: 0.9,
  musicVolume: 0.5,
  reducedMotion: false,
  metricVA: false,
  highContrast: false,
  onboarded: false,
};
