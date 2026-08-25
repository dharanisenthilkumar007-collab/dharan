const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, immutable: true },
  kind: { type: String, enum: ["money", "energy"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  note: { type: String, trim: true, maxlength: 140, default: "" },
  status: { type: String, enum: ["completed"], default: "completed" },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ receiver: 1, createdAt: -1 });
module.exports = mongoose.model("Transaction", transactionSchema);
