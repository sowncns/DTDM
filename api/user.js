// controllers/userController.js
const express = require("express");
const router = express.Router();
const User = require("../models/userModel");
const File = require("../models/fileModel");
const { requireAuth } = require("../middleware/auth");

router.get("/user", requireAuth, async (req, res) => {
  try {
    // Lấy user hiện tại từ middleware requireAuth
    const userEmail = req.user.email;

    // Tìm user trong database
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Tính tổng dung lượng đã dùng (tổng size các file của user)
    const files = await File.find({ owner: userEmail });
    const usedStorage = files.reduce((sum, file) => sum + (file.size || 0), 0);

    // Nếu user chưa có quota, gán mặc định 5GB

    return res.status(200).json({
      email: user.email,
      storageLimit: user.storageLimit,
      storageUsed: user.storageUsed,
      role: user.role,
      plan: user.plan,
      name: user.name,
      planStorage: user.planStorage,
      planExpire: user.planExpire,
      lastUpgrade: user.lastUpgrade

    });
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
module.exports = router;