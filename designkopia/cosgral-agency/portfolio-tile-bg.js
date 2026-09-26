/**
 * Portfolio category WebGL backgrounds — light or dark fields that follow the cursor.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";

(function () {
  "use strict";

  var canvas = document.querySelector("[data-portfolio-tile-bg]");
  if (!canvas) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;

  var THEMES = {
    web: {
      clear: 0x070709,
      base: [0.035, 0.035, 0.045],
      tint: [0.16, 0.17, 0.22],
      accent: [0.42, 0.45, 0.55],
      light: false,
    },
    systems: {
      clear: 0xf4f4f6,
      base: [0.97, 0.97, 0.98],
      tint: [0.88, 0.9, 0.94],
      accent: [0.62, 0.66, 0.78],
      light: true,
    },
    video: {
      clear: 0x050505,
      base: [0.02, 0.02, 0.025],
      tint: [0.14, 0.13, 0.16],
      accent: [0.55, 0.5, 0.48],
      light: false,
    },
    graphics: {
      clear: 0xf3ebe2,
      base: [0.95, 0.92, 0.88],
      tint: [0.86, 0.8, 0.72],
      accent: [0.72, 0.62, 0.5],
      light: true,
    },
  };

  var themeKey = "web";
  var theme = THEMES.web;
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var running = false;
  var renderer = null;
  var uniforms = null;
  var t0 = performance.now();

  function applyDomTheme(key) {
    var t = THEMES[key] || THEMES.web;
    document.body.setAttribute("data-tile-theme", key);
    document.body.classList.toggle("is-tile-bg-light", !!t.light);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", t.light ? "#f4f4f6" : "#070709");
    }
  }

  function setTheme(key) {
    if (!THEMES[key]) key = "web";
    themeKey = key;
    theme = THEMES[key];
    applyDomTheme(key);
    if (!renderer || !uniforms) return;
    renderer.setClearColor(theme.clear, 1);
    uniforms.uBase.value.fromArray(theme.base);
    uniforms.uTint.value.fromArray(theme.tint);
    uniforms.uAccent.value.fromArray(theme.accent);
    uniforms.uLight.value = theme.light ? 1 : 0;
  }

  function onPointer(e) {
    pointer.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    pointer.ty = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
  }

  function resize() {
    if (!renderer || !uniforms) return;
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }

  function tick(now) {
    if (!running) return;
    window.requestAnimationFrame(tick);
    var t = (now - t0) * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.1;
    pointer.y += (pointer.ty - pointer.y) * 0.1;
    uniforms.uTime.value = REDUCED ? 0 : t;
    uniforms.uMouse.value.set(pointer.x, pointer.y);
    renderer.render(uniforms.__scene, uniforms.__camera);
  }

  function boot() {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: !MOBILE,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch (err) {
      console.warn("[portfolio-tile-bg] WebGL unavailable", err);
      applyDomTheme(document.body.getAttribute("data-tile-theme") || "web");
      window.__portfolioTileBg = { setTheme: setTheme, resize: function () {} };
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2));
    renderer.setClearColor(theme.clear, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uBase: { value: new THREE.Vector3().fromArray(theme.base) },
      uTint: { value: new THREE.Vector3().fromArray(theme.tint) },
      uAccent: { value: new THREE.Vector3().fromArray(theme.accent) },
      uLight: { value: theme.light ? 1 : 0 },
      __scene: scene,
      __camera: camera,
    };

    var mat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: [
        "varying vec2 vUv;",
        "void main(){",
        "  vUv = uv;",
        "  gl_Position = vec4(position.xy, 0.0, 1.0);",
        "}",
      ].join("\n"),
      fragmentShader: [
        "precision highp float;",
        "varying vec2 vUv;",
        "uniform float uTime;",
        "uniform vec2 uMouse;",
        "uniform vec2 uRes;",
        "uniform vec3 uBase;",
        "uniform vec3 uTint;",
        "uniform vec3 uAccent;",
        "uniform float uLight;",
        "void main(){",
        "  vec2 uv = vUv;",
        "  vec2 m = uMouse * 0.5 + 0.5;",
        "  vec2 p = uv - 0.5;",
        "  p.x *= uRes.x / max(uRes.y, 1.0);",
        "  float d = length(uv - m);",
        "  float pulse = 0.5 + 0.5 * sin(uTime * 0.9 + d * 10.0);",
        "  float rip = sin(d * 18.0 - uTime * 2.8) * exp(-d * 2.4);",
        "  float glow = smoothstep(1.05, 0.0, d) * (0.42 + pulse * 0.22);",
        "  float band = 0.07 * sin((uv.x + uMouse.x * 0.25) * 18.0 + uTime * 0.55)",
        "             * sin((uv.y + uMouse.y * 0.25) * 12.0 - uTime * 0.4);",
        "  vec3 col = mix(uBase, uTint, glow);",
        "  col = mix(col, uAccent, clamp(rip * 0.55 + band, 0.0, 0.65));",
        "  float vig = smoothstep(1.25, 0.25, length(p));",
        "  col *= mix(uLight > 0.5 ? 0.94 : 0.72, 1.0, vig);",
        "  gl_FragColor = vec4(col, 1.0);",
        "}",
      ].join("\n"),
    });

    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", resize, { passive: true });
    resize();
    setTheme(document.body.getAttribute("data-tile-theme") || "web");
    running = true;
    window.requestAnimationFrame(tick);
    window.__portfolioTileBg = { setTheme: setTheme, resize: resize };
    window.dispatchEvent(new CustomEvent("portfolio-tile-bg-ready"));
  }

  boot();
})();
