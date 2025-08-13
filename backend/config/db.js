const { Pool } = require("pg");
require("dotenv").config();

const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,   // true later 
  },
});

module.exports = dbPool;
