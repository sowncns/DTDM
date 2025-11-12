const express = require("express");
const bcrypt = require("bcrypt");
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

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashed,
      storageLimit: 100 * 1024 * 1024,
      storageUsed: 0,
    });

    const token = signAccessToken(newUser);
    res.status(201).json({
      message: "Registered successfully",
      user: { id: newUser._id, email: newUser.email },
      
    });
  } catch (err) {
    res.status(500).json({ message: "Register failed", error: err.message });
  }
});

module.exports = router;
