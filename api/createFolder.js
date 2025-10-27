const express = require("express");
const mongoose = require("mongoose");
const Folder = require("../models/folderModel");
const User = require("../models/userModel");
const router = express.Router();

// POST /folders  (JSON: { owner, name, [parentId] })
router.post("/folder", async (req, res) => {
  try {
    const { owner, name, parentId } = req.body;
    if (!owner || !name?.trim()) {
      return res.status(400).json({ message: "owner and name are required" });
    }

    let parent = null;
    let ancestors = [];
    // const folder = await Folder.findOne({ owner });
    //     if (!folder) {
        
    //       return res.status(404).json({ message: "owner not found" });
    //     }
    const userExists = await User.findOne({ email: owner }); 
        if (!userExists) {
            return res.status(404).json({ message: "Owner user not found" });
        }
    if (parentId) {
      if (!mongoose.isValidObjectId(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }
      parent = await Folder.findOne({
        _id: parentId,
        owner,
        trashed: { $ne: true },
      });
      if (!parent)
        return res.status(404).json({ message: "Parent folder not found" });
      ancestors = [...(parent.ancestors || []), parent._id];
    }
    const folder = await Folder.create({
      name: name.trim(),
      owner,
      parent: parent ? parent._id : null,
      ancestors,
      storageUsed: 0,
    });
    res.json({ message: "Folder created", folder });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "Folder already exists in this location", error: err.message });
    }
    res
      .status(500)
      .json({ message: "Create folder failed", error: err.message });
  }
});

module.exports = router;
