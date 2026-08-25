const { app, connectDatabase } = require("../server");

// Vercel entry point. vercel.json rewrites every /api/* request to this
// function, while Express keeps the original /api/... path for its routes.
module.exports = async (req, res) => {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error("Database connection failed", error);
    return res.status(500).json({ message: "Database connection failed. Check MONGODB_URI and Atlas Network Access." });
  }
};
