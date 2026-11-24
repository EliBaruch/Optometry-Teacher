import type { SceneModule } from '@core';
import { SettingsScene } from './SettingsScene';

const settings: SceneModule = {
  id: 'settings',
  component: SettingsScene,
  music: 'hub',
};

export default settings;
