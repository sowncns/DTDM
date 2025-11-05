require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid token" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user || !user.refreshToken) {
      return res.status(401).json({ message: "User logged out or invalid" });
    }

    req.user = { id: user._id, email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized", error: err.message });
  }
}


function permit(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthenticated" });

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }

    next();
  };
}

function ownerOrAdmin(getOwnerEmail) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthenticated" });

    const isAdmin = req.user.role === "admin";
    const isOwner = getOwnerEmail(req) === req.user.email;

    if (isAdmin || isOwner) return next();
    return res.status(403).json({ message: "Forbidden: not owner" });
  };
}

module.exports = { requireAuth, permit, ownerOrAdmin };
