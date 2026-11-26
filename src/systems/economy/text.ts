import type { Locale } from '@core';
import { CRATES, KIND_LABEL, type CatalogItem, type CrateKind, type ItemKind } from './catalog';
import { CRATE_HE, ITEM_HE, KIND_HE } from './strings';

/** Edition-aware names for catalogue data (English stays in catalog.ts). */
export const itemText = (item: CatalogItem, locale: Locale): { name: string; blurb: string } =>
  (locale === 'he' && ITEM_HE[item.id]) || { name: item.name, blurb: item.blurb };
export const crateText = (kind: CrateKind, locale: Locale): { name: string; earn: string } =>
  locale === 'he' ? CRATE_HE[kind] : { name: CRATES[kind].name, earn: CRATES[kind].earn };
export const kindLabel = (k: ItemKind, locale: Locale) => (locale === 'he' ? KIND_HE[k] : KIND_LABEL[k]);
