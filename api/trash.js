const express = require('express');
const mongoose = require('mongoose');
const AWS = require('aws-sdk');
const Folder = require('../models/folderModel');
const File = require('../models/fileModel');
const User = require('../models/userModel');
const { requireAuth } = require('../middleware/auth');
const { writeActivity } = require('../log');

const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

async function calculateUsedStorage(email) {
  // Exclude trashed files
  const files = await File.find({ owner: email, trashed: { $ne: true } });
  return files.reduce((sum, f) => sum + (f.size || 0), 0);
}

// GET /trash - list trashed items for authenticated user
router.get('/trash', requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const [folders, files] = await Promise.all([
      Folder.find({ owner, trashed: true }),
      File.find({ owner, trashed: true }),
    ]);
    res.json({ folders, files });
  } catch (err) {
    console.error('List trash error:', err);
    res.status(500).json({ message: 'Failed to list trash', error: err.message });
  }
});

// POST /trash/restore - restore file or folder from trash
router.post('/trash/restore', requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const { id } = req.body;
    if (!id) return res.status(400).json({ message: 'id is required' });
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    // Try file
    const file = await File.findById(id);
    if (file) {
      if (String(file.owner) !== String(owner)) return res.status(403).json({ message: 'Forbidden' });
      if (!file.trashed) return res.status(400).json({ message: 'File is not in trash' });
      file.trashed = false;
      file.trashedAt = null;
      file.trashedBy = null;
      await file.save();
      try { writeActivity(`RESTORE FILE id=${id} owner=${owner}`, 'OK'); } catch(_){}
      return res.json({ message: 'File restored', id });
    }

    // Try folder restore recursively
    const folder = await Folder.findById(id);
    if (!folder) return res.status(404).json({ message: 'Item not found' });
    if (String(folder.owner) !== String(owner)) return res.status(403).json({ message: 'Forbidden' });
    if (!folder.trashed) return res.status(400).json({ message: 'Folder is not in trash' });

    const allFolders = await Folder.find({ owner }).lean();
    const restoreFolders = [];
    const collectChildren = (fid) => {
      restoreFolders.push(fid);
      allFolders.filter((f) => f.parent?.toString() === fid.toString()).forEach((c) => collectChildren(c._id.toString()));
    };
    collectChildren(id);

    await Folder.updateMany({ _id: { $in: restoreFolders } }, { $set: { trashed: false, trashedAt: null, trashedBy: null } });
    await File.updateMany({ owner, folder: { $in: restoreFolders } }, { $set: { trashed: false, trashedAt: null, trashedBy: null } });

    try { writeActivity(`RESTORE FOLDER id=${id} owner=${owner}`, 'OK', `restoredFolders=${restoreFolders.length}`); } catch(_){}
    return res.json({ message: 'Folder restored (recursive)', restoredFolders: restoreFolders.length });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ message: 'Restore failed', error: err.message });
  }
});

router.post('/trash/empty', requireAuth, async (req, res) => {
  try {
    const owner = req.user.email;
    const { id } = req.body;

    // helper to remove S3 objects and delete DB entries for folderIds
    const removeFilesAndFolders = async (folderIds) => {
      const files = await File.find({ owner, folder: { $in: folderIds }, trashed: true }).lean();
      const s3Objects = files.filter((f) => f.s3Url).map((f) => ({ Key: f.s3Url.split('.com/')[1] }));
      if (s3Objects.length) {
        await s3.deleteObjects({ Bucket: process.env.AWS_S3_BUCKET_NAME, Delete: { Objects: s3Objects } }).promise();
      }

      const fileRes = await File.deleteMany({ owner, folder: { $in: folderIds }, trashed: true });
      const folderRes = await Folder.deleteMany({ _id: { $in: folderIds }, trashed: true });
      return { deletedFiles: fileRes.deletedCount || 0, deletedFolders: folderRes.deletedCount || 0, bytesFreed: files.reduce((s, f) => s + (f.size || 0), 0) };
    };

    if (id) {
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

      const file = await File.findById(id);
      if (file) {
        if (String(file.owner) !== String(owner)) return res.status(403).json({ message: 'Forbidden' });
        if (!file.trashed) return res.status(400).json({ message: 'File is not in trash' });

        // delete from S3 if exists
        if (file.s3Url) {
          const Key = file.s3Url.split('.com/')[1];
          await s3.deleteObject({ Bucket: process.env.AWS_S3_BUCKET_NAME, Key }).promise();
        }

        await file.deleteOne();
        const newUsed = await calculateUsedStorage(owner);
        await User.updateOne({ email: owner }, { storageUsed: newUsed });
        try { writeActivity(`DELETE FILE id=${id} owner=${owner}`, 'PERMANENT', `size=${file.size}`); } catch(_){}
        return res.json({ message: 'File permanently deleted', id, storageUsed: newUsed });
      }

      const folder = await Folder.findById(id);
      if (!folder) return res.status(404).json({ message: 'Item not found' });
      if (String(folder.owner) !== String(owner)) return res.status(403).json({ message: 'Forbidden' });
      if (!folder.trashed) return res.status(400).json({ message: 'Folder is not in trash' });

      // collect children
      const allFolders = await Folder.find({ owner }).lean();
      const deleteFolders = [];
      const collect = (fid) => { deleteFolders.push(fid); allFolders.filter((f) => f.parent?.toString() === fid.toString()).forEach((c) => collect(c._id.toString())); };
      collect(id);

      const result = await removeFilesAndFolders(deleteFolders);
      const newUsed = await calculateUsedStorage(owner);
      await User.updateOne({ email: owner }, { storageUsed: newUsed });
      try { writeActivity(`DELETE FOLDER id=${id} owner=${owner}`, 'PERMANENT', `folders=${result.deletedFolders} files=${result.deletedFiles}`); } catch(_){}
      return res.json({ message: 'Folder permanently deleted', deletedFolders: result.deletedFolders, deletedFiles: result.deletedFiles, storageUsed: newUsed });
    }

    // empty all trashed: remove files in trashed folders and root trashed files
    const [trashedFolders, trashedRootFiles] = await Promise.all([
      Folder.find({ owner, trashed: true }).lean(),
      File.find({ owner, trashed: true, folder: null }).lean(),
    ]);

    const folderIds = trashedFolders.map((f) => f._id.toString());
    const result = await removeFilesAndFolders(folderIds);

    // delete root trashed files
    const rootObjects = trashedRootFiles.filter((f) => f.s3Url).map((f) => ({ Key: f.s3Url.split('.com/')[1] }));
    if (rootObjects.length) {
      await s3.deleteObjects({ Bucket: process.env.AWS_S3_BUCKET_NAME, Delete: { Objects: rootObjects } }).promise();
    }
    const rootDel = await File.deleteMany({ owner, trashed: true, folder: null });

    const newUsed = await calculateUsedStorage(owner);
    await User.updateOne({ email: owner }, { storageUsed: newUsed });

    try { writeActivity(`EMPTY TRASH owner=${owner}`, 'PERMANENT', `deletedFolders=${result.deletedFolders} deletedFiles=${result.deletedFiles + (rootDel.deletedCount || 0)}`); } catch(_){}
    return res.json({ message: 'Trash emptied', deletedFolders: result.deletedFolders, deletedFiles: (result.deletedFiles + (rootDel.deletedCount || 0)), storageUsed: newUsed });
  } catch (err) {
    console.error('Empty trash error:', err);
    res.status(500).json({ message: 'Failed to empty trash', error: err.message });
  }
});

module.exports = router;
