const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  isAdmin: { type: Boolean, default: false },
   storageUsed: { type: Number, default: 0 },      // bytes đã dùng
  storageLimit: { type: Number, default: 100 * 1024 * 1024 } // 100MB mặc địn
});

module.exports = mongoose.model("User", userSchema);
