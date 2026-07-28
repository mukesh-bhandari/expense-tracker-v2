# Expense Tracker v2 - Project Review

**Date:** July 28, 2026
**Last Updated:** July 28, 2026 (Code audit + Grilling session)

---

## What Has Been Built

### Backend (Express 5 + PostgreSQL)
- **Auth System** - Email verification (OTP), signup, login, logout with JWT access/refresh token rotation
- **Room System** - Create rooms, list user's rooms, view room members
- **Invite System** - Send invite emails, verify invite tokens, accept invites
- **Expense System** - Add/get/delete expenses with split tracking, save payment states

### Frontend (React 18 + Vite 7 + Tailwind 4)
- **Landing Page** - Marketing page with features and CTA
- **Signup** - 3-step flow: email → OTP verification → username/password
- **Login** - Username/password with cookie-based auth
- **Room Dashboard** - List/create rooms, invite members
- **Invite Accept** - Token-based invite flow with auth redirect
- **Expense Page** - Add expenses with Nepali date picker, split tracking, skip/mark-paid toggles, balance sheet sidebar, delete with confirmation
- **Auth Context** - Global auth state with cookie-based session verification
- **Protected Routes** - Route guard with loading state

---

## SECURITY ISSUES (Open)


### 10. No input validation on backend routes ❌
**Problem:** Most routes don't validate input lengths, types, or ranges.
**Fix:** Add input validation middleware.

---

## TRANSACTION/EXPENSE LOGIC BUGS (Open)


### 14. Mark Paid doesn't persist ⚠️ INTENTIONAL
**File:** `frontend/src/pages/expenses/Expenses.jsx:101-141`
**Status:** Kept as-is by design. User must manually click "Save Changes" to persist.

### 15. Distribute Equally remainder issue ⚠️ INTENTIONAL
**File:** `frontend/src/pages/expenses/components/EditModal.jsx:68`
**Status:** Kept as-is by design. User can manually adjust the remaining amount.

### 16. EditModal skip inconsistency ⚠️ INTENTIONAL
**File:** `frontend/src/pages/expenses/components/EditModal.jsx:46-54`
**Status:** Kept as-is by design. EditModal and ExpenseList have intentionally different skip behaviors.

---

## CODE QUALITY ISSUES (Open)


### 22. Duplicate `vercel.json` files ❌
**Files:** Root, `backend/`, and `frontend/` all have `vercel.json`
**Problem:** Three different configs. Root uses non-standard `experimentalServices`.
**Fix:** Consolidate or remove root one.

### 23. Pool error handler kills the process ❌
**File:** `backend/server.js:30-33`
**Problem:** `pool.on("error")` calls `process.exit(-1)`. Aggressive for production.
**Fix:** Log error and let pool recover.

---

## MINOR ISSUES (Open)


### 28. `npm install crypto` warning ❌
**Problem:** Deprecation warning for `crypto` package.

---

## SUMMARY: Priority Fix Order

| # | Priority | Issue | Status | Impact |
|---|----------|-------|--------|--------|
| 9 | **P0** | Access token cookie maxAge mismatch | ❌ OPEN | Security/stale state |
| 10 | **P1** | No input validation on backend | ❌ OPEN | Security |
| 14 | **P1** | Mark Paid doesn't persist | 🔴 NEW | Data loss |
| 15 | **P2** | Distribute Equally remainder | 🔴 NEW | Confusing UX |
| 16 | **P2** | EditModal skip inconsistency | 🔴 NEW | Inconsistent UX |
| 22 | **P3** | Duplicate vercel.json | ❌ OPEN | Confusing configs |
| 23 | **P3** | Pool error kills process | ❌ OPEN | Production stability |
| 27 | **P3** | Placeholder stats | ❌ OPEN | Cosmetic |
| 28 | **P3** | npm install warning | ❌ OPEN | DX |
