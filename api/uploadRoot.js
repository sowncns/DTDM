const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");

const User = require("../models/userModel");
const File = require("../models/fileModel");

const router = express.Router();
const upload = multer({ dest: path.join(process.cwd(), "uploads/") });

// POST /upload-root  (form-data: file, owner=<email>)
router.post("/upload-root", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const { owner } = req.body;
    const user = await User.findOne({ email: owner });
    if (!user) {
      await fs.unlink(req.file.path);
      return res.status(404).json({ message: "User not found" });
    }

    const saved = await File.create({
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      owner: user.email,
      folder: null,
      folderAncestors: [],
    });

    user.storageUsed = (user.storageUsed || 0) + req.file.size;
    await user.save();

    res.json({
      message: "Upload success (root)",
      file: saved,
      userUsed: user.storageUsed,
    });
  } catch (err) {
    if (req.file?.path) { try { await fs.unlink(req.file.path); } catch {} }
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

module.exports = router;
