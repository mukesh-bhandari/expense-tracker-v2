const { sendInviteEmail } = require("../services/emailService");
const pool = require("../config/db");
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const authenticateUser = require("../middleware/auth");

const router = express.Router();

router.post("/send-invite", authenticateUser, async (req, res) => {
  const { email, roomId } = req.body;
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(token, 10);
  
  try {
    await pool.query(
      "INSERT INTO invitation (email, token, room_id, status, created_at) VALUES ($1, $2, $3, 'pending', NOW())",
      [email, hashedToken, roomId]
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendUrl}/invite/accept?token=${token}&email=${encodeURIComponent(email)}`;
    
    await sendInviteEmail(email, inviteLink);
    res.json({ message: "invite sent" });
  } catch (error) {
    res.status(500).json({ error: "Failed to send invite", details: error.message });
  }
});

router.get("/verify-token", async (req, res) => {
  const { token, email } = req.query;

  try {
    if (!token || !email) {
      return res.status(400).json({ error: "Missing token or email" });
    }

    // Find pending invite by email
    const result = await pool.query(
      "SELECT * FROM invitation WHERE email = $1 AND status = 'pending'",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No pending invite for this email" });
    }

    const invite = result.rows[0];

    // Check if invite expired (24 hours)
    const createdAt = new Date(invite.created_at).getTime();
    const now = new Date().getTime();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (now - createdAt > expiryTime) {
      // Delete expired invite
      await pool.query("DELETE FROM invitation WHERE id = $1", [invite.id]);
      return res.status(400).json({ error: "Invite link expired" });
    }

    // Verify token matches
    const isMatch = await bcrypt.compare(token, invite.token);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid token" });
    }

    res.json({ message: "Token verified", email, roomId: invite.room_id });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

router.post("/accept-invite", authenticateUser, async (req, res) => {
  const { token, email } = req.body;
  const userId = req.user.id;

  try {
    // Find invite by email
    const result = await pool.query(
      "SELECT * FROM invitation WHERE email = $1 AND status = 'pending'",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "No pending invite for this email" });
    }

    const invite = result.rows[0];

    // Check if room_id exists
    if (!invite.room_id) {
      return res.status(400).json({ 
        error: "Invalid invite",
        details: "This invitation doesn't have a valid room ID"
      });
    }

    // Check expiry
    const createdAt = new Date(invite.created_at).getTime();
    const now = new Date().getTime();
    const expiryTime = 24 * 60 * 60 * 1000;

    if (now - createdAt > expiryTime) {
      await pool.query("DELETE FROM invitation WHERE id = $1", [invite.id]);
      return res.status(400).json({ error: "Invite link expired" });
    }

    // Verify token
    const isMatch = await bcrypt.compare(token, invite.token);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid token" });
    }

    // Update invite status
    await pool.query("UPDATE invitation SET status = 'accepted' WHERE id = $1", [invite.id]);

    // Add user to room
    await pool.query(
      "INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)",
      [invite.room_id, userId]
    );

    res.json({ message: "Invite accepted", roomId: invite.room_id });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;
