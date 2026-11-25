import type { SceneModule } from '@core';
import { HubScene } from './HubScene';

const hub: SceneModule = {
  id: 'hub',
  component: HubScene,
  music: 'hub',
};

export default hub;
