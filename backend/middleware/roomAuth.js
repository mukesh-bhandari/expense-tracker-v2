const pool = require("../config/db");
const { serverError } = require("../utils/errors");

/**
 * Middleware to authorize room membership
 * Checks if the authenticated user is a member of the room specified in req.params.roomId
 * Must be used AFTER authenticateUser middleware
 */
const authorizeRoomMember = async (req, res, next) => {
  try {
    const roomId = req.params.roomId;
    const userId = req.user.id;

    // Validate roomId exists
    if (!roomId) {
      return res.status(400).json({ error: "Room ID is required" });
    }

    // Query to check if user is a member of the room
    const result = await pool.query(
      "SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2",
      [roomId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: "Not a member of this room" });
    }

    // User is authorized, proceed to next middleware/route handler
    next();
  } catch (error) {
    serverError(res, error, "Error verifying room access");
  }
};

module.exports = authorizeRoomMember;
