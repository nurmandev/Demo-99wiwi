require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const validateJWT = async (req, res, next) => {
  try {
    const token = req.header("x-auth-token");
    if (!token) return res.status(401).json({ error: "No token provided" });

    if (!process.env.JWT_SECRET) {
      console.error("Missing JWT_SECRET!");
      return res.status(500).json({ error: "Server config error" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const dbUser = await User.findById(decoded.id);
    if (!dbUser) return res.status(401).json({ error: "User not found" });

    req.authToken = token;
    req.user = dbUser;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

const allowAdminsOnly = async (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ error: "Authentication required" });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (user.rank >= 5) return next();
  return res.status(403).json({ error: "Insufficient permissions" });
};

// ✅ Ensure correct export
module.exports = { validateJWT, allowAdminsOnly };
