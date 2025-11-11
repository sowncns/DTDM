const express = require("express");
const File = require("../models/fileModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// 📤 Cập nhật quyền truy cập file
router.post("/files/:id", requireAuth, async (req, res) => {
  try {
    const { mode,emails,fileId } = req.body; // mode: "public" | "private" | "shared"
    const userEmail = req.user.email;

    const file = await File.findOne({ _id: fileId });
    
    if (!file) return res.status(404).json({ message: "File not found" });

    // chỉ owner được thay đổi quyền
    if (file.owner !== userEmail) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!["private", "shared", "public"].includes(mode)) {
      return res.status(400).json({ message: "Invalid mode" });
    }

    file.visibility = mode;
    if (mode === "shared" && Array.isArray(emails)) {
      file.sharedWith = emails;
    } else {
      file.sharedWith = [];
    }
    await file.save();

    res.json({ message: "File visibility updated", file });
  } catch (error) {
    res.status(500).json({ message: "Failed to update visibility", error: error.message });
  }
});

module.exports = router;
