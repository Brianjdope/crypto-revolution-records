// ============================================================
// Buy section — placeholder integrations for:
//   • Wallet connect (real EIP-1193 if window.ethereum exists,
//     simulated otherwise)
//   • Card / Apple Pay (simulated PaymentRequest UI)
// No live transactions; this is a demo flow that mirrors the
// real shape of an integration so a future swap to Stripe +
// WalletConnect is mechanical.
// ============================================================
const TOKEN_PRICE_USD = 0.0125; // $OZ price for the demo math
const ETH_USD = 3284;           // mirror of the live price; updated below

export function initBuy() {
  const amtCrypto = document.getElementById("amt-crypto");
  const quoteCrypto = document.getElementById("quote-crypto");
  const amtFiat = document.getElementById("amt-fiat");
  const quoteFiat = document.getElementById("quote-fiat");
  const connectBtn = document.getElementById("connect-wallet");
  const payCard = document.getElementById("pay-card");
  const payApple = document.getElementById("pay-apple");
  const walletStatus = document.getElementById("wallet-status");
  const cardStatus = document.getElementById("card-status");

  // ---- Hero stats animator (called from main once prices arrive) ----
  // exposed via window for main.js to update
  window.__updateBuyStats = (mcap, holders, tracks) => {
    animateNumber("stat-cap", mcap, (v) => "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v));
    animateNumber("stat-holders", holders, (v) => Math.round(v).toLocaleString());
    animateNumber("stat-tracks", tracks, (v) => Math.round(v).toLocaleString());
  };

  function recalc() {
    const oz = +amtCrypto.value || 0;
    const usd = oz * TOKEN_PRICE_USD;
    const eth = usd / ETH_USD;
    quoteCrypto.textContent = `≈ ${eth.toFixed(4)} ETH · $${usd.toFixed(2)}`;

    const usd2 = +amtFiat.value || 0;
    const oz2 = usd2 / TOKEN_PRICE_USD;
    quoteFiat.textContent = `= ${Math.round(oz2).toLocaleString()} $OZ`;
  }
  amtCrypto.addEventListener("input", recalc);
  amtFiat.addEventListener("input", recalc);
  recalc();

  // ---- Wallet connect ----
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
              walletStatus.textContent = `✓ Bought ${(+amtCrypto.value).toLocaleString()} $OZ — tx 0x${Math.random().toString(16).slice(2, 10)}…`;
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
          walletStatus.textContent = `✓ Bought ${(+amtCrypto.value).toLocaleString()} $OZ on testnet`;
        }, 1100);
      };
    } catch (e) {
      walletStatus.textContent = "Wallet request rejected.";
    }
  });

  // ---- Card / Apple Pay ----
  async function payWithCard() {
    cardStatus.textContent = "Opening secure checkout…";
    await new Promise((r) => setTimeout(r, 500));
    cardStatus.textContent = `✓ Charged $${(+amtFiat.value).toFixed(2)} (Stripe demo) · tokens queued`;
  }

  async function payWithApple() {
    cardStatus.textContent = "Requesting Apple Pay sheet…";
    if (window.PaymentRequest) {
      try {
        const supported = ["basic-card"];
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
          { supportedMethods: supported },
        ];
        const details = {
          total: { label: "$OZ Tokens", amount: { currency: "USD", value: (+amtFiat.value || 0).toFixed(2) } },
        };
        const req = new PaymentRequest(methods, details);
        const can = await req.canMakePayment().catch(() => false);
        if (!can) throw new Error("Apple Pay unavailable on this device");
        const res = await req.show();
        await res.complete("success");
        cardStatus.textContent = `✓ Apple Pay confirmed for $${(+amtFiat.value).toFixed(2)}`;
        return;
      } catch (e) {
        // Fall back to demo
      }
    }
    await new Promise((r) => setTimeout(r, 500));
    cardStatus.textContent = `✓ Apple Pay (demo) — $${(+amtFiat.value).toFixed(2)} charged, tokens queued`;
  }

  payCard.addEventListener("click", payWithCard);
  payApple.addEventListener("click", payWithApple);
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
