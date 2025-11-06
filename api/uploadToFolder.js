require("dotenv").config();
const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const mongoose = require("mongoose");

const User = require("../models/userModel");
const File = require("../models/fileModel");
const Folder = require("../models/folderModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Sử dụng memoryStorage để đọc file buffer
const upload = multer({ storage: multer.memoryStorage() });

// Cấu hình AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// 📁 POST /upload-to-folder (form-data: file, [folderId])
router.post("/upload-to-folder", requireAuth, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const owner = req.user.email;
    const { folderId } = req.body;

    // Tìm user
    const user = await User.findOne({ email: owner });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Kiểm tra quota
    const newUsed = (user.storageUsed || 0) + req.file.size;
    if (newUsed > user.storageLimit)
      return res.status(400).json({ message: "Storage limit exceeded (100MB)" });

    // Nếu có folderId → kiểm tra folder
    let folder = null;
    let folderAncestors = [];
    if (folderId) {
      if (!mongoose.isValidObjectId(folderId))
        return res.status(400).json({ message: "Invalid folderId" });

      folder = await Folder.findOne({ _id: folderId, owner, trashed: { $ne: true } });
      if (!folder) return res.status(404).json({ message: "Folder not found" });
      folderAncestors = [...(folder.ancestors || []), folder._id];
    }

    // Upload lên S3
    const s3Key = `users/${owner}/${folder ? folder.name + "/" : ""}${Date.now()}_${req.file.originalname}`;
    const s3Upload = await s3
      .upload({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: "private", // hoặc "public-read" nếu cần
      })
      .promise();

    // Lưu metadata vào DB
    const savedFile = await File.create({
      filename: req.file.originalname,
      s3Url: s3Upload.Location, // URL S3
      size: req.file.size,
      mimetype: req.file.mimetype,
      owner,
      folder: folder ? folder._id : null,
      folderAncestors,
    });

    // Cập nhật dung lượng
    user.storageUsed = newUsed;
    await user.save();

    if (folder) {
      folder.storageUsed = (folder.storageUsed || 0) + req.file.size;
      await folder.save();
    }

    return res.json({
      message: folder
        ? `Upload success (in folder "${folder.name}")`
        : "Upload success (in root)",
      file: savedFile,
      folder: folder
        ? { id: folder._id, name: folder.name }
        : null,
      used: user.storageUsed,
      limit: user.storageLimit,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

module.exports = router;
