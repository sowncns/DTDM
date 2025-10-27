const express = require("express");
const User = require("../models/userModel");
const File = require("../models/fileModel");
const Folder = require("../models/folderModel");
const router = express.Router();
router.get("/show-tree/:owner", async (req, res) => {
  try {
    const owner = req.params.owner;
    const userExists = await User.findOne({ email: owner });
    if (!userExists) {
      return res.status(404).json({ message: "Owner user not found" });
    }
    const folders = await Folder.find({ owner });
    const files = await File.find({ owner });

    // map nhanh để truy cập theo parentId
    const map = {};
    folders.forEach(
      (f) => (map[f._id] = { ...f._doc, type: "folder", children: [] })
    );

    // gắn folder con
    folders.forEach((f) => {
      if (f.parent) map[f.parent]?.children.push(map[f._id]);
    });

    // gắn file vào folder tương ứng
    files.forEach((file) => {
      if (file.folder && map[file.folder]) {
        map[file.folder].children.push({
          type: "file",
          name: file.filename,
          size: file.size,
          mimetype: file.mimetype,
        });
      }
    });

    // chỉ lấy folder ở root (parent = null)
    const tree = Object.values(map).filter((f) => f.parent === null);

    // thêm file ở root
    const rootFiles = files
      .filter((f) => !f.folder)
      .map((f) => ({
        type: "file",
        name: f.filename,
        size: f.size,
        mimetype: f.mimetype,
      }));
    tree.push(...rootFiles);

    res.json(tree);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to build tree", error: err.message });
  }
});
router.get("/show-tree/:owner/:folderId", (req, res) => {
  const { owner, folderId } = req.params;
  // Logic to show the tree for a specific folder
});
module.exports = router;
