// ============================================================
// Main orchestrator. Boots the Three.js stage, then progressively
// initializes each section. Uses Lenis for smooth scroll, and
// IntersectionObserver for reveal-on-scroll + scene tracking.
// ============================================================
import { CryptoScene } from "./scene.js";
import { initCryptoTicker } from "./crypto.js";
import { initTokenomics } from "./tokenomics.js";
import { initRoster } from "./roster.js";
import { initMusicPlayer } from "./music.js";
import { initRoadmap } from "./roadmap.js";
import { initBuy } from "./buy.js";
import { initExtras } from "./extras.js";

// ---------- Loader ----------
const loader = document.getElementById("loader");
const loaderFill = document.getElementById("loader-fill");
const loaderStatus = document.getElementById("loader-status");
const loaderMessages = [
  "minting the gold goat…",
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
  else {
    setTimeout(() => loader.classList.add("is-done"), 350);
  }
}
tickLoader();

// ---------- Three.js stage ----------
const canvas = document.getElementById("bg-canvas");
const stage = new CryptoScene(canvas);

// ---------- Smooth scroll (Lenis) ----------
let scroll = { y: 0, max: 1, t: 0 };
let lenis;

(async () => {
  try {
    const mod = await import("lenis");
    const Lenis = mod.default || mod.Lenis;
    lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    lenis.on("scroll", ({ scroll: y, limit }) => {
      stage.setScroll(Math.max(0, Math.min(1, y / Math.max(1, limit))));
    });
  } catch (e) {
    // graceful fallback to native scroll
    window.addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      stage.setScroll(window.scrollY / Math.max(1, max));
    }, { passive: true });
  }
})();

// nav anchor smoothing — works whether lenis loaded or not
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href").slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(el, { duration: 1.4, offset: -40 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

// ---------- Section observer ----------
const sectionList = Array.from(document.querySelectorAll("section[data-scene]"));
const sectionObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        const idx = sectionList.indexOf(en.target);
        if (idx !== -1) stage.setSceneIndex(idx);
      }
    });
  },
  { threshold: 0.4 }
);
sectionList.forEach((s) => sectionObs.observe(s));

// ---------- Reveal on scroll ----------
document.querySelectorAll(".mission-grid article, .coin-card, .token-legend li, .artist-card, .timeline li, .buy-card, h2, .lede, .hero-stats, .hero-actions").forEach((el) => {
  el.classList.add("reveal-up");
});
const revealObs = new IntersectionObserver(
  (entries) => {
    entries.forEach((en, i) => {
      if (en.isIntersecting) {
        setTimeout(() => en.target.classList.add("is-in"), i * 60);
        revealObs.unobserve(en.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll(".reveal-up").forEach((el) => revealObs.observe(el));

// ---------- Hero h1 line stagger ----------
document.querySelectorAll(".hero h1 .line").forEach((line, i) => {
  line.style.transform = "translateY(110%)";
  line.style.transition = `transform 1.1s cubic-bezier(.2,.8,.2,1) ${0.2 + i * 0.12}s`;
  requestAnimationFrame(() => requestAnimationFrame(() => (line.style.transform = "translateY(0)")));
});

// ---------- Boot the sections ----------
initRoster();
initMusicPlayer();
initRoadmap();
initTokenomics();
initBuy();
initExtras();
initCryptoTicker().then(() => {
  // animate hero stats now that the page is "live"
  if (window.__updateBuyStats) {
    window.__updateBuyStats(12_500_000, 4287, 168);
  }
});

// ---------- Tiny console signature ----------
console.log(
  "%cCRYPTO REVOLUTION %c· OZ THE CRYPTO GOAT",
  "color:#f4d36b;font:700 14px serif;letter-spacing:.3em",
  "color:#b9ad8b;font:400 12px monospace;letter-spacing:.3em"
);
