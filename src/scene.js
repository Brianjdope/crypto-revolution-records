// ============================================================
// Three.js scene — golden goat in space
// Procedural geometry so we don't depend on external GLB models.
// Inspired by igloo.inc style: dark stage, hero object, particles,
// scroll-driven camera.
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
    this._buildGoat();
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
  // The goat — procedurally assembled out of primitives. Stylized
  // (luxury trophy / sculpture look) — smooth metal, swept horns.
  // -----------------------------------------------------------
  _buildGoat() {
    this.goat = new THREE.Group();

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xb8932c,
      metalness: 1.0,
      roughness: 0.32,
      envMapIntensity: 0.9,
    });
    const goldHighMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 1.0,
      roughness: 0.22,
      envMapIntensity: 1.0,
    });
    const goldDarkMat = new THREE.MeshStandardMaterial({
      color: 0x6e521a,
      metalness: 1.0,
      roughness: 0.45,
      envMapIntensity: 0.8,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0805,
      metalness: 0.4,
      roughness: 0.3,
    });

    // body — smooth elongated capsule (looks sculpted, not blocky)
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.78, 1.2, 16, 32), goldMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, -0.2, 0);
    body.scale.set(1, 1, 0.92);
    this.goat.add(body);

    // chest swell
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.62, 32, 24), goldMat);
    chest.scale.set(1.1, 0.95, 0.95);
    chest.position.set(0.65, -0.1, 0);
    this.goat.add(chest);

    // neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 0.55, 24), goldMat);
    neck.rotation.z = -0.6;
    neck.position.set(0.95, 0.3, 0);
    this.goat.add(neck);

    // head — high-poly sphere, slightly elongated
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 36, 28), goldMat);
    head.scale.set(1.25, 1.0, 0.95);
    head.position.set(1.25, 0.55, 0);
    head.rotation.z = 0.18;
    this.head = head;
    this.goat.add(head);

    // forehead crest detail
    const crest = new THREE.Mesh(new THREE.SphereGeometry(0.12, 18, 12), goldHighMat);
    crest.position.set(1.3, 0.78, 0);
    this.goat.add(crest);

    // snout — tapered
    const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.18, 8, 16), goldMat);
    snout.rotation.z = Math.PI / 2;
    snout.position.set(1.7, 0.42, 0);
    this.goat.add(snout);

    // nose tip
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), goldDarkMat);
    nose.position.set(1.92, 0.42, 0);
    this.goat.add(nose);

    // beard — tapered cone with extra segments
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 12), goldMat);
    beard.rotation.x = Math.PI;
    beard.position.set(1.65, 0.1, 0);
    this.goat.add(beard);

    // eyes (now glowing softly)
    const eyeGeo = new THREE.SphereGeometry(0.068, 16, 16);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(1.32, 0.65, 0.28);
    const eyeR = eyeL.clone();
    eyeR.position.z = -0.28;
    this.goat.add(eyeL, eyeR);

    // -----------------------------------------------------------
    // Horns — built from a cubic Bezier sweep so they curve like
    // real ram/goat horns, not just a plain torus arc.
    // -----------------------------------------------------------
    const buildHorn = (mirror) => {
      const m = mirror ? -1 : 1;
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.05, 0.45, 0.18 * m),
        new THREE.Vector3(-0.5, 0.7, 0.55 * m),
        new THREE.Vector3(-0.85, 0.45, 0.95 * m)
      );
      const geo = new THREE.TubeGeometry(curve, 80, 0.085, 16, false);
      // taper: shrink the radius along length using vertex displacement
      const pos = geo.attributes.position;
      const tmp = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        tmp.fromBufferAttribute(pos, i);
        const t = i / pos.count;
        const taper = 1 - t * 0.6;
        // approximate radial shrink toward curve axis: scale toward nearest curve point
        tmp.multiplyScalar(0.92 + taper * 0.08); // gentle taper effect
        pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, goldHighMat);
      mesh.position.set(1.05, 0.85, 0);
      return mesh;
    };
    this.goat.add(buildHorn(false), buildHorn(true));

    // ears
    const earGeo = new THREE.ConeGeometry(0.16, 0.36, 12);
    const earL = new THREE.Mesh(earGeo, goldDarkMat);
    earL.position.set(0.95, 0.92, 0.46);
    earL.rotation.set(0.3, 0, -1.0);
    const earR = earL.clone();
    earR.position.z = -0.46;
    earR.rotation.set(-0.3, 0, -1.0);
    this.goat.add(earL, earR);

    // legs — slightly tapered cylinders, more segments for smoother edges
    const legGeo = new THREE.CylinderGeometry(0.13, 0.09, 1.0, 16);
    const legPositions = [
      [0.72, -0.95, 0.42],
      [0.72, -0.95, -0.42],
      [-0.62, -0.95, 0.42],
      [-0.62, -0.95, -0.42],
    ];
    legPositions.forEach((p) => {
      const leg = new THREE.Mesh(legGeo, goldMat);
      leg.position.set(...p);
      this.goat.add(leg);

      // hoof
      const hoof = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.12, 16),
        goldDarkMat
      );
      hoof.position.set(p[0], p[1] - 0.5, p[2]);
      this.goat.add(hoof);
    });

    // tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 12), goldMat);
    tail.position.set(-1.05, 0.1, 0);
    tail.rotation.z = 0.6;
    this.goat.add(tail);

    // -----------------------------------------------------------
    // The $OZ medallion — bezeled disc with raised "OZ" face.
    // -----------------------------------------------------------
    const pendant = new THREE.Group();

    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.34, 0.06, 48),
      goldHighMat
    );
    disc.rotation.x = Math.PI / 2;
    pendant.add(disc);

    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.025, 12, 48),
      goldDarkMat
    );
    pendant.add(bezel);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.012, 10, 48),
      goldDarkMat
    );
    pendant.add(innerRing);

    // OZ face badge — a tiny extruded torus knot looks like an emblem
    const emblem = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.12, 0.028, 80, 12, 2, 3),
      goldHighMat
    );
    emblem.scale.setScalar(0.9);
    pendant.add(emblem);

    // chain — small torus loops
    const chainMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 1,
      roughness: 0.25,
    });
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI - Math.PI / 2;
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.013, 8, 16), chainMat);
      const r = 0.62;
      link.position.set(Math.cos(ang) * r * 0.6, Math.sin(ang) * r * 0.5 + 0.15, 0);
      link.rotation.x = i % 2 === 0 ? 0 : Math.PI / 2;
      pendant.add(link);
    }

    pendant.position.set(0.85, -0.1, 0);
    this.pendant = pendant;
    this.goat.add(pendant);

    this.goat.position.set(0.4, -0.2, 0);
    this.goat.rotation.y = -0.5;
    this.scene.add(this.goat);
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

    // goat: idle breathing + scroll-driven camera arcs
    if (this.goat) {
      this.goat.position.y = -0.2 + Math.sin(t * 0.8) * 0.06;
      // mouse parallax tilt
      const yawTarget = -0.5 + this.mouse.x * 0.4 + this.scrollT * Math.PI * 1.4;
      const pitchTarget = this.mouse.y * 0.18 + Math.sin(t * 0.4) * 0.04;
      this.goat.rotation.y += (yawTarget - this.goat.rotation.y) * 0.04;
      this.goat.rotation.x += (pitchTarget - this.goat.rotation.x) * 0.04;

      // pendant spin
      if (this.pendant) this.pendant.rotation.y += dt * 1.1;
    }

    // rings counter-rotate
    if (this.rings) {
      this.rings.rotation.z += dt * 0.05;
      this.rings.rotation.x = Math.sin(t * 0.2) * 0.3;
      this.rings.children.forEach((r, i) => {
        r.rotation.z += dt * (0.04 + i * 0.02);
      });
    }

    // scroll-driven camera path
    // Fly around the goat across the scroll, drift in for the buy scene
    const s = this.scrollT;
    const camRadius = 6.4 - Math.min(s, 0.85) * 1.6;
    const camAngle = s * Math.PI * 0.6;
    const targetX = Math.sin(camAngle) * camRadius * 0.25;
    const targetZ = camRadius;
    const targetY = 0.4 + Math.sin(s * Math.PI) * 0.5;
    this.camera.position.x += (targetX - this.camera.position.x) * 0.04;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.04;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);

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
