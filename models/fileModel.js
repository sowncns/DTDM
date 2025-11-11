const mongoose = require("mongoose");
const { Schema } = mongoose;
const permissionSchema = new Schema({
  userId: { type: String, required: true }, // ID hoặc email của người dùng
  access: {
    type: [String],
    enum: ["read", "write", "share"],
    default: ["read"]
  }
});

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },        // tên file gốc
  s3Url: { type: String, required: true },           // đường dẫn public/private trên S3
  size: { type: Number, required: true },            // dung lượng (bytes)
  mimetype: { type: String, required: true },        // loại file (image/png, pdf,…)
  owner: { type: String, required: true },           // email hoặc userId
  folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null }, // folder chứa
  folderAncestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Folder" }],     // cây cha
  visibility: {                                      // quyền truy cập file
    type: String,
    enum: ["private", "shared", "public"],
    default: "private",
  },
  sharedWith: [permissionSchema],                   // danh sách quyền chi tiết  
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("File", fileSchema);
