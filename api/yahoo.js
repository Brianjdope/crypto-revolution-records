// Yahoo Finance proxy — serverless function.
// Browser can't call Yahoo v8 directly (no CORS), so we proxy it.
// Usage: GET /api/yahoo?symbols=BTC-USD,ETH-USD,AAPL,TSLA

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  const raw = (req.query?.symbols || "").toString().trim();
  if (!raw) {
    res.status(400).json({ error: "missing symbols" });
    return;
  }
  const symbols = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);

  const results = await Promise.all(
    symbols.map(async (sym) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1h&range=1d`;
        const r = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            Accept: "application/json",
          },
        });
        if (!r.ok) throw new Error("yahoo " + r.status);
        const j = await r.json();
        const meta = j?.chart?.result?.[0]?.meta;
        const closes = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
        if (!meta) throw new Error("no meta");
        const price = meta.regularMarketPrice;
        const prev  = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = prev ? ((price - prev) / prev) * 100 : 0;
        return {
          symbol: sym,
          name: meta.shortName || meta.longName || sym,
          price,
          change,
          currency: meta.currency || "USD",
          spark: closes.filter((x) => typeof x === "number").slice(-24),
        };
      } catch (e) {
        return { symbol: sym, error: e.message };
      }
    })
  );

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  res.status(200).json({ quotes: results });
}
