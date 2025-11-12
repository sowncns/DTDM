const express = require("express");
const mongoose = require("mongoose");
const Folder = require("../models/folderModel");
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// 📁 POST /folder/create  (JSON: { name, parentId? })
router.post("/create", requireAuth, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const owner = req.user.email;

    // Kiểm tra tên folder
    if (!name?.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    // Kiểm tra user
    const user = await User.findOne({ email: owner });
    if (!user) return res.status(404).json({ message: "User not found" });

    let parent = null;
    let ancestors = [];

    // 🟢 Nếu có parentId → tạo subfolder
    if (parentId) {
      if (!mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }

      parent = await Folder.findOne({ _id: parentId, owner, trashed: { $ne: true } });
      if (!parent)
        return res.status(404).json({ message: "Parent folder not found" });

      ancestors = [...(parent.ancestors || []), parent._id];

      // Kiểm tra trùng tên trong cùng folder cha
      const exists = await Folder.findOne({ name: name.trim(), owner, parent: parent._id });
      if (exists)
        return res.status(400).json({ message: "Folder already exists in this location" });
    } 
    // 🟢 Nếu không có parentId → tạo folder ở root
    else {
      const existsRoot = await Folder.findOne({ name: name.trim(), owner, parent: null });
      if (existsRoot)
        return res.status(400).json({ message: "Folder already exists in root" });
    }

    // 🧱 Tạo folder mới
    const folder = await Folder.create({
      name: name.trim(),
      owner,
      parent: parent ? parent._id : null,
      ancestors,
      storageUsed: 0,
    });

    res.json({
      message: parent
        ? `Subfolder "${folder.name}" created inside "${parent.name}"`
        : `Root folder "${folder.name}" created successfully`,
      folder,
    });
  } catch (err) {
    console.error("Create folder error:", err);
    res.status(500).json({ message: "Create folder failed", error: err.message });
  }
});

module.exports = router;
