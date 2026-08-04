# Expense Tracker v2 - Code Review

**Date:** July 28, 2026
**Last Updated:** August 4, 2026 (Full codebase audit — 56 bugs found)

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

## BUG SEVERITY LEGEND

| Severity | Meaning |
|----------|---------|
| **CRITICAL** | Security vulnerability or data loss — fix immediately |
| **HIGH** | Authorization bypass, race condition, or broken functionality |
| **MEDIUM** | Incorrect behavior, poor UX, or reliability risk |
| **LOW** | Minor issue, cosmetic, or convention violation |
| **INTENTIONAL** | By design — no fix needed unless requirements change |

---

## CRITICAL SECURITY BUGS (Backend)

### B01. `accept-invite` doesn't verify user email matches invite email
- **File:** `backend/routes/inviteRoute.js:82-138`
- **Severity:** CRITICAL
- **Problem:** The `accept-invite` endpoint requires authentication but never checks that `req.user.email` matches the `email` parameter in the request body. Any logged-in user can accept an invitation sent to any email address. User A can join User B's room by submitting User B's invite token.
- **Fix:** Look up the authenticated user's email from the DB (JWT payload only has `id` and `username`) and compare it against the invite email before processing acceptance.

### B02. Signup bypasses email verification entirely
- **File:** `backend/routes/authRoute.js:79-126`
- **Severity:** CRITICAL
- **Problem:** The signup endpoint inserts a user with the provided email but never verifies that the email went through the `send-code` + `verify-code` flow. A user can POST directly to `/signup` with any email, completely bypassing OTP verification.
- **Fix:** Store a `verified` flag in the session or a temporary DB table during the OTP flow, and check it before allowing signup. Alternatively, require the OTP code to be included in the signup request.

### B03. `.env` contains hardcoded production credentials
- **File:** `backend/.env:1-7`
- **Severity:** CRITICAL (operational)
- **Problem:** The `.env` file contains real production database credentials (`npg_wjYUFhq7H5LP...`), JWT signing secrets, a Gmail address, and an app password in plaintext. Even though `.gitignore` excludes `.env`, these credentials exist on disk.
- **Fix:** Use a secrets manager or environment variable injection at deploy time. Rotate all exposed credentials.

---

## HIGH SEVERITY BUGS (Backend)

### B04. `secure: true` cookies break local development over HTTP
- **File:** `backend/routes/authRoute.js:110-121, 165-176`
- **Severity:** HIGH
- **Problem:** All cookies (accessToken, refreshToken) are set with `secure: true`. The browser refuses to send/store these cookies over plain HTTP. During local development at `http://localhost:5173`, login and signup are completely non-functional.
- **Fix:** Make the `secure` flag conditional: `secure: process.env.NODE_ENV === 'production'`.

### B05. Unauthenticated `verify-token` allows invite probing
- **File:** `backend/routes/inviteRoute.js:37`
- **Severity:** HIGH
- **Problem:** The `GET /api/invite/verify-token` endpoint requires no authentication. An attacker can enumerate valid invitation tokens, emails, and room IDs by sending arbitrary queries. The endpoint reveals whether an email has a pending invite and which room it belongs to.
- **Fix:** Add rate limiting and consider requiring authentication, or limit what data is returned (e.g., don't return `roomId` in the response).

### B06. `rejectUnauthorized: false` enables MITM on database connection
- **File:** `backend/config/db.js:6-8`
- **Severity:** HIGH
- **Problem:** Setting `rejectUnauthorized: false` disables SSL certificate verification for the PostgreSQL connection, making it vulnerable to man-in-the-middle attacks.
- **Fix:** Provide the correct CA certificate via `ssl: { rejectUnauthorized: true, ca: fs.readFileSync('ca-cert.pem', 'utf-8') }`. Neon provides their CA cert.

### B07. Any room member can delete other members' expenses
- **File:** `backend/routes/expenseRoute.js:206-242`
- **Severity:** HIGH
- **Problem:** The `DELETE /:roomId/:expenseId` route only checks room membership via `authorizeRoomMember`, not ownership. Any member of a room can delete expenses created by other members.
- **Fix:** Add a `WHERE id = $1 AND paid_by = $2` check, or introduce role-based authorization (e.g., expense creator or room admin can delete).

### B08. Any room member can modify other members' expense shares
- **File:** `backend/routes/expenseRoute.js:150-203`
- **Severity:** HIGH
- **Problem:** The `save-states` endpoint lets any authenticated room member update the `amount_owed` and `is_paid` status of any expense share in the room. A malicious member could mark their own shares as paid without actually paying, or alter amounts owed by others.
- **Fix:** Restrict modifications to the expense creator, the individual share owner (for `is_paid` only), or room admin.

### B09. `roomAuth.js` trusts client-supplied `req.body.roomId`
- **File:** `backend/middleware/roomAuth.js:10-29`
- **Severity:** HIGH
- **Problem:** If `roomId` is not in the route params, the middleware reads it from `req.body.roomId` or derives it from `req.body.expenses[0].id`. A client can manipulate `req.body.roomId` to claim membership in a room they do not belong to.
- **Fix:** Never trust client-provided body data for authorization. Always derive `roomId` from route params or from a verified source.

### B10. No input validation on signup fields
- **File:** `backend/routes/authRoute.js:79-126`
- **Severity:** HIGH
- **Problem:** The signup endpoint does not validate `email`, `username`, or `password`. If `password` is `null`, `bcrypt.hash(null, 10)` throws. If `password` is an empty string, it creates a user with a valid bcrypt hash of an empty string, allowing passwordless login.
- **Fix:** Validate all fields: email format, username length/characters, password minimum length and complexity.

### B11. No validation on `expenses` array in `save-states`
- **File:** `backend/routes/expenseRoute.js:150-203`
- **Severity:** HIGH
- **Problem:** The endpoint does not validate that `expenses` is an array, that each element has the expected structure, or that `splits` is an array. If `expenses` is `undefined`, `expenses.map()` on line 160 throws a 500 error.
- **Fix:** Add validation middleware to ensure the request body matches the expected schema.

### B12. Type mismatch in `is_paid` comparison
- **File:** `backend/routes/expenseRoute.js:68`
- **Severity:** HIGH
- **Problem:** `member.user_id === paidBy` uses strict equality. If `paidBy` arrives as a string (e.g., `"2"` instead of `2`), the comparison always returns `false`, meaning nobody is marked as `is_paid = true`.
- **Fix:** Use `==` or explicitly convert types: `Number(member.user_id) === Number(paidBy)`.

### B13. `save-states` trusts client-supplied `split.id` values
- **File:** `backend/routes/expenseRoute.js:172-180`
- **Severity:** HIGH
- **Problem:** The endpoint uses `split.id` directly from the request body in `WHERE id = $3`. Individual `expense_shares` IDs are not verified to belong to the claimed expenses. An attacker could submit split IDs from other rooms/expenses.
- **Fix:** Validate that each `split.id` belongs to an expense in the claimed room via a JOIN or subquery.

### B14. `process.exit(-1)` on pool error crashes entire server
- **File:** `backend/server.js:30-33`
- **Severity:** HIGH
- **Problem:** `pool.on("error")` calls `process.exit(-1)` on any idle client error. A single transient network hiccup will crash the entire server in production.
- **Fix:** Log the error and let the pool recover: `console.error('Unexpected pool error:', err);`.

### B15. No rate limiting on any endpoint
- **File:** `backend/server.js`
- **Severity:** HIGH
- **Problem:** No rate limiting middleware anywhere. Exposes the app to email bombing (`send-code`), brute force (`login`), and denial of service on any endpoint.
- **Fix:** Add `express-rate-limit` with aggressive limits on `send-code` (5/min per email) and `login` (5/min per IP).

### B16. No CSRF protection
- **File:** `backend/server.js`
- **Severity:** HIGH
- **Problem:** Uses cookie-based auth with `sameSite: "lax"`. While lax provides some protection for GET requests, it does not protect POST requests from same-site navigations. No CSRF token mechanism exists.
- **Fix:** Implement CSRF tokens, or use `sameSite: "strict"` (noting the trade-offs with OAuth flows).

---

## MEDIUM SEVERITY BUGS (Backend)

### B17. Access token cookie `maxAge` is 7 days but JWT expires in 15 minutes
- **File:** `backend/routes/authRoute.js:110-115, 165-170` + `backend/middleware/auth.js:45-50`
- **Severity:** MEDIUM
- **Problem:** The access token cookie has `maxAge: 7 * 24 * 60 * 60 * 1000` (7 days), but the JWT expires in 15 minutes. The browser keeps sending a dead cookie for 7 days, causing every request to trigger a refresh-token round trip to the DB.
- **Fix:** Set cookie `maxAge` to `15 * 60 * 1000` (15 minutes) to match JWT expiry.

### B18. Race condition in verification code storage
- **File:** `backend/routes/authRoute.js:32-37`
- **Severity:** MEDIUM
- **Problem:** `DELETE` then `INSERT` on the `verification` table without a transaction. Two simultaneous `send-code` requests can both succeed, resulting in duplicate pending codes.
- **Fix:** Wrap in a transaction, or use `INSERT ... ON CONFLICT ... DO UPDATE`.

### B19. Race condition in accept invite
- **File:** `backend/routes/inviteRoute.js:126-132`
- **Severity:** MEDIUM
- **Problem:** `UPDATE invitation SET status = 'accepted'` and `INSERT INTO room_members` are not wrapped in a transaction. Two identical accept-invite requests can both succeed, creating duplicate membership.
- **Fix:** Wrap in a transaction. Add `ON CONFLICT DO NOTHING` to the `room_members` insert.

### B20. No validation on login fields
- **File:** `backend/routes/authRoute.js:128-183`
- **Severity:** MEDIUM
- **Problem:** No validation that `username` and `password` are present. `bcrypt.compare(undefined, ...)` could throw.
- **Fix:** Validate both fields are present and are strings before processing.

### B21. No validation on room name
- **File:** `backend/routes/roomRoute.js:7-34`
- **Severity:** MEDIUM
- **Problem:** The `create-room` endpoint does not validate the `name` field. It could be empty, `null`, excessively long, or contain HTML for stored XSS.
- **Fix:** Validate name length (e.g., 1-100 chars) and sanitize input.

### B22. `price` not validated before `parseFloat` — `NaN` inserted into DB
- **File:** `backend/routes/expenseRoute.js:42-48`
- **Severity:** MEDIUM
- **Problem:** `parseFloat(price)` is called but there is no check for `NaN`. If `price` is a non-numeric string, `NaN` propagates through all math operations and is inserted into the database.
- **Fix:** Check `isNaN(parseFloat(price))` before proceeding.

### B23. Internal error messages leaked to clients
- **File:** Multiple backend files
- **Severity:** MEDIUM
- **Problem:** Nearly every error handler sends `error.message` to the client, leaking SQL errors, table names, column names, and file paths.
- **Fix:** Return generic error messages in production; log details server-side only.

### B24. Date default logic only triggers on empty string
- **File:** `backend/routes/expenseRoute.js:18-22`
- **Severity:** MEDIUM
- **Problem:** `if (date === "")` only catches the empty string case. If `date` is `null`, `undefined`, or not provided, `bs_date` is stored as `NULL` instead of defaulting to today.
- **Fix:** Change to `if (!date)`.

### B25. Access token refresh uses stale JWT data
- **File:** `backend/middleware/auth.js:38-52`
- **Severity:** MEDIUM
- **Problem:** On refresh, the old refresh token payload is used to create the new access token. If a user changes their username, the refresh token still contains the old username, propagating stale data.
- **Fix:** Fetch fresh user data from the DB during refresh instead of using the decoded token payload.

### B26. `accept-invite` duplicate insert not handled
- **File:** `backend/routes/inviteRoute.js:129-132`
- **Severity:** MEDIUM
- **Problem:** `INSERT INTO room_members` without `ON CONFLICT DO NOTHING`. If the user is already a member (e.g., they created the room), this throws a unique constraint violation, returning a 500 error.
- **Fix:** Add `ON CONFLICT DO NOTHING` and return a graceful "already a member" response.

### B27. Missing `try/catch` around `bcrypt.hash` in inviteRoute
- **File:** `backend/routes/inviteRoute.js:13`
- **Severity:** MEDIUM
- **Problem:** `bcrypt.hash(token, 10)` is called outside the `try/catch` block. If it throws, the error is unhandled and may leak a stack trace.
- **Fix:** Move the `bcrypt.hash` call inside the existing `try/catch`.

### B28. N+1 query pattern in `save-states`
- **File:** `backend/routes/expenseRoute.js:172-191`
- **Severity:** MEDIUM
- **Problem:** Executes individual UPDATE queries in nested loops. For 50 expenses with 5 members each, this is 300 individual UPDATE queries.
- **Fix:** Batch updates using `UPDATE ... WHERE id = ANY($1)` with arrays.

---

## LOW SEVERITY BUGS (Backend)

### B29. "Email Already Registered" returns 500 instead of 409
- **File:** `backend/routes/authRoute.js:21`
- **Severity:** LOW
- **Problem:** Business logic condition (duplicate email) returns HTTP 500 (Internal Server Error) instead of 409 (Conflict).
- **Fix:** Return 409 Conflict.

### B30. Successful expense creation returns 200 instead of 201
- **File:** `backend/routes/expenseRoute.js:96`
- **Severity:** LOW
- **Problem:** A POST that creates a resource should return 201 Created, not 200 OK (REST convention).
- **Fix:** Return 201.

### B31. Email service doesn't verify transporter at startup
- **File:** `backend/services/emailService.js:3-4` + `backend/config/mail.js:5-11`
- **Severity:** LOW
- **Problem:** The nodemailer transporter is created at module load time but `transporter.verify()` is never called. If credentials are wrong, the server starts successfully but all emails fail at runtime.
- **Fix:** Call `transporter.verify()` at startup and log the result.

---

## HIGH SEVERITY BUGS (Frontend)

### F01. `user` state never populated after login or signup
- **File:** `frontend/src/pages/login/Login.jsx:38` + `frontend/src/pages/signup/Signup.jsx:207` + `frontend/src/contexts/AuthContext.jsx:33`
- **Severity:** HIGH
- **Problem:** After login or signup, `setIsAuthenticated(true)` is called but `setUser` is never called. The `user` object remains `null` forever. Any component reading `user` from AuthContext gets `null`.
- **Fix:** Fetch user data after successful login/signup and call `setUser(data)`, or have the login/signup endpoints return the user object.

### F02. `response.json()` called before checking `response.ok`
- **File:** `frontend/src/pages/login/Login.jsx:33-34`, `frontend/src/pages/signup/Signup.jsx:83-84,140-141,203-204`, `frontend/src/pages/room/Room.jsx:67-69,103-105`, `frontend/src/pages/invite/InviteAccept.jsx:60,81`
- **Severity:** HIGH
- **Problem:** In 6+ places, `response.json()` is called before checking `response.ok`. If the server returns non-JSON (HTML error page, empty body), `response.json()` throws a `SyntaxError`. The catch block shows "Network error" — a completely misleading message for a server error.
- **Fix:** Check `response.ok` first. Only call `.json()` on success. For errors, try `.json()` with a fallback: `const data = await response.json().catch(() => ({}))`.

### F03. Stale closure in room creation loses rooms
- **File:** `frontend/src/pages/room/Room.jsx:63`
- **Severity:** HIGH
- **Problem:** `setRooms([...rooms, data.data])` captures `rooms` from the closure. Rapid creation causes the second call to use stale state, losing the first room.
- **Fix:** Use functional updater: `setRooms((prev) => [...prev, data.data])`.

### F04. EditModal rows reset on every parent re-render
- **File:** `frontend/src/pages/expenses/components/EditModal.jsx:9-35`
- **Severity:** HIGH
- **Problem:** The `useEffect` that initializes rows depends on `expense` and `members` — objects that are re-created on every parent render. Any state change in `Expenses.jsx` overwrites the user's in-progress edits silently.
- **Fix:** Use `JSON.stringify(expense.splits)` as the dependency, or use a `useState` flag to track if the modal has already been initialized.

### F05. Stale closure in `handleSaveExpenseAmounts` overwrites state
- **File:** `frontend/src/pages/expenses/Expenses.jsx:78-110`
- **Severity:** HIGH
- **Problem:** The handler captures `expenses` from the closure. If state was updated between handler creation and invocation, the `map` operates on stale data and overwrites newer state.
- **Fix:** Use functional updater: `setExpenses((prev) => prev.map(...))`.

### F06. Stale closure in `handleTransactionComplete` overwrites state
- **File:** `frontend/src/pages/expenses/Expenses.jsx:122-153`
- **Severity:** HIGH
- **Problem:** Same stale closure problem as F05. `expenses` is from the closure, and the overwrite discards newer expenses.
- **Fix:** Use functional updater: `setExpenses((prev) => prev.map(...))`.

### F07. Local-only mutations silently lost on navigation
- **File:** `frontend/src/pages/expenses/components/ExpenseList.jsx:79,95,121` + `frontend/src/pages/expenses/Expenses.jsx`
- **Severity:** HIGH
- **Problem:** Skip toggle, mark-paid toggle, and delete are local-only mutations. The user must click "Save Changes" to persist. If they navigate away without saving, ALL modifications are silently lost. No dirty-state indicator, no unsaved-changes warning.
- **Fix:** Add a dirty-state flag, show an "Unsaved changes" indicator, and add a `beforeunload` event listener + React Router navigation guard.

---

## MEDIUM SEVERITY BUGS (Frontend)

### F08. Missing `credentials: "include"` on OTP signup API calls
- **File:** `frontend/src/pages/signup/Signup.jsx:78,135,161`
- **Severity:** MEDIUM
- **Problem:** The three signup-related fetch calls (send-code, verify-code, resend) omit `credentials: "include"`. If the server sets or expects session cookies during the OTP flow, those cookies won't be sent/received in cross-origin or proxy scenarios.
- **Fix:** Add `credentials: "include"` to all fetch calls for consistency.

### F09. `setTimeout` not cleaned up — memory leak
- **File:** `frontend/src/pages/invite/InviteAccept.jsx:92-94`
- **Severity:** MEDIUM
- **Problem:** `setTimeout` for 2-second redirect is never cleared. If the component unmounts before the delay (user navigates away), the callback fires on an unmounted component.
- **Fix:** Store the timer ID in a ref and clear it in a `useEffect` cleanup function.

### F10. Missing `inviteRoomId` in useEffect dependency array
- **File:** `frontend/src/pages/invite/InviteAccept.jsx:41`
- **Severity:** MEDIUM
- **Problem:** `inviteRoomId` is used inside the effect body but not listed in the dependency array. If it changes, the effect won't re-run and stale data will be used.
- **Fix:** Add `inviteRoomId` to the dependency array.

### F11. Price regex accepts `"."` leading to `NaN`
- **File:** `frontend/src/pages/expenses/components/ExpenseForm.jsx:101-104,27`
- **Severity:** MEDIUM
- **Problem:** The regex `^\d*(\.\d{0,2})?$` matches `"."` (zero digits, dot, zero digits). `parseFloat(".")` returns `NaN`, which passes validation (`!"."` is `false`) and is sent to the server.
- **Fix:** Reject values that are just `"."` or start with `"."`: add `e.target.value !== "."` to the regex test.

### F12. No error toast when fetching room members/expenses fails
- **File:** `frontend/src/pages/expenses/Expenses.jsx:29-55`
- **Severity:** MEDIUM
- **Problem:** If fetching members or expenses fails, no user-facing feedback is shown. The user sees an empty "No expenses yet" state with no idea something went wrong.
- **Fix:** Add `toast.error("Failed to load room data")` in the catch/else branches.

### F13. Inconsistent `roomId` sent to server vs stored in state
- **File:** `frontend/src/pages/invite/InviteAccept.jsx:69,77`
- **Severity:** MEDIUM
- **Problem:** The verify endpoint returns a `roomId` stored in state, but the subsequent accept-invite call sends `inviteRoomId` from URL search params instead. If the server resolves a different roomId, these could differ.
- **Fix:** Use the `roomId` from the server response (state) instead of the URL param.

### F14. ConfirmDeleteDialog backdrop clickable during active delete
- **File:** `frontend/src/components/ConfirmDeleteDialog.jsx:6-9`
- **Severity:** MEDIUM
- **Problem:** While a DELETE request is in flight, the backdrop is still clickable and closes the dialog. The expense might disappear moments later, or the user might get a confusing toast about a delete they dismissed.
- **Fix:** Disable backdrop click when `isLoading` is true.

---

## LOW SEVERITY BUGS (Frontend)

### F15. Silent validation failure — no user feedback
- **File:** `frontend/src/pages/expenses/components/ExpenseForm.jsx:20-23`
- **Severity:** LOW
- **Problem:** If required fields are missing, the handler silently returns with no toast or visual feedback.
- **Fix:** Add `toast.error("Please fill in all fields")`.

### F16. Email validation bypassable with edge-case inputs
- **File:** `frontend/src/pages/signup/Signup.jsx:71`
- **Severity:** LOW
- **Problem:** `email.includes("@gmail.com")` doesn't reject `"@gmail.com"`, `" @gmail.com"`, or `"test@yahoo.com@gmail.com"`.
- **Fix:** Use a proper email regex or `email.endsWith("@gmail.com")` with additional checks.

### F17. Unskipping restores amount to "0"
- **File:** `frontend/src/pages/expenses/components/EditModal.jsx:47-55`
- **Severity:** LOW
- **Problem:** When a user toggles skip off, the amount is restored to `"0"` (what was stored when skip was turned on). The user must manually enter a value or click "Distribute Equally".
- **Fix:** Store the previous non-zero amount and restore it, or auto-redistribute.

### F18. Unused `useEffect` import
- **File:** `frontend/src/pages/expenses/components/ExpenseForm.jsx:1`
- **Severity:** LOW
- **Problem:** `useEffect` is imported but never used. Triggers ESLint `no-unused-vars` warnings.
- **Fix:** Remove `useEffect` from the import.

---

## DESIGN/UX ISSUES (Intentional — No Fix Required)

### D01. Mark Paid doesn't persist automatically
- **File:** `frontend/src/pages/expenses/Expenses.jsx:101-141`
- **Status:** By design. User must click "Save Changes" to persist.

### D02. Distribute Equally remainder issue
- **File:** `frontend/src/pages/expenses/components/EditModal.jsx:68`
- **Status:** By design. User can manually adjust the remaining amount.

### D03. EditModal skip inconsistency
- **File:** `frontend/src/pages/expenses/components/EditModal.jsx:46-54`
- **Status:** By design. EditModal and ExpenseList have intentionally different skip behaviors.

---

## CODE QUALITY / CONFIG ISSUES

### C01. Duplicate `vercel.json` files
- **Files:** Root, `backend/`, `frontend/`
- **Problem:** Three different configs. Root uses non-standard `experimentalServices`.
- **Fix:** Consolidate or remove the root one.

### C02. `npm install crypto` deprecation warning
- **Problem:** Deprecation warning for the `crypto` package.
- **Fix:** Check if `crypto` is actually needed. If only `crypto.randomUUID()` is used, Node.js has a built-in `crypto` module.

---

## PRIORITY FIX ORDER

### Phase 1 — Critical Security (Do First)
| Bug | Issue | Impact |
|-----|-------|--------|
| B01 | `accept-invite` email mismatch | Privilege escalation — any user joins any room |
| B02 | Signup bypasses email verification | Account takeover with any email |
| B03 | Hardcoded production credentials | Credential leak |

### Phase 2 — High Security & Auth
| Bug | Issue | Impact |
|-----|-------|--------|
| B04 | `secure: true` cookies in dev | Local development broken |
| B05 | Unauthenticated `verify-token` | Information disclosure |
| B06 | `rejectUnauthorized: false` | MITM vulnerability |
| B15 | No rate limiting | Email bombing, brute force |
| B16 | No CSRF protection | Cross-site request forgery |
| B10 | No signup validation | Empty password login |

### Phase 3 — High Authorization & Data Integrity
| Bug | Issue | Impact |
|-----|-------|--------|
| B07 | Any member can delete expenses | Data loss |
| B08 | Any member can modify shares | Financial fraud |
| B09 | `roomAuth` trusts client body | Authorization bypass |
| B11 | No `save-states` validation | Server crashes |
| B12 | `is_paid` type mismatch | Payments not recorded |
| B13 | Client-supplied `split.id` | Data manipulation |
| B14 | Pool error kills process | Production crashes |

### Phase 4 — High Frontend Bugs
| Bug | Issue | Impact |
|-----|-------|--------|
| F01 | `user` never populated | Broken user experience |
| F02 | `json()` before `ok` check | Misleading error messages |
| F03-F06 | Stale closures | Data loss, state corruption |
| F07 | No dirty-state tracking | Silent data loss |

### Phase 5 — Medium Bugs
| Bug | Issue | Impact |
|-----|-------|--------|
| B17-B28 | Backend medium bugs | Various reliability issues |
| F08-F14 | Frontend medium bugs | UX and reliability issues |

### Phase 6 — Low & Quality
| Bug | Issue | Impact |
|-----|-------|--------|
| B29-B31 | Backend low bugs | Convention violations |
| F15-F18 | Frontend low bugs | Minor UX issues |
| C01-C02 | Config issues | DX |

---

## SUGGESTED TOOLING IMPROVEMENTS

1. **Add ESLint strict rules** — `react-hooks/exhaustive-deps` would catch F04, F10. `no-unused-vars` would catch F18.
2. **Add `zod` or `joi` for backend validation** — Catches B10-B13, B20-B22 automatically.
3. **Add `helmet` middleware** — Catches security header issues, XSS, CSRF patterns.
4. **Add `express-rate-limit`** — Catches B15.
5. **Use database transactions** — Catches B18, B19, B13.
6. **Write integration tests** — Especially auth flows, invite flows, and expense CRUD.
7. **Use TypeScript** — Would prevent B12 (type mismatch) at compile time.
8. **Add `eslint-plugin-security`** — Flags insecure patterns like B06.
9. **Add `react-router-dom` ESLint plugin** — Route-aware linting for navigation bugs.
