const express = require("express");
const mongoose = require("mongoose");
const AWS = require("aws-sdk");
const Folder = require("../models/folderModel");
const File = require("../models/fileModel");
const User = require("../models/userModel");
const { requireAuth } = require("../middleware/auth");
const { writeActivity } = require("../log");

const router = express.Router();


const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
async function calculateUsedStorage(email) {
  // Count bytes only for non-trashed files
  const files = await File.find({ owner: email, trashed: { $ne: true } });
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
    // First fetch by id (without owner) to detect whether the item exists but belongs to someone else.
    const fileById = await File.findById(id);

    if (fileById) {
      // If file exists but owner mismatch -> forbidden
      if (String(fileById.owner) !== String(owner)) {
        return res.status(403).json({ message: "Forbidden: only owner can delete this file" });
      }
      const file = fileById;

      // If permanent flag true => permanently delete from S3 and DB
      const permanent = Boolean(req.body?.permanent);
      if (permanent) {
        if (file.s3Url) {
          const key = file.s3Url.split(".com/")[1];
          await s3.deleteObject({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: key,
          }).promise();
        }

        await file.deleteOne();

        // Recalculate storage used (exclude deleted file)
        const newUsed = await calculateUsedStorage(owner);
        await User.updateOne({ email: owner }, { storageUsed: newUsed });

        try { writeActivity(`DELETE FILE id=${id} owner=${owner}`, 'PERMANENT', `size=${file.size}`); } catch(_){}
        return res.json({ message: "File permanently deleted", type: "file", id, storageUsed: newUsed });
      }

      // Soft-delete: move to trash (mark trashed = true)
      file.trashed = true;
      file.trashedAt = new Date();
      file.trashedBy = owner;
      await file.save();

      try { writeActivity(`DELETE FILE id=${id} owner=${owner}`, 'TRASHED', `name=${file.filename}`); } catch(_){}
      return res.json({ message: "File moved to trash", type: "file", id });
    }

    // -----------------------------------------
    // 2) NẾU KHÔNG PHẢI FILE → KIỂM TRA FOLDER
    // -----------------------------------------
    const folderById = await Folder.findById(id);
    if (!folderById) {
      return res.status(404).json({ message: "Item not found" });
    }

    // If folder exists but requester isn't the owner -> forbidden
    if (String(folderById.owner) !== String(owner)) {
      return res.status(403).json({ message: "Forbidden: only owner can delete this folder" });
    }

    const folder = folderById;

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

    const permanent = Boolean(req.body?.permanent);

    if (!permanent) {
      // Soft delete: mark folders and files as trashed
      const now = new Date();
      await Folder.updateMany({ _id: { $in: deleteFolders } }, { $set: { trashed: true, trashedAt: now, trashedBy: owner } });
      await File.updateMany({ owner, folder: { $in: deleteFolders } }, { $set: { trashed: true, trashedAt: now, trashedBy: owner } });

      try { writeActivity(`DELETE FOLDER id=${id} owner=${owner}`, 'TRASHED', `folders=${deleteFolders.length} files=${files.length}`); } catch(_){}
      return res.json({ message: "Folder moved to trash (recursive)", type: "folder", id, trashedFolders: deleteFolders.length, trashedFiles: files.length });
    }

    // permanent delete: remove from S3 and DB
    const s3Objects = files.filter((f) => f.s3Url).map((f) => ({ Key: f.s3Url.split(".com/")[1] }));
    if (s3Objects.length > 0) {
      await s3.deleteObjects({ Bucket: process.env.AWS_S3_BUCKET_NAME, Delete: { Objects: s3Objects } }).promise();
    }

    // Xóa DB permanently
    await File.deleteMany({ owner, folder: { $in: deleteFolders } });
    await Folder.deleteMany({ _id: { $in: deleteFolders } });
    try { writeActivity(`DELETE FOLDER id=${id} owner=${owner}`, 'PERMANENT', `folders=${deleteFolders.length} files=${files.length}`); } catch(_){}

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
    try { writeActivity(`DELETE ITEM`, 'FAILED', err.message); } catch(_){}
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

module.exports = router;
