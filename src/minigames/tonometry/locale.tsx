import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import { pickStrings, type Locale } from '@core';
import { S } from './strings';

/** Mini-games mount outside the app's service provider, so the edition language travels in this context. */
export const LocaleContext = createContext<Locale>('en');
export const useLocale = (): Locale => useContext(LocaleContext);
export const useT = () => pickStrings(S, useContext(LocaleContext));
