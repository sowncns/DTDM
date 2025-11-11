// middleware/checkPermission.js
const Folder = require("../models/folderModel");
const File = require("../models/fileModel");

async function checkPermission(resourceType, action) {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      let resource;

      // ✅ Lấy tài nguyên tương ứng
      if (resourceType === "folder") resource = await Folder.findById(id);
      else if (resourceType === "file") resource = await File.findById(id);
      else return res.status(400).json({ error: "Invalid resource type" });

      if (!resource) return res.status(404).json({ error: `${resourceType} not found` });

      // ✅ 1. Chủ sở hữu có toàn quyền
      if (resource.owner === userId) {
        req.resource = resource;
        return next();
      }

      // ✅ 2. Public → chỉ cho phép đọc
      if (resource.visibility === "public" && action === "read") {
        req.resource = resource;
        return next();
      }

      // ✅ 3. Shared trực tiếp
      const sharedList = resource.sharedWith || [];
      const perm = sharedList.find(u => u.userId === userId);
      if (perm && perm.access.includes(action)) {
        req.resource = resource;
        return next();
      }

      // ✅ 4. Nếu là file → kế thừa quyền từ folder cha
      if (resourceType === "file" && resource.folder) {
        const parent = await Folder.findById(resource.folder);
        if (parent) {
          if (parent.visibility === "public" && action === "read") {
            req.resource = resource;
            return next();
          }

          const parentPerm = parent.sharedWith.find(u => u.userId === userId);
          if (parentPerm && parentPerm.access.includes(action)) {
            req.resource = resource;
            return next();
          }
        }
      }

      return res.status(403).json({ error: "Access denied" });
    } catch (err) {
      console.error("checkPermission error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

module.exports = checkPermission;
