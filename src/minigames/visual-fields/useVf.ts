import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Locale } from '@core';
import { vfT, type VfStrings } from './strings';

/** The edition language for everything rendered inside the game (mini-games mount outside the app providers). */
export const VfLocale = createContext<Locale>('en');

export const useVfLocale = (): Locale => useContext(VfLocale);
export const useVf = (): VfStrings => vfT(useContext(VfLocale));
