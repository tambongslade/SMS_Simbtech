# Offline Sync — Backend Contract

**Scope:** roll call · marks entry · student registration
**Out of scope:** fee payments (deliberately — see the end of this document)
**Client:** Next.js PWA running inside a Capacitor shell (`server.url = https://ssiccmr.com`)

What the API has to provide so the phone app can keep working through a power cut — recording
roll call, marks and new student registrations on the device, then replaying them safely when the
network comes back.

Requirements are numbered `R1`–`R11` so they can be referenced directly in replies and PRs.
Statuses marked ✅/❌ were verified against the backend source; ⚠️ items are still unconfirmed.

---

## Why the API has to change at all

The app already survives a network drop as a *shell*: `public/sw.js` caches pages and falls back to
`offline.html`, and the Android build is a Capacitor wrapper pointing at the hosted site, so that
cache is the only thing keeping it open. What it cannot do is hold **data**. The service worker
deliberately never caches API responses and only handles `GET`, so offline the app renders an empty
shell and every save fails.

The frontend side of that is ours: an IndexedDB read cache, a write queue, and a replay engine. All
of it funnels through one function, `src/lib/apiService.ts`, so the wiring is contained.

But a queue that replays writes hours or days later is only safe if the server cooperates on four
things: it must let an expired device log back in without losing the queue, it must not apply the
same write twice, it must not guess dates from arrival time, and it must tell the client in
machine-readable terms whether a rejection is worth retrying.

> **The core risk.** Every requirement below exists to prevent one of two failure modes:
> **silent duplication** (a replayed sync writes the same attendance or mark twice) and
> **silent loss** (the queue is wiped, or a write is dropped, and a teacher's afternoon of work
> disappears with no indication it was ever there).

---

## R1 — Refresh tokens, and a 401 we can tell apart

**Priority: BLOCKER**

Today there is one JWT in `localStorage` and no refresh mechanism. Worse, `apiService.ts:128`
responds to *any* 401 by clearing storage and redirecting to login. A device offline overnight comes
back with an expired token, gets a 401 on its first sync attempt, and the app deletes the pending
queue along with the session. That is data loss by design, and it blocks everything else here.

We need:

- `POST /auth/refresh` exchanging a refresh token for a new access token.
- Refresh token TTL of at least **30 days**, and it must survive being unused for that whole period —
  an offline gap cannot invalidate it.
- A stable `code` on every 401 so the client can distinguish `TOKEN_EXPIRED` (refresh, keep the
  queue) from `TOKEN_INVALID` / `SESSION_REVOKED` (real logout). We will only clear local data on the
  second kind.
- If refresh tokens rotate on use, keep accepting the previous one for a short grace window. A
  connection that dies mid-refresh is the normal case here, not the edge case.

---

## R2 — Idempotency keys on every queued write

**Priority: REQUIRED**

The client cannot know whether a request that timed out was applied. It will retry, and without a key
on the server side every retry is a fresh write.

- Client sends `Idempotency-Key: <uuid v4>` on every write in the endpoint table below.
- Server stores `(key, userId) → {status, body, endpoint, bodyHash}` for at least 7 days, ideally 30.
- A repeat of a known key returns the **original status and body** plus `Idempotency-Replayed: true`,
  and applies nothing.
- Same key with a different endpoint or payload → `422 IDEMPOTENCY_KEY_REUSED`.
- Key arrives while the first request is still in flight → `409 IDEMPOTENCY_IN_PROGRESS` with
  `Retry-After`.

> **Easy to get wrong.** The key record must be committed **in the same transaction as the write
> itself**. If it is written afterwards, a crash in between leaves the write applied and the key
> absent — and the retry duplicates it. This is the whole point of the mechanism.

---

## R3 — Trust the client's business date, never the arrival time

**Priority: REQUIRED**

A roll call taken Monday morning may not reach the server until Wednesday. Any server-side `now()`
used as the business date silently files Monday's attendance under Wednesday, and no one notices
until a report is wrong.

- `date` in the roll call and absence payloads is already explicit — it must stay authoritative, with
  no fallback to server time.
- Every queued write additionally carries `clientRecordedAt` (ISO 8601 with offset), `clientDeviceId`,
  and `clientSeq`, a counter that increments per device.
- Store `clientRecordedAt` **and** the server's own `receivedAt` on the record. Reports use the
  business date; audit can show both.

One caveat on `clientRecordedAt`: these are cheap Android phones with no reliable time sync, so treat
it as ordering information *within a single device* (paired with `clientSeq`), not as a trustworthy
global clock. For conflicts between two different devices, prefer `receivedAt` or surface an explicit
conflict.

---

## R4 — Upsert on natural keys, so the client never needs a server id

**Priority: REQUIRED**

**Verified against the backend source — most of this is already satisfied.** Only bulk lateness
needs server work; the rest is retry-safe today and is called out here so it stays that way.

| Area | Status | Detail |
| --- | --- | --- |
| **Daily roll call** | ✅ Already satisfied | `POST /discipline/roll-call` (`recordDailyRollCall`, `disciplineService.ts:966`) does `deleteMany` then `create` inside a transaction (line 992) — an idempotent replace keyed by `(enrollment_id, day)`. **Do not change this.** The client relies on it to queue attendance offline without waiting for R2. |
| **Bulk absences** | ✅ Retry-safe | `bulkRecordAbsences` (line 636) creates inside a try/catch that swallows P2002 (line 679), protected by `@@unique([enrollment_id, teacher_period_id])` (`schema.prisma:511`). Note this is **create-or-skip, not upsert** — the client cannot use it to *change* an existing absence, so absence edits stay online-only. |
| **Bulk lateness** | ❌ **Needs work** | `recordBulkMorningLateness` loops through `recordMorningLateness`, which throws *"Morning lateness already recorded for this student today"* at line 119–120 if the row exists. Retrying a partially-succeeded batch throws for every student who got through the first time. Either swallow the already-recorded case and return the existing row, or add an explicit upsert path. **Until this changes, the client will not queue lateness offline.** |
| **Marks** | ⚠️ Unconfirmed | Add `PUT /marks` with no id, upserting on `(examId, studentId, subjectId)`. The app currently branches on whether it holds a `markId` — `POST /marks` to create, `PUT /marks/:id` to update (`submit-marks/page.tsx:297–302`) — and offline that branch is unanswerable. Marks queueing stays switched off client-side until the upsert behaviour is confirmed (see open question 3). |
| **Period roll call** | ⚠️ Path mismatch | See R11 below — this is a live bug, not an offline concern. |

---

## R5 — Register a student in one atomic call

**Priority: REQUIRED**

Registration is currently a chain: `POST /students`, read the new id from the response, then
`POST /students/:id/enroll` (`student-registration/page.tsx:1554–1567`). Step two needs a
server-assigned id, so the chain simply cannot execute offline.

- `POST /bursar/create-parent-with-student` already creates student and parents together
  (`createStudentWithParent`, `bursarController.ts:9`; accepts `parents` as an array or the legacy
  single form). It takes **`class_id`, not `sub_class_id`**, and none of `subClassId`, `repeater` or
  `photo` appear in the current payload. Extend it to take all three, so one call covers student +
  parents + enrolment into a specific subclass.
- **Still unverified:** whether `bursarService.createStudentWithParent` actually enrols the student or
  only creates the student record. If it already enrols by `class_id`, this requirement shrinks to
  adding the three fields. Please confirm before estimating.
- Accept an optional `clientRef` (uuid) and store it on the student, unique per school. It lets the
  app link its local record to the server record, and gives us a reconciliation path if an
  idempotency response is ever lost.
- Return the created student including `matricule`. Offline the app will show the registration as
  pending with no matricule until sync, which is honest — but it needs the real value the moment it
  lands.

---

## R6 — A machine-readable error contract

**Priority: REQUIRED**

The sync engine has to decide, without matching on message text, whether to keep a write in the queue
or move it to a "needs attention" list for the user.

- Every 4xx and 5xx returns `{ code, message, details? }`, where `code` is a stable SCREAMING_SNAKE
  identifier.
- **Retryable** — 408, 429, 500, 502, 503, 504. The client backs off and keeps the write queued.
- **Terminal** — 400, 403, 404, 409, 422. The client stops retrying and shows the user.
- A **409** must include the current server state in `details.current`, so the app can say "you marked
  this student absent; the server has present, entered by Mr Ndeh at 08:12" and let the user pick.

`message` stays what it is today — human text, which the client already filters through a heuristic
before showing it (`apiService.ts:41`). `code` is for the sync engine and must never change
wording-to-wording.

---

## R7 — Survive the sync burst when the power returns

**Priority: REQUIRED**

**There is currently no rate limiter at all.** No matches for `rateLimit`, `express-rate` or
`slow-down` anywhere under `src/`; `app.ts:26` registers CORS only. (`CLAUDE.md` claims rate limiting
is in place — that claim is wrong and should be corrected.) So this is *add a limiter*, not *tune the
limits*, and it is worth doing before offline sync ships rather than after.

The failure this feature invites: power comes back at a school and every phone on that one WiFi
connection starts replaying its queue at the same second, behind a single NAT address. A limiter
added later without these properties will throttle the entire school into a retry storm.

- Return `Retry-After` on every 429 — the client honours it instead of guessing at backoff.
- Size limits so one device replaying roughly 200 queued writes is not throttled into failure.
- Key on **user, not IP**. The whole school is one address; per-IP limits punish exactly the scenario
  this is built for.

---

## R8 — Delta sync on list endpoints

**Priority: RECOMMENDED**

Without this, every reconnection re-downloads the whole working set — which on a 2G connection just
after a power cut is the difference between a usable app and one that spins.

- `?updatedSince=<ISO>` on `/students`, `/marks`, `/classes`, `/classes/sub-classes` and the roll call
  reads, returning only changed rows plus a `deletedIds` array.
- Every record exposes `updatedAt`.
- `ETag` / `If-None-Match` on the class and subclass lists, which change perhaps twice a year.

---

## R9 — One prefetch call for a day's working set

**Priority: RECOMMENDED**

Before going offline the app has to pull everything a teacher or discipline master needs. Assembled
from today's endpoints that is fifteen-plus requests racing a signal that is already weak, and a
partial prefetch leaves the app half-usable in a way the user cannot see.

- `GET /offline/bootstrap?date=&academicYearId=` returning, for the calling user: their subclasses,
  the students enrolled in each, today's roll call state, the current exam sequence, and their
  assigned subjects.
- One response, one success or failure, one cache write.

---

## R10 — Record when a late write actually arrived

**Priority: RECOMMENDED**

Store `syncedAt` alongside the business date on attendance and marks. A report can then show honestly
that Monday's roll call was taken Monday and received Wednesday — which matters the first time
someone questions whether a teacher filed attendance on time.

---

## R11 — Settle the period roll-call path (live bug)

**Priority: REQUIRED — and unrelated to offline**

The in-class period roll call appears to be broken in production right now. The frontend has three
different path families for the same feature, and none matches the route the backend registers:

| Caller | Path used |
| --- | --- |
| `disciplineApi.ts:699,709` — used by the live teacher page | `/teacher-periods/:id/roll-call` |
| `teacherRollCallApi.ts:123,134` | `/teachers/me/teacher-periods/:id/roll-call`, `/teachers/me/roll-call` |
| `teacherRollCallApi.ts:168,173` | `/roll-calls/teacher-periods` |
| **Backend registers** (`disciplineRoutes.ts:91`) | `/discipline/teacher-periods/:id/roll-call` |

`disciplineApi.ts` is the one wired into `teacher/period-roll-call/page.tsx` and
`components/discipline/PeriodRollCall.tsx`, so teachers using in-class roll call are hitting a 404.

Two things needed: confirm which path is canonical, and confirm whether the `/teachers/me/*` and
`/roll-calls/*` families exist at all or are leftovers from an earlier API shape. Until that is
settled the client will **not** queue period roll call offline — queueing writes against a path that
404s would fill the queue with permanently failing items.

There is also a second, distinct endpoint — `POST /discipline/dm-roll-call`, the per-slot variant
with a different data model. The client needs to know which of the two any given screen targets.

---

## Endpoints the client will queue

These are the exact calls the write queue will replay. Everything not listed here stays online-only
and fails loudly when there is no network.

Status reflects what the backend actually does today, not what we would like it to do.

| Endpoint | Workflow | Retry-safe today? | Client status |
| --- | --- | --- | --- |
| `POST /discipline/roll-call` | Daily roll call | ✅ idempotent replace | **Queued — on by default** |
| `POST /discipline/absences/bulk` | Bulk absences (create only) | ✅ create-or-skip | **Queued — on by default** |
| `POST /discipline/lateness/bulk` | Morning gate lateness | ❌ throws on replay | Blocked until R4 |
| `PUT /marks` *(new)* | Marks entry | ⚠️ unconfirmed | Behind flag until confirmed |
| `POST /bursar/create-parent-with-student` | Student registration | ⚠️ needs R5 | Behind flag until R5 |
| `PUT /students/:id` | Edit an existing student | ⚠️ needs R2 | Behind flag until R2 |
| `POST /discipline/teacher-periods/:id/roll-call` | In-class period roll call | — | Excluded until R11 |

The first two need nothing from the backend and are what ships first. Everything else is written,
tested and switched off by env var — see `src/lib/offline/config.ts`.

---

## What a queued write looks like on the wire

Same route, same body as the online call. Everything the sync layer adds is either a header or three
extra fields, so the online path is unaffected.

```http
POST /api/v1/discipline/roll-call
Authorization: Bearer <access token, refreshed if needed>
Idempotency-Key: 8f14e45f-ea2b-4c1d-9f3a-7b0d2c6e5a91
Content-Type: application/json
```

```jsonc
{
  // unchanged payload
  "subClassId": 12,
  "date": "2026-08-17",              // business date — authoritative (R3)
  "academicYearId": 4,
  "entries": [
    { "enrollmentId": 881, "status": "PRESENT" },
    { "enrollmentId": 882, "status": "ABSENT"  }
  ],

  // added by the sync layer
  "clientRecordedAt": "2026-08-17T07:42:11+01:00",
  "clientDeviceId": "d41d8cd9-8f00-4b20-a980-0998ecf8427e",
  "clientSeq": 317
}
```

### Replayed after a duplicate send

```http
HTTP/1.1 200 OK
Idempotency-Replayed: true
```

```jsonc
{ "data": { "created": 2, "skipped": [] } }   // original response, nothing re-applied
```

### Rejected because someone else got there first

```http
HTTP/1.1 409 Conflict
```

```json
{
  "code": "ROLL_CALL_ALREADY_SUBMITTED",
  "message": "This roll call was already submitted for that date.",
  "details": {
    "current": {
      "enrollmentId": 882,
      "status": "PRESENT",
      "submittedBy": "Mr Ndeh",
      "submittedAt": "2026-08-17T08:12:04+01:00"
    }
  }
}
```

---

## Deliberately not asking for

- **Offline fee payments.** Receipt numbers are issued server-side, and a phone holding several
  payments through a power cut is exactly how you get duplicate receipts or collisions. Money stays
  online-only until the rest of this is proven in the field.
- **A batch `/sync` endpoint.** Replaying calls one at a time with idempotency keys is enough for the
  first version and needs no new routing. Worth revisiting only if the round trips turn out to hurt
  on real connections.
- **Server-side conflict merging.** Last-write-wins plus an explicit 409 with the current state (R6)
  puts the decision in front of the person who was in the room. That is the right place for it.

---

## Open questions

Answers to these change what we build on the client, so they're worth resolving first.

1. What is the current access token TTL, and is there any refresh infrastructure at all, or is R1
   built from scratch? **(R1 — blocker, still open)**
2. Does `bursarService.createStudentWithParent` enrol the student, or only create the student record?
   **(R5 — decides how big R5 actually is)**
3. Does `POST /marks` reject an existing `(examId, studentId, subjectId)` with a 409, or does it
   duplicate? **(R4 — the one unverified retry-safety claim; marks stay offline-disabled until answered)**
4. Which period roll-call path is canonical, and do the `/teachers/me/*` and `/roll-calls/*` families
   exist at all? **(R11)**
5. Is there an existing unique constraint idempotency can hang off, or does R2 need its own table?
6. Do the list endpoints already expose `updatedAt`, and is it indexed well enough to filter on?

**Answered by the source sweep, no longer open:** daily roll call is already an idempotent replace;
bulk absences are retry-safe via a P2002 swallow; bulk lateness is not; there is no rate limiter.
