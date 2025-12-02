const express = require("express");
const jwt = require("jsonwebtoken");
const File = require("../models/fileModel");
const Folder = require("../models/folderModel");
const { requireAuth } = require("../middleware/auth");
const { writeActivity } = require("../log");

const router = express.Router();


// Helper to decode token if present (optional auth)
function tryDecodeToken(req) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { email: decoded.email, role: decoded.role };
  } catch (e) {
    return null;
  }
}

// GET /share/file/:fileId - return s3Url if public or shared with caller
router.post('/file', async (req, res) => {
  try {
    const { fileId } = req.body;
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (file.trashed) return res.status(404).json({ message: 'File not found' });

    const requester = tryDecodeToken(req);
    const isOwner = requester && requester.email === file.owner;
    const isAdmin = requester && requester.role === 'admin';

    if (file.visibility === 'public') {
      try { writeActivity(`ACCESS FILE id=${fileId}`, 'OK', 'public'); } catch(_){}
      return res.json({ filename: file.filename, s3Url: file.s3Url, mimetype: file.mimetype, size: file.size });
    }

    if (file.visibility === 'shared') {
      if (!requester) return res.status(401).json({ message: 'Authentication required for shared file' });
      const allowed = isOwner || isAdmin || (Array.isArray(file.sharedWith) && file.sharedWith.some(s => s.userId === requester.email));
      if (!allowed) return res.status(403).json({ message: 'Forbidden' });
      try { writeActivity(`ACCESS FILE id=${fileId}`, 'OK', 'shared'); } catch(_){}
      return res.json({ filename: file.filename, s3Url: file.s3Url, mimetype: file.mimetype, size: file.size });
    }

    return res.status(403).json({ message: 'File is private' });
  } catch (err) {
    console.error('Public file view error:', err);
    return res.status(500).json({ message: 'Failed to fetch file', error: err.message });
  }
});

// GET /share/folder/:folderId - recursive children if folder accessible
router.post('/folder', async (req, res) => {
  try {
    const { folderId } = req.body;
    const folder = await Folder.findById(folderId);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    if (folder.trashed) return res.status(404).json({ message: 'Folder not found' });

    const requester = tryDecodeToken(req);
    const isOwner = requester && requester.email === folder.owner;
    const isAdmin = requester && requester.role === 'admin';

    if (folder.visibility === 'private') return res.status(403).json({ message: 'Folder is private' });
    if (folder.visibility === 'shared' && !isOwner && !isAdmin) {
      if (!requester) return res.status(401).json({ message: 'Authentication required for shared folder' });
      const allowed = Array.isArray(folder.sharedWith) && folder.sharedWith.some(s => s.userId === requester.email);
      if (!allowed) return res.status(403).json({ message: 'Forbidden' });
    }

    // BFS traversal, only non-trashed
    const queue = [folderId];
    const folders = [];
    const files = [];

    while (queue.length) {
      const cur = queue.shift();
      const subFolders = await Folder.find({ parent: cur, trashed: { $ne: true } });
      const subFiles = await File.find({ folder: cur, trashed: { $ne: true } });

      for (const f of subFolders) {
        folders.push({ id: f._id.toString(), name: f.name, visibility: f.visibility, owner: f.owner });
        queue.push(f._id.toString());
      }

      for (const fi of subFiles) {
        files.push({ id: fi._id.toString(), filename: fi.filename, s3Url: fi.s3Url, mimetype: fi.mimetype, size: fi.size, visibility: fi.visibility });
      }
    }

    try { writeActivity(`ACCESS FOLDER id=${folderId}`, 'OK', `items=${folders.length + files.length}`); } catch(_){}
    return res.json({ folder: { id: folder._id.toString(), name: folder.name, owner: folder.owner }, folders, files });
  } catch (err) {
    console.error('Public folder view error:', err);
    return res.status(500).json({ message: 'Failed to fetch folder', error: err.message });
  }
});

module.exports = router;
