import Stripe from "stripe";

const TOKEN_PRICE_USD = 0.0125;

// Vercel needs the raw body for Stripe signature verification.
export const config = {
  api: { bodyParser: false },
};

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(200).json({ ok: true });
    return;
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const buf = await readRaw(req);
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (e) {
    console.error("[webhook] bad signature:", e.message);
    res.status(400).end();
    return;
  }
  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const email = pi.metadata?.email;
    const usd = +pi.metadata?.amount_usd || pi.amount / 100;
    const cr = Math.floor(usd / TOKEN_PRICE_USD);
    console.log(`[stripe] ✓ paid: credit ${cr.toLocaleString()} $CR to ${email} (intent ${pi.id})`);
  }
  res.status(200).json({ ok: true });
}
