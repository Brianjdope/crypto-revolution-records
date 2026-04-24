// ============================================================
// Live crypto prices.
//   • $CR / Crypto Revolution      → DexScreener public API (pinned first)
//   • Majors (BTC/ETH/SOL/…)       → CoinGecko (CORS-ok from browser)
//   • Card links                    → Yahoo Finance per ticker
//
// Falls back to baked-in sample data if the network blocks a call
// (so the demo always shows something).
// ============================================================

const CR_FALLBACK = {
  id: "crypto-revolution",
  sym: "CR",
  name: "Crypto Revolution",
  price: 0.0125,
  change: 12.4,
  spark: null,           // filled below
  dexUrl: "https://dexscreener.com/search?q=crypto+revolution",
};

const COINS = [
  { id: "bitcoin",      sym: "BTC",  name: "Bitcoin" },
  { id: "ethereum",     sym: "ETH",  name: "Ethereum" },
  { id: "solana",       sym: "SOL",  name: "Solana" },
  { id: "dogecoin",     sym: "DOGE", name: "Dogecoin" },
  { id: "ripple",       sym: "XRP",  name: "XRP" },
  { id: "cardano",      sym: "ADA",  name: "Cardano" },
  { id: "polkadot",     sym: "DOT",  name: "Polkadot" },
];

const FALLBACK_MAJORS = [
  { id: "bitcoin",  sym: "BTC",  name: "Bitcoin",  price: 96342.41, change: 1.82, spark: spark(96000, 96342, 1.5) },
  { id: "ethereum", sym: "ETH",  name: "Ethereum", price: 3284.55,  change: 2.41, spark: spark(3210, 3284, 2.0) },
  { id: "solana",   sym: "SOL",  name: "Solana",   price: 178.22,   change: -0.91, spark: spark(180, 178, 1.5) },
  { id: "dogecoin", sym: "DOGE", name: "Dogecoin", price: 0.421,    change: 3.12, spark: spark(0.4, 0.42, 3) },
  { id: "ripple",   sym: "XRP",  name: "XRP",      price: 2.31,     change: 0.55, spark: spark(2.28, 2.31, 1) },
  { id: "cardano",  sym: "ADA",  name: "Cardano",  price: 1.04,     change: -1.25, spark: spark(1.06, 1.04, 1) },
  { id: "polkadot", sym: "DOT",  name: "Polkadot", price: 8.42,     change: 0.81, spark: spark(8.35, 8.42, 1) },
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

CR_FALLBACK.spark = spark(0.0112, 0.0125, 2.5);

// ---------- $CR via DexScreener ----------
async function fetchCryptoRevolution() {
  // Public CORS-enabled search endpoint — looks for any "crypto revolution" pair.
  const url = "https://api.dexscreener.com/latest/dex/search?q=crypto%20revolution";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("dexscreener " + res.status);
  const data = await res.json();
  const pairs = (data?.pairs || [])
    .filter((p) => {
      const s = `${p.baseToken?.name || ""} ${p.baseToken?.symbol || ""}`.toLowerCase();
      return /crypto.?revolution/.test(s) || /(^|[^a-z])cr($|[^a-z])/.test(s) || /\$oz/.test(s);
    })
    .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  const top = pairs[0];
  if (!top) throw new Error("no CR pair found");
  const price = +top.priceUsd || 0;
  const change = +top.priceChange?.h24 || 0;
  const marketCap = +top.marketCap || +top.fdv || 0;
  const liquidity = +(top.liquidity?.usd) || 0;
  const volume24h = +(top.volume?.h24) || 0;
  const txns24h = (top.txns?.h24?.buys || 0) + (top.txns?.h24?.sells || 0);
  const out = {
    id: "crypto-revolution",
    sym: (top.baseToken?.symbol || "CR").toUpperCase(),
    name: top.baseToken?.name || "Crypto Revolution",
    price,
    change,
    marketCap,
    liquidity,
    volume24h,
    txns24h,
    chain: top.chainId || "solana",
    spark: spark(price * (1 - change / 200), price, Math.max(1.5, Math.abs(change) / 8)),
    dexUrl: top.url || CR_FALLBACK.dexUrl,
  };
  // expose for the rest of the site
  window.__CR_LIVE = out;
  window.dispatchEvent(new CustomEvent("cr-live", { detail: out }));
  return out;
}

// ---------- Yahoo Finance (via our serverless proxy) ----------
// Call /api/yahoo?symbols=BTC-USD,ETH-USD,...  — returns real-time quotes
// that CoinGecko doesn't have (stocks, forex, commodities).
export async function fetchYahoo(symbols) {
  const q = encodeURIComponent((symbols || []).join(","));
  if (!q) return [];
  const r = await fetch(`/api/yahoo?symbols=${q}`, { cache: "no-store" });
  if (!r.ok) throw new Error("yahoo " + r.status);
  const j = await r.json();
  return (j.quotes || []).filter((x) => !x.error);
}

// ---------- Majors via CoinGecko ----------
async function fetchMajors() {
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

async function fetchLivePrices() {
  const [crRes, majorsRes] = await Promise.allSettled([fetchCryptoRevolution(), fetchMajors()]);
  const cr      = crRes.status === "fulfilled" ? crRes.value : CR_FALLBACK;
  const majors  = majorsRes.status === "fulfilled" ? majorsRes.value : FALLBACK_MAJORS;
  return [cr, ...majors];
}

function fmt(n) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1)    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
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

function linkFor(c) {
  if (c.id === "crypto-revolution") return c.dexUrl || CR_FALLBACK.dexUrl;
  return `https://finance.yahoo.com/quote/${encodeURIComponent(c.sym)}-USD`;
}

function renderTicker(coins, ticker) {
  const html = [...coins, ...coins]
    .map((c) => {
      const dir = c.change >= 0 ? "up" : "down";
      const sign = c.change >= 0 ? "▲" : "▼";
      return `<a class="tk${c.id === "crypto-revolution" ? " tk-cr" : ""}" href="${linkFor(c)}" target="_blank" rel="noopener noreferrer"><strong>${c.sym}</strong> $${fmt(c.price)}
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
      const isCR = c.id === "crypto-revolution";
      return `
        <a class="coin-card${isCR ? " coin-card--cr" : ""}" href="${linkFor(c)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${c.name} ${isCR ? "on DexScreener" : "on Yahoo Finance"}">
          <div class="row">
            <div class="name">${c.name}</div>
            <div class="sym">${c.sym}</div>
          </div>
          <div class="price">$${fmt(c.price)}</div>
          <div class="delta ${dir}">${sign}${c.change.toFixed(2)}% · 24h</div>
          <div class="spark">${buildSparkSVG(c.spark, color)}</div>
          <div class="yf">${isCR ? "View on DexScreener ↗" : "View on Yahoo Finance ↗"}</div>
        </a>
      `;
    })
    .join("");
}

export async function initCryptoTicker() {
  const ticker = document.getElementById("ticker-track");
  const grid = document.getElementById("market-grid");
  let coins = [CR_FALLBACK, ...FALLBACK_MAJORS];
  if (ticker) renderTicker(coins, ticker);
  if (grid)   renderGrid(coins, grid);

  try {
    coins = await fetchLivePrices();
    if (ticker) renderTicker(coins, ticker);
    if (grid)   renderGrid(coins, grid);
  } catch (e) {
    console.info("[crypto] using fallback prices:", e.message);
  }

  setInterval(async () => {
    try {
      const next = await fetchLivePrices();
      if (ticker) renderTicker(next, ticker);
      if (grid)   renderGrid(next, grid);
    } catch {}
  }, 60_000);

  return coins;
}
