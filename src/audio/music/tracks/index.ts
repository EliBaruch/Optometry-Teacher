import type { TrackId } from '@core';
import type { Composition } from '../types';
import { emergency } from './emergency';
import { exam } from './exam';
import { hub } from './hub';
import { results } from './results';
import { title } from './title';
import { zen } from './zen';

export const COMPOSITIONS: Record<TrackId, Composition> = { title, hub, exam, emergency, results, zen };
