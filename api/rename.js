
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const File = require("../models/fileModel");
const Folder = require("../models/folderModel");
const { requireAuth } = require("../middleware/auth");

router.post("/rename", requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const { id, newName } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!newName || newName.trim() === "") {
      return res.status(400).json({ message: "New name required" });
    }

    // Try rename file
    const file = await File.findOne({ _id: id, owner });
    if (file) {
      file.filename = newName;
      await file.save();
      return res.json({ message: "File renamed", id, newName });
    }

    // Try rename folder
    const folder = await Folder.findOne({ _id: id, owner });
    if (folder) {
      folder.name = newName;
      await folder.save();
      return res.json({ message: "Folder renamed", id, newName });
    }

    return res.status(404).json({ message: "Item not found" });

  } catch (err) {
    res.status(500).json({
      message: "Rename failed",
      error: err.message,
    });
  }
});
module.exports = router;
