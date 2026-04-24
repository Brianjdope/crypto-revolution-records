// ============================================================
// Animated flag background (three.js).
// Loads assets/bg-flag.png onto a dense plane and distorts the
// vertices with a sum-of-sines shader so the flag ripples in the
// wind. Renders into #bg-canvas which sits behind all content.
// ============================================================
import * as THREE from "three";

export class FlagBackground {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    this.camera.position.set(0, 0, 7);
    this.camera.lookAt(0, 0, 0);

    const tex = new THREE.TextureLoader().load("./assets/bg-flag.png", (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = this.renderer.capabilities.getMaxAnisotropy?.() || 4;
      this._fitPlane();
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;

    this.uniforms = {
      uTime: { value: 0 },
      uTex: { value: tex },
      uWind: { value: 1.0 },
      uScrim: { value: new THREE.Color(0x0a0805) },
      uScrimAmount: { value: 0.18 }, // lighter so flag colors show
    };

    const geo = new THREE.PlaneGeometry(16, 9, 160, 90);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: false,
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uWind;
        varying vec2 vUv;
        varying float vShade;

        // Sum of sines drives a rippling cloth.
        float wave(vec2 p, float t) {
          float w  = sin(p.x *  2.1 + t * 1.6) * 0.12;
                w += sin(p.x *  4.7 - t * 1.1 + p.y * 1.3) * 0.07;
                w += sin(p.y *  3.3 + t * 0.7) * 0.05;
                w += sin((p.x + p.y) * 6.2 + t * 2.3) * 0.03;
          return w;
        }

        void main() {
          vUv = uv;
          vec3 p = position;

          // Anchor the left edge so the flag flies like a pole-mounted flag.
          float anchor = smoothstep(-8.0, -4.0, p.x); // 0 at pole, 1 free
          float amp = anchor * uWind;

          float z = wave(p.xy * 0.45, uTime) * amp;
          p.z += z;

          // Rough normal for shading — finite differences of the wave fn.
          float e = 0.15;
          float zx = wave(vec2(p.x + e, p.y) * 0.45, uTime) * amp;
          float zy = wave(vec2(p.x, p.y + e) * 0.45, uTime) * amp;
          vec3 n = normalize(vec3(-(zx - z) / e, -(zy - z) / e, 1.0));
          // Soft directional light.
          vec3 lightDir = normalize(vec3(0.4, 0.6, 0.7));
          vShade = clamp(dot(n, lightDir), 0.55, 1.25);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        uniform vec3 uScrim;
        uniform float uScrimAmount;
        varying vec2 vUv;
        varying float vShade;

        void main() {
          vec4 base = texture2D(uTex, vUv);
          vec3 shaded = base.rgb * vShade;
          // Dark scrim so the foreground copy stays readable.
          vec3 c = mix(shaded, uScrim, uScrimAmount);
          gl_FragColor = vec4(c, 1.0);
        }
      `,
    });

    this.plane = new THREE.Mesh(geo, mat);
    this.scene.add(this.plane);

    this.clock = new THREE.Clock();
    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
    this._resize();
    this._fitPlane();
    this._animate();
  }

  // Size the plane so it fills the viewport at z=0 while covering it
  // (like background-size: cover on the PNG).
  _fitPlane() {
    const aspectViewport = window.innerWidth / window.innerHeight;
    const dist = this.camera.position.z;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const viewH = 2 * Math.tan(vFov / 2) * dist;
    const viewW = viewH * this.camera.aspect;

    // cover: fit the shorter side and overflow the other
    const imgAspect = 16 / 9; // matches geometry aspect
    let w, h;
    if (aspectViewport > imgAspect) {
      w = viewW * 1.15; // slight overscan so wave ripples don't reveal edge
      h = w / imgAspect;
    } else {
      h = viewH * 1.25;
      w = h * imgAspect;
    }
    this.plane.scale.set(w / 16, h / 9, 1);
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._fitPlane();
  }

  setScroll() {}
  setSceneIndex() {}

  _animate = () => {
    const t = this.clock.getElapsedTime();
    this.uniforms.uTime.value = t;

    // Slow 3D rotation: full Y-axis spin every ~24s, with a gentle
    // X-axis tilt + Z roll so it feels like a flag flying in space
    // rather than just a wall poster.
    if (this.plane) {
      this.plane.rotation.y = Math.sin(t * 0.22) * 0.55; // sweep left/right
      this.plane.rotation.x = Math.sin(t * 0.18) * 0.18; // pitch
      this.plane.rotation.z = Math.sin(t * 0.13) * 0.08; // roll
    }

    // Camera breathing — subtle parallax on top of the rotation.
    this.camera.position.x = Math.sin(t * 0.12) * 0.18;
    this.camera.position.y = Math.cos(t * 0.09) * 0.12;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this._animate);
  };
}
