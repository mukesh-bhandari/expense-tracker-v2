const isProduction = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
};

const accessTokenOptions = {
  ...baseCookieOptions,
  maxAge: 15 * 60 * 1000,
};

const refreshTokenOptions = {
  ...baseCookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const clearCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict",
};

module.exports = { accessTokenOptions, refreshTokenOptions, clearCookieOptions };
