// What may be queued offline, and what may be read from cache.
//
// The allowlist is deliberately narrow. Every entry names the backend guarantee
// that makes replaying it safe (see OFFLINE_SYNC_BACKEND_CONTRACT.md); anything
// not listed here fails loudly offline rather than being silently queued.

import { offlineConfig, type OfflineFeature } from './config';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface QueueRule {
    /** Feature flag gating this rule. */
    feature: Extract<
        OfflineFeature,
        'rollCall' | 'absences' | 'lateness' | 'marks' | 'registration' | 'studentEdits' | 'periodRollCall'
    >;
    method: HttpMethod;
    match: RegExp;
    /** Short label for the pending-sync list. Must never throw on a partial body. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    describe: (body: any) => string;
    /** What the caller gets back immediately when the write is queued. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    optimisticResponse?: (body: any) => any;
}

// Strip the query string before matching — /discipline/roll-call?x=1 is the
// same rule as /discipline/roll-call.
const path = (endpoint: string): string => endpoint.split('?')[0].replace(/\/+$/, '');

const count = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

export const QUEUE_RULES: QueueRule[] = [
    {
        // Verified idempotent replace: deleteMany + create in one transaction,
        // keyed by (enrollment_id, day). Safe to replay without R2.
        feature: 'rollCall',
        method: 'POST',
        match: /^\/discipline\/roll-call$/,
        describe: (b) => `Roll call — ${b?.date ?? 'unknown date'} (${count(b?.entries)} students)`,
        // Field names mirror RollCallSubmitResult exactly — the caller reads
        // result.updated straight into a toast, and undefined there reads as
        // "undefined marked present".
        optimisticResponse: (b) => ({
            data: { updated: count(b?.entries), created: count(b?.entries), skipped: [] },
        }),
    },
    {
        // Verified create-or-skip via a swallowed P2002 on a unique constraint.
        // Creates only — an edit to an existing absence cannot be expressed here.
        feature: 'absences',
        method: 'POST',
        match: /^\/discipline\/absences\/bulk$/,
        describe: (b) => `Absences — ${b?.date ?? 'unknown date'} (${count(b?.absences)} students)`,
        // Mirrors BulkAbsencesResult.
        optimisticResponse: (b) => ({ data: { created: count(b?.absences), skipped: [] } }),
    },
    {
        // Blocked by default: recordMorningLateness throws on an existing row,
        // so replaying a partly-succeeded batch fails for everyone in it.
        feature: 'lateness',
        method: 'POST',
        match: /^\/discipline\/lateness\/bulk$/,
        describe: (b) => `Lateness — ${b?.date ?? 'unknown date'} (${count(b?.students ?? b?.entries)} students)`,
    },
    {
        // Blocked by default until PUT /marks upserts on the natural key.
        feature: 'marks',
        method: 'PUT',
        match: /^\/marks$/,
        describe: (b) => `Mark — student ${b?.studentId ?? '?'}`,
    },
    {
        feature: 'registration',
        method: 'POST',
        match: /^\/bursar\/create-parent-with-student$/,
        describe: (b) => `Registration — ${[b?.studentNom, b?.studentPrenom].filter(Boolean).join(' ') || 'new student'}`,
    },
    {
        feature: 'studentEdits',
        method: 'PUT',
        match: /^\/students\/\d+$/,
        describe: (b) => `Student update — ${b?.name ?? 'student'}`,
    },
    {
        // Blocked by R11: three conflicting path families, none matching the
        // route the backend registers. Queueing 404s would poison the queue.
        feature: 'periodRollCall',
        method: 'POST',
        match: /^\/(discipline\/)?teacher-periods\/\d+\/roll-call$/,
        describe: (b) => `Period roll call (${count(b?.entries)} students)`,
    },
];

/** The rule for a write, or null when it must not be queued. */
export const findQueueRule = (method: string, endpoint: string): QueueRule | null => {
    const m = method.toUpperCase() as HttpMethod;
    const p = path(endpoint);
    const rule = QUEUE_RULES.find((r) => r.method === m && r.match.test(p));
    if (!rule) return null;
    return offlineConfig[rule.feature] ? rule : null;
};

/**
 * True when a write matches a known rule but its flag is off — the caller can
 * then explain *why* it will not work offline instead of a generic failure.
 */
export const isQueueableButDisabled = (method: string, endpoint: string): boolean => {
    const m = method.toUpperCase() as HttpMethod;
    const p = path(endpoint);
    const rule = QUEUE_RULES.find((r) => r.method === m && r.match.test(p));
    return !!rule && !offlineConfig[rule.feature];
};

// ── Read cache ────────────────────────────────────────────────────────────
//
// Broad by design: any list the user has already loaded is worth having during
// a blackout. The exclusions are things that are pointless or wrong to serve
// stale — auth state, file downloads, and anything that polls.

const CACHE_DENYLIST: RegExp[] = [
    /^\/auth\//,
    /^\/login/,
    /\/export/,
    /\/download/,
    /\/pdf/,
    /\/report-cards?\/generate/,
    /^\/notifications\/unread-count/,
    /^\/messages\/unread/,
];

export const isCacheableRead = (method: string, endpoint: string, responseType: string): boolean => {
    if (!offlineConfig.reads) return false;
    if (method.toUpperCase() !== 'GET') return false;
    // Only JSON — a cached blob is a download the user cannot use offline anyway.
    if (responseType !== 'json') return false;
    const p = path(endpoint);
    return !CACHE_DENYLIST.some((re) => re.test(p));
};
