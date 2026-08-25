const { app, connectDatabase } = require("../server");

// Vercel invokes this catch-all serverless function for every /api/* route.
module.exports = async (req, res) => {
  try {
    await connectDatabase();
    return app(req, res);
  } catch (error) {
    console.error("Database connection failed", error);
    return res.status(500).json({ message: "Database connection failed. Check the Vercel environment variables and Atlas network access list." });
  }
};
