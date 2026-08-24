# Expense Tracker V2

A full-stack shared expense tracking application. Create rooms, invite members via email, log expenses with equal splitting, and view a balance sheet showing who owes whom. Built with React, Express, PostgreSQL, and deployed on Vercel.

## Features

- **Email-based auth** — Sign up with Gmail + OTP verification, log in with email + password, forgot password with OTP reset.
- **Rooms** — Create expense tracking rooms and invite members by email.
- **Invite flow** — Email invites with secure token links; unauthenticated users are prompted to sign up first.
- **Expenses** — Add items with price, payer, and Nepali (Bikram Sambat) date; auto-equal split across all room members.
- **Balance sheet** — See who paid, who owes, and settle up with a single click.
- **Custom distribution** — Skip and adjust individual splits when equal doesn't work.

## Tech Stack

| Layer    | Tech                                                              |
| -------- | ----------------------------------------------------------------- |
| Frontend | React 18, Vite 7, React Router 7, Tailwind CSS 4, Sonner (toasts) |
| Backend  | Express 5, PostgreSQL (pg), JWT, bcrypt, Nodemailer               |
| Database | PostgreSQL (Neon)                                                 |
| Deploy   | Vercel (monorepo config)                                          |

## Project Structure

```
expense-tracker-v2/
├── backend/
│   ├── config/
│   │   ├── db.js            # PostgreSQL pool (Neon, SSL)
│   │   └── mail.js          # Nodemailer transport (Gmail SMTP)
│   ├── middleware/
│   │   ├── auth.js          # JWT access/refresh token verification
│   │   └── roomAuth.js      # Room membership authorization
│   ├── routes/
│   │   ├── authRoute.js     # Signup, login, logout, password reset, email verification
│   │   ├── roomRoute.js     # Create room, list rooms, list members
│   │   ├── inviteRoute.js   # Send, verify, and accept invites
│   │   └── expenseRoute.js  # Add, get, save states, delete expenses
│   ├── services/
│   │   └── emailService.js  # Verification, password reset, and invite emails
│   ├── server.js            # Express app entry point (port 5000)
│   ├── vercel.json
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConfirmDeleteDialog.jsx
│   │   │   └── ProtectedRoute.jsx    # Auth guard; redirects to /login
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx        # Auth state (isAuthenticated, user)
│   │   ├── pages/
│   │   │   ├── signup/Signup.jsx      # 3-step: email → OTP → username+password
│   │   │   ├── login/Login.jsx        # Email + password login
│   │   │   ├── forgot-password/ForgotPassword.jsx
│   │   │   ├── home/Home.jsx          # Public landing page
│   │   │   ├── room/Room.jsx          # Room list + create + invite dialogs
│   │   │   ├── expenses/Expenses.jsx  # Expense list, form, edit modal, balance sheet
│   │   │   └── invite/InviteAccept.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js        # Dev proxy: /api → localhost:5000
│   └── package.json
├── vercel.json               # Root Vercel monorepo config
└── .gitignore
```

## Prerequisites

- **Node.js** v18+
- **PostgreSQL** database (or a [Neon](https://neon.tech) account)
- **Gmail** account with an [App Password](https://myaccount.google.com/apppasswords)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/expense-tracker-v2.git
cd expense-tracker-v2

# Backend
cd backend && npm install

# Frontend (separate terminal)
cd frontend && npm install
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values (see [Environment Variables](#environment-variables) below).

### 3. Run in development

```bash
# Terminal 1 — backend on :5000
cd backend && npm run dev

# Terminal 2 — frontend on :5173 (proxies /api → :5000)
cd frontend && npm run dev
```

Open **http://localhost:5173**.

## Environment Variables

All variables go in **`backend/.env`** (git-ignored). The root `.gitignore` already excludes `.env` files.

| Variable               | Description                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string. Neon example: `postgresql://user:pass@host/db?sslmode=require`         |
| `ACCESS_TOKEN_SECRET`  | Random hex string used to sign JWT access tokens (15-minute expiry).                                 |
| `REFRESH_TOKEN_SECRET` | Random hex string used to sign JWT refresh tokens (7-day expiry).                                    |
| `GMAIL`                | Gmail address used as the sender for verification, password reset, and invite emails.                |
| `APP_PASSWORD`         | Gmail [App Password](https://myaccount.google.com/apppasswords) (not your regular password).         |
| `FRONTEND_DEV_URL`     | Frontend dev server URL for CORS (`http://localhost:5173`).                                           |
| `FRONTEND_URL`         | Frontend production URL (used in invite links and CORS). Example: `https://expense-tracker-room.vercel.app` |

> **Note:** The backend port is hardcoded to `5000` in `server.js`.

## API Endpoints

All endpoints are prefixed with `/api`.

### Auth (`/api/auth`)

| Method | Path               | Auth   | Description                                  |
| ------ | ------------------ | ------ | -------------------------------------------- |
| POST   | `/send-code`       | Public | Send 6-digit OTP to a Gmail address          |
| POST   | `/verify-code`     | Public | Verify OTP code                              |
| POST   | `/signup`          | Public | Create account (email + username + password) |
| POST   | `/login`           | Public | Log in with email + password                 |
| POST   | `/logout`          | Public | Clear cookies and revoke refresh token       |
| POST   | `/reset-password`  | Public | Reset password using OTP code                |
| GET    | `/verify`          | Auth   | Verify session and return user info          |

### Rooms (`/api/rooms`)

| Method | Path                      | Auth           | Description          |
| ------ | ------------------------- | -------------- | -------------------- |
| POST   | `/create-room`            | Auth           | Create a new room    |
| GET    | `/my-rooms`               | Auth           | List user's rooms    |
| GET    | `/:roomId/members`        | Auth + Member  | List room members    |

### Invites (`/api/invite`)

| Method | Path            | Auth           | Description                          |
| ------ | --------------- | -------------- | ------------------------------------ |
| POST   | `/send-invite`  | Auth           | Send invite email to a Gmail address |
| GET    | `/verify-token` | Public         | Verify invite token via link         |
| POST   | `/accept-invite`| Auth           | Accept invite and join room          |

### Expenses (`/api/expenses`)

| Method | Path                          | Auth           | Description                                 |
| ------ | ----------------------------- | -------------- | ------------------------------------------- |
| POST   | `/:roomId/add-expenses`       | Auth + Member  | Add expense with equal split                |
| GET    | `/:roomId/get-expenses`       | Auth + Member  | Get all expenses and splits for a room      |
| POST   | `/:roomId/save-states`        | Auth + Member  | Save paid/skipped states and distribution   |
| DELETE | `/:roomId/:expenseId`         | Auth + Member  | Delete an expense and its splits            |

## Authentication Model

- **Access token**: JWT, 15-minute expiry, stored in `httpOnly` cookie.
- **Refresh token**: JWT, 7-day expiry, stored in `httpOnly` cookie, persisted in `refresh_tokens` table.
- **Token refresh**: When the access token expires, `middleware/auth.js` transparently issues a new one using the refresh token.
- **Room access**: `roomAuth.js` middleware checks the authenticated user is a member of the requested room.

## Database Schema

> No `schema.sql` is included in the repo. The tables below are inferred from the SQL queries in the backend code — verify against your actual database if needed.

| Table              | Columns                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| `users`            | `id`, `username`, `password`, `gmail`                                          |
| `verification`     | `code`, `expired_at`, `email`, `type`                                          |
| `refresh_tokens`   | `user_id`, `token`                                                             |
| `rooms`            | `id`, `name`                                                                   |
| `room_members`     | `room_id`, `user_id`                                                           |
| `invitation`       | `id`, `email`, `token`, `room_id`, `status`, `created_at`                      |
| `expenses`         | `id`, `room_id`, `item`, `price`, `paid_by`, `bs_date`, `created_at`, `transaction_complete` |
| `expense_shares`   | `id`, `expense_id`, `user_id`, `amount_owed`, `is_paid`                        |

## Scripts

### Frontend

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `npm run dev`      | Start Vite dev server (:5173)    |
| `npm run build`    | Production build                 |
| `npm run preview`  | Preview production build         |
| `npm run lint`     | Run ESLint                       |

### Backend

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `npm run dev`      | Start server with Nodemon (:5000)|
| `npm start`        | Start server with Node           |

## Deployment

This project is configured for [Vercel](https://vercel.com) using the root `vercel.json`:

- **Frontend** — built as a Vite app, served at `/`.
- **Backend** — deployed as a Node.js serverless function at `/api/*`.

Update `FRONTEND_URL` in your Vercel environment variables to your production domain after deploying.
