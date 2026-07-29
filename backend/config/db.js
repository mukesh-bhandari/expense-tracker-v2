const { Pool } = require("pg");
require("dotenv").config();

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

module.exports = dbPool;
