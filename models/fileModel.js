const mongoose = require("mongoose");
const { Schema } = mongoose;

// models/fileModel.js
const fileSchema = new Schema({
  filename: { type: String, required: true },
  path:     { type: String, required: true },
  size:     { type: Number, required: true },
  mimetype: String,
  owner:    { type: String, required: true },
  folder:   { type: Schema.Types.ObjectId, ref: "Folder", default: null },
  folderAncestors: [{ type: Schema.Types.ObjectId, ref: "Folder" }],
}, { timestamps: true });
fileSchema.index({ owner: 1, folder: 1, filename: 1 }, { unique: true, partialFilterExpression: { filename: { $type: "string" } } });

module.exports = mongoose.model("File", fileSchema);
