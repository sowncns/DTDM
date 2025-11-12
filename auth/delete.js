const express = require("express");
const User = require("../models/userModel");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");

router.post("/delete" ,requireAuth ,async (req, res) => {
  try {
    const userId = req.body.userId;
    console.log("Delete request for user:", req.user);
    // Chỉ admin hoặc chính chủ mới được xóa
    if (req.user.role !== "admin" && req.user.email !== userId) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const userDe = await User.findOne({ email: userId });
    if (!userDe) {
      return res.status(404).json({ message: "User not found" });
    }
    await User.deleteOne({ email: userId });
    res.json({ message: `User ${userDe.email} deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;