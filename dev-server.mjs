// ============================================================
// Tiny Node dev server.
// • Serves the static site (same as `python3 -m http.server`).
// • Adds three /api endpoints so Stripe can actually run:
//     POST /api/buy/easy       → creates a real Stripe PaymentIntent
//     POST /api/stripe/webhook → consumes payment_intent.succeeded
//     GET  /api/config         → tells the frontend which mode we're in
// • If STRIPE_SECRET_KEY is missing it stays in DEMO mode (no API
//   calls, the page falls back to the localStorage-only flow), so the
//   site still works without setup.
//
// Run: `npm install && npm run dev`
// ============================================================
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import "dotenv/config";

const PORT = +process.env.PORT || 5180;
const ROOT = process.cwd();
const TOKEN_PRICE_USD = 0.0125;

// ---- Lazy-load Stripe only if a secret is configured ----
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.error("[stripe] failed to load SDK:", e.message);
    console.error("        run `npm install` first.");
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif":  "image/gif",
  ".ico":  "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".txt":  "text/plain; charset=utf-8",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end",  () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  try {
    // ---- API: tell the frontend whether real Stripe is wired ----
    if (req.method === "GET" && u.pathname === "/api/config") {
      return json(res, 200, {
        stripeEnabled: !!stripe,
        stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
        tokenPriceUsd: TOKEN_PRICE_USD,
      });
    }

    // ---- API: create a PaymentIntent ----
    if (req.method === "POST" && u.pathname === "/api/buy/easy") {
      if (!stripe) {
        return json(res, 503, {
          error: "Checkout is not configured. Set STRIPE_SECRET_KEY in .env and restart.",
        });
      }
      const body = JSON.parse((await readBody(req)).toString() || "{}");
      const { email, amountUsd } = body;
      if (!/^\S+@\S+\.\S+$/.test(email || "")) {
        return json(res, 400, { error: "Enter a valid email." });
      }
      if (+amountUsd < 10) return json(res, 400, { error: "Minimum $10." });
      try {
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(+amountUsd * 100),
          currency: "usd",
          receipt_email: email,
          payment_method_types: ["card"],
          metadata: { email, amount_usd: String(amountUsd), product: "$CR" },
          description: `${Math.floor(amountUsd / TOKEN_PRICE_USD).toLocaleString()} $CR for ${email}`,
        });
        return json(res, 200, {
          clientSecret: intent.client_secret,
          intentId: intent.id,
        });
      } catch (e) {
        console.error("[stripe] PaymentIntent error:", e.message);
        return json(res, 500, { error: e.message });
      }
    }

    // ---- API: webhook (called by Stripe when a payment really clears) ----
    if (req.method === "POST" && u.pathname === "/api/stripe/webhook") {
      if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return json(res, 200, { ok: true });
      const buf = await readBody(req);
      let event;
      try {
        event = stripe.webhooks.constructEvent(
          buf, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (e) {
        console.error("[webhook] bad signature:", e.message);
        res.writeHead(400); return res.end();
      }
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object;
        const email = pi.metadata?.email;
        const usd = +pi.metadata?.amount_usd || (pi.amount / 100);
        const cr = Math.floor(usd / TOKEN_PRICE_USD);
        console.log(`[stripe] ✓ paid: credit ${cr.toLocaleString()} $CR to ${email} (intent ${pi.id})`);
        // TODO: insert into your ledger DB and email the receipt.
      }
      return json(res, 200, { ok: true });
    }

    // ---- Static files ----
    let p = decodeURIComponent(u.pathname);
    if (p === "/") p = "/index.html";
    const filePath = path.join(ROOT, p);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }
    fs.stat(filePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        return res.end("not found");
      }
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (e) {
    console.error("[server] unhandled:", e);
    json(res, 500, { error: "internal" });
  }
});

server.listen(PORT, () => {
  console.log(`\n  CR Revolution server  →  http://localhost:${PORT}`);
  if (stripe) {
    console.log(`  Stripe: 🟢 LIVE — real PaymentIntents`);
  } else {
    console.log(`  Stripe: 🔴 NOT CONFIGURED`);
    console.log(`          Add STRIPE_SECRET_KEY + STRIPE_PUBLISHABLE_KEY to .env and restart.`);
    console.log(`          /api/buy/easy will return 503 until then.`);
  }
  console.log("");
});
