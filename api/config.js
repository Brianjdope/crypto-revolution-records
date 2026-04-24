const TOKEN_PRICE_USD = 0.0125;

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    tokenPriceUsd: TOKEN_PRICE_USD,
  });
}
