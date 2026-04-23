// ============================================================
// Music player — synthesizes track previews with the WebAudio API
// (no external audio files required). Each track is a short
// procedural loop with a unique vibe. Hooks up to a canvas
// visualizer for the gold "now playing" stage.
// ============================================================
const TRACKS = [
  { title: "Gold Standard",      artist: "OZ The Crypto Goat",  duration: "2:34", nft: "MINTED",  bpm: 92,  key: "C#", scale: [0, 3, 7, 10, 14], pad: 110, pulse: "trap" },
  { title: "Mint Condition",     artist: "MERIDIAN x VAULT 808",duration: "3:12", nft: "1/100",   bpm: 140, key: "F",  scale: [0, 5, 7, 10, 12], pad: 165, pulse: "house" },
  { title: "Tokenize My Soul",   artist: "GHOST CHOIR",         duration: "4:01", nft: "MINTED",  bpm: 76,  key: "A",  scale: [0, 3, 5, 7, 10], pad: 220, pulse: "ambient" },
  { title: "Proof of Work",      artist: "THE PROOF",           duration: "3:48", nft: "1/250",   bpm: 128, key: "D",  scale: [0, 3, 5, 7, 12], pad: 146, pulse: "drill" },
  { title: "Holo Jam",           artist: "AURELIA",             duration: "3:22", nft: "MINTED",  bpm: 118, key: "G",  scale: [0, 4, 7, 11, 14], pad: 196, pulse: "pop" },
  { title: "Run the Node",       artist: "NODE/RUNNER",         duration: "2:55", nft: "1/50",    bpm: 132, key: "E",  scale: [0, 3, 7, 10, 12], pad: 165, pulse: "house" },
];

let ctx, master, analyser, currentNodes = [], rafViz, currentIndex = -1;

function ensureContext() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  ctx = new C();
  master = ctx.createGain();
  master.gain.value = 0.0;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  master.connect(analyser);
  analyser.connect(ctx.destination);
  return ctx;
}

function noteToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function startTrack(track) {
  ensureContext();
  if (ctx.state === "suspended") ctx.resume();
  stopTrack(false);

  const now = ctx.currentTime;
  const beat = 60 / track.bpm;

  // ---- Pad: warm gold-toned pad ----
  const pad = ctx.createOscillator();
  pad.type = "sawtooth";
  pad.frequency.value = track.pad / 2;
  const padGain = ctx.createGain();
  padGain.gain.value = 0.05;
  const padFilter = ctx.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 800;
  padFilter.Q.value = 4;
  pad.connect(padFilter).connect(padGain).connect(master);
  pad.start(now);

  // gentle filter sweep
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 400;
  lfo.connect(lfoGain).connect(padFilter.frequency);
  lfo.start(now);

  // ---- Bass ----
  const bass = ctx.createOscillator();
  bass.type = "triangle";
  bass.frequency.value = noteToFreq(36 + (track.scale[0]));
  const bassGain = ctx.createGain();
  bassGain.gain.value = 0.0;
  bass.connect(bassGain).connect(master);
  bass.start(now);

  // ---- Lead arp (scheduler running ahead in 1s windows) ----
  let nextArpTime = now + 0.05;
  let arpStep = 0;
  const arpInterval = beat / 2;

  function scheduleArp() {
    if (!ctx) return;
    while (nextArpTime < ctx.currentTime + 0.6) {
      const noteIdx = track.scale[arpStep % track.scale.length];
      const midi = 60 + noteIdx + (Math.floor(arpStep / track.scale.length) % 2) * 12;
      const freq = noteToFreq(midi);

      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, nextArpTime);
      g.gain.linearRampToValueAtTime(0.06, nextArpTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, nextArpTime + arpInterval * 0.9);

      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 2200;

      o.connect(f).connect(g).connect(master);
      o.start(nextArpTime);
      o.stop(nextArpTime + arpInterval);

      // bass on every 4 steps
      if (arpStep % 4 === 0) {
        bassGain.gain.setValueAtTime(0.18, nextArpTime);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, nextArpTime + beat * 0.9);
        bass.frequency.setValueAtTime(noteToFreq(36 + track.scale[(arpStep / 4) % track.scale.length]), nextArpTime);
      }

      // kick on the 1
      if (arpStep % 8 === 0) {
        kick(nextArpTime);
      }
      // hat on offbeats
      if (arpStep % 2 === 1) {
        hat(nextArpTime, 0.05);
      }
      // snare/clap on the 5
      if (arpStep % 8 === 4) {
        snare(nextArpTime);
      }

      nextArpTime += arpInterval;
      arpStep++;
    }
    schedRaf = requestAnimationFrame(scheduleArp);
  }
  let schedRaf = requestAnimationFrame(scheduleArp);

  // fade master in
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0.5, now + 0.4);

  currentNodes = [pad, lfo, bass, { stop: () => cancelAnimationFrame(schedRaf) }];
}

function kick(t) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.6, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.3);
}

function snare(t) {
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  noise.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 1500;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.25, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  noise.connect(f).connect(g).connect(master);
  noise.start(t);
  noise.stop(t + 0.2);
}

function hat(t, amp = 0.04) {
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  noise.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(amp, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  noise.connect(f).connect(g).connect(master);
  noise.start(t);
  noise.stop(t + 0.06);
}

function stopTrack(fade = true) {
  if (!ctx) return;
  const now = ctx.currentTime;
  if (fade && master) {
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.25);
  }
  setTimeout(() => {
    currentNodes.forEach((n) => {
      try { n.stop?.(); } catch {}
      try { n.disconnect?.(); } catch {}
    });
    currentNodes = [];
  }, fade ? 280 : 0);
}

// ---------- Visualizer ----------
function startViz() {
  const canvas = document.getElementById("viz-canvas");
  if (!canvas || !analyser) return;
  const ctx2 = canvas.getContext("2d");
  const data = new Uint8Array(analyser.frequencyBinCount);

  function frame() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2.clearRect(0, 0, w, h);

    analyser.getByteFrequencyData(data);

    // soft glow
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx2.createRadialGradient(cx, cy, 10, cx, cy, w / 1.5);
    grad.addColorStop(0, "rgba(244, 211, 107, 0.25)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx2.fillStyle = grad;
    ctx2.fillRect(0, 0, w, h);

    // circular bars
    const bars = 96;
    const radius = Math.min(w, h) * 0.22;
    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * data.length * 0.6);
      const v = data[idx] / 255;
      const a = (i / bars) * Math.PI * 2;
      const len = 16 + v * 80;
      const x1 = cx + Math.cos(a) * radius;
      const y1 = cy + Math.sin(a) * radius;
      const x2 = cx + Math.cos(a) * (radius + len);
      const y2 = cy + Math.sin(a) * (radius + len);
      ctx2.strokeStyle = `hsl(${44 + v * 20}, 80%, ${40 + v * 30}%)`;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.moveTo(x1, y1);
      ctx2.lineTo(x2, y2);
      ctx2.stroke();
    }

    // center disc
    ctx2.beginPath();
    ctx2.arc(cx, cy, radius - 6, 0, Math.PI * 2);
    ctx2.fillStyle = "rgba(10, 8, 5, 0.9)";
    ctx2.fill();
    ctx2.strokeStyle = "rgba(244, 211, 107, 0.5)";
    ctx2.lineWidth = 1;
    ctx2.stroke();

    rafViz = requestAnimationFrame(frame);
  }
  cancelAnimationFrame(rafViz);
  rafViz = requestAnimationFrame(frame);
}

function paintIdleViz() {
  const canvas = document.getElementById("viz-canvas");
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const grad = c.createRadialGradient(cx, cy, 10, cx, cy, w / 1.5);
  grad.addColorStop(0, "rgba(244, 211, 107, 0.18)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(244, 211, 107, 0.35)";
  c.lineWidth = 1;
  c.beginPath();
  c.arc(cx, cy, Math.min(w, h) * 0.22, 0, Math.PI * 2);
  c.stroke();
}

export function initMusicPlayer() {
  const list = document.getElementById("tracklist");
  const npTitle = document.getElementById("np-title");
  const npArtist = document.getElementById("np-artist");
  const playBtn = document.getElementById("play-btn");
  if (!list) return;

  list.innerHTML = TRACKS.map((t, i) => `
    <li data-i="${i}">
      <span class="idx">${String(i + 1).padStart(2, "0")}</span>
      <span class="meta">
        <span class="t">${t.title}</span>
        <span class="a">${t.artist}</span>
      </span>
      <span class="dur">${t.duration}</span>
      <span class="nft">${t.nft}</span>
    </li>
  `).join("");

  function playIndex(i) {
    if (currentIndex === i && playBtn.classList.contains("is-playing")) {
      stopTrack();
      playBtn.classList.remove("is-playing");
      cancelAnimationFrame(rafViz);
      paintIdleViz();
      return;
    }
    currentIndex = i;
    const t = TRACKS[i];
    npTitle.textContent = t.title;
    npArtist.textContent = t.artist;
    list.querySelectorAll("li").forEach((el) =>
      el.classList.toggle("is-active", +el.dataset.i === i)
    );
    startTrack(t);
    startViz();
    playBtn.classList.add("is-playing");
  }

  list.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", () => playIndex(+li.dataset.i));
  });

  playBtn.addEventListener("click", () => {
    if (currentIndex === -1) return playIndex(0);
    playIndex(currentIndex);
  });

  paintIdleViz();
  window.addEventListener("resize", paintIdleViz);
}
