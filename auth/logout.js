const express = require("express");
const jwt = require("jsonwebtoken");
const User = require(".././models/userModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/logout",async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "Missing refresh token" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.sub });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.refreshToken) {
      return res.status(400).json({ message: "Already logged out" });
    }
    user.refreshToken = null;
    await user.save();

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed", error: err.message });
  }
});

module.exports = router;
