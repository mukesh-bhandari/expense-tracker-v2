const pool = require("../config/db");
const express = require("express");
const authenticateUser = require("../middleware/auth")
const router = express.Router();

router.post("/create-room", authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  try {
    // if room already esists what to do
    const result = await pool.query(
      "INSERT INTO rooms (name) VALUES ($1) RETURNING *",
      [name]
    );
    const room = result.rows[0];
    
    await pool.query(
      "INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)",
      [room.id, userId]
    );

    return res.json({data: room });
  } catch (error) {
    res.status(500).json({ error: "error creating room" });
  }
});

router.get("/my-rooms", authenticateUser, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      "SELECT room_id FROM room_members WHERE user_id = $1",
      [userId]
    );

    // get the rooms form roomid
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: "error getting users rooms" });
  }
});

router.get("/:roomId/members",  async (req, res) => {
  const { roomId } = req.params;
  

  try {
    const result = await pool.query(
      `SELECT u.id, u.username 
       FROM users u
       JOIN room_members rm ON u.id = rm.user_id
       WHERE rm.room_id = $1`,
      [roomId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching room members:", error);
    res.status(500).json({ error: "Error fetching room members" });
  }
});

module.exports = router;
