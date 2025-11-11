const express = require("express");
const Folder = require("../models/folderModel");
const { requireAuth } = require("../middleware/auth");
const mongoose = require("mongoose");
const router = express.Router();

// 📤 Cập nhật quyền truy cập file
router.post("/folders", requireAuth, async (req, res) => {
  try {
    const { mode,emails } = req.body; // mode: "public" | "private" | "shared"
    const{ folderId }= req.body;
    const userEmail = req.user.email;

    if(!mongoose.isValidObjectId(folderId)){
      return res.status(400).json({ message: "Invalid folderId" });
    }

    const folder = await Folder.findById(folderId);

    if (!folder) return res.status(404).json({ message: "Folder not found" });

    // chỉ owner được thay đổi quyền
    if (folder.owner !== userEmail) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!["private", "shared", "public"].includes(mode)) {
      return res.status(400).json({ message: "Invalid mode" });
    }

    folder.visibility = mode;
    if (mode === "shared" && Array.isArray(emails)) {
      folder.sharedWith = emails;
    } else {
      folder.sharedWith = [];
    }
    await folder.save();

    res.json({ message: "Folder visibility updated", folder });
  } catch (error) {
    res.status(500).json({ message: "Failed to update visibility", error: error.message });
  }
});

module.exports = router;
