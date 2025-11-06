const express = require("express");
const jwt = require("jsonwebtoken");
const User = require(".././models/userModel");

const router = express.Router();

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_EXPIRES || "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.REFRESH_EXPIRES || "7d" }
  );
}

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "Missing refresh token" });

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.sub });

    if (!user || user.refreshToken !== refreshToken)
      return res.status(403).json({ message: "Invalid refresh token" });

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      message: "Token refreshed",
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    res.status(403).json({ message: "Invalid or expired refresh token" });
  }
});

module.exports = router;
