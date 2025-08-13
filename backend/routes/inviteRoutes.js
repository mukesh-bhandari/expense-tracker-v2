const { sendInviteEmail } = require("../services/emailService");
const pool = require("../config/db")
const router = express.Router();

router.post("/send-invite", async (req, res) => {
  const { email } = req.body;
  const token =  crypto.randomBytes(32).toString("hex");
  const hashedToken = await bcrypt.hash(token, 10);
  await pool.query(
    "INSERT INTO invitation (email, token, status) VALUES ($1, $2, 'pending')",
    [email, hashedToken]
  );
  sendInviteEmail(
    email,
    `Click here to join: https://yourapp.com/invite/accept?token=${token}`
  );
  res.json({ message: "invite sent" });
});


module.exports = router;