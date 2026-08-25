const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication is required." });
  try { req.userId = jwt.verify(token, process.env.JWT_SECRET).sub; next(); }
  catch { res.status(401).json({ message: "Your session has expired. Please sign in again." }); }
};
