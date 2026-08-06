/**
 * Hero cube + cinematic shatter → diagonal sand stream (single Three.js system).
 * Soft additive particles, scroll-scrubbed, cursor liquid forces.
 */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

(function () {
  "use strict";

  var canvas = document.getElementById("hero-3d");
  if (!canvas) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  if (REDUCED) return;

  var HALF = 1.35;
  var CUBE_SCALE = 0.5;
  var SHARDS = MOBILE ? 900 : 1600;
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
  var menuTween = { blend: 0 };
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
  };

  function smooth01(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

  var SURFACE = MOBILE ? 1800 : 4200;
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

  var boxGeo = new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2);
  var shell = new THREE.Mesh(
    boxGeo,
    new THREE.MeshBasicMaterial({ color: 0x080808, transparent: true, opacity: 0.62, depthWrite: true })
  );
  var wire = new THREE.Mesh(
    boxGeo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.1 })
  );
  var edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(boxGeo),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.48 })
  );
  cubeGroup.add(shell, wire, edges, new THREE.Points(sGeo, sMat));

  // ——— Shatter shards (volume sample of cube → diagonal sand) ———
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

  var boxBase = new THREE.BoxGeometry(1, 1, 1);
  boxBase.setAttribute("aStart", new THREE.InstancedBufferAttribute(aStart, 3));
  boxBase.setAttribute("aSand", new THREE.InstancedBufferAttribute(aSand, 3));
  boxBase.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
  boxBase.setAttribute("aDelay", new THREE.InstancedBufferAttribute(aDelay, 1));
  boxBase.setAttribute("aSize0", new THREE.InstancedBufferAttribute(aSize0, 1));

  var shardMat = new THREE.ShaderMaterial({
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

  var shards = new THREE.InstancedMesh(boxBase, shardMat, SHARDS);
  shards.frustumCulled = false;
  shards.castShadow = false;
  shards.receiveShadow = false;
  // Identity instance matrices — transform lives in the shader
  var _id = new THREE.Matrix4();
  for (var ii = 0; ii < SHARDS; ii++) shards.setMatrixAt(ii, _id);
  shards.instanceMatrix.needsUpdate = true;
  root.add(shards);

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

  function syncPointer() {
    var ptr = window.cosgralPointer;
    if (!ptr) return;
    mouse.tx = ptr.tnx;
    mouse.ty = ptr.tny;
  }

  function sampleCards() {
    var nodes = document.querySelectorAll(".services-fan__card");
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

  function animate() {
    requestAnimationFrame(animate);
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
        cinema = 0;
        displayCinema = 0;
        displayMotion = 0;
        sandLocked = false;
        delete sandExt.resetCube;
      }
      if (sandExt.locked && cinema >= 0.96) sandLocked = true;
    }
    if (sandLocked && cinema < 0.96) sandLocked = false;

    displayCinema += (cinema - displayCinema) * 0.22;
    displayMotion += (sm - displayMotion) * 0.2;
    var c = displayCinema;

    var breakAmt = smooth01(0.08, 0.58, c) * 0.52;
    var streamAmt = smooth01(0.2, 0.94, c) * 0.96;
    if (sandLocked && c >= 0.96) {
      breakAmt = Math.max(breakAmt, 0.98);
      streamAmt = Math.max(streamAmt, 0.98);
    }

    displayBreak += (breakAmt - displayBreak) * 0.18;
    displayStream += (streamAmt - displayStream) * 0.18;

    sMat.uniforms.uTime.value = t;
    sMat.uniforms.uMouse.value.set(mouse.x, mouse.y);

    var motion = c;
    var heroX = MOBILE ? 0.3 : 0.4;
    var heroY = MOBILE ? 0.54 : 0.7;
    var heroZ = 0.36;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.74 : 0.78);
    var peakScale = CUBE_SCALE * (MOBILE ? 1.06 : 1.16);
    var cornerX = MOBILE ? 4.35 : 5.55;
    var cornerY = MOBILE ? 3.05 : 3.85;
    var centerX = mouse.x * 0.028;
    var centerY = mouse.y * 0.018;

    var approach = smooth01(0, 0.34, motion);
    var depart = smooth01(0.32, 0.93, motion);

    var posX = centerX + (1 - approach) * heroX - depart * cornerX;
    var posY = centerY + (1 - approach) * heroY + depart * cornerY;
    var posZ = (1 - approach) * heroZ - depart * 0.72;
    cubeGroup.position.set(posX, posY, posZ);

    var sc = heroScale + (peakScale - heroScale) * approach;
    cubeGroup.scale.set(sc, sc, sc);

    var cubeVisible = depart < 0.93;

    var uslugiPanel = document.querySelector("#uslugi .home-scene__panel");
    var tilesOp = 0;
    if (uslugiPanel && window.gsap) {
      tilesOp = parseFloat(gsap.getProperty(uslugiPanel, "opacity")) || 0;
    }

    var spin = 0.016 + approach * 0.01 + depart * 0.005;
    cubeGroup.rotation.y =
      t * spin + mouse.x * 0.1 + (1 - approach) * -0.28 + approach * 0.18 - depart * 0.08;
    cubeGroup.rotation.x =
      0.22 + mouse.y * 0.05 + t * (0.009 + approach * 0.005) + (1 - approach) * 0.26;
    cubeGroup.rotation.z =
      mouse.x * 0.01 + t * 0.008 + (1 - approach) * -0.08 + depart * 0.03;

    if (menuBlend > 0.001) {
      var menuScale = heroScale * 1.14;
      var menuX = heroX;
      var menuY = heroY;
      var menuZ = heroZ;
      var cubeDim = 1 - menuBlend * 0.4;

      if (menuFrom.sideEntry) {
        var flyT = Math.min(1, menuBlend / 0.58);
        var flyEase = 1 - Math.pow(1 - flyT, 2.65);
        var rotT = Math.max(0, (menuBlend - 0.5) / 0.5);
        var rotEase = rotT * rotT * (3 - 2 * rotT);

        posX = menuFrom.px + (menuX - menuFrom.px) * flyEase;
        posY = menuFrom.py + (menuY - menuFrom.py) * flyEase;
        posZ = menuFrom.pz + (menuZ - menuFrom.pz) * flyEase;
        sc = menuFrom.sc + (menuScale - menuFrom.sc) * flyEase;

        cubeGroup.position.set(posX, posY, posZ);
        cubeGroup.scale.set(sc, sc, sc);
        cubeGroup.rotation.x = menuFrom.rx + (0 - menuFrom.rx) * rotEase;
        cubeGroup.rotation.y = menuFrom.ry + (0 - menuFrom.ry) * rotEase;
        cubeGroup.rotation.z = menuFrom.rz + (0 - menuFrom.rz) * rotEase;
      } else {
        var mb = menuBlend * menuBlend * (3 - 2 * menuBlend);
        posX = menuFrom.px + (menuX - menuFrom.px) * mb;
        posY = menuFrom.py + (menuY - menuFrom.py) * mb;
        posZ = menuFrom.pz + (menuZ - menuFrom.pz) * mb;
        sc = menuFrom.sc + (menuScale - menuFrom.sc) * mb;

        cubeGroup.position.set(posX, posY, posZ);
        cubeGroup.scale.set(sc, sc, sc);
        cubeGroup.rotation.x = menuFrom.rx + (0 - menuFrom.rx) * mb;
        cubeGroup.rotation.y = menuFrom.ry + (0 - menuFrom.ry) * mb;
        cubeGroup.rotation.z = menuFrom.rz + (0 - menuFrom.rz) * mb;
      }

      cubeVisible = true;
      sMat.uniforms.uFade.value = cubeDim;
      shell.material.opacity = 0.58 * cubeDim;
      wire.material.opacity = 0.09 * cubeDim;
      edges.material.opacity = 0.42 * cubeDim;
    } else {
      sMat.uniforms.uFade.value = cubeVisible ? 1 : 0;
      shell.material.opacity = cubeVisible ? 0.58 : 0;
      wire.material.opacity = cubeVisible ? 0.09 : 0;
      edges.material.opacity = cubeVisible ? 0.42 : 0;
    }

    cubeGroup.visible = cubeVisible;

    cubeGroup.updateMatrixWorld(true);

    var shardBreak = displayBreak;
    var shardStream = displayStream;
    if (menuBlend > 0.001) {
      var menuFade = Math.max(0, 1 - menuBlend * 1.12);
      shardBreak *= menuFade;
      shardStream *= menuFade;
    }
    if (sandLocked && c >= 0.96) {
      shardBreak = Math.max(shardBreak, 0.98);
      shardStream = Math.max(shardStream, 0.98);
    }

    shardMat.uniforms.uTime.value = t;
    shardMat.uniforms.uBreak.value = shardBreak;
    shardMat.uniforms.uStream.value = shardStream;
    shardMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
    shardMat.uniforms.uCubeMat.value.copy(cubeGroup.matrixWorld);

    if (displayStream > 0.15 || sandLocked) sampleCards();

    // Portal stays visible for sand ribbon after cube exits
    if (canvas.parentElement) {
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
          : 1;
      canvas.parentElement.style.opacity = String(portalOp);
      canvas.parentElement.style.visibility = portalOp > 0.05 ? "visible" : "hidden";
    }

    camera.position.set(mouse.x * 0.08, mouse.y * 0.05, 5.4);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  (async function () {
    if (window.cosgralSmoothScroll && window.cosgralSmoothScroll.ready) {
      await window.cosgralSmoothScroll.ready;
    }
    bindScroll();
    // Prefer section-flow values if present; still bind local as backup
    animate();
  })();

  function captureMenuFrom() {
    var heroX = MOBILE ? 0.3 : 0.4;
    var heroY = MOBILE ? 0.54 : 0.7;
    var heroZ = 0.36;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.74 : 0.78);
    var sectionIdx = window.cosgralSectionSnap?.getIndex?.() ?? 0;

    menuFrom.offscreen = false;
    menuFrom.sideEntry = false;

    if (sectionIdx === 0 && cubeGroup.visible) {
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
    menuFrom.px = -(MOBILE ? 7.8 : 9.4);
    menuFrom.py = heroY;
    menuFrom.pz = heroZ;
    menuFrom.rx = 0.16;
    menuFrom.ry = -Math.PI * 0.52;
    menuFrom.rz = 0.05;
    menuFrom.sc = heroScale * 1.02;
  }

  function snapMenuFromPose() {
    if (!menuFrom.sideEntry) return;
    cubeGroup.position.set(menuFrom.px, menuFrom.py, menuFrom.pz);
    cubeGroup.scale.set(menuFrom.sc, menuFrom.sc, menuFrom.sc);
    cubeGroup.rotation.set(menuFrom.rx, menuFrom.ry, menuFrom.rz);
    cubeGroup.visible = true;
    sMat.uniforms.uFade.value = 1;
    shell.material.opacity = 0.58;
    wire.material.opacity = 0.09;
    edges.material.opacity = 0.42;
  }

  function getMenuFaceRect() {
    if (menuBlend < 0.04 || !cubeGroup.visible) return null;

    var pts = [
      [-0.82, 0.82, 1],
      [0.82, 0.82, 1],
      [-0.82, -0.82, 1],
      [0.82, -0.82, 1],
    ];
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;

    for (var i = 0; i < pts.length; i++) {
      _faceVec.set(pts[i][0] * HALF, pts[i][1] * HALF, pts[i][2] * HALF);
      cubeGroup.localToWorld(_faceVec);
      _faceScreen.copy(_faceVec).project(camera);
      var sx = (_faceScreen.x * 0.5 + 0.5) * window.innerWidth;
      var sy = (-_faceScreen.y * 0.5 + 0.5) * window.innerHeight;
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }

    _faceVec.set(0, 0, HALF);
    cubeGroup.localToWorld(_faceVec);
    _faceScreen.copy(_faceVec).project(camera);
    var cx = (_faceScreen.x * 0.5 + 0.5) * window.innerWidth;
    var cy = (-_faceScreen.y * 0.5 + 0.5) * window.innerHeight;

    var size = Math.min(maxX - minX, maxY - minY) * 0.94;
    return { x: cx, y: cy, size: size };
  }

  var _faceVec = new THREE.Vector3();
  var _faceScreen = new THREE.Vector3();

  window.cosgralCube = {
    group: cubeGroup,
    shards: shards,
    getMenuFaceRect: getMenuFaceRect,
    getMenuBlend: function () {
      return menuBlend;
    },
    isSideEntry: function () {
      return menuFrom.sideEntry;
    },
    openMenu: function () {
      captureMenuFrom();
      snapMenuFromPose();
      menuTween.blend = 0;
      var dur = menuFrom.sideEntry ? 1.08 : 0.92;
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, { blend: 1, duration: dur, ease: "power3.out" });
      }
      menuTween.blend = 1;
      return null;
    },
    closeMenu: function () {
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, {
          blend: 0,
          duration: 0.72,
          ease: "power3.in",
          onComplete: function () {
            menuFrom.sideEntry = false;
          },
        });
      }
      menuTween.blend = 0;
      menuFrom.sideEntry = false;
      return null;
    },
  };
})();
