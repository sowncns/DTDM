const express = require("express");
const multer = require("multer");
const fs = require("fs");
const User = require("../models/userModel");
const router = express.Router();

// lưu file tạm vào /uploads
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const userId = req.body.email;
    const file = req.file; // hoặc lấy từ token
    const user = await User.findOne({ email: userId });
    if (!user) return res.status(404).json({ message: "User not found" });
    const fileSize = req.file.size; // bytes
    const newStorage = user.storageUsed + fileSize;
    if (newStorage > user.storageLimit) {
      // Xoá file nếu vượt quota
      fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ message: "Storage limit exceeded (100MB)" });
    }

    await File.create({
      filename: file.originalname,
      path: file.path,
      size: file.size,
      owner: userId,
    });
    user.storageUsed = newStorage;
    await user.save();

    res.json({
      message: "Upload success",
      used: user.storageUsed,
      limit: user.storageLimit,
    });
  } catch (err) {
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

module.exports = router;
