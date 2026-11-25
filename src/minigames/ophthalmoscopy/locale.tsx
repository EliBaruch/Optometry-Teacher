import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Locale } from '@core';
import { strs } from './strings';

/** Mini-games mount outside the app's service provider, so the edition language travels in this context. */
export const LocaleContext = createContext<Locale>('en');
export const useLocale = (): Locale => useContext(LocaleContext);
export const useT = () => strs(useContext(LocaleContext));
