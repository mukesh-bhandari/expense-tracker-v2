const rateLimit = require("express-rate-limit");

const limiterDefaults = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
};

const inviteVerifyLimiter = rateLimit({
  ...limiterDefaults,
  windowMs: 60 * 1000,
  limit: 20,
  message: { error: "Too many requests, please try again later" },
});

module.exports = { inviteVerifyLimiter };
