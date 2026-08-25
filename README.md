# EnerPay

## Run locally

1. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`.
2. Use a MongoDB replica set (Atlas works) because payments use database transactions to debit and credit atomically.
3. Run `npm install`, then `npm run seed`, then `npm run dev`.

The demo password for every seeded account is `EnerPay@123`. Try sending to `ep@priyasharma`, `ep@rahulkumar`, or scan/share a recipient's `enerpay://pay/<paymentId>` code.

This is a prototype ledger. A production money-transfer system additionally requires payment-gateway integration, KYC/compliance, encryption/key management, rate limits, audit controls, and reconciliation.

## Deploy to Vercel

Deploy the entire project folder, not only `dist`. Add `MONGODB_URI` and `JWT_SECRET` in Vercel Project Settings → Environment Variables, then redeploy. The `api/[...path].js` function serves the backend routes and the deployed frontend uses `/api` automatically.
