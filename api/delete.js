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
      const file = fileById;
      // Allow delete if requester is owner OR has sufficient share access (edit/all)
      const isOwner = String(file.owner) === String(owner);
      const sharedEntry = (file.sharedWith || []).find((p) => p.userId === owner);
      const hasEditAccess = sharedEntry && Array.isArray(sharedEntry.access) && (sharedEntry.access.includes("edit") || sharedEntry.access.includes("all"));
      if (!isOwner && !hasEditAccess) {
        return res.status(403).json({ message: "Forbidden: only owner or users with edit access can delete this file" });
      }

      // If permanent flag true => permanently delete from S3 and DB
      const permanent = Boolean(req.body?.permanent);
      if (permanent) {
        // Only owner can permanently delete
        if (!isOwner) {
          return res.status(403).json({ message: "Forbidden: only owner can permanently delete this file" });
        }
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

        try { writeActivity(`DELETE FILE id=${id} owner=${owner}`, 'PERMANENT', `size=${file.size}`); } catch(_){ }
        return res.json({ message: "File permanently deleted", type: "file", id, storageUsed: newUsed });
      }

      // Soft-delete: move to trash (mark trashed = true)
      file.trashed = true;
      file.trashedAt = new Date();
      file.trashedBy = owner;
      await file.save();

      try { writeActivity(`DELETE FILE id=${id} owner=${owner}`, 'TRASHED', `name=${file.filename}`); } catch(_){ }
      return res.json({ message: "File moved to trash", type: "file", id });
    }

    // -----------------------------------------
    // 2) NẾU KHÔNG PHẢI FILE → KIỂM TRA FOLDER
    // -----------------------------------------
    const folderById = await Folder.findById(id);
    if (!folderById) {
      return res.status(404).json({ message: "Item not found" });
    }

    // If folder exists -> check owner OR sharedWith via folder or its ancestors
    const folder = folderById;
    const isOwnerFolder = String(folder.owner) === String(owner);
    // check direct folder sharedWith
    const directShare = (folder.sharedWith || []).find((p) => p.userId === owner);
    const hasFolderEdit = directShare && Array.isArray(directShare.access) && (directShare.access.includes("edit") || directShare.access.includes("all"));

    // If not owner and no direct edit share, check ancestors for shared entries granting edit
    let ancestorHasEdit = false;
    if (!isOwnerFolder && !hasFolderEdit) {
      // load ancestors
      if (Array.isArray(folder.ancestors) && folder.ancestors.length > 0) {
        const ancestorDocs = await Folder.find({ _id: { $in: folder.ancestors } });
        for (const a of ancestorDocs) {
          const s = (a.sharedWith || []).find((p) => p.userId === owner);
          if (s && Array.isArray(s.access) && (s.access.includes("edit") || s.access.includes("all"))) {
            ancestorHasEdit = true;
            break;
          }
        }
      }
    }

    if (!isOwnerFolder && !hasFolderEdit && !ancestorHasEdit) {
      return res.status(403).json({ message: "Forbidden: only owner or users with edit access can delete this folder" });
    }

    // =========================================
    // XÓA SUB-FOLDERS + FILES RECURSIVELY
    // =========================================
    const allFolders = await Folder.find({ owner: folder.owner }).lean();
    const deleteFolders = [];

    const collectChildren = (folderId) => {
      deleteFolders.push(folderId);
      allFolders
        .filter((f) => f.parent?.toString() === folderId.toString())
        .forEach((sub) => collectChildren(sub._id.toString()));
    };

    collectChildren(id);

    // Lấy tất cả file trong các folder (for the folder owner)
    const files = await File.find({ folder: { $in: deleteFolders } });

    const permanent = Boolean(req.body?.permanent);

    if (permanent && !isOwnerFolder) {
      return res.status(403).json({ message: "Forbidden: only owner can permanently delete this folder" });
    }

    if (!permanent) {
      // Soft delete: mark folders and files as trashed
      const now = new Date();
      await Folder.updateMany({ _id: { $in: deleteFolders } }, { $set: { trashed: true, trashedAt: now, trashedBy: owner } });
      // For files: allow marking trashed regardless of file.owner because folder owner/shared allowed deletion
      await File.updateMany({ folder: { $in: deleteFolders } }, { $set: { trashed: true, trashedAt: now, trashedBy: owner } });

      try { writeActivity(`DELETE FOLDER id=${id} owner=${owner}`, 'TRASHED', `folders=${deleteFolders.length} files=${files.length}`); } catch(_){}
      return res.json({ message: "Folder moved to trash (recursive)", type: "folder", id, trashedFolders: deleteFolders.length, trashedFiles: files.length });
    }

    // permanent delete: only allowed for ownerFolder, remove from S3 and DB
    const s3Objects = files.filter((f) => f.s3Url).map((f) => ({ Key: f.s3Url.split(".com/")[1] }));
    if (s3Objects.length > 0) {
      await s3.deleteObjects({ Bucket: process.env.AWS_S3_BUCKET_NAME, Delete: { Objects: s3Objects } }).promise();
    }

    // Delete DB permanently
    await File.deleteMany({ folder: { $in: deleteFolders } });
    await Folder.deleteMany({ _id: { $in: deleteFolders } });
    try { writeActivity(`DELETE FOLDER id=${id} owner=${owner}`, 'PERMANENT', `folders=${deleteFolders.length} files=${files.length}`); } catch(_){ }

    // ⬅️ Update storageUsed for the folder owner
    const newUsed = await calculateUsedStorage(folder.owner);
    await User.updateOne({ email: folder.owner }, { storageUsed: newUsed });

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
