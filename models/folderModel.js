// models/folderModel.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const permissionSchema = new Schema({
  userId: { type: String, required: true }, // email user
  access: {
    type: [String],
    enum: ["view", "edit", "all"],
    default: ["view"]
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
  trashed: { type: Boolean, default: false },
  trashedAt: { type: Date, default: null },
  trashedBy: { type: String, default: null },
}, { timestamps: true });
folderSchema.index({ owner: 1, parent: 1, name: 1 }, { unique: true, partialFilterExpression: { name: { $type: "string" } } });
module.exports = mongoose.model("Folder", folderSchema);