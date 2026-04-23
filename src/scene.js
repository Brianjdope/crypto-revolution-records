// ============================================================
// Three.js scene — golden Bitcoin-B coiled by a rattlesnake.
// Gadsden-flag "don't tread on my sats" energy, rendered as a
// procedural metal emblem. Centerpiece in the hero, then drifts
// into the background as the user scrolls.
// ============================================================
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export class CryptoScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scrollT = 0; // 0..1 site scroll progress
    this.sceneIndex = 0; // active section
    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);

    this._initRenderer();
    this._initScene();
    this._initEnvironment();
    this._initLights();
    this._buildEmblem();
    this._buildParticles();
    this._buildRings();
    this._buildGrid();
    this._initPostProcessing();

    this.clock = new THREE.Clock();
    window.addEventListener("resize", () => this._resize());
    window.addEventListener("pointermove", (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    this._resize();
    this._animate();
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.85;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0805, 0.022);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    this.camera.position.set(0, 0.4, 6.4);
    this.camera.lookAt(0, 0, 0);
  }

  _initEnvironment() {
    // a small studio environment so polished metal actually has reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = env;
    pmrem.dispose();
  }

  _initLights() {
    // hemisphere fills with sky/ground bias — keeps shadows readable
    const hemi = new THREE.HemisphereLight(0xfff3b0, 0x100a02, 0.4);
    this.scene.add(hemi);

    // warm key light from upper right (gold)
    this.key = new THREE.DirectionalLight(0xffe7a8, 1.5);
    this.key.position.set(4, 5, 3);
    this.scene.add(this.key);

    // cool rim light from behind
    this.rim = new THREE.DirectionalLight(0x6b5cff, 0.7);
    this.rim.position.set(-4, 2, -4);
    this.scene.add(this.rim);

    // a moving point light for shimmer
    this.shimmer = new THREE.PointLight(0xffd86b, 0.9, 14, 1.4);
    this.shimmer.position.set(0, 1.5, 2.5);
    this.scene.add(this.shimmer);
  }

  _initPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom — only the brightest highlights glow. Strength low,
    // threshold high; otherwise the whole goat turns into a torch.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.4, 0.85);
    this.composer.addPass(this.bloom);

    this.composer.addPass(new OutputPass());
  }

  // -----------------------------------------------------------
  // Emblem — ornate bitcoin coin with a rattlesnake coiled around
  // it. Gadsden-flag silhouette, luxury-metal finish. `this.goat`
  // is kept as the external handle so the scroll rig and any
  // external code using that name keeps working.
  // -----------------------------------------------------------
  _buildEmblem() {
    this.goat = new THREE.Group();

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xb8932c,
      metalness: 1.0,
      roughness: 0.32,
      envMapIntensity: 0.9,
    });
    const goldHighMat = new THREE.MeshStandardMaterial({
      color: 0xe9c24a,
      metalness: 1.0,
      roughness: 0.18,
      envMapIntensity: 1.1,
    });
    const goldDarkMat = new THREE.MeshStandardMaterial({
      color: 0x6e521a,
      metalness: 1.0,
      roughness: 0.45,
      envMapIntensity: 0.8,
    });
    const onyxMat = new THREE.MeshStandardMaterial({
      color: 0x0a0805,
      metalness: 0.6,
      roughness: 0.28,
    });
    const snakeMat = new THREE.MeshStandardMaterial({
      color: 0x9a7a22,
      metalness: 1.0,
      roughness: 0.38,
      envMapIntensity: 0.95,
    });
    const snakeScaleMat = new THREE.MeshStandardMaterial({
      color: 0x4a3710,
      metalness: 1.0,
      roughness: 0.55,
      envMapIntensity: 0.6,
    });

    // -----------------------------------------------------------
    // 1. The coin — an ornate bezeled disc that carries the B.
    // -----------------------------------------------------------
    const coin = new THREE.Group();
    const coinR = 1.15;

    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(coinR, coinR, 0.14, 96),
      goldMat
    );
    face.rotation.x = Math.PI / 2;
    coin.add(face);

    // outer rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(coinR, 0.075, 20, 120),
      goldHighMat
    );
    coin.add(rim);

    // inner bezel ring
    const bezelInner = new THREE.Mesh(
      new THREE.TorusGeometry(coinR - 0.12, 0.018, 12, 120),
      goldDarkMat
    );
    coin.add(bezelInner);

    // decorative dot ring (like old coins)
    const dotRingR = coinR - 0.22;
    const dots = 56;
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * Math.PI * 2;
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 10, 8),
        goldHighMat
      );
      d.position.set(Math.cos(a) * dotRingR, Math.sin(a) * dotRingR, 0.075);
      coin.add(d);
    }

    // engraved filigree — a subtle sun-ray pattern around the B
    const rays = 24;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * Math.PI * 2;
      const ray = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.018, 0.008),
        goldDarkMat
      );
      ray.position.set(Math.cos(a) * (coinR - 0.48), Math.sin(a) * (coinR - 0.48), 0.075);
      ray.rotation.z = a;
      coin.add(ray);
    }

    // -----------------------------------------------------------
    // 2. The Bitcoin "B" — extruded 2D shape with two bowl holes
    //    and the iconic vertical strike bars poking out top/bottom.
    // -----------------------------------------------------------
    const B = new THREE.Shape();
    // Outer silhouette — clockwise from top-left of the top strike bar
    B.moveTo(-0.40, 0.85);
    B.lineTo(-0.20, 0.85);
    B.lineTo(-0.20, 0.70);
    B.lineTo(0.05, 0.70);
    B.bezierCurveTo(0.55, 0.70, 0.55, 0.15, 0.05, 0.15);
    B.bezierCurveTo(0.62, 0.15, 0.62, -0.50, 0.05, -0.50);
    B.lineTo(-0.20, -0.50);
    B.lineTo(-0.20, -0.65);
    B.lineTo(-0.40, -0.65);
    B.lineTo(-0.40, -0.50);
    B.lineTo(-0.52, -0.50);
    B.lineTo(-0.52, 0.70);
    B.lineTo(-0.40, 0.70);
    B.lineTo(-0.40, 0.85);

    // top bowl inner hole
    const topHole = new THREE.Path();
    topHole.moveTo(-0.20, 0.55);
    topHole.lineTo(0.05, 0.55);
    topHole.bezierCurveTo(0.32, 0.55, 0.32, 0.30, 0.05, 0.30);
    topHole.lineTo(-0.20, 0.30);
    topHole.lineTo(-0.20, 0.55);
    B.holes.push(topHole);

    // bottom bowl inner hole
    const botHole = new THREE.Path();
    botHole.moveTo(-0.20, 0.0);
    botHole.lineTo(0.05, 0.0);
    botHole.bezierCurveTo(0.40, 0.0, 0.40, -0.35, 0.05, -0.35);
    botHole.lineTo(-0.20, -0.35);
    botHole.lineTo(-0.20, 0.0);
    B.holes.push(botHole);

    const bGeo = new THREE.ExtrudeGeometry(B, {
      depth: 0.22,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.028,
      bevelSegments: 4,
      curveSegments: 64,
    });
    bGeo.center();
    const bMesh = new THREE.Mesh(bGeo, goldHighMat);
    bMesh.position.set(0, 0, 0.15);
    coin.add(bMesh);

    this.coin = coin;
    this.goat.add(coin);

    // keep `this.pendant` as the spinning accent ring (external API)
    const pendant = new THREE.Group();
    const spinRing = new THREE.Mesh(
      new THREE.TorusGeometry(coinR + 0.18, 0.014, 10, 180),
      goldHighMat
    );
    pendant.add(spinRing);
    const spinRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(coinR + 0.32, 0.008, 8, 180),
      goldDarkMat
    );
    spinRing2.rotation.x = Math.PI / 12;
    pendant.add(spinRing2);
    this.pendant = pendant;
    this.goat.add(pendant);

    // -----------------------------------------------------------
    // 3. The rattlesnake — tube geometry following a curve that
    //    coils around the back of the coin and peeks in front.
    // -----------------------------------------------------------
    const snake = new THREE.Group();

    // Define a coiling spline. The snake body wraps behind the coin
    // (z<0), crosses to the right side in front (z>0), then the
    // head rears up on the left-top.
    const coilR = coinR + 0.22;
    const bodyPts = [];
    // tail start (lower-right behind coin)
    bodyPts.push(new THREE.Vector3( 1.85, -0.85, -0.55));
    bodyPts.push(new THREE.Vector3( 1.45, -0.75, -0.35));
    bodyPts.push(new THREE.Vector3( 1.10, -0.90, -0.15));
    // wrap along the bottom of the coin, behind it
    const wrapSteps = 22;
    for (let i = 0; i < wrapSteps; i++) {
      const t = i / (wrapSteps - 1);
      // start at -45deg, go clockwise around the back to +180
      const a = -Math.PI * 0.25 - t * Math.PI * 1.6;
      const r = coilR + Math.sin(t * Math.PI) * 0.05;
      const z = -0.35 - Math.sin(t * Math.PI) * 0.25; // stays behind coin
      bodyPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
    }
    // body crosses in front of the coin on the left side
    bodyPts.push(new THREE.Vector3(-1.25, 0.55, 0.05));
    bodyPts.push(new THREE.Vector3(-1.05, 0.80, 0.30));
    bodyPts.push(new THREE.Vector3(-0.75, 0.95, 0.50));
    // neck rears up
    bodyPts.push(new THREE.Vector3(-0.45, 1.25, 0.70));
    bodyPts.push(new THREE.Vector3(-0.22, 1.55, 0.85));
    // head base
    bodyPts.push(new THREE.Vector3(-0.05, 1.72, 0.92));

    const spine = new THREE.CatmullRomCurve3(bodyPts, false, "catmullrom", 0.4);

    // Taper along length — thick near tail/middle, thinner toward head & toward rattle.
    const segCount = 260;
    const radialCount = 14;
    // Build a TubeGeometry then non-uniformly scale radii per-ring.
    const tubeGeo = new THREE.TubeGeometry(spine, segCount, 0.12, radialCount, false);
    const pos = tubeGeo.attributes.position;
    const v = new THREE.Vector3();
    // TubeGeometry lays out vertices in (segCount+1) rings of radialCount+1 verts.
    // For each vertex, compute its ring index and shrink toward spine accordingly.
    // We reconstruct ring centers by sampling the spine at t = ring/segCount.
    for (let ring = 0; ring <= segCount; ring++) {
      const t = ring / segCount;
      const center = spine.getPointAt(t);
      // thickness profile: thicker in the coiled middle, thin at rattle & head
      let thickness;
      if (t < 0.08) thickness = 0.55 + t * 4.5;          // rattle side: narrow
      else if (t > 0.94) thickness = 1.2 - (t - 0.94) * 8; // head taper
      else thickness = 0.95 + Math.sin((t - 0.08) / 0.86 * Math.PI) * 0.15;
      for (let rad = 0; rad <= radialCount; rad++) {
        const idx = ring * (radialCount + 1) + rad;
        v.fromBufferAttribute(pos, idx);
        const dx = v.x - center.x;
        const dy = v.y - center.y;
        const dz = v.z - center.z;
        v.set(center.x + dx * thickness, center.y + dy * thickness, center.z + dz * thickness);
        pos.setXYZ(idx, v.x, v.y, v.z);
      }
    }
    pos.needsUpdate = true;
    tubeGeo.computeVertexNormals();
    const body = new THREE.Mesh(tubeGeo, snakeMat);
    snake.add(body);

    // Scale ridges — small rings along the body suggesting diamondback pattern
    const ridgeCount = 42;
    for (let i = 2; i < ridgeCount; i++) {
      const t = i / ridgeCount;
      if (t < 0.06 || t > 0.94) continue;
      const p = spine.getPointAt(t);
      const tan = spine.getTangentAt(t).normalize();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.115, 0.012, 6, 18),
        snakeScaleMat
      );
      ring.position.copy(p);
      ring.lookAt(p.clone().add(tan));
      snake.add(ring);
    }

    // Rattle — stacked tapered discs at the tail end
    const rattleStart = bodyPts[0].clone();
    const rattleDir = new THREE.Vector3(0.2, -0.1, -0.25).normalize();
    for (let i = 0; i < 7; i++) {
      const s = 0.09 - i * 0.008;
      const seg = new THREE.Mesh(
        new THREE.ConeGeometry(s, 0.08, 14, 1, true),
        goldDarkMat
      );
      seg.position.copy(rattleStart).add(rattleDir.clone().multiplyScalar(0.09 + i * 0.095));
      seg.lookAt(rattleStart.clone().add(rattleDir));
      seg.rotateX(Math.PI / 2);
      snake.add(seg);
    }
    this.rattle = rattleDir; // saved for idle shake

    // -----------------------------------------------------------
    // 4. Head — wedge-shaped viper skull w/ fangs + forked tongue
    // -----------------------------------------------------------
    const head = new THREE.Group();
    const headPos = bodyPts[bodyPts.length - 1].clone().add(new THREE.Vector3(0.12, 0.12, 0.05));

    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 28, 20),
      snakeMat
    );
    skull.scale.set(1.35, 0.75, 0.95);
    head.add(skull);

    // brow ridge — darker scaled top
    const brow = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 16),
      snakeScaleMat
    );
    brow.scale.set(1.32, 0.28, 0.9);
    brow.position.set(-0.02, 0.11, 0);
    head.add(brow);

    // eyes — two small dark globes with a hint of yellow highlight
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xffc64a,
      metalness: 0.3,
      roughness: 0.2,
      emissive: 0x3a2a00,
      emissiveIntensity: 0.8,
    });
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x070503, roughness: 0.1 });
    const eyeGeo = new THREE.SphereGeometry(0.048, 16, 12);
    const pupilGeo = new THREE.SphereGeometry(0.028, 12, 10);
    [[-0.02, 0.05, 0.15], [-0.02, 0.05, -0.15]].forEach((p) => {
      const e = new THREE.Mesh(eyeGeo, eyeMat);
      e.position.set(...p);
      head.add(e);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(p[0] + 0.018, p[1], p[2] * 0.9);
      head.add(pupil);
    });

    // nostrils
    [[0.22, -0.02, 0.06], [0.22, -0.02, -0.06]].forEach((p) => {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), pupilMat);
      n.position.set(...p);
      head.add(n);
    });

    // jaw — lower half, slightly agape
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.19, 24, 18), snakeMat);
    jaw.scale.set(1.25, 0.35, 0.85);
    jaw.position.set(0.02, -0.10, 0);
    head.add(jaw);

    // fangs — two small curved cones
    const fangMat = new THREE.MeshStandardMaterial({
      color: 0xfff3b0,
      metalness: 0.2,
      roughness: 0.2,
    });
    [[0.14, -0.09, 0.07], [0.14, -0.09, -0.07]].forEach((p) => {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.12, 10), fangMat);
      fang.position.set(...p);
      fang.rotation.x = Math.PI;
      fang.rotation.z = 0.15;
      head.add(fang);
    });

    // forked tongue — two thin ribbons
    const tongueMat = new THREE.MeshStandardMaterial({
      color: 0x801616,
      metalness: 0.1,
      roughness: 0.4,
      emissive: 0x220404,
    });
    const tongueBase = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.008, 0.22, 10), tongueMat);
    tongueBase.rotation.z = -Math.PI / 2;
    tongueBase.position.set(0.32, -0.05, 0);
    head.add(tongueBase);
    [0.05, -0.05].forEach((zoff) => {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.003, 0.11, 10), tongueMat);
      tip.rotation.z = -Math.PI / 2;
      tip.rotation.y = zoff > 0 ? -0.5 : 0.5;
      tip.position.set(0.48, -0.05, zoff);
      head.add(tip);
    });

    head.position.copy(headPos);
    // orient head to look slightly away from coin
    head.rotation.y = -0.25;
    head.rotation.z = 0.32;
    this.snakeHead = head;
    snake.add(head);

    this.snake = snake;
    this.goat.add(snake);

    // place emblem — angled so the front face catches the key light
    this.goat.position.set(0, 0, 0);
    this.goat.rotation.y = -0.2;
    this.goat.rotation.x = 0.05;
    this.scene.add(this.goat);

    // cache materials so we can fade them as the emblem drifts to bg
    this._emblemMaterials = [
      goldMat, goldHighMat, goldDarkMat,
      snakeMat, snakeScaleMat, eyeMat, tongueMat,
    ];
    this._emblemMaterials.forEach((m) => { m.transparent = true; });
  }

  _buildParticles() {
    // gold dust
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.5;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      sizes[i] = Math.random() * 0.04 + 0.005;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffd86b) },
      },
      vertexShader: /* glsl */ `
        attribute float size;
        uniform float uTime;
        varying float vAlpha;
        void main(){
          vec3 p = position;
          float wob = sin(uTime * 0.4 + position.x * 0.4) * 0.15;
          p.y += wob;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = size * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
          vAlpha = clamp(1.0 - (-mv.z) / 16.0, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  _buildRings() {
    // a couple of orbital rings around the goat for "tokenized" feel
    this.rings = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const r = 2.6 + i * 0.45;
      const geo = new THREE.TorusGeometry(r, 0.006, 8, 220);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0.18 - i * 0.04,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
      ring.rotation.y = (Math.random() - 0.5) * 0.4;
      this.rings.add(ring);
    }
    this.scene.add(this.rings);
  }

  _buildGrid() {
    // a faint floor grid that fades out — only visible in market/buy scenes
    const grid = new THREE.GridHelper(40, 40, 0x4a3a14, 0x1a1208);
    grid.position.y = -2.2;
    grid.material.transparent = true;
    grid.material.opacity = 0;
    this.grid = grid;
    this.scene.add(grid);
  }

  setScroll(t) {
    this.scrollT = t;
  }
  setSceneIndex(i) {
    this.sceneIndex = i;
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.composer) {
      this.composer.setSize(w, h);
      this.bloom?.setSize(w, h);
    }
  }

  _animate = () => {
    const t = this.clock.getElapsedTime();
    const dt = Math.min(this.clock.getDelta(), 0.05);

    // smooth mouse lerp
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // particle time
    this.particles.material.uniforms.uTime.value = t;

    // shimmer light orbits
    this.shimmer.position.x = Math.cos(t * 0.7) * 3;
    this.shimmer.position.z = Math.sin(t * 0.7) * 3 + 1;
    this.shimmer.position.y = 1.5 + Math.sin(t * 1.3) * 0.4;

    const s = this.scrollT;
    // how "backgrounded" the emblem is: 0 = hero centerpiece, 1 = deep bg
    const bg = Math.min(1, Math.max(0, (s - 0.05) / 0.45));
    const bgEase = bg * bg * (3 - 2 * bg);

    // emblem: idle drift + scroll-driven slide into background
    if (this.goat) {
      this.goat.position.y = 0 + Math.sin(t * 0.6) * 0.08 - bgEase * 0.6;
      this.goat.position.x = -bgEase * 1.1;
      this.goat.position.z = -bgEase * 4.5;
      // slow continuous rotation, with mouse parallax on top
      const yawTarget = -0.2 + this.mouse.x * 0.25 + s * Math.PI * 0.8 + t * 0.06;
      const pitchTarget = 0.05 + this.mouse.y * 0.14 + Math.sin(t * 0.35) * 0.03;
      this.goat.rotation.y += (yawTarget - this.goat.rotation.y) * 0.04;
      this.goat.rotation.x += (pitchTarget - this.goat.rotation.x) * 0.04;
      const scale = 1 - bgEase * 0.55;
      this.goat.scale.setScalar(scale);

      // fade emblem materials as it backgrounds (never fully gone)
      if (this._emblemMaterials) {
        const op = 1 - bgEase * 0.55;
        this._emblemMaterials.forEach((m) => { m.opacity = op; });
      }

      // pendant / accent rings keep spinning
      if (this.pendant) {
        this.pendant.rotation.z += dt * 0.9;
        this.pendant.rotation.y += dt * 0.4;
      }

      // snake head sway + tongue flicker via head scale pulse
      if (this.snakeHead) {
        this.snakeHead.rotation.z = 0.32 + Math.sin(t * 1.1) * 0.06;
        this.snakeHead.rotation.y = -0.25 + Math.sin(t * 0.7) * 0.08;
      }
    }

    // rings counter-rotate
    if (this.rings) {
      this.rings.rotation.z += dt * 0.05;
      this.rings.rotation.x = Math.sin(t * 0.2) * 0.3;
      this.rings.children.forEach((r, i) => {
        r.rotation.z += dt * (0.04 + i * 0.02);
      });
    }

    // camera stays mostly parked; subtle dolly on deep scroll
    const targetX = this.mouse.x * 0.15;
    const targetY = 0.2 + this.mouse.y * 0.15 - bgEase * 0.3;
    const targetZ = 6.4 + bgEase * 0.6;
    this.camera.position.x += (targetX - this.camera.position.x) * 0.04;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.04;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.04;
    this.camera.lookAt(-bgEase * 0.6, -bgEase * 0.3, 0);

    // grid only fades in mid-scroll
    if (this.grid) {
      const target = Math.max(0, Math.min(1, (s - 0.25) * 2)) * 0.6 *
        Math.max(0, 1 - Math.max(0, s - 0.85) * 4);
      this.grid.material.opacity += (target - this.grid.material.opacity) * 0.05;
    }

    if (this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    requestAnimationFrame(this._animate);
  };
}
