const express = require("express");
const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const Folder = require("../models/folderModel");
const File = require("../models/fileModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// ⚙️ Cấu hình AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// 🗑 POST /delete → xóa folder hoặc file
router.post("/delete", requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const { folderId, fileId } = req.body;

    // 🧩 1️⃣ Xóa 1 file cụ thể
    if (fileId) {
      if (!mongoose.isValidObjectId(fileId))
        return res.status(400).json({ message: "Invalid fileId" });

      const file = await File.findOne({ _id: fileId, owner });
      if (!file) return res.status(404).json({ message: "File not found" });

      // Xóa file trên AWS S3
      if (file.s3Url) {
        const key = file.s3Url.split(".com/")[1];
        await s3.deleteObject({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        }).promise();
      }

      await file.deleteOne();
      return res.json({
        message: `File "${file.filename}" deleted successfully`,
        fileId,
      });
    }

    // 🧩 2️⃣ Xóa folder (và tất cả file + folder con)
    if (folderId) {
      if (!mongoose.isValidObjectId(folderId))
        return res.status(400).json({ message: "Invalid folderId" });

      const rootFolder = await Folder.findOne({ _id: folderId, owner });
      if (!rootFolder)
        return res.status(404).json({ message: "Folder not found" });

      // Tìm toàn bộ folder con đệ quy
      const allFolders = await Folder.find({ owner }).lean();
      const deleteFolders = [];

      const collectChildren = (id) => {
        deleteFolders.push(id);
        allFolders
          .filter((f) => f.parent?.toString() === id.toString())
          .forEach((f) => collectChildren(f._id));
      };
      collectChildren(rootFolder._id);

      // Tìm file trong các folder đó
      const files = await File.find({ owner, folder: { $in: deleteFolders } });

      // Xóa file trên S3
      const s3Objects = files
        .filter((f) => f.s3Url)
        .map((f) => ({ Key: f.s3Url.split(".com/")[1] }));

      if (s3Objects.length > 0) {
        await s3.deleteObjects({
          Bucket: process.env.AWS_BUCKET_NAME,
          Delete: { Objects: s3Objects },
        }).promise();
      }

      // Xóa DB
      await File.deleteMany({ owner, folder: { $in: deleteFolders } });
      await Folder.deleteMany({ _id: { $in: deleteFolders } });

      return res.json({
        message: `Folder "${rootFolder.name}" and all subfolders/files deleted successfully`,
        deletedFolders: deleteFolders.length,
        deletedFiles: files.length,
      });
    }

    // 🧩 3️⃣ Không có tham số hợp lệ
    return res.status(400).json({
      message: "Please provide folderId or fileId",
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;
