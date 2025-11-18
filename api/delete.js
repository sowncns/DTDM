const express = require("express");
const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const Folder = require("../models/folderModel");
const File = require("../models/fileModel");
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();


const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
async function calculateUsedStorage(email) {
  const files = await File.find({ owner: email });
  return files.reduce((sum, f) => sum + (f.size || 0), 0);
}

router.post("/delete", requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const { id } = req.body;

    if (!id) return res.status(400).json({ message: "id is required" });
    if (!mongoose.isValidObjectId(id))
      return res.status(400).json({ message: "Invalid id" });

    // -----------------------------------------
    // 1) KIỂM TRA ID CÓ PHẢI LÀ FILE
    // -----------------------------------------
    const file = await File.findOne({ _id: id, owner });

    if (file) {

      // XÓA TRÊN S3
      if (file.s3Url) {
        const key = file.s3Url.split(".com/")[1];
        await s3.deleteObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
        }).promise();
      }

      // XÓA FILE TRONG DB
      await file.deleteOne();

      // ⬅️ Cập nhật lại storageUsed
      const newUsed = await calculateUsedStorage(owner);
      await User.updateOne({ email: owner }, { storageUsed: newUsed });

      return res.json({
        message: "File deleted successfully",
        type: "file",
        id,
        storageUsed: newUsed
      });
    }

    // -----------------------------------------
    // 2) NẾU KHÔNG PHẢI FILE → KIỂM TRA FOLDER
    // -----------------------------------------
    const folder = await Folder.findOne({ _id: id, owner });
    if (!folder) {
      return res.status(404).json({ message: "Item not found" });
    }

    // =========================================
    // XÓA SUB-FOLDERS + FILES RECURSIVELY
    // =========================================
    const allFolders = await Folder.find({ owner }).lean();
    const deleteFolders = [];

    const collectChildren = (folderId) => {
      deleteFolders.push(folderId);
      allFolders
        .filter((f) => f.parent?.toString() === folderId.toString())
        .forEach((sub) => collectChildren(sub._id.toString()));
    };

    collectChildren(id);

    // Lấy tất cả file trong các folder
    const files = await File.find({
      owner,
      folder: { $in: deleteFolders },
    });

    // Xóa file trên S3
    const s3Objects = files
      .filter((f) => f.s3Url)
      .map((f) => ({ Key: f.s3Url.split(".com/")[1] }));

    if (s3Objects.length > 0) {
      await s3.deleteObjects({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Delete: { Objects: s3Objects },
      }).promise();
    }

    // Xóa DB
    await File.deleteMany({ owner, folder: { $in: deleteFolders } });
    await Folder.deleteMany({ _id: { $in: deleteFolders } });

    // ⬅️ Cập nhật lại storageUsed
    const newUsed = await calculateUsedStorage(owner);
    await User.updateOne({ email: owner }, { storageUsed: newUsed });

    return res.json({
      message: "Folder and its contents deleted",
      type: "folder",
      deletedFolders: deleteFolders.length,
      deletedFiles: files.length,
      storageUsed: newUsed
    });

  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;
