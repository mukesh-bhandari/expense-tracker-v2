require("dotenv").config();
const cors = require("cors");
const express = require("express");
const pool = require("./config/db");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");

const crypto = require("crypto");

app.use(
  cors({
    origin: [process.env.FRONTEND_DEV_URL],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

app.use("/api/auth", authRoutes);
app.use("/api/invite", inviteRoutes);
app.use("/api/room", inviteRoutes);

app.listen(5000, () => {
  console.log("server running on port 5000");
});
