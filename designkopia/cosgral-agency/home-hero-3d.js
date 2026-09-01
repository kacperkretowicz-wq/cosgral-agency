/**
 * Hero cube + cinematic shatter → diagonal sand stream (single Three.js system).
 * Soft additive particles, scroll-scrubbed, cursor liquid forces.
 */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";
import { createIntactCubeParts, createShardGeometry } from "./cube-shape.js";

(function () {
  "use strict";

  var canvas = document.getElementById("hero-3d");
  if (!canvas) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var LOW_PERF =
    MOBILE || window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  if (REDUCED) return;

  var HALF = 1.35;
  var CUBE_SCALE = 0.5;
  var SHARDS = LOW_PERF ? 280 : 1600;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var breakAmt = 0;
  var streamAmt = 0;
  var displayBreak = 0;
  var displayStream = 0;
  var displayMotion = 0;
  var displayCinema = 0;
  var sandLocked = false;
  var cardForces = new Float32Array(8 * 4); // up to 8 cards: cx,cy,w,h in NDC-ish
  var menuBlend = 0;
  var menuTween = { blend: 0, closing: false };
  var menuSandHold = null;
  var heroLook = { x: 0, y: 0 };
  var scrollHandoff = null;
  var prevMotion = 0;
  var introTween = { progress: 0 };
  var introStarted = false;
  var introDone = false;
  var introSettle = 1;
  var introDoneDispatched = false;
  var INTRO_DUR = MOBILE ? 2.1 : 3.35;
  var INTRO_START_DELAY = MOBILE ? 920 : 680;
  var menuFrom = {
    px: 0,
    py: 0,
    pz: 0,
    rx: 0.22,
    ry: -0.35,
    rz: 0,
    sc: CUBE_SCALE * 0.78,
    visible: true,
    offscreen: false,
    sideEntry: false,
    galleryMenu: false,
  };

  function smooth01(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function introEase01(p) {
    return 1 - Math.pow(1 - p, 2.45);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  var FACE_NORMALS = [
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
  ];

  var FACE_CORNERS = [
    [
      [-0.82, 0.82, 1],
      [0.82, 0.82, 1],
      [-0.82, -0.82, 1],
      [0.82, -0.82, 1],
    ],
    [
      [-0.82, 0.82, -1],
      [0.82, 0.82, -1],
      [-0.82, -0.82, -1],
      [0.82, -0.82, -1],
    ],
    [
      [1, 0.82, 0.82],
      [1, 0.82, -0.82],
      [1, -0.82, 0.82],
      [1, -0.82, -0.82],
    ],
    [
      [-1, 0.82, 0.82],
      [-1, 0.82, -0.82],
      [-1, -0.82, 0.82],
      [-1, -0.82, -0.82],
    ],
    [
      [-0.82, 1, 0.82],
      [0.82, 1, 0.82],
      [-0.82, 1, -0.82],
      [0.82, 1, -0.82],
    ],
    [
      [-0.82, -1, 0.82],
      [0.82, -1, 0.82],
      [-0.82, -1, -0.82],
      [0.82, -1, -0.82],
    ],
  ];

  var _cubePos = new THREE.Vector3();
  var _toCam = new THREE.Vector3();
  var _worldNormal = new THREE.Vector3();
  var _qAlign = new THREE.Quaternion();
  var _qTarget = new THREE.Quaternion();
  var _qMenuStart = new THREE.Quaternion();
  var _qFaceSpin = new THREE.Quaternion();
  var _axisSpin = new THREE.Vector3(0.18, 1, 0.12);
  var _screenRay = new THREE.Vector3();
  var mobileHeroSpinReady = false;
  var mobileDriftSpinReady = false;

  function applyMobileIdleSpin(group) {
    _axisSpin.set(0.12, 1, 0.08).normalize();
    _qFaceSpin.setFromAxisAngle(_axisSpin, 0.00135);
    group.quaternion.multiply(_qFaceSpin);
    group.rotation.setFromQuaternion(group.quaternion, "XYZ");
  }

  var MENU_OPEN_SIDE_DUR = 6.1;
  var MENU_OPEN_GALLERY_DUR = 4.1;
  var MENU_OPEN_HERO_DUR = 5.3;
  var MENU_CLOSE_SIDE_DUR = 1.95;
  var MENU_CLOSE_GALLERY_DUR = 3.9;
  var MENU_CLOSE_HERO_DUR = 1.45;
  var MENU_LABELS_BEFORE_CUBE = 1.0;
  var MENU_CUBE_LABEL_DIM = 0.5;
  var MENU_LINKS_LEAD = 0.07;
  var homeCubeVisible = false;

  function menuLabelsBlendAt(openDur) {
    return Math.max(0, (openDur - MENU_LABELS_BEFORE_CUBE) / openDur);
  }

  function menuLabelRevealAtBlend(blend, labelsAt) {
    if (blend < labelsAt - 0.02) return 0;
    return smooth01(labelsAt - 0.02, labelsAt + 0.06, blend);
  }

  function syncCamera() {
    camera.position.set(mouse.x * 0.08, mouse.y * 0.05, 5.4);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }

  function worldPosFromScreen(sx, sy, planeZ) {
    var ndcX = (sx / window.innerWidth) * 2 - 1;
    var ndcY = -(sy / window.innerHeight) * 2 + 1;
    _screenRay.set(ndcX, ndcY, 0.5).unproject(camera);
    _toCam.copy(_screenRay).sub(camera.position).normalize();
    var hit = (planeZ - camera.position.z) / _toCam.z;
    return {
      x: camera.position.x + _toCam.x * hit,
      y: camera.position.y + _toCam.y * hit,
      z: planeZ,
    };
  }

  function getMenuCornerWorld(planeZ) {
    return worldPosFromScreen(MOBILE ? 38 : 54, MOBILE ? 34 : 50, planeZ);
  }

  function getMenuEntryStartWorld(planeZ) {
    return worldPosFromScreen(MOBILE ? -108 : -156, MOBILE ? -96 : -128, planeZ);
  }

  function sideEntryFlyEase(t, useSoft) {
    var pow = useSoft ? 1.48 : 2.65;
    return 1 - Math.pow(1 - t, pow);
  }

  function getMenuLabelReveal() {
    if (menuBlend <= 0.001) return 0;
    if (menuFrom.galleryMenu) {
      return menuLabelRevealAtBlend(menuBlend, menuLabelsBlendAt(MENU_OPEN_GALLERY_DUR));
    }
    if (menuFrom.sideEntry) {
      if (menuTween.closing) return 0;
      if (menuBlend < 0.72) return 0;
      return smooth01(0.72, 0.92, menuBlend);
    }
    if (menuBlend < 0.35) return 0;
    return smooth01(0.35, 0.72, menuBlend);
  }

  function getMenuCubeDimMul() {
    return 1 - getMenuLabelReveal() * MENU_CUBE_LABEL_DIM;
  }

  function getMenuLinksDelay() {
    if (menuFrom.galleryMenu) {
      return Math.max(0, MENU_OPEN_GALLERY_DUR - MENU_LABELS_BEFORE_CUBE) + MENU_LINKS_LEAD;
    }
    if (menuFrom.sideEntry) {
      return MENU_OPEN_SIDE_DUR * 0.128;
    }
    return MENU_OPEN_HERO_DUR * 0.42 + MENU_LINKS_LEAD;
  }

  function getBestFaceIndexFor(group) {
    group.getWorldPosition(_cubePos);
    _toCam.copy(camera.position).sub(_cubePos).normalize();
    var best = 0;
    var bestDot = -Infinity;
    for (var fi = 0; fi < FACE_NORMALS.length; fi++) {
      _worldNormal.copy(FACE_NORMALS[fi]).applyQuaternion(group.quaternion).normalize();
      var dot = _worldNormal.dot(_toCam);
      if (dot > bestDot) {
        bestDot = dot;
        best = fi;
      }
    }
    return best;
  }

  function getBestFaceIndex() {
    return getBestFaceIndexFor(cubeGroup);
  }

  function getFaceCameraQuaternion() {
    var idx = getBestFaceIndex();
    _worldNormal.copy(FACE_NORMALS[idx]).applyQuaternion(cubeGroup.quaternion).normalize();
    cubeGroup.getWorldPosition(_cubePos);
    _toCam.copy(camera.position).sub(_cubePos).normalize();
    if (_worldNormal.dot(_toCam) > 0.9995) return cubeGroup.quaternion.clone();
    _qAlign.setFromUnitVectors(_worldNormal, _toCam);
    return cubeGroup.quaternion.clone().premultiply(_qAlign);
  }

  function applyMenuFaceOrientation(strength, target) {
    if (strength <= 0) return;
    var group = target || cubeGroup;
    var idx = getBestFaceIndexFor(group);
    _worldNormal.copy(FACE_NORMALS[idx]).applyQuaternion(group.quaternion).normalize();
    group.getWorldPosition(_cubePos);
    _toCam.copy(camera.position).sub(_cubePos).normalize();
    if (_worldNormal.dot(_toCam) > 0.9995) return;
    _qAlign.setFromUnitVectors(_worldNormal, _toCam);
    _qTarget.copy(group.quaternion).premultiply(_qAlign);
    group.quaternion.slerp(_qTarget, strength);
    group.rotation.setFromQuaternion(group.quaternion, "XYZ");
  }

  function quadArc(t, sx, sy, cx, cy, ex, ey) {
    var u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * ex,
      y: u * u * sy + 2 * u * t * cy + t * t * ey,
    };
  }

  function startIntro() {
    if (introStarted) return;
    introStarted = true;
    if (window.gsap) {
      gsap.killTweensOf(introTween);
      gsap.to(introTween, {
        progress: 1,
        duration: INTRO_DUR,
        ease: "power2.out",
        onComplete: function () {
          introDone = true;
          introSettle = 0;
          window.setTimeout(function () {
            if (!introDoneDispatched) {
              introDoneDispatched = true;
              window.dispatchEvent(new CustomEvent("cosgral:cube-intro-done"));
            }
          }, 1400);
        },
      });
      return;
    }
    introTween.progress = 1;
    introDone = true;
    introSettle = 0;
  }

  function watchIntroReady() {
    function kick() {
      window.setTimeout(startIntro, INTRO_START_DELAY);
    }

    function ready() {
      if (document.body.classList.contains("is-ready")) return true;
      var preloader = document.getElementById("preloader");
      return !!(preloader && preloader.classList.contains("is-settled"));
    }

    if (ready()) {
      kick();
      return;
    }

    var bodyObs = new MutationObserver(function () {
      if (ready()) {
        bodyObs.disconnect();
        if (preObs) preObs.disconnect();
        kick();
      }
    });
    bodyObs.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    var preloader = document.getElementById("preloader");
    var preObs = null;
    if (preloader) {
      preObs = new MutationObserver(function () {
        if (ready()) {
          bodyObs.disconnect();
          preObs.disconnect();
          kick();
        }
      });
      preObs.observe(preloader, { attributes: true, attributeFilter: ["class"] });
    }

    window.setTimeout(kick, LOW_PERF ? 2600 : 4200);
  }

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: !LOW_PERF,
    alpha: true,
    powerPreference: LOW_PERF ? "low-power" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, LOW_PERF ? 1.0 : 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var root = new THREE.Group();
  scene.add(root);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 5.4;

  // ——— Intact cube (matches previous look) ———
  var cubeGroup = new THREE.Group();
  cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
  cubeGroup.rotation.set(0.22, -0.35, 0);
  root.add(cubeGroup);

  var menuAnchorGroup = new THREE.Group();
  root.add(menuAnchorGroup);

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

  var SURFACE = MOBILE ? 1200 : 2800;
  var sPos = new Float32Array(SURFACE * 3);
  var sSize = new Float32Array(SURFACE);
  for (var si = 0; si < SURFACE; si++) {
    var sp = randomOnCube(HALF);
    sPos[si * 3] = sp[0];
    sPos[si * 3 + 1] = sp[1];
    sPos[si * 3 + 2] = sp[2];
    sSize[si] = 0.45 + Math.random() * 1.6;
  }
  var sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  sGeo.setAttribute("size", new THREE.BufferAttribute(sSize, 1));

  var sMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uFade: { value: 1 },
    },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform float uFade;
      varying float vAlpha;
      void main() {
        vec3 pos = position;
        float pulse = sin(uTime * 0.55 + pos.y * 4.0 + pos.x * 3.0) * 0.012;
        pos += normalize(pos + 0.0001) * pulse;
        float dist = length(pos.xy - uMouse * 1.4);
        float ripple = sin(dist * 9.0 - uTime * 2.8) * smoothstep(2.6, 0.0, dist) * 0.07;
        pos.xy += normalize(pos.xy + 0.0001) * ripple;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * (190.0 / -mv.z) * (1.0 + smoothstep(2.2, 0.0, dist) * 0.75);
        gl_Position = projectionMatrix * mv;
        vAlpha = (0.14 + smoothstep(2.8, 0.0, dist) * 0.38) * uFade;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(0.9, 0.9, 0.9, vAlpha * glow);
      }
    `,
  });

  var cubeParts = createIntactCubeParts(HALF);
  var shell = cubeParts.shell;
  var wire = cubeParts.wire;
  var edges = cubeParts.edges;
  var setWireOpacity = cubeParts.setWireOpacity;
  cubeGroup.add(shell, edges, new THREE.Points(sGeo, sMat));

  // ——— Shatter shards (deferred on mobile to avoid blocking first paint) ———
  var shards = null;
  var shardMat = null;
  var shardsBuilt = false;

  function buildShards() {
    if (shardsBuilt) return;
    shardsBuilt = true;

  var aStart = new Float32Array(SHARDS * 3);
  var aSand = new Float32Array(SHARDS * 3);
  var aSeed = new Float32Array(SHARDS);
  var aDelay = new Float32Array(SHARDS);
  var aSize0 = new Float32Array(SHARDS);

  var DIAG = -0.62;
  var cA = Math.cos(DIAG);
  var sA = Math.sin(DIAG);

  function hash(i, salt) {
    var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function gauss2(u, v) {
    return Math.sqrt(-2 * Math.log(Math.max(1e-4, u))) * Math.cos(Math.PI * 2 * Math.max(1e-4, v));
  }

  for (var i = 0; i < SHARDS; i++) {
    // ~78% surface peel (readable shatter), rest soft volume fill
    var sx;
    var sy;
    var sz;
    var depth01;
    if (hash(i, 1) < 0.78) {
      var face = Math.floor(hash(i, 2) * 6);
      var a = (hash(i, 3) * 2 - 1) * HALF;
      var b = (hash(i, 4) * 2 - 1) * HALF;
      var inset = hash(i, 5) * 0.04 * HALF;
      if (face === 0) {
        sx = HALF - inset;
        sy = a;
        sz = b;
      } else if (face === 1) {
        sx = -HALF + inset;
        sy = a;
        sz = b;
      } else if (face === 2) {
        sx = a;
        sy = HALF - inset;
        sz = b;
      } else if (face === 3) {
        sx = a;
        sy = -HALF + inset;
        sz = b;
      } else if (face === 4) {
        sx = a;
        sy = b;
        sz = HALF - inset;
      } else {
        sx = a;
        sy = b;
        sz = -HALF + inset;
      }
      depth01 = 1;
    } else {
      var r = Math.pow(hash(i, 2), 0.42);
      var th = hash(i, 3) * Math.PI * 2;
      var ph = Math.acos(hash(i, 4) * 2 - 1);
      sx = Math.max(-1, Math.min(1, r * Math.sin(ph) * Math.cos(th) * 1.05)) * HALF;
      sy = Math.max(-1, Math.min(1, r * Math.sin(ph) * Math.sin(th) * 1.05)) * HALF;
      sz = Math.max(-1, Math.min(1, r * Math.cos(ph) * 1.05)) * HALF;
      depth01 = r;
    }
    aStart[i * 3] = sx;
    aStart[i * 3 + 1] = sy;
    aStart[i * 3 + 2] = sz;

    // Full-viewport sand diagonal (TL → BR), ~1.5× width
    var t = hash(i, 6);
    var side = gauss2(hash(i, 7), hash(i, 8)) * 0.55;
    side = Math.max(-2.0, Math.min(2.0, side + (hash(i, 9) - 0.5) * 0.5));
    var flare = 1 + 0.18 * Math.sin(t * 8.4) + 0.1 * Math.sin(t * 15.2 + 1.1);
    var halfW = (0.12 + t * 0.48) * flare;
    var along = t * 8.6 - 4.3;
    var lat = side * halfW;
    var meander = Math.sin(t * 5.8 + hash(i, 10) * 5.5) * (0.1 + t * 0.22);
    aSand[i * 3] = along * cA + (-sA) * lat + cA * meander * 0.35;
    aSand[i * 3 + 1] = along * sA + cA * lat + sA * meander * 0.35;
    aSand[i * 3 + 2] = (hash(i, 11) - 0.5) * 0.18;

    aSeed[i] = hash(i, 12);
    // Wave peel: leave first from the diagonal-facing corner
    var peelAxis = (sx * cA + sy * sA) / (HALF * 1.42);
    aDelay[i] = Math.max(0, Math.min(0.55, (0.5 - peelAxis) * 0.32 + (1 - depth01) * 0.12 + hash(i, 13) * 0.18));
    aSize0[i] = 0.016 + hash(i, 14) * 0.02;
  }

  var boxBase = createShardGeometry();
  boxBase.setAttribute("aStart", new THREE.InstancedBufferAttribute(aStart, 3));
  boxBase.setAttribute("aSand", new THREE.InstancedBufferAttribute(aSand, 3));
  boxBase.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
  boxBase.setAttribute("aDelay", new THREE.InstancedBufferAttribute(aDelay, 1));
  boxBase.setAttribute("aSize0", new THREE.InstancedBufferAttribute(aSize0, 1));

  shardMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide,
    uniforms: {
      uTime: { value: 0 },
      uBreak: { value: 0 },
      uStream: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uCards: { value: cardForces },
      uCardCount: { value: 0 },
      uDiag: { value: new THREE.Vector2(cA, sA) },
      uCubeMat: { value: new THREE.Matrix4() },
      uMenuAbsorb: { value: 0 },
    },
    vertexShader: `
      attribute vec3 aStart;
      attribute vec3 aSand;
      attribute float aSeed;
      attribute float aDelay;
      attribute float aSize0;
      uniform float uTime;
      uniform float uBreak;
      uniform float uStream;
      uniform vec2 uMouse;
      uniform vec2 uDiag;
      uniform float uCards[32];
      uniform float uCardCount;
      uniform mat4 uCubeMat;
      uniform float uMenuAbsorb;
      varying float vAlpha;
      varying float vShade;
      varying float vForm;

      float easeOutCubic(float t) {
        float u = 1.0 - t;
        return 1.0 - u * u * u;
      }
      float easeInOut(float t) {
        return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
      }

      void main() {
        float local = clamp((uBreak - aDelay) / 0.7, 0.0, 1.0);
        local = easeOutCubic(local);
        // Trail lags behind cube — ribbon forms after cube passes
        float morph = clamp((uStream - aDelay * 0.24) / 0.78, 0.0, 1.0);
        morph = easeInOut(morph) * smoothstep(0.05, 0.55, local);
        float menuT = clamp(uMenuAbsorb, 0.0, 1.0);
        morph *= (1.0 - menuT);
        local *= (1.0 - menuT);

        vec3 start = (uCubeMat * vec4(aStart, 1.0)).xyz;
        vec3 outward = normalize(start + 0.0001);
        float fly = local * (1.0 - morph * 0.98);
        vec3 diag = vec3(uDiag.x, uDiag.y, 0.0);
        vec3 perp = vec3(-uDiag.y, uDiag.x, 0.0);
        float scatter = (aSeed - 0.5) * 0.55;
        float lift = sin(aSeed * 6.283 + local * 2.8) * 0.05;

        vec3 flight = start
          + outward * mix(0.006, 0.14, aSeed) * fly
          + diag * mix(0.4, 1.6, pow(aSeed, 0.65)) * fly
          + perp * scatter * fly * mix(0.15, 0.4, local)
          + vec3(0.0, lift * fly - 0.03 * fly * fly, scatter * 0.03 * fly);

        vec3 home = mix(flight, aSand, morph);

        vec2 m = uMouse * 1.45;
        float md = length(home.xy - m);
        float mf = smoothstep(1.45, 0.0, md);
        float rip = sin(md * 7.2 - uTime * 2.2) * mf;
        home.xy += normalize(home.xy - m + 0.0001) * rip * 0.075 * (0.15 + morph);
        home.xy += vec2(-(home.y - m.y), home.x - m.x) * mf * 0.028;

        for (int c = 0; c < 8; c++) {
          if (float(c) >= uCardCount) break;
          vec2 cc = vec2(uCards[c * 4], uCards[c * 4 + 1]);
          vec2 ch = vec2(uCards[c * 4 + 2], uCards[c * 4 + 3]);
          vec2 d = home.xy - cc;
          float inside = 1.0 - smoothstep(0.0, length(ch) + 0.1, length(d / max(ch, vec2(0.05))));
          float wave = sin(length(d) * 8.5 - uTime * 2.9 + float(c)) * inside;
          home.xy += normalize(d + 0.0001) * wave * 0.055;
          home.xy += vec2(-d.y, d.x) * inside * 0.02;
        }

        home.xy += vec2(
          sin(uTime * 0.48 + aSeed * 9.5 + home.y * 1.6),
          cos(uTime * 0.4 + aSeed * 7.5 + home.x * 1.6)
        ) * (0.004 + morph * 0.012);

        float spin = (aSeed * 6.283 + local * 3.8 + uTime * (0.12 + aSeed * 0.3)) * (1.0 - morph);
        float cs = cos(spin);
        float sn = sin(spin);
        vec3 lp = position;
        lp = vec3(lp.x * cs - lp.z * sn, lp.y, lp.x * sn + lp.z * cs);
        float yaw = (aSeed - 0.5) * 1.6 * (1.0 - morph) + morph * aSeed * 0.35;
        float cy = cos(yaw);
        float sy = sin(yaw);
        lp = vec3(lp.x * cy - lp.y * sy, lp.x * sy + lp.y * cy, lp.z);

        float edge = mix(aSize0, aSize0 * 0.22, morph);
        // Shrink while flying so peel → dust feels continuous
        edge *= mix(1.0, 0.55, fly);
        vec3 world = home + lp * edge;

        vec4 mv = modelViewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mv;

        vec3 n = normal;
        n = vec3(n.x * cs - n.z * sn, n.y, n.x * sn + n.z * cs);
        n = vec3(n.x * cy - n.y * sy, n.x * sy + n.y * cy, n.z);
        vShade = 0.3 + 0.7 * clamp(dot(normalize(n), normalize(vec3(0.45, 0.82, 0.4))), 0.0, 1.0);

        float appear = smoothstep(0.0, 0.08, local);
        vAlpha = appear * mix(0.78, 0.38 + aSeed * 0.16, morph);
        vForm = 1.0 - morph;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying float vShade;
      varying float vForm;
      void main() {
        if (vAlpha < 0.02) discard;
        // Match hero particle language: soft luminous grey
        vec3 lit = mix(vec3(0.45), vec3(0.95), vShade);
        vec3 sand = vec3(0.75 + vShade * 0.1);
        vec3 col = mix(sand, lit, 0.4 + 0.6 * vForm);
        gl_FragColor = vec4(col, vAlpha);
      }
    `,
  });
  shardMat.transparent = true;
  shardMat.depthWrite = false;
  shardMat.blending = THREE.NormalBlending;

  shards = new THREE.InstancedMesh(boxBase, shardMat, SHARDS);
  shards.frustumCulled = false;
  shards.castShadow = false;
  shards.receiveShadow = false;
  // Identity instance matrices — transform lives in the shader
  var _id = new THREE.Matrix4();
  for (var ii = 0; ii < SHARDS; ii++) shards.setMatrixAt(ii, _id);
  shards.instanceMatrix.needsUpdate = true;
  root.add(shards);
  }

  if (LOW_PERF) {
    function scheduleShards() {
      window.setTimeout(buildShards, 100);
    }
    window.addEventListener("cosgral:cube-intro-done", scheduleShards, { once: true });
    window.setTimeout(scheduleShards, INTRO_DUR * 1000 + 500);
  } else {
    buildShards();
  }

  function resize() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  // Canvas żyje w #home-cube-portal (position: fixed), więc geometrycznie nigdy
  // nie schodzi z ekranu — obserwujemy sekcje, w których sześcian jest naprawdę
  // potrzebny, żeby nie renderować sceny przez całą długość strony.
  var zoneVisible = true;
  var lastPortalOp = null;
  var lastPortalVis = null;
  var offZoneTick = 0;
  var OUT_OF_ZONE_EVERY = LOW_PERF ? 4 : 3;
  (function watchCubeZone() {
    var zones = [document.getElementById("top"), document.getElementById("rozpad")].filter(Boolean);
    if (!zones.length || typeof IntersectionObserver !== "function") return;
    var seen = new WeakSet();
    var io = new IntersectionObserver(
      function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) seen.add(entries[i].target);
          else seen.delete(entries[i].target);
        }
        zoneVisible = zones.some(function (z) {
          return seen.has(z);
        });
      },
      { rootMargin: "20% 0px" }
    );
    zones.forEach(function (z) {
      io.observe(z);
    });
  })();

  function restoreRendererDpr() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, LOW_PERF ? 1.25 : 2));
    resize();
  }
  window.addEventListener("cosgral:cube-intro-done", restoreRendererDpr, { once: true });

  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
  });
  canvas.addEventListener("webglcontextrestored", function () {
    resize();
  });

  function syncPointer() {
    var ptr = window.cosgralPointer;
    if (!ptr) return;
    mouse.tx = ptr.tnx;
    mouse.ty = ptr.tny;
  }

  var cardNodes = null;
  window.addEventListener("resize", function () {
    cardNodes = null;
  });

  function sampleCards() {
    if (!shardMat) return;
    // Karty są statyczne w DOM — odpytujemy raz, nie przy każdym próbkowaniu.
    var nodes = cardNodes;
    if (!nodes || !nodes.length) {
      nodes = cardNodes = document.querySelectorAll(".services-fan__card");
    }
    var n = 0;
    var w = window.innerWidth || 1;
    var h = window.innerHeight || 1;
    for (var i = 0; i < nodes.length && n < 8; i++) {
      var el = nodes[i];
      var op = parseFloat(el.style.opacity || "1");
      if (op < 0.2) continue;
      var r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) continue;
      // map screen to approx world xy (heuristic matching camera view)
      var cx = ((r.left + r.width * 0.5) / w) * 2 - 1;
      var cy = -(((r.top + r.height * 0.5) / h) * 2 - 1);
      cardForces[n * 4] = cx * 2.8;
      cardForces[n * 4 + 1] = cy * 1.8;
      cardForces[n * 4 + 2] = (r.width / w) * 2.6;
      cardForces[n * 4 + 3] = (r.height / h) * 1.8;
      n++;
    }
    shardMat.uniforms.uCardCount.value = n;
  }

  function bindScroll() {
    if (!window.gsap || !window.ScrollTrigger) return;

    // #rozpad progress is owned by home-section-flow → window.cosgralSand
    ScrollTrigger.create({
      trigger: "#uslugi",
      start: "top bottom",
      endTrigger: "#kontakt",
      end: "bottom top",
      scrub: 1.1,
      onUpdate: function (self) {
        var cur = window.cosgralSand || {};
        if ((cur.cinema || 0) >= 0.96) {
          window.cosgralSand = {
            break: Math.max(cur.break || 0, 0.98),
            stream: Math.max(cur.stream || 0, 0.85 + self.progress * 0.15),
            cinema: Math.max(cur.cinema || 0, 1),
            locked: true,
            motion: 1,
          };
          document.documentElement.classList.add("is-sand-stream");
        }
      },
    });
  }

  var clock = new THREE.Clock();
  var cardSampleTick = 0;

  function sandLineActive() {
    return sandLocked || displayStream > 0.18 || displayBreak > 0.12;
  }

  function menuSandAbsorb() {
    if (menuBlend <= 0.001) return 0;
    // Ta sama krzywa w obie strony — zamknięcie = odwrócone otwarcie
    return 1 - Math.pow(Math.max(0, 1 - menuBlend), 0.68);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    var t = clock.getElapsedTime();
    syncPointer();
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    var sandExt = window.cosgralSand;
    var sm = 0;
    var tm = 0;
    var cinema = 0;
    menuBlend = menuTween.blend;
    if (sandExt) {
      cinema = Math.max(0, Math.min(1, sandExt.cinema ?? sandExt.motion ?? 0));
      sm = cinema;
      tm = sandExt.motionTail || 0;
      if (sandExt.resetCube) {
        sandLocked = false;
        scrollHandoff = null;
        displayBreak = 0;
        displayStream = 0;
        displayCinema = 0;
        displayMotion = 0;
        delete sandExt.resetCube;
      }
      if (sandExt.locked) sandLocked = true;
    }
    if (sandLocked && cinema < 0.96 && !(sandExt && sandExt.locked)) {
      sandLocked = false;
    }

    if (sandExt && sandExt.locked && cinema >= 0.96) {
      sandLocked = true;
      displayCinema = cinema;
      displayMotion = sm;
      displayBreak = 0.98;
      displayStream = 0.98;
    }

    if (sandLocked) {
      cinema = Math.max(cinema, 0.96);
      sm = Math.max(sm, 0.96);
    }

    displayCinema += (cinema - displayCinema) * (sandLocked ? 0.55 : 0.22);
    displayMotion += (sm - displayMotion) * (sandLocked ? 0.5 : 0.2);
    var c = displayCinema;

    var breakAmt = smooth01(0.08, 0.58, c) * 0.52;
    var streamAmt = smooth01(0.2, 0.94, c) * 0.96;
    if (sandLocked && c >= 0.96) {
      breakAmt = Math.max(breakAmt, 0.98);
      streamAmt = Math.max(streamAmt, 0.98);
    }

    if (sandLocked && c >= 0.96 && menuBlend <= 0.001) {
      displayBreak = 0.98;
      displayStream = 0.98;
    } else if (!(menuBlend > 0.001 && menuSandHold)) {
      displayBreak += (breakAmt - displayBreak) * 0.18;
      displayStream += (streamAmt - displayStream) * 0.18;
    }

    sMat.uniforms.uTime.value = t;
    sMat.uniforms.uMouse.value.set(mouse.x, mouse.y);

    var motion = c;
    var heroX = MOBILE ? 0.3 : 0.4;
    var heroY = MOBILE ? 0.54 : 0.7;
    var heroZ = 0.36;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
    var peakScale = CUBE_SCALE * (MOBILE ? 1.06 : 1.16);
    var cornerX = MOBILE ? 4.35 : 5.55;
    var cornerY = MOBILE ? 3.05 : 3.85;
    var centerX = mouse.x * 0.028;
    var centerY = mouse.y * 0.018;

    var approach = smooth01(0, 0.34, motion);
    var depart = smooth01(0.32, 0.93, motion);
    var heroReady = document.body.classList.contains("is-ready");
    var inHero = motion < 0.01 && menuBlend < 0.001;

    var scrollPosX = centerX + (1 - approach) * heroX - depart * cornerX;
    var scrollPosY = centerY + (1 - approach) * heroY + depart * cornerY;
    var scrollPosZ = (1 - approach) * heroZ - depart * 0.72;
    var scrollSc = heroScale + (peakScale - heroScale) * approach;

    var introActive = introStarted && !introDone && motion < 0.01 && menuBlend < 0.001;
    var introLanding = introDone && introSettle < 1 && motion < 0.01 && menuBlend < 0.001;
    var mobileHeroIdle =
      MOBILE && inHero && introDone && menuBlend < 0.001 && !introActive && !introLanding;
    var mobileDriftIdle =
      MOBILE &&
      !inHero &&
      depart > 0.12 &&
      menuBlend < 0.001 &&
      !introActive &&
      !introLanding;

    var idleRotX = 0.22 + Math.sin(t * (mobileHeroIdle ? 0.16 : 0.035)) * 0.04;
    var idleRotY = -0.35 + Math.cos(t * (mobileHeroIdle ? 0.13 : 0.028)) * 0.05;
    var idleRotZ = Math.sin(t * (mobileHeroIdle ? 0.1 : 0.022)) * 0.02;

    var spin = 0.016 + approach * 0.01 + depart * 0.005;
    var scrollRotX =
      idleRotX + heroLook.x + approach * 0.18 + depart * 0.28 + mouse.y * 0.05 * depart;
    var scrollRotY =
      idleRotY +
      heroLook.y +
      approach * 0.2 -
      depart * 0.12 +
      (t * spin + mouse.x * 0.1) * depart;
    var scrollRotZ = idleRotZ + depart * 0.08 + mouse.x * 0.01 * depart + t * 0.008 * depart;

    var introDim = 1;

    var motionDelta = motion - prevMotion;
    var leavingHero = motionDelta > 0.00008;
    var returningHero = motionDelta < -0.00008;

    if (returningHero) scrollHandoff = null;
    if (motion < 0.008) scrollHandoff = null;

    if (heroReady && inHero && introDone) {
      var ptr = window.cosgralPointer;
      if (ptr) {
        heroLook.y += ptr.nx * 0.0023;
        heroLook.x += ptr.ny * 0.0016;
      }
    } else if (!inHero && motion > 0.01) {
      heroLook.x *= 0.994;
      heroLook.y *= 0.994;
    }

    if (!scrollHandoff && leavingHero && motion >= 0.01 && motion < 0.04) {
      scrollHandoff = {
        px: heroX,
        py: heroY,
        pz: heroZ,
        rx: idleRotX + heroLook.x,
        ry: idleRotY + heroLook.y,
        rz: idleRotZ,
        sc: heroScale,
      };
    }

    var posX;
    var posY;
    var posZ;
    var sc;
    var rotX;
    var rotY;
    var rotZ;

    if (introActive || introLanding) {
      if (introLanding) introSettle = Math.min(1, introSettle + 0.034);
      var introT = introActive ? introEase01(introTween.progress) : 1;
      var flyStartX = MOBILE ? 7.15 : 8.75;
      var flyStartY = MOBILE ? -4.15 : -5.05;
      var flyStartZ = 0.14;
      var flyCtrlX = flyStartX * 0.36 + heroX * 0.64;
      var flyCtrlY = heroY + (MOBILE ? 1.28 : 1.72);
      var flyArc = quadArc(introT, flyStartX, flyStartY, flyCtrlX, flyCtrlY, heroX, heroY);
      posX = flyArc.x;
      posY = flyArc.y;
      posZ = flyStartZ + (heroZ - flyStartZ) * introT;
      sc = heroScale * (0.82 + 0.18 * introT);
      var flyStartRx = 0.52;
      var flyStartRy = -1.18;
      var flyStartRz = 0.32;
      rotX = flyStartRx + (idleRotX - flyStartRx) * introT;
      rotY = flyStartRy + (idleRotY - flyStartRy) * introT;
      rotZ = flyStartRz + (idleRotZ - flyStartRz) * introT;
      introDim = introActive
        ? Math.min(1, introTween.progress * 3.2)
        : 1;

      if (introLanding) {
        var landT = introEase01(introSettle);
        posX += (scrollPosX - posX) * landT;
        posY += (scrollPosY - posY) * landT;
        posZ += (scrollPosZ - posZ) * landT;
        sc += (scrollSc - sc) * landT;
        rotX += (scrollRotX - rotX) * landT;
        rotY += (scrollRotY - rotY) * landT;
        rotZ += (scrollRotZ - rotZ) * landT;
        if (introSettle >= 1 && !introDoneDispatched) {
          introDoneDispatched = true;
          window.dispatchEvent(new CustomEvent("cosgral:cube-intro-done"));
        }
      }
    } else if (!introStarted && motion < 0.01 && menuBlend < 0.001) {
      posX = MOBILE ? 7.15 : 8.75;
      posY = MOBILE ? -4.15 : -5.05;
      posZ = 0.14;
      sc = heroScale * 0.82;
      rotX = 0.52;
      rotY = -1.18;
      rotZ = 0.32;
      introDim = 0;
    } else if (scrollHandoff && leavingHero) {
      var handoffT = smooth01(0.01, 0.26, motion);
      posX = scrollHandoff.px + (scrollPosX - scrollHandoff.px) * handoffT;
      posY = scrollHandoff.py + (scrollPosY - scrollHandoff.py) * handoffT;
      posZ = scrollHandoff.pz + (scrollPosZ - scrollHandoff.pz) * handoffT;
      sc = scrollHandoff.sc + (scrollSc - scrollHandoff.sc) * handoffT;
      rotX = scrollHandoff.rx + (scrollRotX - scrollHandoff.rx) * handoffT;
      rotY = scrollHandoff.ry + (scrollRotY - scrollHandoff.ry) * handoffT;
      rotZ = scrollHandoff.rz + (scrollRotZ - scrollHandoff.rz) * handoffT;
    } else {
      posX = scrollPosX;
      posY = scrollPosY;
      posZ = scrollPosZ;
      sc = scrollSc;
      rotX = scrollRotX;
      rotY = scrollRotY;
      rotZ = scrollRotZ;
    }

    prevMotion = motion;

    if (typeof posX === "number") {
      cubeGroup.position.set(posX, posY, posZ);
      cubeGroup.scale.set(sc, sc, sc);
      if (menuBlend < 0.001) {
        if (mobileHeroIdle) {
          if (!mobileHeroSpinReady) {
            cubeGroup.rotation.set(rotX, rotY, rotZ);
            cubeGroup.quaternion.setFromEuler(cubeGroup.rotation);
            mobileHeroSpinReady = true;
          }
          mobileDriftSpinReady = false;
          applyMobileIdleSpin(cubeGroup);
        } else if (mobileDriftIdle) {
          mobileHeroSpinReady = false;
          if (!mobileDriftSpinReady) {
            cubeGroup.rotation.set(rotX, rotY, rotZ);
            cubeGroup.quaternion.setFromEuler(cubeGroup.rotation);
            mobileDriftSpinReady = true;
          }
          applyMobileIdleSpin(cubeGroup);
        } else {
          mobileHeroSpinReady = false;
          mobileDriftSpinReady = false;
          cubeGroup.rotation.x = rotX;
          cubeGroup.rotation.y = rotY;
          cubeGroup.rotation.z = rotZ;
        }
      }
    }

    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);

    var cubeVisible = depart < 0.93;

    var uslugiPanel = document.querySelector("#uslugi .home-scene__panel");
    var tilesOp = 0;
    if (uslugiPanel && window.gsap) {
      tilesOp = parseFloat(gsap.getProperty(uslugiPanel, "opacity")) || 0;
    }

    if (menuBlend > 0.001) {
      mobileDriftSpinReady = false;
      var menuScale = heroScale * 1.14;
      var menuX = heroX;
      var menuY = heroY;
      var menuZ = heroZ;
      var cubeDim = (1 - menuBlend * 0.4) * getMenuCubeDimMul();

      if (menuFrom.sideEntry) {
        var flyT = menuTween.closing ? 1 - menuBlend : menuBlend;
        var flyEase = sideEntryFlyEase(flyT, menuFrom.galleryMenu);
        var arrive = menuTween.closing ? 1 - flyEase : flyEase;
        var startX = menuFrom.px;
        var startY = menuFrom.py;
        var startZ = menuFrom.pz;

        if (menuFrom.galleryMenu) {
          var ctrlX = startX * 0.56 + menuX * 0.44;
          var ctrlY = startY * 0.18 + menuY * 0.82;
          var arc = quadArc(arrive, startX, startY, ctrlX, ctrlY, menuX, menuY);
          posX = arc.x;
          posY = arc.y;
        } else {
          posX = startX + (menuX - startX) * arrive;
          posY = startY + (menuY - startY) * arrive;
        }
        posZ = startZ + (menuZ - startZ) * arrive;
        sc = menuFrom.sc + (menuScale - menuFrom.sc) * arrive;

        cubeGroup.position.set(posX, posY, posZ);
        cubeGroup.scale.set(sc, sc, sc);
        if (menuFrom.qStart) {
          _axisSpin.set(0.18, 1, 0.12).normalize();
          _qFaceSpin.setFromAxisAngle(_axisSpin, arrive * Math.PI * 2);
          cubeGroup.quaternion.copy(menuFrom.qStart).multiply(_qFaceSpin);
          cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
        }
        cubeGroup.updateMatrixWorld(true);

        if (!menuTween.closing && menuBlend > 0.72) {
          applyMenuFaceOrientation(((menuBlend - 0.72) / 0.28) * 0.14);
        }

        if (menuTween.closing && flyT > 0.86) {
          cubeDim *= Math.max(0, 1 - (flyT - 0.86) / 0.14);
        }
      } else {
        var mb = menuBlend * menuBlend * (3 - 2 * menuBlend);
        posX = menuFrom.px + (menuX - menuFrom.px) * mb;
        posY = menuFrom.py + (menuY - menuFrom.py) * mb;
        posZ = menuFrom.pz + (menuZ - menuFrom.pz) * mb;
        sc = menuFrom.sc + (menuScale - menuFrom.sc) * mb;

        cubeGroup.position.set(posX, posY, posZ);
        cubeGroup.scale.set(sc, sc, sc);
        cubeGroup.updateMatrixWorld(true);

        applyMenuFaceOrientation(menuTween.closing ? 0 : 0.1 + menuBlend * 0.24);
      }

      cubeVisible = true;
      sMat.uniforms.uFade.value = cubeDim;
      setWireOpacity(wire, 0.1 * cubeDim);
      shell.material.opacity = 0.62 * cubeDim;
      edges.material.opacity = 0.44 * cubeDim;
    } else {
      var fade = introActive || introLanding || (!introStarted && motion < 0.01 && menuBlend < 0.001)
        ? introDim
        : cubeVisible
          ? 1
          : 0;
      sMat.uniforms.uFade.value = fade;
      shell.material.opacity = 0.62 * fade;
      setWireOpacity(wire, 0.1 * fade);
      edges.material.opacity = 0.44 * fade;
      if (introActive || introLanding || (!introStarted && motion < 0.01 && menuBlend < 0.001)) {
        cubeVisible = fade > 0.02;
      }
    }

    cubeGroup.visible = cubeVisible;
    homeCubeVisible = cubeVisible && menuBlend < 0.001;

    cubeGroup.updateMatrixWorld(true);

    var shardBreak = displayBreak;
    var shardStream = displayStream;
    var menuAbsorb = 0;

    if (menuBlend > 0.001 && sandLineActive()) {
      menuAbsorb = menuSandAbsorb();
      var hold = menuSandHold || { break: displayBreak, stream: displayStream };
      var keep = 1 - menuAbsorb;
      shardBreak = hold.break * keep;
      shardStream = hold.stream * keep;
    } else if (menuBlend <= 0.001 && sandLocked && c >= 0.96) {
      shardBreak = Math.max(shardBreak, 0.98);
      shardStream = Math.max(shardStream, 0.98);
    }

    if (shardMat) {
      if (!shardsBuilt && (displayBreak > 0.04 || displayStream > 0.04 || c > 0.03 || menuAbsorb > 0.02)) {
        buildShards();
      }
      shardMat.uniforms.uTime.value = t;
      shardMat.uniforms.uBreak.value = shardBreak;
      shardMat.uniforms.uStream.value = shardStream;
      shardMat.uniforms.uMenuAbsorb.value = menuAbsorb;
      shardMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
      shardMat.uniforms.uCubeMat.value.copy(cubeGroup.matrixWorld);
    }

    if (displayStream > 0.15 || sandLocked) {
      // Każde sampleCards() to wymuszony reflow (getBoundingClientRect na kartach),
      // więc próbkujemy co 3. klatkę niezależnie od klasy urządzenia.
      if (cardSampleTick++ % 3 === 0) sampleCards();
    }

    // Portal stays visible for sand ribbon after cube exits
    var sandOn =
      menuBlend > 0.02 ||
      sandLocked ||
      displayStream > 0.32 ||
      displayBreak > 0.4 ||
      tm > 0.08;
    var portalOp = sandOn
      ? 1
      : tilesOp > 0.45
        ? Math.max(0.15, 1 - smooth01(0.45, 0.85, tilesOp))
        : 0.68;
    var needsScene = portalOp > 0.05 || sandOn || menuBlend > 0.001;

    if (canvas.parentElement) {
      var op = String(portalOp);
      var vis = portalOp > 0.05 ? "visible" : "hidden";
      // Zapisy stylu unieważniają styl całego poddrzewa — piszemy tylko przy zmianie.
      if (op !== lastPortalOp) {
        canvas.parentElement.style.opacity = op;
        lastPortalOp = op;
      }
      if (vis !== lastPortalVis) {
        canvas.parentElement.style.visibility = vis;
        lastPortalVis = vis;
      }
    }

    if (!needsScene) return;

    // Poza hero/rozpadem na ekranie zostaje już tylko wolno dryfujące pole
    // piasku — pełne 60 fps jest tam niepotrzebne, a scena kosztuje najwięcej
    // GPU na stronie. W strefie sześcianu (i przy otwartym menu) renderujemy
    // każdą klatkę, poza nią co OUT_OF_ZONE_EVERY-tą.
    var fullRate = zoneVisible || menuBlend > 0.001;
    if (!fullRate && offZoneTick++ % OUT_OF_ZONE_EVERY !== 0) return;

    camera.position.set(mouse.x * 0.08, mouse.y * 0.05, 5.4);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  if (canvas.parentElement) {
    canvas.parentElement.style.opacity = "0.68";
    canvas.parentElement.style.visibility = "visible";
  }

  watchIntroReady();
  animate();

  (async function () {
    if (window.cosgralSmoothScroll && window.cosgralSmoothScroll.ready) {
      await window.cosgralSmoothScroll.ready;
    }
    bindScroll();
  })();

  function captureMenuFrom() {
    var heroZ = 0.36;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
    var sectionIdx = window.cosgralSectionSnap?.getIndex?.() ?? 0;

    menuFrom.offscreen = false;
    menuFrom.sideEntry = false;
    menuFrom.galleryMenu = false;

    if (sectionIdx === 0) {
      menuFrom.px = cubeGroup.position.x;
      menuFrom.py = cubeGroup.position.y;
      menuFrom.pz = cubeGroup.position.z;
      menuFrom.rx = cubeGroup.rotation.x;
      menuFrom.ry = cubeGroup.rotation.y;
      menuFrom.rz = cubeGroup.rotation.z;
      menuFrom.sc = cubeGroup.scale.x;
      menuFrom.visible = true;
      return;
    }

    menuFrom.sideEntry = true;
    menuFrom.visible = false;
    syncCamera();
    menuFrom.galleryMenu = !!homeCubeVisible;
    var entryPoint = homeCubeVisible
      ? getMenuEntryStartWorld(heroZ)
      : getMenuCornerWorld(heroZ);
    menuFrom.px = entryPoint.x;
    menuFrom.py = entryPoint.y;
    menuFrom.pz = entryPoint.z;
    if (cubeGroup.visible && sMat.uniforms.uFade.value > 0.12) {
      menuFrom.rx = cubeGroup.rotation.x;
      menuFrom.ry = cubeGroup.rotation.y;
      menuFrom.rz = cubeGroup.rotation.z;
      menuFrom.sc = cubeGroup.scale.x;
      _qMenuStart.copy(cubeGroup.quaternion);
    } else {
      menuFrom.rx = 0.16;
      menuFrom.ry = -Math.PI * 0.52;
      menuFrom.rz = 0.05;
      menuFrom.sc = heroScale * 1.02;
      _qMenuStart.setFromEuler(new THREE.Euler(0.16, -Math.PI * 0.52, 0.05, "XYZ"));
    }
    menuFrom.qStart = _qMenuStart.clone();
    delete menuFrom.qEnd;
  }

  function snapMenuFromPose() {
    if (!menuFrom.sideEntry) return;
    cubeGroup.position.set(menuFrom.px, menuFrom.py, menuFrom.pz);
    cubeGroup.scale.set(menuFrom.sc, menuFrom.sc, menuFrom.sc);
    if (menuFrom.qStart) {
      cubeGroup.quaternion.copy(menuFrom.qStart);
      cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    } else {
      cubeGroup.rotation.set(menuFrom.rx, menuFrom.ry, menuFrom.rz);
    }
    cubeGroup.visible = true;
    sMat.uniforms.uFade.value = 1;
    shell.material.opacity = 0.62;
    setWireOpacity(wire, 0.1);
    edges.material.opacity = 0.44;
  }

  function syncMenuAnchorPose() {
    var heroX = MOBILE ? 0.3 : 0.4;
    var heroY = MOBILE ? 0.54 : 0.7;
    var heroZ = 0.36;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
    var menuScale = heroScale * 1.14;

    menuAnchorGroup.position.set(heroX, heroY, heroZ);
    menuAnchorGroup.scale.set(menuScale, menuScale, menuScale);
    if (menuFrom.qStart) {
      _axisSpin.set(0.18, 1, 0.12).normalize();
      _qFaceSpin.setFromAxisAngle(_axisSpin, Math.PI * 2);
      menuAnchorGroup.quaternion.copy(menuFrom.qStart).multiply(_qFaceSpin);
      menuAnchorGroup.rotation.setFromQuaternion(menuAnchorGroup.quaternion, "XYZ");
    }
    syncCamera();
    applyMenuFaceOrientation(1, menuAnchorGroup);
    menuAnchorGroup.updateMatrixWorld(true);
  }

  function computeFaceRectForGroup(poseGroup) {
    var faceIdx = getBestFaceIndexFor(poseGroup);
    var corners = FACE_CORNERS[faceIdx];
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;

    for (var i = 0; i < corners.length; i++) {
      _faceVec.set(corners[i][0] * HALF, corners[i][1] * HALF, corners[i][2] * HALF);
      poseGroup.localToWorld(_faceVec);
      _faceScreen.copy(_faceVec).project(camera);
      var sx = (_faceScreen.x * 0.5 + 0.5) * window.innerWidth;
      var sy = (-_faceScreen.y * 0.5 + 0.5) * window.innerHeight;
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }

    var cx = (minX + maxX) * 0.5;
    var cy = (minY + maxY) * 0.5;
    var size = Math.min(maxX - minX, maxY - minY) * 0.94;
    return { x: cx, y: cy, size: size };
  }

  function getMenuFaceAnchorRect() {
    if (menuBlend < 0.04 || !menuFrom.galleryMenu) return null;
    syncMenuAnchorPose();
    return computeFaceRectForGroup(menuAnchorGroup);
  }

  function getMenuFaceRect() {
    if (menuBlend < 0.04 || !cubeGroup.visible) return null;
    return computeFaceRectForGroup(cubeGroup);
  }

  var _faceVec = new THREE.Vector3();
  var _faceScreen = new THREE.Vector3();
  var MENU_SEG_MIN_DUR = 0.14;

  function resetHeroMenuCloseState() {
    menuTween.blend = 0;
    menuFrom.sideEntry = false;
    menuFrom.galleryMenu = false;
    menuTween.closing = false;
    if (menuSandHold) {
      displayBreak = menuSandHold.break;
      displayStream = menuSandHold.stream;
    }
    menuSandHold = null;
  }

  function prepareHeroMenuOpenFromClosed() {
    if (sandLineActive()) {
      menuSandHold = { break: displayBreak, stream: displayStream };
    } else {
      menuSandHold = null;
    }
    if (!shardsBuilt && menuSandHold) buildShards();
    captureMenuFrom();
    snapMenuFromPose();
  }

  window.cosgralCube = {
    group: cubeGroup,
    shards: shards,
    introDone: function () {
      return introDone;
    },
    forceIntro: startIntro,
    getMenuFaceRect: getMenuFaceRect,
    getMenuFaceAnchorRect: getMenuFaceAnchorRect,
    getMenuBlend: function () {
      return menuBlend;
    },
    isSideEntry: function () {
      return menuFrom.sideEntry;
    },
    getMenuOpenDuration: function () {
      if (menuFrom.galleryMenu) return MENU_OPEN_GALLERY_DUR;
      return menuFrom.sideEntry ? MENU_OPEN_SIDE_DUR : MENU_OPEN_HERO_DUR;
    },
    getMenuCloseDuration: function () {
      if (menuFrom.galleryMenu) return MENU_CLOSE_GALLERY_DUR;
      return menuFrom.sideEntry ? MENU_CLOSE_SIDE_DUR : MENU_CLOSE_HERO_DUR;
    },
    getMenuLinksDelay: getMenuLinksDelay,
    getMenuLabelReveal: getMenuLabelReveal,
    getMenuCubeDimMul: getMenuCubeDimMul,
    openMenu: function () {
      var freshOpen = menuTween.blend < 0.02;
      if (freshOpen) prepareHeroMenuOpenFromClosed();
      menuTween.closing = false;
      var openDur = menuFrom.galleryMenu
        ? MENU_OPEN_GALLERY_DUR
        : menuFrom.sideEntry
          ? MENU_OPEN_SIDE_DUR
          : MENU_OPEN_HERO_DUR;
      var remaining = Math.max(MENU_SEG_MIN_DUR, openDur * (1 - menuTween.blend));
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, { blend: 1, duration: remaining, ease: "power3.out" });
      }
      menuTween.blend = 1;
      return null;
    },
    closeMenu: function () {
      menuTween.closing = true;
      var closeDur = menuFrom.galleryMenu
        ? MENU_CLOSE_GALLERY_DUR
        : menuFrom.sideEntry
          ? MENU_CLOSE_SIDE_DUR
          : MENU_CLOSE_HERO_DUR;
      var remaining = Math.max(MENU_SEG_MIN_DUR, closeDur * menuTween.blend);
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, {
          blend: 0,
          duration: remaining,
          ease: "power3.out",
          onComplete: function () {
            if (menuTween.blend > 0.02) return;
            resetHeroMenuCloseState();
          },
        });
      }
      resetHeroMenuCloseState();
      return null;
    },
  };
})();
