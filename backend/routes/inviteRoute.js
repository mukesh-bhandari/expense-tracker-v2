const { sendInviteEmail } = require("../services/emailService");
const pool = require("../config/db");
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const authenticateUser = require("../middleware/auth");
const { serverError } = require("../utils/errors");
const { inviteVerifyLimiter } = require("../config/rateLimit");

const router = express.Router();

router.post("/send-invite", authenticateUser, async (req, res) => {
  const { email, roomId } = req.body;
  const token = crypto.randomBytes(32).toString("hex");

  try {
    const hashedToken = await bcrypt.hash(token, 10);

    // Check if the email belongs to an existing user who is already a member of this room
    const existingMember = await pool.query(
      `SELECT rm.user_id FROM room_members rm 
       JOIN users u ON rm.user_id = u.id 
       WHERE u.gmail = $1 AND rm.room_id = $2`,
      [email, roomId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: "This user is already a member of this room" });
    }

    // Remove any existing pending invite for this email+room to avoid duplicates
    await pool.query(
      "DELETE FROM invitation WHERE email = $1 AND room_id = $2 AND status = 'pending'",
      [email, roomId]
    );

    await pool.query(
      "INSERT INTO invitation (email, token, room_id, status, created_at) VALUES ($1, $2, $3, 'pending', NOW())",
      [email, hashedToken, roomId]
    );

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendUrl}/invite/accept?token=${token}&email=${encodeURIComponent(email)}&roomId=${roomId}`;
    
    await sendInviteEmail(email, inviteLink);
    res.json({ message: "invite sent" });
  } catch (error) {
    serverError(res, error, "Failed to send invite");
  }
});

router.get("/verify-token", inviteVerifyLimiter, async (req, res) => {
  const { token, email, roomId } = req.query;

  try {
    if (!token || !email) {
      return res.status(400).json({ error: "Missing token or email" });
    }

    // First look for a pending invite
    let pendingQuery = "SELECT * FROM invitation WHERE email = $1 AND status = 'pending'";
    let pendingParams = [email];
    if (roomId) {
      pendingQuery += " AND room_id = $2";
      pendingParams.push(roomId);
    }
    const pendingResult = await pool.query(pendingQuery, pendingParams);

    // If no pending invite found, check for an already accepted invite
    if (pendingResult.rows.length === 0) {
      let acceptedQuery = "SELECT * FROM invitation WHERE email = $1 AND status = 'accepted'";
      let acceptedParams = [email];
      if (roomId) {
        acceptedQuery += " AND room_id = $2";
        acceptedParams.push(roomId);
      }
      const acceptedResult = await pool.query(acceptedQuery, acceptedParams);

      if (acceptedResult.rows.length > 0) {
        return res.status(400).json({ error: "Invite already accepted" });
      }

      return res.status(400).json({ error: "No pending invite for this email" });
    }

    const invite = pendingResult.rows[0];

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
    serverError(res, err, "Server error");
  }
});

router.post("/accept-invite", authenticateUser, async (req, res) => {
  const { token, email, roomId } = req.body;
  const userId = req.user.id;

  try {
    let query = "SELECT * FROM invitation WHERE email = $1 AND status = 'pending'";
    let params = [email];
    if (roomId) {
      query += " AND room_id = $2";
      params.push(roomId);
    }
    const result = await pool.query(query, params);

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

    // Verify the authenticated user's email matches the invitation email
    const userResult = await pool.query("SELECT gmail FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0 || userResult.rows[0].gmail !== email) {
      return res.status(403).json({ error: "This invite is for a different email address" });
    }

    // Add user to room and mark invite accepted atomically.
    // ON CONFLICT DO NOTHING makes this idempotent if the user is already a member,
    // and concurrent duplicate accepts can no longer create duplicate membership.
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");

      await client.query(
        "INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT (room_id, user_id) DO NOTHING",
        [invite.room_id, userId]
      );

      await client.query(
        "UPDATE invitation SET status = 'accepted' WHERE id = $1",
        [invite.id]
      );

      await client.query("COMMIT");
    } catch (err) {
      if (client) {
        try { await client.query("ROLLBACK"); } catch (_) {}
      }
      throw err;
    } finally {
      if (client) client.release();
    }

    res.json({ message: "Invite accepted", roomId: invite.room_id });
  } catch (err) {
    serverError(res, err, "Server error");
  }
});

module.exports = router;
