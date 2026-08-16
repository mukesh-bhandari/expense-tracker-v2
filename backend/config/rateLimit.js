const rateLimit = require("express-rate-limit");

const limiterDefaults = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
};

const tooManyMessage = { error: "Too many requests, please try again later" };

// Invite link verification: 20/min per IP (prevents invite probing)
const inviteVerifyLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 1000,
  limit: 20,
  message: tooManyMessage,
});

// send-code: per-IP cap (anti email-bombing with rotating addresses)
const sendCodeIpLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 1000,
  limit: 10,
  message: tooManyMessage,
});

// send-code: per-email cap (5/min per email as specified in the review)
const sendCodeEmailLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (req) => {
    const email = req.body?.email;
    return typeof email === "string" ? email.trim().toLowerCase() : req.ip;
  },
  message: tooManyMessage,
});

// login: 5/min per IP (brute-force protection)
const loginLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 1000,
  limit: 5,
  message: tooManyMessage,
});

// Global baseline for all /api routes: 100/min per IP
const globalLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 1000,
  limit: 100,
  message: tooManyMessage,
});

module.exports = {
  inviteVerifyLimiter,
  sendCodeIpLimiter,
  sendCodeEmailLimiter,
  loginLimiter,
  globalLimiter,
};
