const { Pool } = require("pg");
require("dotenv").config();

// B06 fix (TLS verification) — background:
//
// The original code passed `ssl: { rejectUnauthorized: false }`, which disables
// certificate verification and would allow MITM attacks IF it ever took effect.
//
// Investigation (Aug 2026, pg 8.16.3) showed it was actually dead code:
// - DATABASE_URL contains `?sslmode=require`, and pg-connection-string maps that
//   to `ssl: {}` (empty object).
// - pg's ConnectionParameters merges with
//   `Object.assign({}, config, parse(config.connectionString))`, so the URL's
//   `ssl: {}` OVERRODE the explicit `ssl: { rejectUnauthorized: false }` here.
// - Node's TLS defaults `rejectUnauthorized` to `true` when the option is absent,
//   so connections were in fact being verified. A live check confirmed
//   `stream.authorized === true` (Let's Encrypt cert for *.ap-southeast-1.aws.neon.tech).
//
// We now set `rejectUnauthorized: true` EXPLICITLY. Both paths stay secure:
// - URL has sslmode=require  -> pg yields ssl {}, verification on (Node default)
// - URL has no sslmode       -> explicit { rejectUnauthorized: true } applies
//
// Optional further hardening (env change, not code): switch the URL to
// `sslmode=verify-full` to also verify the hostname.

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
  },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

module.exports = dbPool;
