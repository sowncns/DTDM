const mongoose = require("mongoose");
const { Schema } = mongoose;
const permissionSchema = new Schema({
  userId: { type: String, required: true }, // ID hoặc email của người dùng
  access: {
    type: [String],
    enum: ["read", "write", "share","all"],
    default: ["all"]
  }
});

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },     
  s3Url: { type: String, required: true },          
  size: { type: Number, required: true },           
  mimetype: { type: String, required: true },      
  owner: { type: String, required: true },         
  folder: { type: mongoose.Schema.Types.ObjectId, ref: "Folder", default: null },
  folderAncestors: [{ type: mongoose.Schema.Types.ObjectId, ref: "Folder" }],     // cây cha
  visibility: {                                      
    type: String,
    enum: ["private", "shared", "public"],
    default: "private",
  },
  sharedWith: [permissionSchema],                  
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("File", fileSchema);
