const express = require("express");
const File = require("../models/fileModel");
const Folder = require("../models/folderModel");
const { requireAuth } = require("../middleware/auth");
const { writeActivity } = require("../log");

const router = express.Router();

const rank = { private: 0, shared: 1, public: 2 };

// ===== MERGE SHARE LIST =====
function mergePermissions(parentList, childList) {
  const map = {};

  childList.forEach((s) => {
    map[s.userId] = s.access;
  });

  parentList.forEach((p) => {
    if (!map[p.userId]) {
      map[p.userId] = p.access; // inherit
    }
  });

  return Object.keys(map).map((email) => ({
    userId: email,
    access: map[email]
  }));
}

// ===== GET ALL CHILDREN (FOLDER + FILE) =====
async function getAllChildren(folderId) {
  const resultFolders = [];
  const resultFiles = [];

  const queue = [folderId];

  while (queue.length) {
    const current = queue.shift();

    // folder con trực tiếp
    const subFolders = await Folder.find({ parent: current });
    resultFolders.push(...subFolders);

    // file trực tiếp trong folder đó
    const files = await File.find({ folder: current });
    resultFiles.push(...files);

    // tiếp tục duyệt xuống
    queue.push(...subFolders.map((f) => f._id));
  }

  return { resultFolders, resultFiles };
}

router.post("/set-visibility", requireAuth, async (req, res) => {
  try {
    const { id, mode, emails, access } = req.body;
    const userEmail = req.user.email;

    let item = await File.findOne({ _id: id, owner: userEmail });
    let type = "file";

    if (!item) {
      item = await Folder.findOne({ _id: id, owner: userEmail });
      type = "folder";
    }

    if (!item) return res.status(404).json({ message: "Item not found" });

    // NGĂN con có quyền cao hơn cha
    if (type === "file" && item.folder) {
      const parent = await Folder.findById(item.folder);
      if (parent && rank[mode] > rank[parent.visibility]) {
        return res.status(400).json({
          message: "Child cannot have higher visibility than parent",
        });
      }
    }

    // set visibility chính cho item
    item.visibility = mode;

    // SET SHARE LIST
    if (mode === "shared" && Array.isArray(emails)) {
      emails.forEach((email) => {
        const exist = item.sharedWith.find((s) => s.userId === email);
        if (exist) exist.access = [access || "view"];
        else item.sharedWith.push({ userId: email, access: [access || "view"] });
      });
    }

    if (mode !== "shared") item.sharedWith = [];

    await item.save();
    try { writeActivity(`UPDATE ${type.toUpperCase()} id=${item._id} owner=${userEmail}`, 'OK', `visibility=${mode}`); } catch(_){}

    // ========= APPLY TO CHILDREN =========
    if (type === "folder") {

      const { resultFolders, resultFiles } = await getAllChildren(item._id);

      const parentShare = item.sharedWith;

      for (const f of [...resultFolders, ...resultFiles]) {

        // 1) visibility con không được vượt cha
        if (rank[f.visibility] > rank[mode]) {
          f.visibility = mode;
        }

        // 2) merge quyền share
        if (mode === "shared") {
          f.sharedWith = mergePermissions(parentShare, f.sharedWith);
        } else {
          f.sharedWith = [];
        }

        await f.save();
        // log child update
        try {
          const kind = f.constructor && f.constructor.modelName ? f.constructor.modelName.toUpperCase() : 'ITEM';
          writeActivity(`UPDATE ${kind} id=${f._id} owner=${f.owner}`, 'OK', `propagated visibility=${f.visibility}`);
        } catch(_){}
      }
    }

    res.json({ message: "Visibility updated", item, type });

  } catch (err) {
    try { writeActivity(`UPDATE ${req.body?.id || 'UNKNOWN'}`, 'FAILED', err.message); } catch(_){}
    res.status(500).json({ message: "Error", error: err.message });
  }
});
// xoa quyen
//chinh
module.exports = router;
