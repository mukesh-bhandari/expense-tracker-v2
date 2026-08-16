const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { accessTokenOptions } = require("../config/cookies");

const authenticateUser = async (req, res, next) => {
  const token = req.cookies?.accessToken;
  // console.log("Token:", token);
  if (!token) {
    return res.status(401).json({ error: "not authorized" });
  }

  try {
    // Try to verify access token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // If token expired, try to use refresh token
    if (err.name === "TokenExpiredError") {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ error: "no refresh token" });
      }
      // Check if refresh token exists in DB
      try {
        const result = await pool.query(
          "SELECT EXISTS (SELECT 1 FROM refresh_tokens WHERE token = $1)",
          [refreshToken]
        );
        if (!result.rows[0].exists) {
          return res.status(401).json({ error: "refresh token not found" });
        }
      } catch (dbErr) {
        return res.status(401).json({ error: "Refresh token not found in db" });
      }

      // Verify refresh token and issue new access token with fresh user data
      try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const userResult = await pool.query(
          "SELECT id, username FROM users WHERE id = $1",
          [decoded.id]
        );
        if (userResult.rows.length === 0) {
          return res.status(401).json({ error: "User not found" });
        }
        const user = userResult.rows[0];
        console.log("new access token created ");
        const newAccessToken = jwt.sign(
          { id: user.id, username: user.username },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );
        res.cookie("accessToken", newAccessToken, accessTokenOptions);
        req.user = user;
        return next();
      } catch (refreshErr) {
        // If refresh token expired, remove from DB
        if (refreshErr.name === "TokenExpiredError") {
          await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [
            refreshToken,
          ]);
          console.log("Refresh token expired, removed from DB");
          return res.status(401).json({ error: "refresh token expired" });
        }
        console.log("Invalid refresh token", refreshErr);
        return res.status(401).json({ error: "Invalid refresh token" });
      }
    }
    // Any other error
    return res.status(401).json({ error: "Invalid access token" });
  }
};

module.exports = authenticateUser