// One place to turn stored codes (SCIENCE_AND_TECHNOLOGY, EXPRESS_UNION,
// ANNUAL, OTHER, totalDays ...) into words a user can read. Use this wherever
// an enum value or an API field name would otherwise be printed as-is.
import { PAYMENT_METHODS } from '@/lib/paymentMethods';

// Codes whose readable form is not just "split on _ and capitalise".
const OVERRIDES: Record<string, string> = {
  SCIENCE_AND_TECHNOLOGY: 'Science & Technology',
  LANGUAGES_AND_LITERATURE: 'Languages & Literature',
  HUMAN_AND_SOCIAL_SCIENCE: 'Human & Social Sciences',
  OTHERS: 'Other',
  OTHER: 'Other',
  HOD: 'Head of Department',
  SUPER_MANAGER: 'Super Manager',
  ...Object.fromEntries(PAYMENT_METHODS.map(m => [m.value, m.label])),
};

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "SCIENCE_AND_TECHNOLOGY" → "Science & Technology", "EXPRESS_UNION" →
 * "Express Union", "totalDays" → "Total days", "ANNUAL" → "Annual".
 * Pass a feature's own option list (e.g. LEAVE_TYPES) to prefer its labels
 * ("ANNUAL" → "Annual leave"). Empty input returns the fallback ('—').
 */
export function enumLabel(
  code: string | null | undefined,
  fallback = '—',
  options?: readonly { value: string; label: string }[],
): string {
  if (code === null || code === undefined || code === '') return fallback;
  const raw = String(code).trim();
  const fromOptions = options?.find(o => o.value === raw)?.label;
  if (fromOptions) return fromOptions;
  if (OVERRIDES[raw]) return OVERRIDES[raw];
  const upper = raw.toUpperCase();
  if (OVERRIDES[upper] && /^[A-Z0-9_]+$/.test(raw)) return OVERRIDES[upper];
  const words = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // camelCase → camel Case
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/);
  return capitalise(words.join(' '));
}

/** Replace every SCREAMING_SNAKE code inside a sentence with its label. */
export function humanizeCodesInText(text: string): string {
  return text.replace(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g, m => enumLabel(m));
}
