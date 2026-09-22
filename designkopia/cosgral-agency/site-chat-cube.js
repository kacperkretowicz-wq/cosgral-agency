/**
 * Live chat FAB — mini Cosgral cube (Three.js).
 * Materials + surface shimmer match home-hero-3d.js (same look on mobile & desktop).
 * Framed with padding so rotated cube never clips the canvas.
 */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";
import { createIntactCubeParts } from "./cube-shape.js?v=20260919mob";

(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var canvas = null;
  var tries = 0;

  function findCanvas() {
    canvas = document.querySelector("[data-cg-chat-cube]");
    if (canvas) {
      boot();
      return;
    }
    tries += 1;
    if (tries < 40) window.setTimeout(findCanvas, 50);
  }

  function boot() {
    var MOBILE = window.matchMedia("(max-width: 900px)").matches;
    var HALF = 1.35;
    /* Same visual recipe as hero; framing only differs (camera / scale). */
    var CUBE_SCALE = MOBILE ? 0.72 : 0.76;
    var SHELL_OP = 0.45;
    var EDGE_OP = 0.24;

    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
      premultipliedAlpha: false,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40);
    camera.position.set(0, 0.02, MOBILE ? 9.4 : 8.9);

    var root = new THREE.Group();
    root.scale.setScalar(CUBE_SCALE);
    scene.add(root);

    var parts = createIntactCubeParts(HALF);
    parts.shell.material.opacity = SHELL_OP;
    parts.shell.material.depthWrite = true;
    parts.edges.material.opacity = EDGE_OP;
    parts.edges.material.depthTest = true;
    parts.edges.material.depthWrite = false;

    function randomOnCube(h) {
      var face = Math.floor(Math.random() * 6);
      var a = (Math.random() - 0.5) * 2 * h;
      var b = (Math.random() - 0.5) * 2 * h;
      if (face === 0) return [h, a, b];
      if (face === 1) return [-h, a, b];
      if (face === 2) return [a, h, b];
      if (face === 3) return [a, -h, b];
      if (face === 4) return [a, b, h];
      return [a, b, -h];
    }

    /* Dense enough for FAB pixel size; same size/alpha on mobile & desktop. */
    var SURFACE = 900;
    var SURFACE_SIZE_MUL = 1.15;
    var sPos = new Float32Array(SURFACE * 3);
    var sSize = new Float32Array(SURFACE);
    for (var si = 0; si < SURFACE; si++) {
      var sp = randomOnCube(HALF);
      sPos[si * 3] = sp[0];
      sPos[si * 3 + 1] = sp[1];
      sPos[si * 3 + 2] = sp[2];
      sSize[si] = (0.45 + Math.random() * 1.6) * SURFACE_SIZE_MUL;
    }
    var sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute("size", new THREE.BufferAttribute(sSize, 1));

    /* Identical shimmer shader to home-hero-3d.js */
    var sMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uFade: { value: 1 },
        uAlphaMul: { value: 1 },
      },
      vertexShader: [
        "attribute float size;",
        "uniform float uTime;",
        "uniform vec2 uMouse;",
        "uniform float uFade;",
        "uniform float uAlphaMul;",
        "varying float vAlpha;",
        "void main() {",
        "  vec3 pos = position;",
        "  float pulse = sin(uTime * 0.55 + pos.y * 4.0 + pos.x * 3.0) * 0.012;",
        "  pos += normalize(pos + 0.0001) * pulse;",
        "  float dist = length(pos.xy - uMouse * 1.4);",
        "  float ripple = sin(dist * 9.0 - uTime * 2.8) * smoothstep(2.6, 0.0, dist) * 0.07;",
        "  pos.xy += normalize(pos.xy + 0.0001) * ripple;",
        "  vec4 mv = modelViewMatrix * vec4(pos, 1.0);",
        "  gl_PointSize = size * (190.0 / -mv.z) * (1.0 + smoothstep(2.2, 0.0, dist) * 0.75);",
        "  gl_Position = projectionMatrix * mv;",
        "  vAlpha = (0.16 + smoothstep(2.8, 0.0, dist) * 0.25) * uFade * uAlphaMul;",
        "}",
      ].join("\n"),
      fragmentShader: [
        "varying float vAlpha;",
        "void main() {",
        "  float d = length(gl_PointCoord - 0.5);",
        "  if (d > 0.5) discard;",
        "  float glow = 1.0 - smoothstep(0.0, 0.5, d);",
        "  gl_FragColor = vec4(0.7, 0.7, 0.72, vAlpha * glow * 0.5);",
        "}",
      ].join("\n"),
    });

    root.add(parts.shell, parts.edges, new THREE.Points(sGeo, sMat));

    var spin = 0.35;
    var leanX = 0;
    var leanY = 0;
    var targetLeanX = 0;
    var targetLeanY = 0;
    var mouseX = 0;
    var mouseY = 0;
    var visualFade = 1;
    var running = true;
    var last = performance.now();
    var LOOK = MOBILE ? 0.48 : 0.58;
    var IDLE_SPIN = MOBILE ? 0.2 : 0.26;
    /* Mega-menu style dim when chat panel is open (~40% darker). */
    var OPEN_DIM = 0.58;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      var dpr = Math.min(window.devicePixelRatio || 1, 2.25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    }

    function clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    function readPointer() {
      var ptr = window.cosgralPointer;
      if (!ptr) {
        targetLeanX = 0;
        targetLeanY = 0;
        mouseX = 0;
        mouseY = 0;
        return;
      }

      if (ptr.fromOrientation || (window.cosgralOrientation && window.cosgralOrientation.active)) {
        targetLeanY = clamp(ptr.nx || 0, -1, 1) * LOOK;
        targetLeanX = clamp(ptr.ny || 0, -1, 1) * LOOK * 0.88;
        mouseX = clamp(ptr.nx || 0, -1, 1) * 0.85;
        mouseY = clamp(-(ptr.ny || 0), -1, 1) * 0.85;
        return;
      }

      var rect = canvas.getBoundingClientRect();
      var cx = rect.left + rect.width * 0.5;
      var cy = rect.top + rect.height * 0.5;
      var px = ptr.x != null ? ptr.x : window.innerWidth * 0.5;
      var py = ptr.y != null ? ptr.y : window.innerHeight * 0.5;
      var dx = (px - cx) / Math.max(window.innerWidth * 0.45, 1);
      var dy = (py - cy) / Math.max(window.innerHeight * 0.45, 1);
      targetLeanY = clamp(dx, -1.1, 1.1) * LOOK;
      targetLeanX = clamp(-dy, -1.1, 1.1) * LOOK * 0.82;
      /* Local FAB-relative mouse for shimmer hotspot (hero-style). */
      mouseX = clamp((px - cx) / Math.max(rect.width * 0.55, 1), -1.2, 1.2);
      mouseY = clamp(-(py - cy) / Math.max(rect.height * 0.55, 1), -1.2, 1.2);
    }

    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      var launcher = canvas.closest(".cg-chat-launcher");
      var open = launcher && launcher.getAttribute("aria-expanded") === "true";
      var chatRoot = document.querySelector(".cg-chat-root");
      var scrollHidden = chatRoot && !chatRoot.classList.contains("is-chat-visible");
      var hidden =
        document.hidden ||
        scrollHidden ||
        (canvas.offsetParent === null && getComputedStyle(canvas).visibility === "hidden");
      if (hidden) return;

      if (open) {
        /* Face front + dim — same language as mega-menu cube settle. */
        targetLeanX = 0.18;
        targetLeanY = -0.12;
        mouseX = 0;
        mouseY = 0;
      } else {
        readPointer();
      }

      var follow = 1 - Math.pow(0.001, dt);
      leanX += (targetLeanX - leanX) * Math.min(1, follow * 12);
      leanY += (targetLeanY - leanY) * Math.min(1, follow * 12);
      if (!open) spin += dt * IDLE_SPIN;

      root.rotation.x = leanX;
      root.rotation.y = (open ? 0.22 : spin * 0.5) + leanY;
      root.rotation.z = leanY * -0.12 + leanX * 0.04;

      var fadeTarget = open ? OPEN_DIM : 1;
      visualFade += (fadeTarget - visualFade) * Math.min(1, follow * 8);
      sMat.uniforms.uTime.value = spin;
      sMat.uniforms.uMouse.value.set(mouseX, mouseY);
      sMat.uniforms.uFade.value = visualFade;
      parts.shell.material.opacity = SHELL_OP * visualFade;
      parts.edges.material.opacity = EDGE_OP * visualFade;
      renderer.render(scene, camera);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvas.parentElement || canvas);
    }
    requestAnimationFrame(frame);

    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        last = performance.now();
        resize();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", findCanvas, { once: true });
  } else {
    findCanvas();
  }
})();
