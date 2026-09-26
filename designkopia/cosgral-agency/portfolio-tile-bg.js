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
      base: [0.03, 0.03, 0.04],
      tint: [0.12, 0.13, 0.16],
      accent: [0.35, 0.38, 0.45],
      light: false,
    },
    systems: {
      clear: 0xf2f2f4,
      base: [0.96, 0.96, 0.97],
      tint: [0.9, 0.91, 0.94],
      accent: [0.72, 0.74, 0.82],
      light: true,
    },
    video: {
      clear: 0x050505,
      base: [0.02, 0.02, 0.025],
      tint: [0.1, 0.1, 0.12],
      accent: [0.45, 0.45, 0.5],
      light: false,
    },
    graphics: {
      clear: 0xefeae3,
      base: [0.94, 0.92, 0.89],
      tint: [0.88, 0.85, 0.8],
      accent: [0.7, 0.66, 0.6],
      light: true,
    },
  };

  var themeKey = "web";
  var theme = THEMES.web;

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: !MOBILE,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2));
  renderer.setClearColor(theme.clear, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  var uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uRes: { value: new THREE.Vector2(1, 1) },
    uBase: { value: new THREE.Vector3().fromArray(theme.base) },
    uTint: { value: new THREE.Vector3().fromArray(theme.tint) },
    uAccent: { value: new THREE.Vector3().fromArray(theme.accent) },
    uLight: { value: theme.light ? 1 : 0 },
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
      "  float pulse = 0.5 + 0.5 * sin(uTime * 0.75 + d * 9.0);",
      "  float rip = sin(d * 16.0 - uTime * 2.6) * exp(-d * 2.8);",
      "  float glow = smoothstep(0.9, 0.0, d) * (0.28 + pulse * 0.16);",
      "  float band = 0.045 * sin((uv.x + uMouse.x * 0.2) * 20.0 + uTime * 0.5)",
      "             * sin((uv.y + uMouse.y * 0.2) * 14.0 - uTime * 0.35);",
      "  vec3 col = mix(uBase, uTint, glow);",
      "  col = mix(col, uAccent, clamp(rip * 0.4 + band, 0.0, 0.5));",
      "  float vig = smoothstep(1.2, 0.3, length(p));",
      "  col *= mix(uLight > 0.5 ? 0.92 : 0.78, 1.0, vig);",
      "  gl_FragColor = vec4(col, 1.0);",
      "}",
    ].join("\n"),
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var running = true;
  var t0 = performance.now();

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }

  function setTheme(key) {
    if (!THEMES[key]) key = "web";
    themeKey = key;
    theme = THEMES[key];
    renderer.setClearColor(theme.clear, 1);
    uniforms.uBase.value.fromArray(theme.base);
    uniforms.uTint.value.fromArray(theme.tint);
    uniforms.uAccent.value.fromArray(theme.accent);
    uniforms.uLight.value = theme.light ? 1 : 0;
    document.body.classList.toggle("is-tile-bg-light", !!theme.light);
  }

  function onPointer(e) {
    pointer.tx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    pointer.ty = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
  }

  function tick(now) {
    if (!running) return;
    window.requestAnimationFrame(tick);
    var t = (now - t0) * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    uniforms.uTime.value = REDUCED ? 0 : t;
    uniforms.uMouse.value.set(pointer.x, pointer.y);
    renderer.render(scene, camera);
  }

  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  resize();
  setTheme(document.body.getAttribute("data-tile-theme") || "web");
  window.requestAnimationFrame(tick);

  window.__portfolioTileBg = { setTheme: setTheme, resize: resize };
})();
