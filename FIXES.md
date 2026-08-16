# Fix Changelog

**Session date:** August 16, 2026
**Branch:** `bug-fix`
**Purpose:** Phase-by-phase implementation of the bugs identified in `REVIEW.md`.

---

## Decisions Made This Session

| Topic | Decision |
|-------|----------|
| B02 (signup bypasses OTP) | Verified-flag approach: `verify-code` flips `type` to `signup_verified`; signup requires that marker **or** a valid pending invite |
| B07 / B08 (expense delete / share-modification authorization) | **Skipped** — left permissive for now |
| B16 (CSRF) | `sameSite: "strict"` on all cookies (no OAuth flows exist) |
| B18 / B21 (unscheduled in REVIEW.md) | Added to Phase 2 |
| Validation & rate limiting | `zod` for validation; `express-rate-limit` (planned, Phase 5) |
| Pacing | Implement phase-by-phase, pausing for review after each |

---

## Phase 1 — Critical Auth ✅ DONE

### B02 — Signup bypasses email verification ✅ FIXED
- `backend/routes/authRoute.js`
  - `verify-code`: on success for `signup`, instead of deleting the row, updates it to `type = 'signup_verified'` with `expired_at` extended +30 min.
  - `signup`: requires a non-expired `signup_verified` row **or** a pending `invitation` for the email, else 403. Consumes the marker after successful account creation. Also added presence check (400).

### B03 — Hardcoded production credentials ⏳ USER ACTION REQUIRED
- No code change possible. `backend/.env` is correctly gitignored, but secrets exist in plaintext on disk and a fragment of the DB password is in committed `REVIEW.md`.
- **User must rotate:** Neon DB password, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, Gmail app password.
- Added `backend/.env.example` with placeholders.

---

## Phase 2 — Auth Hardening ✅ DONE

### B04 — `secure: true` cookies break local dev ✅ FIXED
- Cookies now use `secure: process.env.NODE_ENV === "production"`.
- New shared module: `backend/config/cookies.js`.

### B16 — No CSRF protection ✅ FIXED
- All cookies switched to `sameSite: "strict"` (via shared options).

### B17 — Access token cookie maxAge 7 days vs JWT 15 min ✅ FIXED
- Access token cookie `maxAge` → `15 * 60 * 1000` (refresh token stays 7d).

### B10 — No input validation on signup ✅ FIXED
- `backend/routes/authRoute.js`: zod `signupSchema` — gmail email regex, username 3-30 `[a-zA-Z0-9_]`, password ≥ 8 → 400.

### B20 — No validation on login fields ✅ FIXED
- zod `loginSchema` — username & password required → 400.

### B29 — Duplicate email returns 500 instead of 409 ✅ FIXED
- `send-code` duplicate-email response → 409.

### B18 — Race condition in verification code storage ✅ FIXED (PARTIAL — see note)
- `send-code` DELETE+INSERT wrapped in a transaction (`BEGIN`/`COMMIT`/`ROLLBACK` on dedicated client).
- **Note:** fully eliminating the race needs a `UNIQUE (email, type)` constraint on `verification` — optional migration:
  ```sql
  ALTER TABLE verification ADD CONSTRAINT verification_email_type_unique UNIQUE (email, type);
  ```

### B25 — Access token refresh uses stale JWT data ✅ FIXED
- `backend/middleware/auth.js`: on refresh, fetches fresh `id, username` from DB using the decoded token's `id`; 401 if the user no longer exists; new access token + `req.user` from fresh row.

### B31 — Email transporter not verified at startup ✅ FIXED
- `backend/config/mail.js`: `transporter.verify()` called at module load, logs readiness/failure.

### B21 — No validation on room name ✅ FIXED
- `backend/routes/roomRoute.js`: zod `roomNameSchema` — trimmed, 1–100 chars → 400.

### Dependency added
- `zod@^4.4.3` (backend).

---

## Phase 3 — Authorization & Data Integrity ✅ DONE

> **Skipped (per decision):** B07 (any member deletes expenses), B08 (any member modifies shares).

### B09 — `roomAuth.js` trusts client-supplied `req.body.roomId` ✅ FIXED
- `backend/middleware/roomAuth.js`: removed both `req.body` fallback branches; `roomId` read only from `req.params`.

### B11 — No validation on `expenses` array in `save-states` ✅ FIXED
- `backend/routes/expenseRoute.js`: zod `saveStatesSchema` — non-empty array of `{ id, transaction_complete, splits[] }` with typed splits → 400.

### B12 — Type mismatch in `is_paid` comparison ✅ FIXED
- `Number(member.user_id) === Number(paidBy)`; also new 400 if `paidBy` is not a room member.

### B13 — `save-states` trusts client-supplied `split.id` ✅ FIXED
- Batch-fetches `expense_shares` by the submitted IDs and verifies each `split.id` maps to its claimed `expense.id` → 403 on mismatch.

### B14 — `process.exit(-1)` on pool error crashes server ✅ FIXED
- `backend/server.js`: pool error handler now logs only.

### B22 — `price` NaN inserted into DB ✅ FIXED
- `add-expenses` zod schema refines `parseFloat(price)` to finite & > 0 → 400 otherwise.

### B24 — Date default logic only triggers on empty string ✅ FIXED
- `if (date === "")` → `if (!date)`.

### B28 — N+1 queries in `save-states` ✅ FIXED
- Two batched `UNNEST` UPDATE statements replace the nested sequential loops (one for splits, one for `transaction_complete`).

### B30 — Expense creation returns 200 instead of 201 ✅ FIXED
- `add-expenses` success → 201.

### B23 — Internal error messages leaked to clients ✅ FIXED
- New helper `backend/utils/errors.js` — `serverError(res, error, fallback)` returns generic message in production (`NODE_ENV === "production"`), detailed in dev; logs details server-side.
- Sweep applied across `expenseRoute.js`, `roomAuth.js`, `authRoute.js`, `inviteRoute.js`, `roomRoute.js`.
- Bonus fix: `add-expenses` "Cannot split evenly" / "No members" now return 400 (validation happens before `BEGIN`).

---

## Phase 4 — Invite Flow Hardening ✅ DONE

### B05 — Unauthenticated `verify-token` allows invite probing ✅ FIXED
- `GET /api/invite/verify-token` now rate-limited at 20 req/min per IP via `express-rate-limit` (endpoint stays public per decision; `roomId` kept in response since F13 depends on it).
- New module: `backend/config/rateLimit.js` (`inviteVerifyLimiter`; Phase 5 will add send-code/login/global limiters here).
- `backend/server.js`: added `app.set("trust proxy", 1)` so client IPs resolve correctly behind Vercel/proxies.

### B19 — Race condition in accept invite ✅ FIXED
- Membership insert + invite-status update now run inside a single transaction (`BEGIN`/`COMMIT`/`ROLLBACK`).

### B26 — Duplicate insert unhandled ✅ FIXED
- `INSERT INTO room_members ... ON CONFLICT (room_id, user_id) DO NOTHING` — concurrent accepts are idempotent; already-member returns the same graceful success. (The old memberCheck fast path was removed as redundant.)

### B27 — `bcrypt.hash` outside try/catch ✅ FIXED
- `bcrypt.hash(token, 10)` moved inside the `send-invite` try block; failures now return a generic 500 via `serverError`.

### Dependency added
- `express-rate-limit@^8.6.2` (backend).

## Phase 5 — Server-Wide Security ⏳ PLANNED

| Bug | Fix |
|-----|-----|
| B06 | `rejectUnauthorized: true` on the Neon connection (standard certs, no CA file needed) |
| B15 | Add `sendCodeLimiter` (5/min) + `loginLimiter` (5/min) + global baseline to `config/rateLimit.js` and mount in `server.js` (dependency already installed in Phase 4) |

## Phase 6 — Frontend Data Integrity ⏳ PLANNED

| Bug | Fix |
|-----|-----|
| F01 | Populate `user` after login/signup (return safe user object, call `setUser`) |
| F03 | Functional updater for `setRooms` in `Room.jsx` |
| F04 | Stabilize `EditModal` useEffect deps (stringify splits / init flag) |
| F05 | Functional updater in `handleSaveExpenseAmounts` |
| F06 | Functional updater in `handleTransactionComplete` |
| F07 | Dirty-state flag + `beforeunload` + navigation guard |

## Phase 7 — Frontend Robustness & UX ⏳ PLANNED

| Bug | Fix |
|-----|-----|
| F02 | Check `response.ok` before `response.json()` (Login, Signup ×3, ForgotPassword ×3) |
| F08 | `credentials: "include"` on OTP signup calls |
| F09 | Clear the redirect `setTimeout` on unmount |
| F10 | Add `inviteRoomId` to useEffect dependency array |
| F11 | Reject `"."` and values starting with `"."` in price regex |
| F12 | Error toasts when fetching room members/expenses fails |
| F13 | Use server-returned `roomId` from verifyData instead of URL param |
| F14 | Disable backdrop click while delete is in flight |

## Phase 8 — Polish & Config ⏳ PLANNED

| Bug | Fix |
|-----|-----|
| F15 | Toast on silent validation failure in `ExpenseForm` |
| F16 | Proper email validation (regex / `endsWith` + trimming) |
| F17 | Restore previous amount when unskipping in `EditModal` |
| F18 | Remove unused `useEffect` import in `ExpenseForm` |
| C01 | Consolidate duplicate `vercel.json` files |

---

## Pending User Actions

1. **B03** — rotate exposed credentials (Neon DB password, JWT secrets, Gmail app password).
2. **B18 (optional)** — run the `UNIQUE (email, type)` migration on `verification` to fully close the send-code race.
