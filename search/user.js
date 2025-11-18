const express = require("express");
const Folder = require("../models/folderModel");
const File = require("../models/fileModel");
const { requireAuth } = require("../middleware/auth");
const router = express.Router();

/** 🔹 Check quyền xem item (folder/file) */
function canView(item, userEmail) {
  if (!item) return false;
  return (
    item.visibility === "public" ||
    item.owner === userEmail ||
    (Array.isArray(item.sharedWith) &&
      item.sharedWith.some((sw) => sw.userId === userEmail)  )
  );
}


router.get("/user/:username", requireAuth, async (req, res) => {
  try {
    const currentUser = req.user.email;
    const username = req.params.username;
    const folderQuery = { owner: username };
    const fileQuery = { owner: username };
    const [folders, files] = await Promise.all([
      Folder.find(folderQuery),
      File.find(fileQuery),
    ]);


    const folderMap = {};
    folders.forEach((f) => {
      if (canView(f, currentUser)) {
        folderMap[f._id] = {
          _id: f._id.toString(),
          name: f.name,
          type: "folder",
          visibility: f.visibility,
          owner: f.owner,
          parent: f.parent || null,
          sharedWith: f.sharedWith || [],
          children: [],
        };
      }
    });


    folders.forEach((f) => {
      if (f.parent && folderMap[f.parent] && folderMap[f._id]) {
        folderMap[f.parent].children.push(folderMap[f._id]);
      }
    });

    const rootFiles = [];
    files.forEach((file) => {
      if (canView(file, currentUser)) {
        const fileNode = {
          _id: file._id.toString(),
          type: "file",
          name: file.filename,
          s3Url: file.s3Url,
          visibility: file.visibility,
          mimetype: file.mimetype,
          size: file.size,
          folder: file.folder || null,
        };
        if (file.folder && folderMap[file.folder]) {
          folderMap[file.folder].children.push(fileNode);
        } else {
          rootFiles.push(fileNode);
        }
      }
    });

    const rootFolders = Object.values(folderMap).filter((f) => !f.parent);


    res.json({
      owner: username,
      viewer: currentUser,
      totalFolders: rootFolders.length,
      totalRootFiles: rootFiles.length,
      structure: [...rootFolders, ...rootFiles],
    });
  } catch (error) {
    console.error("Drive tree error:", error);
    res.status(500).json({
      message: "Failed to fetch drive tree",
      error: error.message,
    });
  }
});

module.exports = router;
