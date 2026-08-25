const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  paymentId: { type: String, required: true, unique: true, immutable: true },
  qrPayload: { type: String, required: true, immutable: true },
  balances: {
    energyKwh: { type: Number, default: 0, min: 0 },
    moneyInr: { type: Number, default: 0, min: 0 }
  },
  solarKwh: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
