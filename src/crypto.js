// ============================================================
// Live crypto prices via the public CoinGecko API.
// Falls back to baked-in sample data if the network blocks the call
// (so the demo always has something to show).
// ============================================================
const COINS = [
  { id: "bitcoin",      sym: "BTC",  name: "Bitcoin" },
  { id: "ethereum",     sym: "ETH",  name: "Ethereum" },
  { id: "solana",       sym: "SOL",  name: "Solana" },
  { id: "dogecoin",     sym: "DOGE", name: "Dogecoin" },
  { id: "ripple",       sym: "XRP",  name: "XRP" },
  { id: "cardano",      sym: "ADA",  name: "Cardano" },
  { id: "polkadot",     sym: "DOT",  name: "Polkadot" },
  { id: "chainlink",    sym: "LINK", name: "Chainlink" },
];

const FALLBACK = [
  { id: "bitcoin",  sym: "BTC",  name: "Bitcoin",  price: 96342.41, change: 1.82, spark: spark(96000, 96342, 1.5) },
  { id: "ethereum", sym: "ETH",  name: "Ethereum", price: 3284.55,  change: 2.41, spark: spark(3210, 3284, 2.0) },
  { id: "solana",   sym: "SOL",  name: "Solana",   price: 178.22,   change: -0.91, spark: spark(180, 178, 1.5) },
  { id: "dogecoin", sym: "DOGE", name: "Dogecoin", price: 0.421,    change: 3.12, spark: spark(0.4, 0.42, 3) },
  { id: "ripple",   sym: "XRP",  name: "XRP",      price: 2.31,     change: 0.55, spark: spark(2.28, 2.31, 1) },
  { id: "cardano",  sym: "ADA",  name: "Cardano",  price: 1.04,     change: -1.25, spark: spark(1.06, 1.04, 1) },
  { id: "polkadot", sym: "DOT",  name: "Polkadot", price: 8.42,     change: 0.81, spark: spark(8.35, 8.42, 1) },
  { id: "chainlink",sym: "LINK", name: "Chainlink",price: 22.18,    change: 4.10, spark: spark(21.3, 22.18, 2) },
];

function spark(start, end, vol = 1) {
  const out = [];
  const n = 24;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * vol * 0.005;
    out.push(start + (end - start) * t + start * noise);
  }
  return out;
}

async function fetchLivePrices() {
  const ids = COINS.map((c) => c.id).join(",");
  const url =
    "https://api.coingecko.com/api/v3/coins/markets" +
    `?vs_currency=usd&ids=${ids}` +
    "&order=market_cap_desc&sparkline=true&price_change_percentage=24h";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("coingecko " + res.status);
  const data = await res.json();
  return COINS.map((c) => {
    const row = data.find((d) => d.id === c.id);
    if (!row) return null;
    return {
      ...c,
      price: row.current_price,
      change: row.price_change_percentage_24h,
      spark: row.sparkline_in_7d?.price?.slice(-24) ?? spark(row.current_price, row.current_price, 1),
    };
  }).filter(Boolean);
}

function fmt(n) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function buildSparkSVG(values, color) {
  if (!values || values.length < 2) return "";
  const w = 220;
  const h = 38;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="100%">
    <polyline fill="none" stroke="${color}" stroke-width="1.4" points="${pts}" />
  </svg>`;
}

function yahooUrl(sym) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(sym)}-USD`;
}

function renderTicker(coins, ticker) {
  // duplicate so the marquee is seamless
  const html = [...coins, ...coins]
    .map((c) => {
      const dir = c.change >= 0 ? "up" : "down";
      const sign = c.change >= 0 ? "▲" : "▼";
      return `<a class="tk" href="${yahooUrl(c.sym)}" target="_blank" rel="noopener noreferrer"><strong>${c.sym}</strong> $${fmt(c.price)}
        <span class="${dir}">${sign} ${Math.abs(c.change).toFixed(2)}%</span></a>`;
    })
    .join("");
  ticker.innerHTML = html;
}

function renderGrid(coins, grid) {
  grid.innerHTML = coins
    .slice(0, 8)
    .map((c) => {
      const dir = c.change >= 0 ? "up" : "down";
      const color = c.change >= 0 ? "#6dd58c" : "#ef6c6c";
      const sign = c.change >= 0 ? "+" : "";
      return `
        <a class="coin-card" href="${yahooUrl(c.sym)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${c.name} on Yahoo Finance">
          <div class="row">
            <div class="name">${c.name}</div>
            <div class="sym">${c.sym}</div>
          </div>
          <div class="price">$${fmt(c.price)}</div>
          <div class="delta ${dir}">${sign}${c.change.toFixed(2)}% · 24h</div>
          <div class="spark">${buildSparkSVG(c.spark, color)}</div>
          <div class="yf">View on Yahoo Finance ↗</div>
        </a>
      `;
    })
    .join("");
}

export async function initCryptoTicker() {
  const ticker = document.getElementById("ticker-track");
  const grid = document.getElementById("market-grid");
  let coins = FALLBACK;
  // Render fallback immediately so something shows even on slow networks
  renderTicker(coins, ticker);
  renderGrid(coins, grid);

  try {
    coins = await fetchLivePrices();
    renderTicker(coins, ticker);
    renderGrid(coins, grid);
  } catch (e) {
    // CoinGecko occasionally rate-limits / CORS-fails; the fallback stays in place.
    console.info("[crypto] using fallback prices:", e.message);
  }

  // refresh every 60s
  setInterval(async () => {
    try {
      const next = await fetchLivePrices();
      renderTicker(next, ticker);
      renderGrid(next, grid);
    } catch {}
  }, 60_000);

  return coins;
}
