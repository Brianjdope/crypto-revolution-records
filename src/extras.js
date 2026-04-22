// ============================================================
// "Pro touches": press strip, FAQ accordion, newsletter signup,
// cookie consent banner, social links. Pure DOM, zero deps.
// ============================================================
const FAQS = [
  {
    q: "What is Crypto Revolution Records?",
    a: "An AI-native music label co-founded by OZ The Crypto Goat. Every release is minted on-chain, every royalty is split by smart contract, and every fan can hold a piece of the label through the $OZ token.",
  },
  {
    q: "Is $OZ a security?",
    a: "$OZ is a utility token granting access to drops, governance, and creator royalties. We are not making investment claims and recommend you consult counsel in your jurisdiction before participating.",
  },
  {
    q: "How are artists paid?",
    a: "On-chain. Streams, sales, and licensing fees route through a royalty contract that splits revenue to the artist, the label, and $OZ holders the moment they settle.",
  },
  {
    q: "Do I need a wallet to buy?",
    a: "No. You can pay with credit card or Apple Pay through our fiat onramp — your tokens land in a custodial wallet you control. Bring your own wallet to claim them at any time.",
  },
  {
    q: "Where is the label based?",
    a: "Everywhere and nowhere. Operating entity: Crypto Revolution Records, Inc. (Wyoming, USA). Treasury and governance live on-chain.",
  },
];

const PRESS = [
  { name: "BILLBOARD",  w: 124 },
  { name: "PITCHFORK",  w: 128 },
  { name: "COINDESK",   w: 130 },
  { name: "ROLLING STONE", w: 152 },
  { name: "THE BLOCK",  w: 116 },
  { name: "RESIDENT ADVISOR", w: 174 },
];

const SOCIALS = [
  { label: "X / Twitter", href: "#", svg: '<path d="M18.244 2H21.5l-7.4 8.46L23 22h-6.84l-5.36-7.01L4.66 22H1.4l7.93-9.06L1 2h7l4.85 6.41L18.244 2zm-2.4 18h1.86L7.27 4H5.27l10.574 16z"/>' },
  { label: "Instagram",   href: "#", svg: '<path d="M12 2.16c3.2 0 3.58 0 4.84.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23.07 1.27.07 1.65.07 4.84s0 3.58-.07 4.84c-.05 1.17-.25 1.8-.42 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.27.07-1.65.07-4.84.07s-3.58 0-4.84-.07c-1.17-.05-1.8-.25-2.23-.42-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.17-.42-.37-1.06-.42-2.23C2.16 15.58 2.16 15.2 2.16 12s0-3.58.07-4.84c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.42 2.16 8.8 2.16 12 2.16zm0 2.16c-3.13 0-3.5 0-4.74.07-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.04C2.66 8.5 2.66 8.87 2.66 12s0 3.5.07 4.74c.05 1.07.23 1.65.38 2.04.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.04.38 1.24.07 1.61.07 4.74.07s3.5 0 4.74-.07c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.04.07-1.24.07-1.61.07-4.74s0-3.5-.07-4.74c-.05-1.07-.23-1.65-.38-2.04-.2-.51-.44-.88-.83-1.27-.39-.39-.76-.63-1.27-.83-.39-.15-.97-.33-2.04-.38C15.5 4.32 15.13 4.32 12 4.32zm0 3.68a4 4 0 110 8 4 4 0 010-8zm0 6.6a2.6 2.6 0 100-5.2 2.6 2.6 0 000 5.2zm5.1-6.78a.94.94 0 11-1.88 0 .94.94 0 011.88 0z"/>' },
  { label: "TikTok",      href: "#", svg: '<path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005.8 20.1a6.34 6.34 0 0010.86-4.43V8.62a8.16 8.16 0 004.77 1.52V6.69h-1.84z"/>' },
  { label: "YouTube",     href: "#", svg: '<path d="M21.6 7.2a2.5 2.5 0 00-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 002.4 7.2C2 8.77 2 12 2 12s0 3.23.4 4.8a2.5 2.5 0 001.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 001.76-1.77C22 15.23 22 12 22 12s0-3.23-.4-4.8zM10 15V9l5.2 3-5.2 3z"/>' },
  { label: "Discord",     href: "#", svg: '<path d="M20.32 4.37A19.79 19.79 0 0016.43 3a14.9 14.9 0 00-.76 1.55 18.27 18.27 0 00-5.34 0A14.9 14.9 0 009.57 3a19.79 19.79 0 00-3.89 1.37C2.36 9.04 1.55 13.6 1.96 18.09a19.93 19.93 0 006.05 3.06 14.61 14.61 0 001.3-2.11 12.86 12.86 0 01-2.05-.99c.17-.13.34-.26.5-.4a14.21 14.21 0 0012.48 0c.16.14.33.27.5.4a12.85 12.85 0 01-2.05.99 14.6 14.6 0 001.3 2.11 19.93 19.93 0 006.05-3.06c.5-5.18-.83-9.71-3.72-13.72zM8.74 15.32c-1.18 0-2.15-1.09-2.15-2.42s.96-2.42 2.15-2.42c1.18 0 2.15 1.09 2.15 2.42s-.97 2.42-2.15 2.42zm6.52 0c-1.18 0-2.15-1.09-2.15-2.42s.97-2.42 2.15-2.42 2.15 1.09 2.15 2.42-.97 2.42-2.15 2.42z"/>' },
];

export function initExtras() {
  buildPress();
  buildFAQ();
  buildNewsletter();
  buildSocials();
  buildCookieBanner();
}

function buildPress() {
  const el = document.getElementById("press-strip");
  if (!el) return;
  el.innerHTML = PRESS.map(
    (p) => `<span class="press-logo" style="--w:${p.w}px">${p.name}</span>`
  ).join("");
}

function buildFAQ() {
  const el = document.getElementById("faq-list");
  if (!el) return;
  el.innerHTML = FAQS.map(
    (f, i) => `
    <li>
      <button class="faq-q" aria-expanded="false" aria-controls="faq-a-${i}">
        <span>${f.q}</span>
        <span class="faq-icon" aria-hidden="true">+</span>
      </button>
      <div class="faq-a" id="faq-a-${i}" hidden>${f.a}</div>
    </li>
  `
  ).join("");

  el.querySelectorAll(".faq-q").forEach((btn) => {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      // close siblings
      el.querySelectorAll(".faq-q").forEach((b) => {
        b.setAttribute("aria-expanded", "false");
        b.parentElement.querySelector(".faq-a").hidden = true;
        b.querySelector(".faq-icon").textContent = "+";
      });
      if (!open) {
        btn.setAttribute("aria-expanded", "true");
        btn.parentElement.querySelector(".faq-a").hidden = false;
        btn.querySelector(".faq-icon").textContent = "–";
      }
    });
  });
}

function buildNewsletter() {
  const form = document.getElementById("newsletter-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.querySelector("input[type=email]");
    const status = form.querySelector(".nl-status");
    const value = (input.value || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      status.textContent = "Enter a valid email to join the herd.";
      status.dataset.state = "err";
      return;
    }
    status.textContent = "✓ Welcome to the herd. Check your inbox.";
    status.dataset.state = "ok";
    input.value = "";
  });
}

function buildSocials() {
  const el = document.getElementById("socials");
  if (!el) return;
  el.innerHTML = SOCIALS.map(
    (s) => `
    <a href="${s.href}" aria-label="${s.label}" rel="noopener">
      <svg viewBox="0 0 24 24" aria-hidden="true">${s.svg}</svg>
    </a>
  `
  ).join("");
}

function buildCookieBanner() {
  if (localStorage.getItem("oz-cookie") === "1") return;
  const el = document.createElement("div");
  el.className = "cookie";
  el.innerHTML = `
    <p>We use light analytics to count herd-members. No tracking, no resale. By staying you accept our <a href="#">policy</a>.</p>
    <button class="cookie-ok">Accept</button>
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("is-in"));
  el.querySelector(".cookie-ok").addEventListener("click", () => {
    localStorage.setItem("oz-cookie", "1");
    el.classList.remove("is-in");
    setTimeout(() => el.remove(), 400);
  });
}
