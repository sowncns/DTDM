const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  requestId: { type: String, required: true },
  packId: { type: String, required: true },
  owner: { type: String, required: true }, // owner email
  amount: { type: Number, required: true }, // cents
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
  momoResponse: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
