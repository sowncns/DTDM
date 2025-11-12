const File = require("../models/fileModel");

/**
 * Kiểm tra quyền truy cập file theo cấp độ:
 *  - "read": chỉ đọc
 *  - "write": chỉnh sửa
 *  - "share": chia sẻ tiếp
 *  - "all": toàn quyền
 */
function checkFilePermission(requiredAccess = "read") {
  return async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const userEmail = req.user.email;

      const file = await File.findById(fileId);
      if (!file) return res.status(404).json({ message: "File not found" });


      if (file.owner === userEmail) {
        req.file = file;
        return next();
      }


      if (file.visibility === "public") {
        if (requiredAccess === "read") {
          req.file = file;
          return next();
        }
        return res.status(403).json({ message: "Public files are read-only" });
      }

 
      if (file.visibility === "shared") {
        const sharedUser = file.sharedWith.find((u) => u.userId === userEmail);

        if (!sharedUser)
          return res
            .status(403)
            .json({ message: "You do not have shared access to this file" });

        const { access } = sharedUser;

        const allowed =
          access.includes("all") ||
          (requiredAccess === "read" && access.includes("read")) ||
          (requiredAccess === "write" && access.includes("write")) ||
          (requiredAccess === "share" && access.includes("share"));

        if (!allowed)
          return res
            .status(403)
            .json({ message: `Missing required permission: ${requiredAccess}` });

        req.file = file;
        return next();
      }


      return res.status(403).json({ message: "You do not have access to this file" });
    } catch (error) {
      console.error("checkFilePermission error:", error);
      res.status(500).json({ message: "Permission check failed", error: error.message });
    }
  };
}

module.exports = { checkFilePermission };
