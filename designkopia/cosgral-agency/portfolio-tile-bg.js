/**
 * Portfolio WebGL — systems: glassmorphism field that follows the cursor.
 * Canvas is shown only for systems; other themes use dedicated media layers / home ambient.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";

(function () {
  "use strict";

  var canvas = document.querySelector("[data-portfolio-tile-bg]");
  if (!canvas) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;

  var THEMES = {
    web: { clear: 0x070709, light: false, mode: 0 },
    systems: { clear: 0xeef1f6, light: true, mode: 1 },
    video: { clear: 0x050505, light: false, mode: 0 },
    graphics: { clear: 0xf3ebe2, light: true, mode: 0 },
  };

  var themeKey = "web";
  var theme = THEMES.web;
  var pointer = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0 };
  var running = false;
  var renderer = null;
  var uniforms = null;
  var scene = null;
  var camera = null;
  var t0 = performance.now();

  function applyDomTheme(key) {
    var t = THEMES[key] || THEMES.web;
    document.body.setAttribute("data-tile-theme", key);
    document.body.classList.toggle("is-tile-bg-light", !!t.light);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", t.light ? "#eef1f6" : "#070709");
    }
  }

  function setTheme(key) {
    if (!THEMES[key]) key = "web";
    themeKey = key;
    theme = THEMES[key];
    applyDomTheme(key);
    if (!renderer || !uniforms) return;
    renderer.setClearColor(theme.clear, 1);
    uniforms.uMode.value = theme.mode;
  }

  function onPointer(e) {
    var nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    var ny = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
    pointer.vx += (nx - pointer.tx) * 0.35;
    pointer.vy += (ny - pointer.ty) * 0.35;
    pointer.tx = nx;
    pointer.ty = ny;
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
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;
    pointer.vx *= 0.9;
    pointer.vy *= 0.9;
    uniforms.uTime.value = REDUCED ? 0 : t;
    uniforms.uMouse.value.set(pointer.x, pointer.y);
    uniforms.uVel.value.set(pointer.vx, pointer.vy);
    renderer.render(scene, camera);
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

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uVel: { value: new THREE.Vector2(0, 0) },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMode: { value: theme.mode },
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
        "uniform vec2 uVel;",
        "uniform vec2 uRes;",
        "uniform float uMode;",
        "float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
        "float sdRoundBox(vec2 p, vec2 b, float r){",
        "  vec2 q = abs(p) - b + r;",
        "  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;",
        "}",
        "void main(){",
        "  vec2 uv = vUv;",
        "  vec2 m = uMouse * 0.5 + 0.5;",
        "  float aspect = uRes.x / max(uRes.y, 1.0);",
        "  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);",
        "  vec2 mp = (m - 0.5) * vec2(aspect, 1.0);",
        "  /* Soft studio base */",
        "  vec3 col = mix(vec3(0.93, 0.94, 0.97), vec3(0.86, 0.89, 0.95), uv.y);",
        "  col += vec3(0.04, 0.05, 0.07) * (0.5 + 0.5 * sin(uv.x * 3.0 + uTime * 0.2));",
        "  /* Floating glass panels */",
        "  for (int i = 0; i < 5; i++){",
        "    float fi = float(i);",
        "    vec2 center = vec2(",
        "      sin(uTime * (0.18 + fi * 0.04) + fi * 1.7) * 0.55,",
        "      cos(uTime * (0.15 + fi * 0.03) + fi * 2.1) * 0.32",
        "    );",
        "    center += mp * (0.04 + fi * 0.012);",
        "    vec2 size = vec2(0.22 + fi * 0.035, 0.14 + mod(fi, 3.0) * 0.03);",
        "    float d = sdRoundBox(p - center, size, 0.045);",
        "    float glass = smoothstep(0.01, -0.02, d);",
        "    float edge = smoothstep(0.02, 0.0, abs(d));",
        "    /* Fake refraction inside panel */",
        "    vec2 refr = normalize(p - center + 0.0001) * glass * 0.035;",
        "    vec3 tint = mix(vec3(1.0), vec3(0.78, 0.84, 0.95), fi * 0.12);",
        "    col = mix(col, col * tint + vec3(0.08), glass * 0.42);",
        "    col += vec3(0.85, 0.9, 1.0) * edge * 0.55;",
        "    /* Specular streak */",
        "    float spec = pow(max(0.0, 1.0 - abs((p.x - center.x) * 1.8 + (p.y - center.y) * 0.4)), 18.0);",
        "    col += vec3(1.0) * spec * glass * 0.35;",
        "    col += refr.x * vec3(0.05, 0.08, 0.12) * glass;",
        "  }",
        "  /* Cursor glass lens */",
        "  float ld = length(p - mp);",
        "  float lens = smoothstep(0.28, 0.0, ld);",
        "  float rim = smoothstep(0.28, 0.22, ld) * smoothstep(0.16, 0.22, ld);",
        "  vec2 dir = normalize(p - mp + 0.0001);",
        "  float bend = lens * (0.08 + length(uVel) * 0.12);",
        "  vec2 sampleUv = uv - dir * bend;",
        "  vec3 refracted = mix(col, vec3(0.75, 0.82, 0.95), lens * 0.35);",
        "  refracted += vec3(0.15, 0.2, 0.28) * sin((sampleUv.x + sampleUv.y) * 40.0 - uTime * 3.0) * lens * 0.08;",
        "  col = mix(col, refracted, lens * 0.85);",
        "  col += vec3(1.0) * rim * 0.75;",
        "  col += vec3(0.9, 0.95, 1.0) * pow(max(0.0, 1.0 - ld * 3.2), 6.0) * 0.25;",
        "  /* Soft caustic rings from cursor */",
        "  float rings = sin(ld * 42.0 - uTime * 3.8) * exp(-ld * 4.5);",
        "  col += vec3(0.55, 0.65, 0.85) * rings * 0.12;",
        "  float vig = smoothstep(1.35, 0.25, length(p));",
        "  col *= mix(0.92, 1.0, vig);",
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
