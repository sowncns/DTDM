const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  refreshToken: { type: String , default: null },
  role: { type: String, enum: ["admin","editor","user"], default: "user" },
  storageUsed: { type: Number, default: 0 },      // bytes đã dùng
  storageLimit: { type: Number, default: 100 * 1024 * 1024 }, // 100MB mặc địn
  plan: { type: String, enum: ["Free", "Plus", "Pro", "Business"], default: "Free" },
  planStorage: { type: Number, default: 0 },         
  planExpire: { type: Date, default: null },     
  lastUpgrade: { type: Date, default: null },
});

module.exports = mongoose.model("User", userSchema);
