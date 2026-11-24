import type { SceneModule } from '@core';
import { ArcadeScene } from './ArcadeScene';

const arcade: SceneModule = {
  id: 'arcade',
  component: ArcadeScene,
  music: 'zen',
};

export default arcade;
