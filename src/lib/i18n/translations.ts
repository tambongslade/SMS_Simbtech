// Public i18n API. The dictionary is composed from per-role files under
// ./dictionaries so that parallel agents can extend translations without
// stepping on each other. Add new French translations by editing (or
// creating) the appropriate dictionary file — not this one.
import { dictionary } from './dictionaries';

export type Language = 'en' | 'fr';

export const translations = dictionary;

export function translate(key: string, lang: Language): string {
  if (lang === 'en') return key;
  return dictionary[key] ?? key;
}
