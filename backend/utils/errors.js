const isProduction = process.env.NODE_ENV === "production";

function serverError(res, error, fallback = "Server error") {
  console.error(error);
  res.status(500).json({ error: isProduction ? fallback : error.message || fallback });
}

module.exports = { serverError };
