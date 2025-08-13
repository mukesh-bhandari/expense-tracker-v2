const pool = require("../config/db")

const router = express.Router();

router.post("/create-room", async (req, res) => {
  const userId = req.user.id;
  const { name } = req.body;
  try {
    // if room already esists what to do
    const result = await pool.query(
      "INSERT INTO rooms (name) VALUES ($1) RETURNING *",
      [name]
    );
    room = result.rows[0];
    await pool.query(
      "INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)",
      [room.id, userId]
    );

    return res.json({ message: "room created" });
  } catch (error) {
    res.status(500).json({ error: "error creating room" });
  }
});

module.exports = router;
