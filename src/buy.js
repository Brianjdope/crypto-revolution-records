// ============================================================
// Buy section — two paths so anyone can join the herd:
//
//   1) The EASY path (default): email + card / Apple Pay → we
//      auto-create a custodial CR account and hold the tokens.
//      Zero crypto knowledge required. This mirrors how Coinbase /
//      MoonPay / Stripe Crypto Onramp work for first-time buyers.
//
//   2) The WEB3 path (secondary): connect MetaMask / Phantom and
//      pay in ETH / SOL / USDC. For users who already self-custody.
//
// In a real build the easy path would call a server endpoint that:
//   • creates a Stripe Customer + PaymentIntent
//   • on success, mints / transfers $CR to a custodial sub-account
//     keyed by the user's email (Privy, Magic, or Web3Auth all do
//     this out of the box)
//   • emails them a magic-link login + receipt
// Everything below is a faithful demo: same UX, no real money moves.
// ============================================================
const TOKEN_PRICE_USD = 0.0125; // $CR price for the demo math
const ETH_USD = 3284;           // mirror of the live price; updated below

const ACCOUNT_KEY = "cr-account";

function loadAccount() {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
  } catch {
    return null;
  }
}
function saveAccount(a) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a));
}

function shortId(email) {
  // turn an email into a stable 8-char demo "account id"
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return "CR-" + h.toString(36).toUpperCase().slice(0, 6);
}

export function initBuy() {
  const amtCrypto = document.getElementById("amt-crypto");
  const quoteCrypto = document.getElementById("quote-crypto");
  const amtFiat = document.getElementById("amt-fiat");
  const quoteFiat = document.getElementById("quote-fiat");
  const emailInput = document.getElementById("buy-email");
  const payAmtSpan = document.getElementById("pay-amt");
  const connectBtn = document.getElementById("connect-wallet");
  const payCard = document.getElementById("pay-card");
  const payApple = document.getElementById("pay-apple");
  const walletStatus = document.getElementById("wallet-status");
  const cardStatus = document.getElementById("card-status");

  // ---- Hero stats animator (called from main once prices arrive) ----
  window.__updateBuyStats = (mcap, holders, tracks) => {
    animateNumber("stat-cap", mcap, (v) => "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v));
    animateNumber("stat-holders", holders, (v) => Math.round(v).toLocaleString());
    animateNumber("stat-tracks", tracks, (v) => Math.round(v).toLocaleString());
  };

  function recalc() {
    const cr = +amtCrypto.value || 0;
    const usd = cr * TOKEN_PRICE_USD;
    const eth = usd / ETH_USD;
    quoteCrypto.textContent = `≈ ${eth.toFixed(4)} ETH · $${usd.toFixed(2)}`;

    const usd2 = +amtFiat.value || 0;
    const cr2 = usd2 / TOKEN_PRICE_USD;
    quoteFiat.textContent = `= ${Math.round(cr2).toLocaleString()} $CR`;
    if (payAmtSpan) payAmtSpan.textContent = (+amtFiat.value || 0).toFixed(0);
  }
  amtCrypto.addEventListener("input", recalc);
  amtFiat.addEventListener("input", recalc);
  recalc();

  // ---- Hydrate the CR account widget if the user already bought ----
  renderAccount(loadAccount());

  // ---- Wallet connect (web3 path) ----
  connectBtn.addEventListener("click", async () => {
    walletStatus.textContent = "Requesting wallet…";
    try {
      if (window.ethereum && window.ethereum.request) {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const a = accounts?.[0];
        if (a) {
          walletStatus.textContent = `Connected · ${a.slice(0, 6)}…${a.slice(-4)}`;
          connectBtn.textContent = "Buy with ETH";
          connectBtn.onclick = () => {
            walletStatus.textContent = "Submitting tx (demo)… ✓ pending";
            setTimeout(() => {
              const cr = +amtCrypto.value || 0;
              walletStatus.textContent = `✓ Bought ${cr.toLocaleString()} $CR — tx 0x${Math.random().toString(16).slice(2, 10)}…`;
              creditAccount({ email: a, cr, paid: cr * TOKEN_PRICE_USD, method: "wallet", custodial: false });
            }, 1400);
          };
          return;
        }
      }
      // No wallet → simulate
      await new Promise((r) => setTimeout(r, 700));
      const fake = "0x" + Math.random().toString(16).slice(2, 10) + "…" + Math.random().toString(16).slice(2, 6);
      walletStatus.textContent = `Demo wallet connected · ${fake}`;
      connectBtn.textContent = "Buy with demo wallet";
      connectBtn.onclick = () => {
        walletStatus.textContent = "Submitting tx (demo)…";
        setTimeout(() => {
          const cr = +amtCrypto.value || 0;
          walletStatus.textContent = `✓ Bought ${cr.toLocaleString()} $CR on testnet`;
          creditAccount({ email: fake, cr, paid: cr * TOKEN_PRICE_USD, method: "wallet", custodial: false });
        }, 1100);
      };
    } catch {
      walletStatus.textContent = "Wallet request rejected.";
    }
  });

  // ---- Easy path (custodial card / Apple Pay) ----
  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
  }

  async function easyBuy(method) {
    const email = (emailInput?.value || "").trim();
    const usd = +amtFiat.value || 0;
    if (!validEmail(email)) {
      cardStatus.dataset.state = "err";
      cardStatus.textContent = "Enter your email so we can deliver your tokens.";
      emailInput?.focus();
      return;
    }
    if (usd < 10) {
      cardStatus.dataset.state = "err";
      cardStatus.textContent = "Minimum $10 to start.";
      return;
    }
    cardStatus.dataset.state = "";
    cardStatus.textContent = method === "apple" ? "Requesting Apple Pay sheet…" : "Opening secure checkout…";

    if (method === "apple" && window.PaymentRequest) {
      try {
        const methods = [
          {
            supportedMethods: "https://apple.com/apple-pay",
            data: {
              version: 3,
              merchantIdentifier: "merchant.demo.cryptorevolution",
              merchantCapabilities: ["supports3DS"],
              supportedNetworks: ["visa", "masterCard", "amex"],
              countryCode: "US",
            },
          },
          { supportedMethods: ["basic-card"] },
        ];
        const details = {
          total: { label: "$CR Tokens", amount: { currency: "USD", value: usd.toFixed(2) } },
        };
        const req = new PaymentRequest(methods, details);
        if (await req.canMakePayment().catch(() => false)) {
          const res = await req.show();
          await res.complete("success");
        }
      } catch {
        // fall through to demo
      }
    } else {
      // simulated Stripe checkout
      await new Promise((r) => setTimeout(r, 700));
    }

    const cr = usd / TOKEN_PRICE_USD;
    cardStatus.dataset.state = "ok";
    cardStatus.textContent = `✓ Charged $${usd.toFixed(2)} · ${Math.round(cr).toLocaleString()} $CR added to your account`;

    creditAccount({ email, cr, paid: usd, method, custodial: true });
  }

  payCard.addEventListener("click", () => easyBuy("card"));
  payApple.addEventListener("click", () => easyBuy("apple"));

  // ---- Account widget controls ----
  document.getElementById("cra-withdraw")?.addEventListener("click", () => {
    const acct = loadAccount();
    if (!acct) return;
    const addr = prompt(
      "Withdraw to a wallet address.\n\nPaste any ETH / SOL / USDC compatible address — we'll send your full $CR balance there. (Demo: nothing actually sends.)"
    );
    if (!addr) return;
    const status = document.getElementById("card-status");
    status.dataset.state = "ok";
    status.textContent = `✓ Withdrawal queued to ${addr.slice(0, 6)}…${addr.slice(-4)} — confirms in ~30s`;
  });
}

function creditAccount({ email, cr, paid, method, custodial }) {
  const prev = loadAccount() || { email, balance: 0, paid: 0, txs: [], custodial };
  const next = {
    ...prev,
    email: email || prev.email,
    custodial: custodial ?? prev.custodial,
    balance: (prev.balance || 0) + cr,
    paid: (prev.paid || 0) + paid,
    txs: [
      { at: Date.now(), cr, paid, method },
      ...(prev.txs || []),
    ].slice(0, 12),
  };
  saveAccount(next);
  renderAccount(next);
}

function renderAccount(acct) {
  const el = document.getElementById("cr-account");
  if (!el) return;
  if (!acct || !acct.balance) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  document.getElementById("cra-balance").textContent =
    Math.round(acct.balance).toLocaleString() + " $CR";
  const idEl = document.getElementById("cra-id");
  if (idEl) {
    idEl.textContent = acct.custodial
      ? `${shortId(acct.email)} · ${acct.email}`
      : `Wallet · ${acct.email}`;
  }
}

// little tween helper
function animateNumber(id, target, format) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseFloat(el.dataset.v || "0");
  const startTime = performance.now();
  const dur = 1400;
  function frame(t) {
    const k = Math.min(1, (t - startTime) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    const v = start + (target - start) * e;
    el.textContent = format(v);
    if (k < 1) requestAnimationFrame(frame);
    else el.dataset.v = String(target);
  }
  requestAnimationFrame(frame);
}
