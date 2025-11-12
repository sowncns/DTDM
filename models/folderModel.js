// models/folderModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const permissionSchema = new Schema({
  userId: { type: String, required: true }, // ID hoặc email của người dùng
  access: {
    type: [String],
    enum: ["read", "write", "share","all"],
    default: ["read"]
  }
});

const folderSchema = new Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: String, required: true },
  parent: { type: Schema.Types.ObjectId, ref: "Folder", default: null },
  ancestors: [{ type: Schema.Types.ObjectId, ref: "Folder" }],
  storageUsed: { type: Number, default: 0 },
  visibility: {
    type: String,
    enum: ["private", "shared", "public"],
    default: "private"
  },
  sharedWith: [permissionSchema],
}, { timestamps: true });
folderSchema.index({ owner: 1, parent: 1, name: 1 }, { unique: true, partialFilterExpression: { name: { $type: "string" } } });
module.exports = mongoose.model("Folder", folderSchema);