// ============================================================
// $CR tokenomics — donut chart drawn with Canvas 2D so we don't
// pull in another dep. Animates on first reveal.
// ============================================================
const SLICES = [
  { label: "Artist & creator pool",  pct: 30, color: "#f4d36b", note: "Royalties + signing bonuses" },
  { label: "Public sale",            pct: 22, color: "#d4af37", note: "DEX + Apple Pay onramp" },
  { label: "Community treasury",     pct: 18, color: "#a8821e", note: "DAO-governed grants" },
  { label: "Team (4y vest)",         pct: 12, color: "#8a6a1f", note: "OZ + core contributors" },
  { label: "Liquidity",              pct: 10, color: "#6b5cff", note: "Locked LPs" },
  { label: "Strategic partners",     pct: 5,  color: "#4f449a", note: "Studios, distros" },
  { label: "Airdrop · early herd",   pct: 3,  color: "#ef9c4a", note: "First listeners" },
];

function drawDonut(canvas, t) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = Math.min(canvas.clientWidth, 520);
  if (canvas.width !== size * dpr) {
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size * 0.45;
  const rInner = size * 0.31;
  const gap = 0.014;

  // background ring
  ctx.beginPath();
  ctx.arc(cx, cy, (rOuter + rInner) / 2, 0, Math.PI * 2);
  ctx.lineWidth = rOuter - rInner;
  ctx.strokeStyle = "rgba(212,175,55,0.06)";
  ctx.stroke();

  let start = -Math.PI / 2;
  const easeT = 1 - Math.pow(1 - t, 3);
  for (const s of SLICES) {
    const sweep = (s.pct / 100) * Math.PI * 2 * easeT;
    if (sweep <= 0.001) {
      start += (s.pct / 100) * Math.PI * 2;
      continue;
    }
    const end = start + sweep - gap;

    const grad = ctx.createLinearGradient(cx - rOuter, cy - rOuter, cx + rOuter, cy + rOuter);
    grad.addColorStop(0, lighten(s.color, 0.35));
    grad.addColorStop(1, s.color);

    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, start, end);
    ctx.arc(cx, cy, rInner, end, start, true);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // subtle outline
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.stroke();

    start += (s.pct / 100) * Math.PI * 2;
  }

  // gold inner glow ring
  ctx.beginPath();
  ctx.arc(cx, cy, rInner - 4, 0, Math.PI * 2);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(244, 211, 107, 0.4)";
  ctx.stroke();
}

function lighten(hex, amt) {
  const h = hex.replace("#", "");
  const num = parseInt(h, 16);
  let r = (num >> 16) + Math.round(255 * amt);
  let g = ((num >> 8) & 0xff) + Math.round(255 * amt);
  let b = (num & 0xff) + Math.round(255 * amt);
  r = Math.min(255, r); g = Math.min(255, g); b = Math.min(255, b);
  return `rgb(${r}, ${g}, ${b})`;
}

function renderLegend(el) {
  el.innerHTML = SLICES.map((s) => `
    <li>
      <span class="swatch" style="background:${s.color}"></span>
      <span class="label">
        <strong>${s.label}</strong>
        <span>${s.note}</span>
      </span>
      <span class="pct">${s.pct}%</span>
    </li>
  `).join("");
}

export function initTokenomics() {
  const canvas = document.getElementById("token-canvas");
  const legend = document.getElementById("token-legend");
  if (!canvas || !legend) return;

  renderLegend(legend);

  let progress = 0;
  let started = false;
  let raf;

  function animate() {
    progress = Math.min(1, progress + 0.012);
    drawDonut(canvas, progress);
    if (progress < 1) raf = requestAnimationFrame(animate);
  }

  // initial empty draw so we don't see a flash
  drawDonut(canvas, 0);

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && !started) {
        started = true;
        cancelAnimationFrame(raf);
        animate();
      }
    });
  }, { threshold: 0.35 });
  obs.observe(canvas);

  window.addEventListener("resize", () => drawDonut(canvas, progress));
}
