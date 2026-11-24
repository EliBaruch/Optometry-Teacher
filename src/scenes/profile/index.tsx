import type { SceneModule } from '@core';
import { ProfileScene } from './ProfileScene';

const profile: SceneModule = {
  id: 'profile',
  component: ProfileScene,
  music: 'hub',
};

export default profile;
