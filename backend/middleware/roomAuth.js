const pool = require("../config/db");

/**
 * Middleware to authorize room membership
 * Checks if the authenticated user is a member of the room specified in req.params.roomId
 * Must be used AFTER authenticateUser middleware
 */
const authorizeRoomMember = async (req, res, next) => {
  try {
    let roomId = req.params.roomId; // Try to get from route params first
    const userId = req.user.id;

    // If no roomId in params, try to get it from request body
    if (!roomId && req.body && req.body.roomId) {
      roomId = req.body.roomId;
    }

    // If still no roomId, try to get it from expenses array (for /save-states endpoint)
    if (!roomId && req.body && req.body.expenses && req.body.expenses.length > 0) {
      // Query database to find room_id for the first expense
      const expenseId = req.body.expenses[0].id;
      const expenseResult = await pool.query(
        "SELECT room_id FROM expenses WHERE id = $1",
        [expenseId]
      );
      if (expenseResult.rows.length > 0) {
        roomId = expenseResult.rows[0].room_id;
      }
    }

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
    console.error("Error checking room membership:", error);
    res.status(500).json({ error: "Error verifying room access" });
  }
};

module.exports = authorizeRoomMember;
