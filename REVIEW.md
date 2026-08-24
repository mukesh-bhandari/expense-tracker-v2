# Expense Tracker v2 — Remaining Issues

**Updated:** August 17, 2026
**Branch:** `bug-fix`
**Resolved:** 47 issues across 8 phases → see [`FIXES.md`](./FIXES.md) for the full changelog.

---

## Severity Legend

| Severity | Meaning |
|----------|---------|
| **CRITICAL** | Security vulnerability or data loss |
| **HIGH** | Authorization bypass, race condition, or broken functionality |
| **MEDIUM** | Incorrect behavior, poor UX, or reliability risk |
| **LOW** | Minor issue, cosmetic, or convention violation |

---

## Remaining / Open Issues

### B03. Hardcoded production credentials — CRITICAL (operational)
- **File:** `backend/.env:1-7`
- **Problem:** `.env` contains plaintext production DB credentials, JWT secrets, and a Gmail app password. A fragment of the DB password is also in the committed `REVIEW.md` (now removed — this doc).
- **Fix:** Rotate all exposed credentials (Neon DB password, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, Gmail app password). `backend/.env.example` is provided as a template.

### B05. Unauthenticated `verify-token` allows invite probing — HIGH (mitigated)
- **File:** `backend/routes/inviteRoute.js:49`
- **Problem:** `GET /api/invite/verify-token` requires no authentication. An attacker can enumerate pending invitation tokens, emails, and room IDs.
- **Current mitigation:** Rate-limited at 20 req/min per IP via `express-rate-limit`.
- **Optional further fix:** Require `authenticateUser` middleware on this endpoint (the frontend already only calls it while authenticated).

### B07. Any room member can delete other members' expenses — HIGH (skipped)
- **File:** `backend/routes/expenseRoute.js:206`
- **Problem:** `DELETE /:roomId/:expenseId` only checks room membership via `authorizeRoomMember`, not expense ownership. Any member can delete any expense.
- **Fix:** Add a `WHERE id = $1 AND paid_by = $2` check, or introduce role-based authorization.

### B08. Any room member can modify other members' expense shares — HIGH (skipped)
- **File:** `backend/routes/expenseRoute.js:150`
- **Problem:** The `save-states` endpoint lets any authenticated room member update the `amount_owed` and `is_paid` status of any expense share in the room.
- **Fix:** Restrict modifications to the expense creator, the individual share owner (for `is_paid` only), or room admin.

### B18. Race condition in verification code storage — MEDIUM (partial)
- **File:** `backend/routes/authRoute.js:60-80`
- **Problem:** `DELETE` then `INSERT` on the `verification` table without a transaction. Two simultaneous `send-code` requests can both succeed.
- **Current fix:** Wrapped in a transaction (`BEGIN`/`COMMIT`/`ROLLBACK`).
- **Optional further fix:** Add a `UNIQUE (email, type)` constraint via migration:
  ```sql
  ALTER TABLE verification ADD CONSTRAINT verification_email_type_unique UNIQUE (email, type);
  ```

### C01. Duplicate `vercel.json` files — CONFIG (deferred)
- **Files:** Root, `backend/`, `frontend/`
- **Problem:** Three different configs. Root uses non-standard `experimentalServices`.
- **Fix:** Confirm your Vercel deployment model (single monorepo project vs. separate frontend/backend projects), then consolidate accordingly.

### B32. `/verify` swallows DB errors — LOW (new)
- **File:** `backend/routes/authRoute.js:311-321`
- **Problem:** The `catch` block on `GET /api/auth/verify` returns a `200` response with `email: null` when the DB query throws. A real database outage is silently treated as "authenticated with no email", masking the failure.
- **Fix:** Return `serverError(res, error, "Failed to verify user")` instead of a 200.

---

## By Design (No Action Required)

- **D01** — Mark Paid doesn't persist automatically (user must click "Save Changes").
- **D02** — Distribute Equally remainder issue (user can manually adjust).
- **D03** — EditModal skip inconsistency (intentionally different from ExpenseList).
