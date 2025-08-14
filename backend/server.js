require("dotenv").config();
const cors = require("cors");
const express = require("express");
const pool = require("./config/db");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const authRoute = require("./routes/authRoute");


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

app.use("/api/auth", authRoute);
app.use("/api/invite", inviteRoute);
app.use("/api/room", inviteRoute);

app.listen(5000, () => {
  console.log("server running on port 5000");
});
