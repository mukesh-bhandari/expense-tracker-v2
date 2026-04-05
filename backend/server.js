require("dotenv").config();
const cors = require("cors");
const express = require("express");
const pool = require("./config/db");
const app = express();

const cookieParser = require("cookie-parser");
const authRoute = require("./routes/authRoute");
const inviteRoute = require("./routes/inviteRoute");
const roomRoute = require("./routes/roomRoute");
const expenseRoute = require("./routes/expenseRoute")


const allowedOrigins = [
  process.env.FRONTEND_DEV_URL,
  process.env.FRONTEND_URL,
  "http://localhost:5173",  // Local Vite dev server
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

app.use("/auth", authRoute);
app.use("/invite", inviteRoute);
app.use("/rooms", roomRoute);
app.use("/expenses", expenseRoute)

app.listen(5000, () => {
  console.log("server running on port 5000");
});
