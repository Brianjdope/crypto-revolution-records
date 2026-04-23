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
    if (document.body.classList.contains("is-paged")) {
      goToPanel(id);
    } else if (lenis) {
      lenis.scrollTo(el, { duration: 1.4, offset: -40 });
    } else {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ---------- Paged mode ----------
// One section per viewport. Switched via nav, prev/next arrows, keyboard
// arrows, and a dotted index at the bottom.
const PANELS = [
  { id: "hero",    label: "Home"      },
  { id: "mission", label: "Manifesto" },
  { id: "market",  label: "Market"    },
  { id: "token",   label: "$CR"       },
  { id: "roster",  label: "Artists"   },
  { id: "play",    label: "Listen"    },
  { id: "roadmap", label: "Roadmap"   },
  { id: "buy",     label: "Buy"       },
  { id: "faq",     label: "FAQ"       },
  { id: "join",    label: "Join"      },
];
let activePanel = 0;

function renderDots() {
  const dots = document.getElementById("pager-dots");
  if (!dots) return;
  dots.innerHTML = PANELS.map(
    (p, i) => `<button type="button" data-idx="${i}" data-label="${p.label}" aria-label="${p.label}"></button>`
  ).join("");
  dots.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-idx]");
    if (!b) return;
    goToPanel(PANELS[+b.dataset.idx].id);
  });
}

function setActive(idx) {
  idx = Math.max(0, Math.min(PANELS.length - 1, idx));
  activePanel = idx;
  const target = PANELS[idx].id;
  document.querySelectorAll("main > section, main > footer").forEach((el) => {
    el.classList.toggle("is-active", el.id === target);
  });
  // scroll each panel to top whenever it activates
  const activeEl = document.getElementById(target);
  if (activeEl) activeEl.scrollTop = 0;
  document.querySelectorAll("#pager-dots button").forEach((b, i) => {
    b.classList.toggle("is-active", i === idx);
  });
  const prev = document.getElementById("pager-prev");
  const next = document.getElementById("pager-next");
  if (prev) prev.disabled = idx === 0;
  if (next) next.disabled = idx === PANELS.length - 1;
  stage.setSceneIndex(idx);
  stage.setScroll(idx / Math.max(1, PANELS.length - 1));
  if (location.hash !== "#" + target) {
    history.replaceState(null, "", "#" + target);
  }
}

function goToPanel(id) {
  const idx = PANELS.findIndex((p) => p.id === id);
  if (idx !== -1) setActive(idx);
}

function initPager() {
  document.body.classList.add("is-paged");
  // Hide non-panel sections (press strip) in paged mode
  document.querySelectorAll("main > section:not([id])").forEach((el) => {
    el.style.display = "none";
  });
  // Ensure footer is positioned like a panel
  const footer = document.querySelector("main > footer");
  if (footer && !footer.id) footer.id = "join";
  renderDots();
  document.getElementById("pager-prev")?.addEventListener("click", () => setActive(activePanel - 1));
  document.getElementById("pager-next")?.addEventListener("click", () => setActive(activePanel + 1));
  window.addEventListener("keydown", (e) => {
    if (e.target?.closest?.("input, textarea")) return;
    const k = e.key;
    if (k === " " || k === "Spacebar" || k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || k === "Enter") {
      e.preventDefault();
      setActive(activePanel + (e.shiftKey ? -1 : 1));
    } else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || k === "Backspace") {
      e.preventDefault();
      setActive(activePanel - 1);
    } else if (k === "Home") setActive(0);
    else if (k === "End") setActive(PANELS.length - 1);
  });

  // Wheel / trackpad — advance one panel per gesture, with a cooldown so
  // a single flick doesn't blow through three sections.
  let wheelCooldown = 0;
  let wheelAcc = 0;
  window.addEventListener("wheel", (e) => {
    const active = document.querySelector("main > section.is-active, main > footer.is-active");
    if (active) {
      const atTop = active.scrollTop <= 0;
      const atBottom = active.scrollTop + active.clientHeight >= active.scrollHeight - 2;
      // let the panel scroll internally when its content overflows
      if (e.deltaY > 0 && !atBottom) return;
      if (e.deltaY < 0 && !atTop) return;
    }
    const now = performance.now();
    if (now < wheelCooldown) return;
    wheelAcc += e.deltaY;
    if (Math.abs(wheelAcc) < 40) return;
    if (wheelAcc > 0) setActive(activePanel + 1);
    else setActive(activePanel - 1);
    wheelAcc = 0;
    wheelCooldown = now + 650;
  }, { passive: true });

  // Touch swipe — vertical swipe advances panels
  let touchStartY = null;
  window.addEventListener("touchstart", (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (touchStartY == null) return;
    const dy = (e.changedTouches[0].clientY ?? touchStartY) - touchStartY;
    touchStartY = null;
    if (Math.abs(dy) < 60) return;
    const active = document.querySelector("main > section.is-active, main > footer.is-active");
    if (active) {
      if (dy < 0 && active.scrollTop + active.clientHeight < active.scrollHeight - 2) return;
      if (dy > 0 && active.scrollTop > 2) return;
    }
    setActive(activePanel + (dy < 0 ? 1 : -1));
  }, { passive: true });
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id) goToPanel(id);
  });
  const start = PANELS.findIndex((p) => p.id === location.hash.slice(1));
  setActive(start >= 0 ? start : 0);

  const hint = document.getElementById("pager-hint");
  if (hint) {
    setTimeout(() => hint.classList.add("is-in"), 600);
    setTimeout(() => hint.classList.add("is-faded"), 6000);
  }
}
initPager();

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
