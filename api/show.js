const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const File = require("../models/fileModel");
const Folder = require("../models/folderModel");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();


router.get("/tree", requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const user = await User.findOne({ email: owner });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Exclude trashed items (only show active content)
    const [folders, files] = await Promise.all([
      Folder.find({ owner, trashed: { $ne: true } }),
      File.find({ owner, trashed: { $ne: true } }),
    ]);

    // Tạo map folder
    const folderMap = {};
    folders.forEach((f) => {
      folderMap[f._id] = {
        id: f._id.toString(),
        name: f.name,
        type: "folder",
        parent: f.parent,
        visibility:f.visibility,
        children: [],
        shareWith:f.sharedWith
      };
    });

    // Gắn folder con vào parent
    folders.forEach((f) => {
      if (f.parent && folderMap[f.parent]) {
        folderMap[f.parent].children.push(folderMap[f._id]);
      }
    });


    files.forEach((file) => {
      if (file.folder && folderMap[file.folder]) {
        folderMap[file.folder].children.push({
          id: file._id.toString(),
          type: "file",
          name: file.filename,
          s3Url: file.s3Url,
          size: file.size,
          visibility: file.visibility,
          shareWith: file.sharedWith
        });
      }
    });

    // Folder ở root
    const rootFolders = Object.values(folderMap).filter((f) => !f.parent);

    // File ở root
    const rootFiles = files
      .filter((f) => !f.folder)
      .map((f) => ({
        id: f._id.toString(),
        type: "file",
        name: f.filename,
        s3Url: f.s3Url,
        size: f.size,
        visibility: f.visibility,
        shareWith: f.sharedWith

      }));

    res.json([...rootFolders, ...rootFiles]);
  } catch (err) {
    res.status(500).json({ message: "Failed to build tree", error: err.message });
  }
});

router.get("/tree/:folderId", requireAuth, async (req, res) => {
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
      Folder.find({ parent: folderId, owner, trashed: { $ne: true } }),
      File.find({ folder: folderId, owner, trashed: { $ne: true } }),
    ]);

    const contents = [
      ...subFolders.map((f) => ({
        id: f._id.toString(),
        type: "folder",
        name: f.name,
        s3Url: f.s3Url,
        visibility: f.visibility,
        shareWith: f.sharedWith
      })),
      ...subFiles.map((f) => ({
        id: f._id.toString(),
        type: "file",
        name: f.filename,
        size: f.size,
        s3Url: f.s3Url,
        visibility: f.visibility,
        shareWith: f.sharedWith

      })),
    ];

    res.json(contents);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
