// Standardised date formatters — pinned to en-GB so the output does not shift
// with the user's device locale ("phone standard"). Use these instead of
// `.toLocaleDateString()` or ad-hoc `.split('T')[0]` for anything user-facing.

const DOB_FORMATTER = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});

// "15 Mar 2005" for anything that looks like a valid date, otherwise a dash.
// Accepts ISO strings, Date objects, or null/undefined.
export function formatDOB(value: string | Date | null | undefined): string {
    if (!value) return '-';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return DOB_FORMATTER.format(d);
}
