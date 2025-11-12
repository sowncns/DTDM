const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require(".././models/userModel");

const router = express.Router();

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_EXPIRES || "60m" }
  );
}
function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES || "7d" }
  );
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({ message: "Logged in", accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

module.exports = router;
