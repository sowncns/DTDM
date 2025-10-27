const express = require("express");
const mongoose = require("mongoose");
const Folder = require("../models/folderModel");
const User = require("../models/userModel");
const router = express.Router();

// POST /folders/sub  (JSON: { owner, name, parentId })
router.post("/folder/sub", async (req, res) => {
  try {
    const { owner, name, parentId } = req.body;
    if (!owner || !name?.trim() || !parentId) {
      return res
        .status(400)
        .json({ message: "owner, name, parentId are required" });
    }
    const userExists = await User.findOne({ email: owner });
    if (!userExists) {
      return res.status(404).json({ message: "Owner user not found" });
    }
    if (!mongoose.isValidObjectId(parentId)) {
      return res.status(400).json({ message: "Invalid parentId" });
    }

    const parent = await Folder.findOne({
      _id: parentId,
      owner,
      trashed: { $ne: true },
    });
    if (!parent)
      return res.status(404).json({ message: "Parent folder not found" });

    const folder = await Folder.create({
      name: name.trim(),
      owner,
      parent: parent._id,
      ancestors: [...(parent.ancestors || []), parent._id],
      storageUsed: 0,
    });

    res.json({
      message: `Subfolder "${folder.name}" created inside "${parent.name}"`,
      folder,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Folder already exists in this location" });
    }
    res
      .status(500)
      .json({ message: "Create subfolder failed", error: err.message });
  }
});

module.exports = router;
