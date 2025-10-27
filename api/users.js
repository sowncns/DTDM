const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/userModel");

// GET /api/users/login
router.post("/user/register", async (req, res) => {
  const { email, password, name } = req.body;
  const users = await User.findOne({ email });
  if (users) {
    return res.status(401).json({ message: "User already exists" });
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: hashedPassword,
      storageLimit: 100 * 1024 * 1024, // 100MB
      storageUsed: 0,
    });
    await newUser.save();
    return res.status(201).json({ message: "User registered successfully" });
  }
});

module.exports = router;
