const express = require("express");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const router = express.Router();
const { sendVerificationEmail, sendPasswordResetEmail } = require("../services/emailService");
const bcrypt = require("bcrypt")
const crypto = require("crypto")

// Send verification code
router.post("/send-code", async (req, res) => {
  const { email, purpose = "signup" } = req.body;

  if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
    return res.status(400).json({ error: "Invalid Gmail address" });
  }

  if (purpose === "signup") {
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
        .json({ message: "Error checking email from database", error: error.message });
    }
  }

  if (purpose === "password_reset") {
    try {
      const result = await pool.query("SELECT * FROM users WHERE gmail = $1", [
        email,
      ]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "No account found with this email" });
      }
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Error checking email from database", error: error.message });
    }
  }

  const code = crypto.randomInt(100000, 999999);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min

  try {
    await pool.query("DELETE FROM verification WHERE email = $1 AND type = $2", [email, purpose]);
    await pool.query(
      "INSERT INTO verification (code, expired_at, email, type) VALUES ($1, $2, $3, $4)",
      [code, expiresAt, email, purpose]
    );
  } catch (error) {
    return res.status(500).json({ message: "Error saving code to database", error: error.message });
  }

  try {
    if (purpose === "password_reset") {
      await sendPasswordResetEmail(email, code);
    } else {
      await sendVerificationEmail(email, code);
    }
    return res.json({ message: "Verification code sent" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to send email", details: err.message });
  }
});

// Verify code
router.post("/verify-code", async (req, res) => {
  const { email, code, purpose = "signup" } = req.body;
  try {
    const record = await pool.query(
      "SELECT * FROM verification WHERE email = $1 AND type = $2",
      [email, purpose]
    );

    if (record.rows.length === 0)
      return res.status(400).json({ error: "No code sent." });

    if (Date.now() > record.rows[0].expired_at) {
      await pool.query("DELETE FROM verification WHERE email = $1 AND type = $2", [email, purpose]);
      return res.status(400).json({ error: "Code expired." });
    }

    if (parseInt(code) !== record.rows[0].code) {
      return res.status(400).json({ error: "Invalid code." });
    }

    if (purpose === "signup") {
      await pool.query("DELETE FROM verification WHERE email = $1 AND type = $2", [email, purpose]);
    }
    res.json({ message: "Email verified " });
  } catch (error) {
    res.status(500).json({ error: "Server error while verifying code", details: error.message });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, code, and new password are required." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    // Verify the reset code
    const record = await pool.query(
      "SELECT * FROM verification WHERE email = $1 AND type = $2",
      [email, "password_reset"]
    );

    if (record.rows.length === 0) {
      return res.status(400).json({ error: "No reset code found. Please request a new one." });
    }

    if (Date.now() > record.rows[0].expired_at) {
      await pool.query("DELETE FROM verification WHERE email = $1 AND type = $2", [email, "password_reset"]);
      return res.status(400).json({ error: "Code expired. Please request a new one." });
    }

    if (parseInt(code) !== record.rows[0].code) {
      return res.status(400).json({ error: "Invalid code." });
    }

    // Hash new password and update user
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE gmail = $2", [hashedPassword, email]);

    // Invalidate all sessions for this user
    const userResult = await pool.query("SELECT id FROM users WHERE gmail = $1", [email]);
    if (userResult.rows.length > 0) {
      await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [userResult.rows[0].id]);
    }

    // Delete the verification record
    await pool.query("DELETE FROM verification WHERE email = $1 AND type = $2", [email, "password_reset"]);

    res.json({ message: "Password reset successful. Please log in with your new password." });
  } catch (error) {
    res.status(500).json({ error: "Server error during password reset", details: error.message });
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
      { id: user.id, username: user.username },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, username: user.username },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );
    await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
      user.id,
    ]);

    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING",
      [user.id, refreshToken]
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
    res.status(500).json({ error: "Server error", details: error.message });
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
        { id: user.id, username: user.username },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );
      const refreshToken = jwt.sign(
        { id: user.id, username: user.username },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );
      await pool.query("DELETE FROM refresh_tokens WHERE user_id = $1", [
        user.id,
      ]);

      await pool.query(
        "INSERT INTO refresh_tokens (user_id, token) VALUES ($1, $2) ON CONFLICT (token) DO NOTHING",
        [user.id, refreshToken]
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
    res.status(500).json({ message: "Error login in", details: error.message });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
    }
    res.clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Logout failed" });
  }
});

const authenticateUser = require("../middleware/auth");

router.get("/verify", authenticateUser, async (req, res) => {
  try {
    const result = await pool.query("SELECT gmail FROM users WHERE id = $1", [req.user.id]);
    
    // User doesn't exist in DB (was deleted) - clear cookies and return 401
    if (result.rows.length === 0) {
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      message: "User authenticated",
      user: {
        id: req.user.id,
        username: req.user.username,
        email: result.rows[0].gmail,
      },
    });
  } catch (error) {
    res.json({
      message: "User authenticated",
      user: {
        id: req.user.id,
        username: req.user.username,
        email: null,
      },
    });
  }
});

module.exports = router;
