const express = require("express");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");

const User = require("../models/userModel");
const File = require("../models/fileModel");
const Folder = require("../models/folderModel");

const router = express.Router();
const upload = multer({ dest: path.join(process.cwd(), "uploads") });

// POST /upload-to-folder  (form-data: file, owner=<email>, folderId=<ObjectId>)
router.post("/upload-to-folder", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  try {
    const { owner, folderId } = req.body;
    if (!owner || !folderId) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: "owner and folderId are required" });
    }

    if (!mongoose.isValidObjectId(folderId)) {
      await fs.unlink(req.file.path);
      return res.status(400).json({ message: "Invalid folderId" });
    }

    const [user, folder] = await Promise.all([
      User.findOne({ email: owner }),
      Folder.findOne({ _id: folderId, owner, trashed: { $ne: true } }),
    ]);
    if (!user || !folder) {
      await fs.unlink(req.file.path);
      return res.status(404).json({ message: "User or folder not found" });
    }

    const saved = await File.create({
      filename: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
      owner: user.email,
      folder: folder._id,
      folderAncestors: [...(folder.ancestors || []), folder._id],
    });

    user.storageUsed = (user.storageUsed || 0) + req.file.size;
    folder.storageUsed = (folder.storageUsed || 0) + req.file.size;
    await Promise.all([user.save(), folder.save()]);

    res.json({
      message: `Upload success (in folder "${folder.name}")`,
      file: saved,
      folder: { id: folder._id, name: folder.name },
      userUsed: user.storageUsed,
      folderUsed: folder.storageUsed,
    });
  } catch (err) {
    if (req.file?.path) { try { await fs.unlink(req.file.path); } catch {} }
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
});

module.exports = router;
