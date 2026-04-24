import Stripe from "stripe";

const TOKEN_PRICE_USD = 0.0125;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    res.status(503).json({ error: "Checkout is not configured." });
    return;
  }

  const { email, amountUsd } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(email || "")) {
    res.status(400).json({ error: "Enter a valid email." });
    return;
  }
  if (+amountUsd < 10) {
    res.status(400).json({ error: "Minimum $10." });
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(+amountUsd * 100),
      currency: "usd",
      receipt_email: email,
      payment_method_types: ["card"],
      metadata: { email, amount_usd: String(amountUsd), product: "$CR" },
      description: `${Math.floor(amountUsd / TOKEN_PRICE_USD).toLocaleString()} $CR for ${email}`,
    });
    res.status(200).json({
      clientSecret: intent.client_secret,
      intentId: intent.id,
    });
  } catch (e) {
    console.error("[stripe] PaymentIntent error:", e.message);
    res.status(500).json({ error: e.message });
  }
}
