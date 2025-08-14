const { sendInviteEmail } = require("../services/emailService");
const pool = require("../config/db");

const router = express.Router();

router.post("/send-invite", async (req, res) => {
  const { email, roomId } = req.body; //get room id from forntend
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(token, 10); //bccrypt not good
  await pool.query(
    "INSERT INTO invitation (email, token, room_id, status) VALUES ($1, $2, $3, 'pending')",
    [email, hashedToken, roomId]
  );
  sendInviteEmail(
    email,
    `Click here to join: https://yourapp.com/invite/accept?token=${token}`
  );
  res.json({ message: "invite sent" });
});

//redirect to login if not logged in then accept-invite

router.post("/accept-invite", async (req, res) => {
  const { token, email } = req.body; // need userid
  const userId = req.user.id;

  try {
    // 1. Find invite by email (or store token in DB with expiry)
    const result = await pool.query(
      "SELECT * FROM invitation WHERE email = $1 AND status = 'pending'",
      [email]
    );

    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ error: "No pending invite for this email" });
    }

    const invite = result.rows[0];

    const isMatch = await bcrypt.compare(token, invite.token);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid token" });
    }

    const updatedInvite = await pool.query(
      "UPDATE invitation SET status = 'accepted' WHERE email = $1",
      [email]
    );
    const invitation = updatedInvite.rows[0];

   await pool.query("INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)", [invitation.room_id, userId])
    res.json({ message: "Invite accepted" });
  } catch (err) {
    console.error("Error accepting invite:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
