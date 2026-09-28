/**
 * Systems stage — bright almost-white WebGL field + Cosgral cube.
 * Reacts to pointer and device gyroscope.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";
import { createIntactCubeParts } from "./cube-shape.js?v=20260919mob";
import {
  heroCubeLook,
  createCubeShimmerMaterial,
  applyHeroCubeMaterials,
} from "./cube-look.js?v=20260926cube1";

(function () {
  "use strict";

  var canvas = document.querySelector("[data-stage-systems-webgl]");
  if (!canvas) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var look = heroCubeLook(MOBILE);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: !MOBILE,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2));
  renderer.setClearColor(0xf4f4f6, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 0.15, 6.2);

  /* Soft reactive field behind the cube */
  var fieldUniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uGyro: { value: new THREE.Vector2(0, 0) },
    uRes: { value: new THREE.Vector2(1, 1) },
  };
  var fieldMat = new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: false,
    uniforms: fieldUniforms,
    vertexShader: [
      "varying vec2 vUv;",
      "void main() {",
      "  vUv = uv;",
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
      "}",
    ].join("\n"),
    fragmentShader: [
      "precision highp float;",
      "varying vec2 vUv;",
      "uniform float uTime;",
      "uniform vec2 uMouse;",
      "uniform vec2 uGyro;",
      "uniform vec2 uRes;",
      "void main() {",
      "  vec2 uv = vUv;",
      "  vec2 m = uMouse * 0.5 + 0.5;",
      "  vec2 g = uGyro * 0.35;",
      "  vec2 p = uv - 0.5;",
      "  p.x *= uRes.x / max(uRes.y, 1.0);",
      "  float d = length(uv - m + g * 0.08);",
      "  float pulse = 0.5 + 0.5 * sin(uTime * 0.7 + d * 8.0);",
      "  float rip = sin(d * 18.0 - uTime * 2.4) * exp(-d * 3.2);",
      "  float glow = smoothstep(0.85, 0.0, d) * (0.22 + pulse * 0.12);",
      "  float band = 0.04 * sin((uv.x + g.x) * 22.0 + uTime * 0.55) * sin((uv.y + g.y) * 16.0 - uTime * 0.4);",
      "  vec3 base = vec3(0.965, 0.965, 0.972);",
      "  vec3 tint = vec3(0.92, 0.93, 0.96);",
      "  vec3 accent = vec3(0.78, 0.80, 0.86);",
      "  vec3 col = mix(base, tint, glow);",
      "  col = mix(col, accent, clamp(rip * 0.35 + band, 0.0, 0.45));",
      "  float vignette = smoothstep(1.15, 0.35, length(p));",
      "  col *= mix(0.94, 1.0, vignette);",
      "  gl_FragColor = vec4(col, 1.0);",
      "}",
    ].join("\n"),
  });
  var field = new THREE.Mesh(new THREE.PlaneGeometry(24, 16), fieldMat);
  field.position.z = -2.4;
  scene.add(field);

  var parts = createIntactCubeParts(look.half);
  var cube = new THREE.Group();
  cube.add(parts.shell);
  cube.add(parts.edges);
  cube.scale.setScalar(look.cubeScale * (MOBILE ? 0.95 : 1.15));
  cube.rotation.set(look.restRot.x, look.restRot.y, look.restRot.z);
  scene.add(cube);
  applyHeroCubeMaterials(parts.shell, parts.edges, 1, {
    shellOp: Math.min(0.72, look.shellOp + 0.22),
    edgeOp: Math.min(0.55, look.edgeOp + 0.22),
  });

  var shimmerMat = createCubeShimmerMaterial(THREE, {
    fade: 1,
    alphaMul: MOBILE ? 0.55 : 0.85,
  });
  /* brighter shimmer for light stage */
  shimmerMat.fragmentShader = [
    "varying float vAlpha;",
    "void main() {",
    "  float d = length(gl_PointCoord - 0.5);",
    "  if (d > 0.5) discard;",
    "  float glow = 1.0 - smoothstep(0.0, 0.5, d);",
    "  gl_FragColor = vec4(0.35, 0.36, 0.4, vAlpha * glow * 0.85);",
    "}",
  ].join("\n");
  shimmerMat.needsUpdate = true;

  var shimmerCount = MOBILE ? 900 : 1800;
  var shimmerGeo = new THREE.BufferGeometry();
  var pos = new Float32Array(shimmerCount * 3);
  var sizes = new Float32Array(shimmerCount);
  var h = look.half * 0.98;
  for (var i = 0; i < shimmerCount; i++) {
    var face = i % 6;
    var u = Math.random() * 2 - 1;
    var v = Math.random() * 2 - 1;
    if (face === 0) {
      pos[i * 3] = u * h;
      pos[i * 3 + 1] = v * h;
      pos[i * 3 + 2] = h;
    } else if (face === 1) {
      pos[i * 3] = u * h;
      pos[i * 3 + 1] = v * h;
      pos[i * 3 + 2] = -h;
    } else if (face === 2) {
      pos[i * 3] = h;
      pos[i * 3 + 1] = u * h;
      pos[i * 3 + 2] = v * h;
    } else if (face === 3) {
      pos[i * 3] = -h;
      pos[i * 3 + 1] = u * h;
      pos[i * 3 + 2] = v * h;
    } else if (face === 4) {
      pos[i * 3] = u * h;
      pos[i * 3 + 1] = h;
      pos[i * 3 + 2] = v * h;
    } else {
      pos[i * 3] = u * h;
      pos[i * 3 + 1] = -h;
      pos[i * 3 + 2] = v * h;
    }
    sizes[i] = (MOBILE ? 1.2 : 1.8) * (0.55 + Math.random() * 0.9);
  }
  shimmerGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  shimmerGeo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  var shimmer = new THREE.Points(shimmerGeo, shimmerMat);
  cube.add(shimmer);

  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var gyro = { x: 0, y: 0, tx: 0, ty: 0 };
  var running = false;
  var raf = 0;
  var t0 = performance.now();

  function resize() {
    var w = window.innerWidth;
    var hgt = window.innerHeight;
    renderer.setSize(w, hgt, false);
    camera.aspect = w / Math.max(1, hgt);
    camera.updateProjectionMatrix();
    fieldUniforms.uRes.value.set(w, hgt);
  }

  function onPointer(e) {
    var x = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
    var y = -((e.clientY / Math.max(1, window.innerHeight)) * 2 - 1);
    pointer.tx = x;
    pointer.ty = y;
  }

  function onDeviceOrientation(e) {
    var beta = e.beta || 0;
    var gamma = e.gamma || 0;
    gyro.tx = Math.max(-1, Math.min(1, gamma / 35));
    gyro.ty = Math.max(-1, Math.min(1, (beta - 45) / 45));
  }

  function tick(now) {
    if (!running) return;
    raf = window.requestAnimationFrame(tick);
    var t = (now - t0) * 0.001;
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    gyro.x += (gyro.tx - gyro.x) * 0.06;
    gyro.y += (gyro.ty - gyro.y) * 0.06;

    fieldUniforms.uTime.value = t;
    fieldUniforms.uMouse.value.set(pointer.x, pointer.y);
    fieldUniforms.uGyro.value.set(gyro.x, gyro.y);
    shimmerMat.uniforms.uTime.value = t;
    shimmerMat.uniforms.uMouse.value.set(pointer.x, pointer.y);

    if (!REDUCED) {
      cube.rotation.x = look.restRot.x + pointer.y * 0.35 + gyro.y * 0.45 + Math.sin(t * 0.35) * 0.08;
      cube.rotation.y = look.restRot.y + pointer.x * 0.55 + gyro.x * 0.55 + t * 0.18;
      cube.rotation.z = look.restRot.z + pointer.x * 0.08;
      cube.position.x = pointer.x * 0.35 + gyro.x * 0.25;
      cube.position.y = pointer.y * 0.22 + gyro.y * 0.2 + Math.sin(t * 0.55) * 0.06;
      camera.position.x = pointer.x * 0.15 + gyro.x * 0.2;
      camera.position.y = 0.15 + pointer.y * 0.1 + gyro.y * 0.12;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  var api = {
    start: function () {
      if (running) return;
      running = true;
      canvas.classList.add("is-on");
      resize();
      t0 = performance.now();
      raf = window.requestAnimationFrame(tick);
    },
    stop: function () {
      running = false;
      canvas.classList.remove("is-on");
      if (raf) window.cancelAnimationFrame(raf);
      raf = 0;
    },
    resize: resize,
  };

  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("resize", resize, { passive: true });
  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });
  }
  resize();
  window.__portfolioSystemsStage = api;
  if (document.body.getAttribute("data-tile-theme") === "systems") {
    api.start();
  }
})();
