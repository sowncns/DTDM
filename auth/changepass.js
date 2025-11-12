const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();


router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const email = req.user.email; // lấy từ token

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Missing oldPassword or newPassword" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Old password is incorrect" });

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: "Change password failed", error: err.message });
  }
});

module.exports = router;
