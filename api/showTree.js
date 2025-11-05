const express = require("express");
const router = express.Router();
const Folder = require("../models/folderModel");
const { requireAuth } = require("../middleware/auth");        


router.get("/folders/tree", requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;

    const folders = await Folder.find({ owner, trashed: { $ne: true } }).lean();
    const map = {};

    // Gắn folder vào map
    folders.forEach(f => map[f._id] = { ...f, children: [] });

    // Gắn con vào cha
    folders.forEach(f => {
      if (f.parent && map[f.parent]) {
        map[f.parent].children.push(map[f._id]);
      }
    });

    // Lấy folder ở ROOT
    const tree = Object.values(map).filter(f => !f.parent);

    res.json({ message: "Folder tree fetched", tree });
  } catch (err) {
    res.status(500).json({ message: "Get folder tree failed", error: err.message });
  }
});
module.exports = router;