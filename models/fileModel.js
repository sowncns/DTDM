const mongoose = require("mongoose");

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
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("File", fileSchema);
