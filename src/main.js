// ============================================================
// Main orchestrator + section pager.
//
// Sections are full-viewport panels. Inside a panel, the trackpad /
// wheel scrolls normally so users can READ overflowing content.
// Panel advance rules:
//   • Spacebar     → next  (Shift+Space → previous)
//   • Arrow/PgUp/  → same as space
//   • Overscroll   → a firm extra trackpad gesture past the top or
//                    bottom edge advances (with a cooldown)
// Regular scrolling inside a panel never advances — only overscroll
// at the panel edge does.
// ============================================================
import { FlagBackground } from "./flag.js";
import { initCryptoTicker } from "./crypto.js";
import { initRoster } from "./roster.js";
import { initBuy } from "./buy.js";
import { initExtras } from "./extras.js";

// ---------- Loader ----------
const loader = document.getElementById("loader");
const loaderFill = document.getElementById("loader-fill");
const loaderStatus = document.getElementById("loader-status");
const loaderMessages = [
  "igniting the revolution…",
  "indexing the chain…",
  "tuning the studio…",
  "warming the herd…",
  "ready.",
];
let loadProgress = 0;
function tickLoader() {
  loadProgress = Math.min(100, loadProgress + 6 + Math.random() * 12);
  loaderFill.style.width = loadProgress + "%";
  const msgIdx = Math.min(loaderMessages.length - 1, Math.floor((loadProgress / 100) * loaderMessages.length));
  loaderStatus.textContent = loaderMessages[msgIdx];
  if (loadProgress < 100) setTimeout(tickLoader, 220);
  else setTimeout(() => loader.classList.add("is-done"), 350);
}
tickLoader();

// ---------- Three.js stage ----------
const canvas = document.getElementById("bg-canvas");
const stage = new FlagBackground(canvas);

// ---------- Section pager ----------
document.documentElement.classList.add("pager-mode");
const panels = Array.from(document.querySelectorAll("main > section, main > footer"));
const total = panels.length;
let activeIdx = 0;

// Build hint / counter.
const hint = document.createElement("div");
hint.className = "pager-hint";
hint.innerHTML = `
  <button class="ph-btn" id="ph-prev" aria-label="Previous section">↑</button>
  <span class="ph-label"><span id="ph-num">1</span> / ${total}</span>
  <span class="ph-sep">·</span>
  <span class="ph-key">SPACE</span>
  <button class="ph-btn" id="ph-next" aria-label="Next section">↓</button>
`;
document.body.appendChild(hint);
const phNum = hint.querySelector("#ph-num");

function setActive(next) {
  next = Math.max(0, Math.min(total - 1, next));
  if (next === activeIdx) return;
  panels[activeIdx].classList.remove("is-active");
  panels[next].classList.add("is-active");
  activeIdx = next;
  phNum.textContent = String(next + 1);

  // Drive the 3D scene.
  stage.setSceneIndex(next);
  stage.setScroll(total > 1 ? next / (total - 1) : 0);

  // Trigger reveals inside the newly active panel.
  panels[next].querySelectorAll(".reveal-up").forEach((el, i) => {
    setTimeout(() => el.classList.add("is-in"), 80 + i * 60);
  });

  // Update URL hash for back/forward + linkability.
  const id = panels[next].id;
  if (id) history.replaceState(null, "", "#" + id);
}

function goToId(id) {
  const idx = panels.findIndex((p) => p.id === id);
  if (idx !== -1) setActive(idx);
}

// Mark first panel active immediately.
panels[0].classList.add("is-active");
panels[0].querySelectorAll(".reveal-up").forEach((el, i) => {
  setTimeout(() => el.classList.add("is-in"), 600 + i * 60);
});

// Deep-link via #hash on load.
if (location.hash) {
  const id = location.hash.slice(1);
  const idx = panels.findIndex((p) => p.id === id);
  if (idx > 0) {
    panels[0].classList.remove("is-active");
    panels[idx].classList.add("is-active");
    activeIdx = idx;
    phNum.textContent = String(idx + 1);
    stage.setSceneIndex(idx);
    stage.setScroll(idx / (total - 1));
  }
}

// ---------- Reveal classes (applied, triggered per-panel) ----------
document.querySelectorAll(
  ".mission-grid article, .coin-card, .token-legend li, .artist-card, .timeline li, .buy-card, h2, .lede, .hero-stats, .hero-actions"
).forEach((el) => el.classList.add("reveal-up"));

// ---------- Hero h1 line stagger ----------
document.querySelectorAll(".hero h1 .line").forEach((line, i) => {
  line.style.transform = "translateY(110%)";
  line.style.transition = `transform 1.1s cubic-bezier(.2,.8,.2,1) ${0.2 + i * 0.12}s`;
  requestAnimationFrame(() => requestAnimationFrame(() => (line.style.transform = "translateY(0)")));
});

// ---------- Input handlers ----------
function inEditable(target) {
  if (!target || !target.closest) return false;
  return !!target.closest("input, textarea, select, [contenteditable='true']");
}

// Spacebar advance.
window.addEventListener("keydown", (e) => {
  if (inEditable(e.target)) return;
  const k = e.key;
  if (k === " " || k === "Spacebar") {
    e.preventDefault();
    setActive(activeIdx + (e.shiftKey ? -1 : 1));
    return;
  }
  if (k === "ArrowDown" || k === "PageDown") { e.preventDefault(); setActive(activeIdx + 1); return; }
  if (k === "ArrowUp"   || k === "PageUp")   { e.preventDefault(); setActive(activeIdx - 1); return; }
  if (k === "Home") { e.preventDefault(); setActive(0); return; }
  if (k === "End")  { e.preventDefault(); setActive(total - 1); return; }
});

// Trackpad / wheel — scrolls the active panel internally. Only when
// the user keeps pushing past the top/bottom edge (overscroll) does
// it advance. Cooldown prevents a single flick from skipping panels.
let wheelCooldown = 0;
let overscrollAcc = 0;
window.addEventListener(
  "wheel",
  (e) => {
    if (inEditable(e.target)) return;
    const active = panels[activeIdx];
    if (!active) return;
    const atTop    = active.scrollTop <= 0;
    const atBottom = active.scrollTop + active.clientHeight >= active.scrollHeight - 1;
    const goingDown = e.deltaY > 0;
    const goingUp   = e.deltaY < 0;

    // Plenty of room to scroll inside the panel → let the browser handle it.
    if (goingDown && !atBottom) { overscrollAcc = 0; return; }
    if (goingUp   && !atTop)    { overscrollAcc = 0; return; }

    // At an edge — accumulate overscroll until it's firm enough to advance.
    const now = performance.now();
    if (now < wheelCooldown) return;
    overscrollAcc += e.deltaY;
    if (Math.abs(overscrollAcc) < 120) return; // firmer threshold than before

    if (overscrollAcc > 0) setActive(activeIdx + 1);
    else                   setActive(activeIdx - 1);
    overscrollAcc = 0;
    wheelCooldown = now + 700;
  },
  { passive: true }
);

// Touch swipe — only when at the panel edge, to mirror wheel behavior.
let touchStartY = null;
window.addEventListener("touchstart", (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener("touchend", (e) => {
  if (touchStartY == null) return;
  const dy = (e.changedTouches[0].clientY ?? touchStartY) - touchStartY;
  touchStartY = null;
  if (Math.abs(dy) < 80) return;
  const active = panels[activeIdx];
  if (!active) return;
  const atTop    = active.scrollTop <= 0;
  const atBottom = active.scrollTop + active.clientHeight >= active.scrollHeight - 1;
  if (dy < 0 && !atBottom) return; // still room to scroll down inside panel
  if (dy > 0 && !atTop)    return; // still room to scroll up inside panel
  setActive(activeIdx + (dy < 0 ? 1 : -1));
}, { passive: true });

// Pager hint buttons.
hint.querySelector("#ph-prev").addEventListener("click", () => setActive(activeIdx - 1));
hint.querySelector("#ph-next").addEventListener("click", () => setActive(activeIdx + 1));

// Nav anchor + in-page link support — jump to the panel.
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").slice(1);
    if (!id) return;
    const idx = panels.findIndex((p) => p.id === id);
    if (idx === -1) return;
    e.preventDefault();
    setActive(idx);
  });
});

window.addEventListener("hashchange", () => {
  const id = location.hash.slice(1);
  if (id) goToId(id);
});

// ---------- Boot the sections ----------
initRoster();
initBuy();
initExtras();
initCryptoTicker().then(() => {
  // First paint uses fallback numbers so nothing looks empty.
  if (window.__updateBuyStats) {
    window.__updateBuyStats(12_500_000, 4287, 168);
  }
});

// Whenever DexScreener gives us a fresh $CR read, pipe it into the hero
// stats and anywhere else that cares.
window.addEventListener("cr-live", (e) => {
  const d = e.detail || {};
  if (window.__updateBuyStats) {
    const cap     = d.marketCap  || d.liquidity * 10 || 12_500_000;
    const holders = d.txns24h    ? Math.max(1000, Math.round(d.txns24h * 8)) : 4287;
    const tracks  = 168;
    window.__updateBuyStats(cap, holders, tracks);
  }
  if (window.__updateLivePrice) {
    window.__updateLivePrice(d.price);
  }
});

// ---------- Console signature ----------
console.log(
  "%cCRYPTO REVOLUTION %c· AI MUSIC RECORD LABEL",
  "color:#f4d36b;font:700 14px serif;letter-spacing:.3em",
  "color:#b9ad8b;font:400 12px monospace;letter-spacing:.3em"
);
