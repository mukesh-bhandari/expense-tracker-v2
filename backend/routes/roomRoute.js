const pool = require("../config/db");
const express = require("express");
const authenticateUser = require("../middleware/auth")
const authorizeRoomMember = require("../middleware/roomAuth");
const { z } = require("zod");
const { serverError } = require("../utils/errors");
const router = express.Router();

const roomNameSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

router.post("/create-room", authenticateUser, async (req, res) => {
  const userId = req.user.id;
  const parsed = roomNameSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Room name must be 1-100 characters" });
  }
  const { name } = parsed.data;
  try {
    //TODO: if room already esists what to do
    const result = await pool.query(
      "INSERT INTO rooms (name) VALUES ($1) RETURNING *",
      [name]
    );
    const room = result.rows[0];
    
    await pool.query(
      "INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)",
      [room.id, userId]
    );

    // Return formatted data to match the my-rooms endpoint
    const formattedRoom = {
      room_id: room.id,
      room_name: room.name,
      member_count: 1 // Just created, so only 1 member (creator)
    };

    return res.json({data: formattedRoom });
  } catch (error) {
    serverError(res, error, "Error creating room");
  }
});

router.get("/my-rooms", authenticateUser, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT 
        r.id AS room_id,
        r.name AS room_name,
        COUNT(rm2.user_id) AS member_count
      FROM room_members myrm
      JOIN rooms r ON myrm.room_id = r.id
      JOIN room_members rm2 ON r.id = rm2.room_id
      WHERE myrm.user_id = $1
      GROUP BY r.id, r.name
      ORDER BY r.id
    `,
      [userId]
    );
    // get the rooms form roomid
    res.json(result.rows)
  } catch (error) {
    serverError(res, error, "Error getting user's rooms");
  }
});

router.get("/:roomId/members", authenticateUser, authorizeRoomMember, async (req, res) => {
  const roomId = parseInt(req.params.roomId); // PARSE STRING TO INTEGER
  
  // Check if roomId is valid
  if (isNaN(roomId)) {
    return res.status(400).json({ error: "Invalid room ID" });
  } 

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
    serverError(res, error, "Error fetching room members");
  }
});

module.exports = router;
