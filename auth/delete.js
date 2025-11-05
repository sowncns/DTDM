const express = require("express");
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// 🧨 Xóa user theo ID (chỉ chính chủ hoặc admin)
router.delete("/delete/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    // Chỉ admin hoặc chính chủ mới được xóa
    if (req.user.role !== "admin" && req.user.email !== userId) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const user = await User.findOneAndDelete({ email: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: `User ${user.email} deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;