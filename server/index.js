require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("./models/User");
const Transaction = require("./models/Transaction");
const auth = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

const sign = id => jwt.sign({ sub: id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const publicUser = user => ({ id: user._id, name: user.name, phone: user.phone, paymentId: user.paymentId, qrPayload: user.qrPayload, balances: user.balances, solarKwh: user.solarKwh });

// Changed EP@ to ep@ for new accounts
const paymentIdFor = name => `ep@${name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14)}${crypto.randomBytes(2).toString("hex")}`;

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, phone, password } = req.body;
    if (!name || !phone || !password || password.length < 6) return res.status(400).json({ message: "Name, phone, and a 6+ character password are required." });
    if (await User.exists({ phone })) return res.status(409).json({ message: "An account already exists for this phone number." });

    const paymentId = paymentIdFor(name);
    const user = await User.create({
      name,
      phone,
      passwordHash: await bcrypt.hash(password, 12),
      paymentId,
      qrPayload: `enerpay://pay/${paymentId}`
    });

    res.status(201).json({ token: sign(user.id), user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const user = await User.findOne({ phone: req.body.phone });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) return res.status(401).json({ message: "Invalid phone number or password." });
    res.json({ token: sign(user.id), user: publicUser(user) });
  } catch (error) { next(error); }
});

app.get("/api/me", auth, async (req, res, next) => {
  try {
    res.json({ user: publicUser(await User.findById(req.userId)) });
  } catch (e) { next(e); }
});

app.get("/api/users/lookup", auth, async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();

    const user = await User.findOne({
      $or: [{ paymentId: q }, { phone: q }]
    }).collation({ locale: "en", strength: 2 });

    if (!user) return res.status(404).json({ message: "No EnerPay account found." });
    res.json({ user: publicUser(user) });
  } catch (e) { next(e); }
});

app.post("/api/payments", auth, async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const { recipient, kind, amount, note = "" } = req.body;
    const value = Number(amount);

    if (!recipient || !["money", "energy"].includes(kind) || !Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: "Enter a valid recipient, payment type, and amount." });
    }

    await session.withTransaction(async () => {
      const sender = await User.findById(req.userId).session(session);
      const recipientValue = recipient.trim();

      const receiver = await User.findOne({
        $or: [{ paymentId: recipientValue }, { phone: recipientValue }]
      })
        .collation({ locale: "en", strength: 2 })
        .session(session);

      if (!receiver) throw Object.assign(new Error("Recipient account was not found."), { status: 404 });
      if (sender.id === receiver.id) throw Object.assign(new Error("You cannot pay your own account."), { status: 400 });

      // Energy and money are independent wallets. Never convert or debit money
      // when an energy transfer is requested.
      const balanceKey = kind === "money" ? "moneyInr" : "energyKwh";
      const balanceField = `balances.${balanceKey}`;

      if (sender.balances[balanceKey] < value) throw Object.assign(new Error("Insufficient balance."), { status: 400 });

      await User.updateOne({ _id: sender._id }, { $inc: { [balanceField]: -value } }, { session });
      await User.updateOne({ _id: receiver._id }, { $inc: { [balanceField]: value } }, { session });

      await Transaction.create([{
        reference: `EP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        kind,
        amount: value,
        sender: sender._id,
        receiver: receiver._id,
        note
      }], { session });
    });

    res.status(201).json({ message: "Payment completed." });
  } catch (e) { next(e); } finally {
    session.endSession();
  }
});

app.get("/api/transactions", auth, async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ $or: [{ sender: req.userId }, { receiver: req.userId }] })
      .populate("sender receiver", "name paymentId")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ transactions });
  } catch (e) { next(e); }
});

app.get("/api/analytics", auth, async (req, res, next) => {
  try {
    const period = ["daily", "weekly", "monthly"].includes(req.query.period) ? req.query.period : "weekly";
    const buckets = period === "daily" ? 24 : period === "weekly" ? 7 : 12;
    const format = period === "daily" ? "%H:00" : period === "weekly" ? "%a" : "%b";

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    if (period === "daily") start.setHours(start.getHours() - 23);
    if (period === "weekly") start.setDate(start.getDate() - 6);
    if (period === "monthly") start.setMonth(start.getMonth() - 11);

    const points = await Transaction.aggregate([
      { $match: { receiver: new mongoose.Types.ObjectId(req.userId), kind: "money", createdAt: { $gte: start } } },
      { $group: { _id: { $dateToString: { format, date: "$createdAt", timezone: "Asia/Kolkata" } }, earnings: { $sum: "$amount" } } }
    ]);

    res.json({ period, buckets, earnings: points, source: "Solar" });
  } catch (e) { next(e); }
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Something went wrong." });
});

async function connectDatabase() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not configured.");
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  return mongoose.connect(process.env.MONGODB_URI);
}

if (require.main === module) {
  connectDatabase()
    .then(() => app.listen(process.env.PORT || 4000, () => console.log("EnerPay API running")))
    .catch(err => {
      console.error("MongoDB connection failed", err);
      process.exit(1);
    });
}

module.exports = { app, connectDatabase };