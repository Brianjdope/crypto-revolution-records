// ============================================================
// Artist roster — each artist gets a procedurally-generated
// cover canvas (no external imagery needed). Algorithmic art
// in the spirit of luxury record sleeves.
// ============================================================
const ARTISTS = [
  { name: "MERIDIAN",   genre: "AI Trap",        tracks: 12, hue: 44,  seed: 7  },
  { name: "GHOST CHOIR",genre: "Synth Gospel",   tracks: 8,  hue: 268, seed: 13 },
  { name: "VAULT 808",  genre: "Crypto Drill",   tracks: 14, hue: 12,  seed: 21 },
  { name: "AURELIA",    genre: "Holo Pop",       tracks: 9,  hue: 320, seed: 5  },
  { name: "NODE/RUNNER",genre: "AI Hyperhouse",  tracks: 11, hue: 180, seed: 33 },
  { name: "THE PROOF",  genre: "Spoken Word",    tracks: 6,  hue: 90,  seed: 41 },
];

// Tiny seeded RNG so the art is stable across renders
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintCard(canvas, artist) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rng = mulberry32(artist.seed);

  // background — radial gradient driven by hue
  const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 10, w * 0.5, h * 0.5, w);
  g.addColorStop(0, `hsl(${artist.hue}, 70%, 30%)`);
  g.addColorStop(0.5, `hsl(${artist.hue}, 50%, 12%)`);
  g.addColorStop(1, "#0a0805");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // gold dust
  for (let i = 0; i < 80; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = rng() * 1.4 + 0.2;
    ctx.fillStyle = `rgba(255, 220, 130, ${rng() * 0.6})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // central glyph — a stylized goat horn / spiral
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rng() * 0.4 - 0.2);
  ctx.strokeStyle = "rgba(255, 215, 130, 0.85)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const radius = (Math.min(w, h) / 3) * (1 - i * 0.13);
    for (let a = 0; a <= Math.PI * 2; a += 0.05) {
      const wob = Math.sin(a * (3 + i) + rng() * 6) * 4;
      const x = Math.cos(a) * (radius + wob);
      const y = Math.sin(a) * (radius + wob);
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.globalAlpha = 0.4 - i * 0.06;
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // gold horn arc
  ctx.save();
  ctx.translate(w / 2, h / 2 + 20);
  ctx.strokeStyle = `hsl(46, 80%, 65%)`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, w * 0.18, Math.PI, Math.PI * 1.85);
  ctx.stroke();
  ctx.restore();

  // grain
  for (let i = 0; i < 600; i++) {
    const x = rng() * w;
    const y = rng() * h;
    ctx.fillStyle = `rgba(0,0,0,${rng() * 0.06})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // edge frame
  ctx.strokeStyle = "rgba(212,175,55,0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, w - 12, h - 12);
}

export function initRoster() {
  const grid = document.getElementById("roster-grid");
  if (!grid) return;

  grid.innerHTML = ARTISTS.map((a, i) => `
    <article class="artist-card" data-i="${i}">
      <div class="artist-art"><canvas></canvas></div>
      <div class="artist-meta">
        <div class="nm">${a.name}</div>
        <div class="gn">${a.genre}</div>
        <div class="row">
          <span>${a.tracks} tracks · streaming</span>
          <span class="price">on-chain royalties</span>
        </div>
      </div>
    </article>
  `).join("");

  // paint after layout
  requestAnimationFrame(() => {
    grid.querySelectorAll(".artist-card").forEach((card) => {
      const idx = +card.dataset.i;
      const canvas = card.querySelector("canvas");
      paintCard(canvas, ARTISTS[idx]);
    });
  });

  // tilt on hover
  grid.querySelectorAll(".artist-card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

  window.addEventListener("resize", () => {
    grid.querySelectorAll(".artist-card").forEach((card) => {
      const idx = +card.dataset.i;
      paintCard(card.querySelector("canvas"), ARTISTS[idx]);
    });
  });
}
