// ============================================================
// Buy section — real Stripe Payment Element (card-only).
//
//   • Wallet connect: EIP-1193 if window.ethereum exists.
//   • Card: Stripe Payment Element with payment_method_types=["card"].
//     Requires STRIPE_PUBLISHABLE_KEY / STRIPE_SECRET_KEY in .env.
// ============================================================
let TOKEN_PRICE_USD = 0.0125;  // seeded; updated live from DexScreener
let ETH_USD = 3284;             // seeded; updated live from Yahoo proxy

export function initBuy() {
  const amtCrypto   = document.getElementById("amt-crypto");
  const quoteCrypto = document.getElementById("quote-crypto");
  const amtFiat     = document.getElementById("amt-fiat");
  const quoteFiat   = document.getElementById("quote-fiat");
  const emailInput  = document.getElementById("buy-email");
  const payBtn      = document.getElementById("pay-card");
  const payAmountEl = document.getElementById("pay-amount");
  const walletStatus = document.getElementById("wallet-status");
  const cardStatus   = document.getElementById("card-status");
  const peMount      = document.getElementById("payment-element");

  // ---- Hero stats animator ----
  window.__updateBuyStats = (mcap, holders, tracks) => {
    animateNumber("stat-cap", mcap, (v) => "$" + Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v));
    animateNumber("stat-holders", holders, (v) => Math.round(v).toLocaleString());
    animateNumber("stat-tracks", tracks, (v) => Math.round(v).toLocaleString());
  };

  // ---- Live price binding ----
  // DexScreener pushes the latest $CR USD price via the cr-live event in
  // src/main.js, which calls this setter. Same hook is exposed for ETH.
  window.__updateLivePrice = (priceUsd) => {
    if (typeof priceUsd === "number" && priceUsd > 0) {
      TOKEN_PRICE_USD = priceUsd;
      paintLivePrice();
      recalc();
      stripeState.needsNewIntent = true;
    }
  };
  window.__updateEthPrice = (eth) => {
    if (typeof eth === "number" && eth > 0) {
      ETH_USD = eth;
      paintLivePrice();
      recalc();
    }
  };

  // Optional live price chip in the buy card. Render only if container
  // exists; otherwise we just update the quote math silently.
  function paintLivePrice() {
    const el = document.getElementById("live-price");
    if (!el) return;
    const fmt = TOKEN_PRICE_USD < 0.01
      ? "$" + TOKEN_PRICE_USD.toFixed(6)
      : "$" + TOKEN_PRICE_USD.toFixed(4);
    el.innerHTML = `<span class="lp-dot"></span> Live $CR ${fmt} · ETH $${Math.round(ETH_USD).toLocaleString()}`;
  }
  paintLivePrice();

  // Refresh ETH from Yahoo proxy every 60s so quote math stays current.
  async function refreshEth() {
    try {
      const r = await fetch("/api/yahoo?symbols=ETH-USD", { cache: "no-store" });
      const j = await r.json();
      const px = j?.quotes?.[0]?.price;
      if (typeof px === "number" && px > 0) window.__updateEthPrice(px);
    } catch {}
  }
  refreshEth();
  setInterval(refreshEth, 60_000);

  // ---- Quote math ----
  function fmtUsd(v) { return "$" + (+v || 0).toFixed(2); }
  function recalc() {
    const oz  = +amtCrypto.value || 0;
    const usd = oz * TOKEN_PRICE_USD;
    const eth = usd / ETH_USD;
    quoteCrypto.textContent = `≈ ${eth.toFixed(4)} ETH · $${usd.toFixed(2)}`;

    const usd2 = +amtFiat.value || 0;
    const oz2  = usd2 / TOKEN_PRICE_USD;
    quoteFiat.textContent = `= ${Math.round(oz2).toLocaleString()} $CR`;
    if (payAmountEl) payAmountEl.textContent = fmtUsd(usd2);
  }
  amtCrypto.addEventListener("input", recalc);
  amtFiat.addEventListener("input", () => {
    recalc();
    stripeState.needsNewIntent = true;
  });
  recalc();

  // ---- Wallet connect (MetaMask / WalletConnect / Phantom / Solflare) ----
  const chainTabs = document.querySelectorAll(".chain-tab");
  const walletEth = document.getElementById("wallet-eth");
  const walletSol = document.getElementById("wallet-sol");
  chainTabs.forEach((t) => {
    t.addEventListener("click", () => {
      chainTabs.forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
      t.classList.add("is-active");
      t.setAttribute("aria-selected", "true");
      const c = t.dataset.chain;
      walletEth.classList.toggle("is-hidden", c !== "eth");
      walletSol.classList.toggle("is-hidden", c !== "sol");
    });
  });

  // Label each wallet button with installed/not installed detection.
  function markInstalled() {
    const has = {
      metamask: !!(window.ethereum && (window.ethereum.isMetaMask || (window.ethereum.providers || []).some((p) => p.isMetaMask))),
      walletconnect: true, // always usable via deep link / QR
      phantom: !!(window.phantom?.solana?.isPhantom || window.solana?.isPhantom),
      solflare: !!(window.solflare?.isSolflare),
    };
    document.querySelectorAll(".wallet-btn[data-wallet]").forEach((btn) => {
      const id = btn.dataset.wallet;
      const sub = btn.querySelector("[data-sub]");
      if (!sub || sub.textContent.trim()) return; // respect preset sub-labels
      sub.textContent = has[id] ? "Detected" : "Not installed";
    });
  }
  markInstalled();

  function shortAddr(a) { return a.slice(0, 6) + "…" + a.slice(-4); }
  function setStatus(msg, state = "") {
    walletStatus.textContent = msg;
    walletStatus.dataset.state = state;
  }

  async function connectMetaMask() {
    const eth = window.ethereum;
    if (!eth) {
      window.open("https://metamask.io/download/", "_blank", "noopener");
      setStatus("MetaMask not detected — install it, then try again.", "warn");
      return;
    }
    const provider = (eth.providers || []).find((p) => p.isMetaMask) || eth;
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const a = accounts?.[0];
    if (!a) throw new Error("No account returned");
    setStatus(`MetaMask connected · ${shortAddr(a)}`, "ok");
    return { chain: "eth", address: a, provider };
  }

  async function connectWalletConnect() {
    // WalletConnect v2 requires a Project ID. Until that's configured we
    // surface a clear message instead of pretending to connect.
    setStatus("WalletConnect coming soon — use MetaMask or mobile browser.", "warn");
    return null;
  }

  async function connectPhantom() {
    const sol = window.phantom?.solana || (window.solana?.isPhantom ? window.solana : null);
    if (!sol) {
      window.open("https://phantom.app/", "_blank", "noopener");
      setStatus("Phantom not detected — install it, then try again.", "warn");
      return;
    }
    const resp = await sol.connect();
    const a = resp.publicKey.toString();
    setStatus(`Phantom connected · ${shortAddr(a)}`, "ok");
    return { chain: "sol", address: a, provider: sol };
  }

  async function connectSolflare() {
    const sf = window.solflare;
    if (!sf) {
      window.open("https://solflare.com/", "_blank", "noopener");
      setStatus("Solflare not detected — install it, then try again.", "warn");
      return;
    }
    await sf.connect();
    const a = sf.publicKey?.toString();
    if (!a) throw new Error("Solflare did not return a key");
    setStatus(`Solflare connected · ${shortAddr(a)}`, "ok");
    return { chain: "sol", address: a, provider: sf };
  }

  const CONNECTORS = {
    metamask: connectMetaMask,
    walletconnect: connectWalletConnect,
    phantom: connectPhantom,
    solflare: connectSolflare,
  };

  document.querySelectorAll(".wallet-btn[data-wallet]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.wallet;
      setStatus(`Requesting ${id}…`);
      try {
        const conn = await CONNECTORS[id]();
        if (!conn) return;
        btn.classList.add("is-connected");
        btn.querySelector(".w-name").textContent = `${id[0].toUpperCase() + id.slice(1)} · ${shortAddr(conn.address)}`;
      } catch (e) {
        console.error(e);
        setStatus(e?.message || "Wallet request rejected.", "err");
      }
    });
  });

  // ---- Stripe Payment Element ----
  const stripeState = {
    stripe: null,
    elements: null,
    paymentElement: null,
    clientSecret: null,
    intentId: null,
    lastAmount: null,
    lastEmail: null,
    mode: "init", // init | live | error
    needsNewIntent: true,
  };

  async function fetchConfig() {
    try {
      const r = await fetch("/api/config", { cache: "no-store" });
      if (!r.ok) throw new Error("bad /api/config");
      return await r.json();
    } catch (e) {
      return { stripeEnabled: false, stripePublishableKey: null, tokenPriceUsd: TOKEN_PRICE_USD };
    }
  }

  async function createIntent({ email, amountUsd }) {
    const r = await fetch("/api/buy/easy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amountUsd }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || "Payment setup failed");
    return body;
  }

  function appearance() {
    return {
      theme: "night",
      variables: {
        colorPrimary: "#f4d36b",
        colorBackground: "#0e0c08",
        colorText: "#e8dfc4",
        colorDanger: "#e26a6a",
        fontFamily: "Inter, system-ui, sans-serif",
        borderRadius: "10px",
        spacingUnit: "4px",
      },
    };
  }

  async function mountPaymentElement({ email, amountUsd }) {
    if (!stripeState.stripe) return false;

    if (stripeState.elements) {
      try { stripeState.paymentElement?.unmount(); } catch {}
      stripeState.elements = null;
      stripeState.paymentElement = null;
    }

    const { clientSecret, intentId } = await createIntent({ email, amountUsd });
    if (!clientSecret) throw new Error("Could not start checkout.");
    stripeState.clientSecret = clientSecret;
    stripeState.intentId = intentId;
    stripeState.lastAmount = amountUsd;
    stripeState.lastEmail = email;

    stripeState.elements = stripeState.stripe.elements({
      clientSecret,
      appearance: appearance(),
    });
    stripeState.paymentElement = stripeState.elements.create("payment", {
      layout: { type: "tabs", defaultCollapsed: false },
      wallets: { applePay: "never", googlePay: "never" },
      fields: { billingDetails: { email: "never" } },
    });
    peMount.innerHTML = "";
    stripeState.paymentElement.mount(peMount);
    stripeState.needsNewIntent = false;
    return true;
  }

  async function initStripe() {
    const cfg = await fetchConfig();

    if (!cfg.stripeEnabled || !cfg.stripePublishableKey || typeof window.Stripe !== "function") {
      stripeState.mode = "error";
      peMount.innerHTML = `<div class="pe-placeholder">Checkout is temporarily unavailable. Please try again shortly.</div>`;
      payBtn.disabled = true;
      return;
    }

    try {
      stripeState.stripe = window.Stripe(cfg.stripePublishableKey);
      stripeState.mode = "live";
      peMount.innerHTML = `<div class="pe-placeholder">Enter your email to load secure checkout.</div>`;
    } catch (e) {
      console.error("[stripe] init failed:", e);
      stripeState.mode = "error";
      peMount.innerHTML = `<div class="pe-placeholder">Checkout is temporarily unavailable. Please try again shortly.</div>`;
      payBtn.disabled = true;
    }
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
  }

  // Re-mount Payment Element when the email becomes valid.
  emailInput.addEventListener("change", async () => {
    if (stripeState.mode !== "live") return;
    const email = emailInput.value.trim();
    const amountUsd = +amtFiat.value || 0;
    if (!validEmail(email) || amountUsd < 10) return;
    try {
      cardStatus.textContent = "Loading secure checkout…";
      cardStatus.dataset.state = "";
      await mountPaymentElement({ email, amountUsd });
      cardStatus.textContent = "";
    } catch (e) {
      cardStatus.textContent = e.message || "Couldn't load checkout.";
      cardStatus.dataset.state = "err";
    }
  });

  async function onPayClick() {
    const email = (emailInput.value || "").trim();
    const amountUsd = +amtFiat.value || 0;

    if (!validEmail(email)) {
      cardStatus.textContent = "Enter a valid email to receive the receipt.";
      cardStatus.dataset.state = "err";
      emailInput.focus();
      return;
    }
    if (amountUsd < 10) {
      cardStatus.textContent = "Minimum purchase is $10.";
      cardStatus.dataset.state = "err";
      amtFiat.focus();
      return;
    }

    if (stripeState.mode !== "live" || !stripeState.stripe) {
      cardStatus.textContent = "Checkout is temporarily unavailable. Please try again shortly.";
      cardStatus.dataset.state = "err";
      return;
    }

    try {
      payBtn.disabled = true;
      cardStatus.textContent = "Setting up secure checkout…";
      cardStatus.dataset.state = "";

      // Mount/refresh if amount or email changed.
      if (
        !stripeState.elements ||
        stripeState.needsNewIntent ||
        stripeState.lastAmount !== amountUsd ||
        stripeState.lastEmail !== email
      ) {
        await mountPaymentElement({ email, amountUsd });
        cardStatus.textContent = "Enter your card details above, then click Pay again.";
        cardStatus.dataset.state = "warn";
        payBtn.disabled = false;
        return;
      }

      cardStatus.textContent = "Confirming payment…";
      const returnUrl = new URL(window.location.href);
      returnUrl.searchParams.set("paid", "1");

      const { error, paymentIntent } = await stripeState.stripe.confirmPayment({
        elements: stripeState.elements,
        confirmParams: {
          return_url: returnUrl.toString(),
          receipt_email: email,
        },
        redirect: "if_required",
      });

      if (error) {
        cardStatus.textContent = error.message || "Payment failed.";
        cardStatus.dataset.state = "err";
        payBtn.disabled = false;
        return;
      }
      if (paymentIntent && paymentIntent.status === "succeeded") {
        const cr = Math.round(amountUsd / TOKEN_PRICE_USD);
        cardStatus.textContent = `✓ Paid $${amountUsd.toFixed(2)} — ${cr.toLocaleString()} $CR queued for ${email}.`;
        cardStatus.dataset.state = "ok";
        stripeState.needsNewIntent = true;
      } else if (paymentIntent) {
        cardStatus.textContent = `Payment status: ${paymentIntent.status}. We'll email you when it clears.`;
        cardStatus.dataset.state = "warn";
      }
      payBtn.disabled = false;
    } catch (e) {
      console.error(e);
      cardStatus.textContent = e.message || "Something went wrong.";
      cardStatus.dataset.state = "err";
      payBtn.disabled = false;
    }
  }

  payBtn.addEventListener("click", onPayClick);

  // If Stripe redirected back with ?paid=1, show a success message.
  if (new URLSearchParams(window.location.search).get("paid") === "1") {
    cardStatus.textContent = "✓ Payment confirmed. Check your inbox for the receipt.";
    cardStatus.dataset.state = "ok";
  }

  initStripe();
}

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
