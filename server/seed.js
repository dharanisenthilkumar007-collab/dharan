require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Transaction = require("./models/Transaction");

const accounts = [
  { name: "Arjun Mehta", phone: "+919876543210", paymentId: "ep@arjunmehta", moneyInr: 4286.5, energyKwh: 142.8, solarKwh: 126.4 },
  { name: "Priya Sharma", phone: "+919876543211", paymentId: "ep@priyasharma", moneyInr: 2950, energyKwh: 84.6, solarKwh: 71.2 },
  { name: "Rahul Kumar", phone: "+919876543212", paymentId: "ep@rahulkumar", moneyInr: 1800, energyKwh: 59.4, solarKwh: 42.8 },
  { name: "Meera Joshi", phone: "+919876543213", paymentId: "ep@meerajoshi", moneyInr: 6120, energyKwh: 214.1, solarKwh: 188.7 },
  { name: "Suresh Patel", phone: "+919876543214", paymentId: "ep@sureshpatel", moneyInr: 920, energyKwh: 36.2, solarKwh: 25.6 }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Transaction.deleteMany({}); await User.deleteMany({});
  const passwordHash = await bcrypt.hash("EnerPay@123", 12);
  const users = await User.insertMany(accounts.map(a => ({ name: a.name, phone: a.phone, passwordHash, paymentId: a.paymentId, qrPayload: `enerpay://pay/${a.paymentId}`, balances: { moneyInr: a.moneyInr, energyKwh: a.energyKwh }, solarKwh: a.solarKwh })));
  const byId = Object.fromEntries(users.map(u => [u.paymentId, u]));
  const history = [
    ["money", 84.6, "ep@priyasharma", "ep@arjunmehta", "Solar energy payment", 0],
    ["energy", 5, "ep@arjunmehta", "ep@rahulkumar", "Sharing surplus solar energy", 1],
    ["money", 200, "ep@arjunmehta", "ep@priyasharma", "Energy purchase", 2],
    ["energy", 8.2, "ep@meerajoshi", "ep@arjunmehta", "Solar transfer", 3],
    ["money", 342.5, "ep@rahulkumar", "ep@arjunmehta", "Solar energy sale", 5]
  ];
  await Transaction.insertMany(history.map(([kind, amount, sender, receiver, note, days], i) => ({ reference: `EP-SEED-${String(i + 1).padStart(4, "0")}`, kind, amount, sender: byId[sender]._id, receiver: byId[receiver]._id, note, createdAt: new Date(Date.now() - days * 86400000) })));
  console.log("Seed complete. All demo accounts use password: EnerPay@123");
  await mongoose.disconnect();
}
seed().catch(error => { console.error(error); process.exit(1); });
