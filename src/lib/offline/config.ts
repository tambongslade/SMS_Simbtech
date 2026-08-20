// Which parts of the offline layer are safe to switch on.
//
// The read cache needs nothing from the server. Queued *writes* are only safe
// where replaying a write cannot duplicate or throw — which was verified
// endpoint by endpoint against the backend source. See
// OFFLINE_SYNC_BACKEND_CONTRACT.md for the evidence behind each default.
//
// Anything unverified ships switched OFF and fails loudly offline, because a
// queue that silently duplicates attendance is worse than no queue at all.
// Flip each flag by env var as the matching backend requirement lands.

const on = (value: string | undefined, fallback: boolean): boolean => {
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return fallback;
};

export const offlineConfig = {
    /** Serve cached GET responses when the network is unreachable. Needs nothing from the server. */
    reads: on(process.env.NEXT_PUBLIC_OFFLINE_READS, true),

    // ── Safe today: verified retry-safe in the backend source ──────────────

    /**
     * POST /discipline/roll-call — recordDailyRollCall does deleteMany + create
     * in one transaction, keyed by (enrollment_id, day). Replaying it is an
     * idempotent replace, so this needs no idempotency key to be safe.
     */
    rollCall: on(process.env.NEXT_PUBLIC_OFFLINE_ROLL_CALL, true),

    /**
     * POST /discipline/absences/bulk — creates inside a try/catch that swallows
     * P2002, guarded by @@unique([enrollment_id, teacher_period_id]).
     * Create-or-skip, so queued *creates* are safe; edits to an existing
     * absence are not expressible through it and stay online-only.
     */
    absences: on(process.env.NEXT_PUBLIC_OFFLINE_ABSENCES, true),

    // ── Blocked: verified unsafe, or unverified ───────────────────────────

    /**
     * POST /discipline/lateness/bulk — recordMorningLateness throws
     * "already recorded for this student today" when the row exists, so
     * retrying a partly-succeeded batch throws for everyone who got through.
     * Needs the backend fix in R4 before this can be turned on.
     */
    lateness: on(process.env.NEXT_PUBLIC_OFFLINE_LATENESS, false),

    /** R4. Needs PUT /marks upserting on (examId, studentId, subjectId) — unconfirmed. */
    marks: on(process.env.NEXT_PUBLIC_OFFLINE_MARKS, false),

    /** R5. Needs the one-call endpoint; the create-then-enrol chain cannot run offline. */
    registration: on(process.env.NEXT_PUBLIC_OFFLINE_REGISTRATION, false),

    /** R2. Editing a student offline needs a real idempotency key to be safe. */
    studentEdits: on(process.env.NEXT_PUBLIC_OFFLINE_STUDENT_EDITS, false),

    /** R11. Three conflicting path families in this repo; queueing 404s would be worse than failing. */
    periodRollCall: on(process.env.NEXT_PUBLIC_OFFLINE_PERIOD_ROLL_CALL, false),

    // ── Server capabilities ────────────────────────────────────────────────

    /**
     * R2. Send the Idempotency-Key header on replayed writes.
     *
     * Off until the backend accepts it: a custom request header changes the
     * CORS preflight, and if the server pins Access-Control-Allow-Headers
     * rather than reflecting them, adding this would break every write —
     * online ones included.
     */
    idempotencyHeader: on(process.env.NEXT_PUBLIC_OFFLINE_IDEMPOTENCY, false),

    /** R1. Until refresh tokens exist, an expired token can strand a full queue. */
    refreshTokens: on(process.env.NEXT_PUBLIC_OFFLINE_REFRESH_TOKENS, false),
} as const;

export type OfflineFeature = keyof typeof offlineConfig;

// How many cached GET responses to keep before evicting the oldest. Sized to
// hold a day's working set for one role without filling a cheap phone.
export const CACHE_MAX_ENTRIES = 300;

// A cached read older than this is still shown, but the UI says how old it is.
export const CACHE_STALE_AFTER_MS = 1000 * 60 * 60 * 12;

// Replay backoff. Capped deliberately low: the common case is a whole school
// getting its power back at once, and long waits strand the queue.
export const RETRY_BASE_MS = 5_000;
export const RETRY_MAX_MS = 5 * 60_000;
export const MAX_ATTEMPTS = 12;
