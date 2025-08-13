const express = require("express");
const pool = require("./config/db");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { sendVerificationEmail } = require("../services/emailService");

// Send verification code
router.post("/send-code", async (req, res) => {
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

  const code = crypto.randomInt(100000, 999999);
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
    // verifaction mail
    sendVerificationEmail(email, code);
    return res.json({ message: "Verification code sent" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to send email" });
  }
});

// Verify code
router.post("/verify-code", async (req, res) => {
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

router.post("/signup", async (req, res) => {
  const { email, username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (username, password, gmail) VALUES ($1, $2, $3)  RETURNING *",
      [username, hashedPassword, email]
    );
    

    const user = result.rows[0];
    const accessToken = jwt.sign(
      { id: user.id_, username: user.username },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id_, username: user.username },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
      user.id_,
    ]);

    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING",
      [user.id_, refreshToken]
    );
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.json({ message: "Signup Successfull" });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid user" });
    } else {
      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

      const accessToken = jwt.sign(
        { id: user.id_, username: user.username },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { id: user.id_, username: user.username },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );
      await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
        user.id_,
      ]);

      await pool.query(
        "INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING",
        [user.id_, refreshToken]
      );

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ message: "Login Successfull" });
    }
  } catch (error) {
    console.log("server error", error);
    res.status(500).json({ message: "Error login in" });
  }
});

module.exports = router;
