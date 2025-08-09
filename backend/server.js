require("dotenv").config();
const cors = require("cors");
const express = require("express");
const pool = require("./db");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

app.use(
  cors({
    origin: [process.env.FRONTEND_DEV_URL],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Configure Gmail SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL,
    pass: process.env.APP_PASSWORD, // App password, NOT your real password
  },
});

// Generate 6-digit code
function generateCode() {
  return crypto.randomInt(100000, 999999);
}

// Send verification code
app.post("/api/send-code", async (req, res) => {
  const { email } = req.body;

  if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
    return res.status(400).json({ error: "Invalid Gmail address" });
  }
  try {
    const result = await pool.query("SELECT * FROM users WHERE gmail = $1", [
      email,
    ]);
    if (result.rows.length > 0) {
      return res.status(500).json({ message: "email already registered" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error checking email from database" });
  }

  const code = generateCode();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min

  try {
    await pool.query("DELETE FROM verification WHERE email = $1", [email]);
    await pool.query(
      "INSERT INTO verification (code , expired_at, email) VALUES ($1, $2, $3)",
      [code, expiresAt, email]
    );
  } catch (error) {
    console.log("database error", error);
    return res.status(500).json({ message: "Error saving code to database" });
  }

  try {
    await transporter.sendMail({
      from: `"Expense Tracker" <${process.env.GMAIL}>`,
      to: email,
      subject: "Your Verification Code",
      html: `
        <p>Your verification code is:</p>
        <h2>${code}</h2>
        <p>This code expires in 5 minutes.</p>
      `,
    });

    return res.json({ message: "Verification code sent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send email" });
  }
});

// Verify code
app.post("/api/verify-code", async (req, res) => {
  const { email, code } = req.body;
  try {
    const record = await pool.query(
      "SELECT * FROM verification WHERE email = $1",
      [email]
    );

    if (record.rows.length === 0)
      return res.status(400).json({ error: "No code sent." });

    if (Date.now() > record.rows[0].expired_at) {
      await pool.query("DELETE FROM verification WHERE email = $1", [email]);
      return res.status(400).json({ error: "Code expired." });
    }

    if (parseInt(code) !== record.rows[0].code) {
      return res.status(400).json({ error: "Invalid code." });
    }

    await pool.query("DELETE FROM verification WHERE email = $1", [email]);
    res.json({ message: "Email verified " });
  } catch (error) {
    console.error("Error verifying code:", error);
    res.status(500).json({ error: "Server error while verifying code" });
  }
});

app.post("/api/signup", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO users (username, password, gmail) VALUES ($1, $2, $3)",
      [username, hashedPassword, email]
    );
    res.json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/room-invite", async (req, res) => {
  
});

app.listen(5000, () => {
  console.log("server running on port 5000");
});
