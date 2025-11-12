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
      item.sharedWith.some((sw) => sw.userId === userEmail))
  );
}

/** 🔹 GET /api/drive/:ownerEmail/tree?kw=optional */
router.get("/:ownerEmail/tree", requireAuth, async (req, res) => {
  try {
    const currentUser = req.user.email;
    const ownerEmail = req.params.ownerEmail;
    const keyword = req.query.kw?.trim();

    // 1️⃣ Tạo query cơ bản
    const folderQuery = { owner: ownerEmail };
    const fileQuery = { owner: ownerEmail };

    // 2️⃣ Nếu có keyword → lọc theo tên
    if (keyword) {
      folderQuery.name = { $regex: keyword, $options: "i" };
      fileQuery.filename = { $regex: keyword, $options: "i" };
    }

    // 3️⃣ Lấy dữ liệu song song
    const [folders, files] = await Promise.all([
      Folder.find(folderQuery),
      File.find(fileQuery),
    ]);

    // 4️⃣ Map folder mà user được phép xem
    const folderMap = {};
    folders.forEach((f) => {
      if (canView(f, currentUser)) {
        folderMap[f._id] = {
          _id: f._id,
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

    // 5️⃣ Gắn folder con vào folder cha
    folders.forEach((f) => {
      if (f.parent && folderMap[f.parent] && folderMap[f._id]) {
        folderMap[f.parent].children.push(folderMap[f._id]);
      }
    });

    // 6️⃣ Gắn file vào folder hoặc root
    const rootFiles = [];
    files.forEach((file) => {
      if (canView(file, currentUser)) {
        const fileNode = {
          _id: file._id,
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

    // 7️⃣ Lấy folder gốc (không có parent)
    const rootFolders = Object.values(folderMap).filter((f) => !f.parent);

    // 8️⃣ Trả kết quả hợp nhất
    res.json({
      message: keyword
        ? `Search results for "${keyword}" in ${ownerEmail}'s drive`
        : `Drive of ${ownerEmail} fetched successfully`,
      owner: ownerEmail,
      viewer: currentUser,
      query: keyword || null,
      totalFolders: rootFolders.length,
      totalRootFiles: rootFiles.length,
      structure: [...rootFolders, ...rootFiles],
    });
  } catch (error) {
    console.error("❌ Drive tree error:", error);
    res.status(500).json({
      message: "Failed to fetch drive tree",
      error: error.message,
    });
  }
});

module.exports = router;
