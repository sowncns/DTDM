const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const File = require("../models/fileModel");
const Folder = require("../models/folderModel");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();


// 🧱 API 1️⃣: Lấy toàn bộ cây thư mục của user
router.get("/folder/tree", requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const user = await User.findOne({ email: owner });
    if (!user) return res.status(404).json({ message: "User not found" });

    const [folders, files] = await Promise.all([
      Folder.find({ owner }),
      File.find({ owner }),
    ]);

    // Tạo map folder
    const folderMap = {};
    folders.forEach((f) => {
      folderMap[f._id] = { ...f._doc, type: "folder", children: [] };
    });

    // Gắn folder con vào parent
    folders.forEach((f) => {
      if (f.parent && folderMap[f.parent]) {
        folderMap[f.parent].children.push(folderMap[f._id]);
      }
    });

    // Gắn file vào folder
    files.forEach((file) => {
      if (file.folder && folderMap[file.folder]) {
        folderMap[file.folder].children.push({
          type: "file",
          name: file.filename,
          s3Url: file.s3Url,
          size: file.size,
          mimetype: file.mimetype,
        });
      }
    });

    // Folder ở root
    const rootFolders = Object.values(folderMap).filter((f) => !f.parent);

    // File ở root
    const rootFiles = files
      .filter((f) => !f.folder)
      .map((f) => ({
        type: "file",
        name: f.filename,
        s3Url: f.s3Url,
        size: f.size,
        mimetype: f.mimetype,
      }));

    res.json([...rootFolders, ...rootFiles]);
  } catch (err) {
    res.status(500).json({ message: "Failed to build tree", error: err.message });
  }
});


// 🧱 API 2️⃣: Lấy nội dung 1 folder cụ thể
router.get("/folder/tree/:folderId", requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const { folderId } = req.params;

    if (!mongoose.isValidObjectId(folderId)) {
      return res.status(400).json({ message: "Invalid folderId" });
    }

    const folder = await Folder.findOne({ _id: folderId, owner });
    if (!folder) {
      return res.status(404).json({ message: "Folder not found or no permission" });
    }

    // Lấy folder con + file trong folder
    const [subFolders, subFiles] = await Promise.all([
      Folder.find({ parent: folderId, owner }),
      File.find({ folder: folderId, owner }),
    ]);

    const contents = [
      ...subFolders.map((f) => ({
        _id: f._id,
        type: "folder",
        name: f.name,
        s3Url:f.s3Url,
        createdAt: f.createdAt,
      })),
      ...subFiles.map((f) => ({
        _id: f._id,
        type: "file",
        name: f.filename,
        size: f.size,
        s3Url:f.s3Url,
        mimetype: f.mimetype,
        uploadedAt: f.createdAt,
      })),
    ];

    res.json({
      message: "Folder content fetched successfully",
      folder: folder.name,
      totalItems: contents.length,
      contents,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
