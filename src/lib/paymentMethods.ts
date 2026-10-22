// Single list of payment methods for every money form (fees, expenditures, edits).
// Mirrors the backend PaymentMethod enum (GET /fees/payment-methods returns the same list).
export type PaymentMethodCode =
  | 'CASH'
  | 'MTN_MOMO'
  | 'ORANGE_MONEY'
  | 'EXPRESS_UNION'
  | 'CCA'
  | 'F3DC'
  | 'AFRILAND_FIRST_BANK';

export const PAYMENT_METHODS: { value: PaymentMethodCode; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MTN_MOMO', label: 'MTN Mobile Money' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'EXPRESS_UNION', label: 'Express Union' },
  { value: 'CCA', label: 'CCA Bank' },
  { value: 'F3DC', label: 'F3DC' },
  { value: 'AFRILAND_FIRST_BANK', label: 'Afriland First Bank' },
];

const LABELS: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map(m => [m.value, m.label]));

/** Human label for a stored method code; never shows a raw enum code to the user. */
export const paymentMethodLabel = (code?: string | null): string =>
  !code ? '—' : LABELS[code] ?? code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
