const express = require("express");
const File = require("../models/fileModel");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
//xem file co public khong
// router.get("/public/files/:fileId", async (req, res) => {
//   try {
//     const { fileId } = req.params;
//     const file = await File.findById(fileId);
//     if (!file) return res.status(404).json({ message: "File not found" });

//     if (file.visibility !== "public") {
//       return res.status(403).json({ message: "File is not public" });
//     }

//     const s3Url = file.s3Url;
//     const mimetype = file.mimetype || "application/octet-stream";

   
//     if (mimetype.startsWith("image/") || mimetype === "application/pdf") {
//       if (s3Url) return res.redirect(302, s3Url);
//     }

//     // Text files: return metadata and URL for client to fetch and display
//     if (mimetype.startsWith("text/")) {
//       return res.json({
//         filename: file.filename,
//         mimetype,
//         size: file.size,
//         s3Url,
//       });
//     }

//     // Default: return metadata and URL
//     return res.json({ filename: file.filename, mimetype, size: file.size, s3Url });
//   } catch (err) {
//     console.error("Public file view error:", err);
//     return res.status(500).json({ message: "Failed to fetch file", error: err.message });
//   }
// });


router.post("/file", requireAuth, async (req, res) => {
  try {
    const { mode,emails,fileId,access } = req.body; // mode: "public" | "private" | "shared"
    const userEmail = req.user.email;

    const file = await File.findOne({ _id: fileId });
    
    if (!file) return res.status(404).json({ message: "File not found" });

    // chỉ owner được thay đổi quyền
    if (file.owner !== userEmail) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (!["private", "shared", "public"].includes(mode)) {
      return res.status(400).json({ message: "Invalid mode" });
    }

    file.visibility = mode;
    if (mode === "shared" && Array.isArray(emails)) {
     file.sharedWith = emails.map((email) => ({
        userId: email,
        access: [access || "all"],
      }));
    } else {
      file.sharedWith = [];
    }
    await file.save();

    res.json({ message: "File visibility updated", file });
  } catch (error) {
    res.status(500).json({ message: "Failed to update visibility", error: error.message });
  }
});

module.exports = router;
