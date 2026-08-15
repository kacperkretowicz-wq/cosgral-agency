/**
 * Portfolio hero — kostka + rozpad w linię piasku (jak homepage) przy wejściu na stronę.
 */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";
import { createShardGeometry } from "./cube-shape.js";

(function () {
  "use strict";

  if (!document.body.classList.contains("portfolio-page") && !document.body.classList.contains("about-page")) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  var backCanvas = document.getElementById("portfolio-sand-back");
  var frontCanvas = document.getElementById("portfolio-sand-front");
  if (!backCanvas || !frontCanvas) return;

  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var HALF = 1.35;
  var COUNT = MOBILE ? 720 : 1600;
  var DIAG = -0.62;
  var cA = Math.cos(DIAG);
  var sA = Math.sin(DIAG);

  var state = { cube: 0, break: 0, stream: 0, hero: 1 };
  var layers = [];
  var displayBreak = 0;
  var displayStream = 0;
  var menuSandHold = null;
  var menuSandBoost = false;
  var menuSandBoostClosing = false;
  var menuSandVisible = false;
  var menuParticlePass = false;
  var menuParticlePassClosing = false;
  var menuBoostHero = null;

  function smooth01(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-4, edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function lockMenuSandLine() {
    displayBreak = 0.98;
    displayStream = 0.98;
    menuSandHold = { break: 0.98, stream: 0.98 };
  }

  function armMenuSandVisible() {
    menuSandVisible = true;
    if (menuBoostHero == null) menuBoostHero = state.hero;
    state.hero = 1;
    lockMenuSandLine();
    document.body.classList.add("is-grafiki-menu-sand", "is-portfolio-sand-active");
  }

  function armMenuSandBoost() {
    menuSandVisible = true;
    menuSandBoost = true;
    menuSandBoostClosing = false;
    menuParticlePass = false;
    lockMenuSandLine();
    if (menuBoostHero == null) menuBoostHero = state.hero;
    state.hero = 1;
    document.body.classList.add("is-grafiki-menu-sand", "is-portfolio-sand-active");
  }

  function armParticlePassMenu() {
    menuParticlePass = true;
    menuParticlePassClosing = false;
    menuSandBoost = false;
    menuSandBoostClosing = false;
    displayBreak = 0.98;
    displayStream = 0.98;
    menuSandHold = { break: 0.98, stream: 0.98 };
    document.body.classList.add(
      "is-grafiki-menu-sand",
      "is-portfolio-sand-active",
      "is-gallery-menu-particles"
    );
  }

  function releaseParticlePassMenu() {
    menuParticlePass = false;
    menuParticlePassClosing = false;
    menuSandHold = null;
    document.body.classList.remove("is-gallery-menu-particles", "is-grafiki-menu-sand");
    displayBreak = state.break * state.hero;
    displayStream = state.stream * state.hero;
  }

  function releaseMenuSandVisible() {
    menuSandVisible = false;
    if (menuBoostHero != null) state.hero = menuBoostHero;
    menuBoostHero = null;
    if (!menuSandBoost) {
      menuSandHold = null;
      document.body.classList.remove("is-grafiki-menu-sand");
      displayBreak = state.break * state.hero;
      displayStream = state.stream * state.hero;
    }
  }

  function releaseMenuSandBoost() {
    menuSandBoost = false;
    menuSandBoostClosing = false;
    menuSandVisible = false;
    menuSandHold = null;
    if (menuBoostHero != null) state.hero = menuBoostHero;
    menuBoostHero = null;
    document.body.classList.remove("is-grafiki-menu-sand");
    displayBreak = state.break * state.hero;
    displayStream = state.stream * state.hero;
  }

  function hash(i, salt) {
    var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function gauss2(u, v) {
    return Math.sqrt(-2 * Math.log(Math.max(1e-4, u))) * Math.cos(Math.PI * 2 * Math.max(1e-4, v));
  }

  function buildLayer(canvas, count, layerOpts) {
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !MOBILE,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 40);
    camera.position.set(0, 0, 5.4);

    var aStart = new Float32Array(count * 3);
    var aSand = new Float32Array(count * 3);
    var aSeed = new Float32Array(count);
    var aDelay = new Float32Array(count);
    var aSize0 = new Float32Array(count);

    for (var i = 0; i < count; i++) {
      var gi = i + layerOpts.seedOffset;
      var sx;
      var sy;
      var sz;
      var depth01;
      if (hash(gi, 1) < 0.78) {
        var face = Math.floor(hash(gi, 2) * 6);
        var a = (hash(gi, 3) * 2 - 1) * HALF;
        var b = (hash(gi, 4) * 2 - 1) * HALF;
        var inset = hash(gi, 5) * 0.04 * HALF;
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
        var r = Math.pow(hash(gi, 2), 0.42);
        var th = hash(gi, 3) * Math.PI * 2;
        var ph = Math.acos(hash(gi, 4) * 2 - 1);
        sx = Math.max(-1, Math.min(1, r * Math.sin(ph) * Math.cos(th) * 1.05)) * HALF;
        sy = Math.max(-1, Math.min(1, r * Math.sin(ph) * Math.sin(th) * 1.05)) * HALF;
        sz = Math.max(-1, Math.min(1, r * Math.cos(ph) * 1.05)) * HALF;
        depth01 = r;
      }
      aStart[i * 3] = sx;
      aStart[i * 3 + 1] = sy;
      aStart[i * 3 + 2] = sz;

      var t = hash(gi, 6);
      var side = gauss2(hash(gi, 7), hash(gi, 8)) * 0.55;
      side = Math.max(-2.0, Math.min(2.0, side + (hash(gi, 9) - 0.5) * 0.5));
      var flare = 1 + 0.18 * Math.sin(t * 8.4) + 0.1 * Math.sin(t * 15.2 + 1.1);
      var halfW = (0.12 + t * 0.48) * flare;
      var along = t * 8.6 - 4.3;
      var lat = side * halfW;
      var meander = Math.sin(t * 5.8 + hash(gi, 10) * 5.5) * (0.1 + t * 0.22);
      aSand[i * 3] = along * cA + -sA * lat + cA * meander * 0.35;
      aSand[i * 3 + 1] = along * sA + cA * lat + sA * meander * 0.35;
      aSand[i * 3 + 2] = (hash(gi, 11) - 0.5) * 0.18;

      aSeed[i] = hash(gi, 12);
      var peelAxis = (sx * cA + sy * sA) / (HALF * 1.42);
      aDelay[i] = Math.max(0, Math.min(0.55, (0.5 - peelAxis) * 0.32 + (1 - depth01) * 0.12 + hash(gi, 13) * 0.18));
      aSize0[i] = layerOpts.sizeBase + hash(gi, 14) * layerOpts.sizeVar;
    }

    var geo = createShardGeometry();
    geo.setAttribute("aStart", new THREE.InstancedBufferAttribute(aStart, 3));
    geo.setAttribute("aSand", new THREE.InstancedBufferAttribute(aSand, 3));
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(aSeed, 1));
    geo.setAttribute("aDelay", new THREE.InstancedBufferAttribute(aDelay, 1));
    geo.setAttribute("aSize0", new THREE.InstancedBufferAttribute(aSize0, 1));

    var mat = new THREE.ShaderMaterial({
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
        uDiag: { value: new THREE.Vector2(cA, sA) },
        uCubeMat: { value: new THREE.Matrix4() },
        uMenuAbsorb: { value: 0 },
        uLayerAlpha: { value: layerOpts.alpha },
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
        uniform mat4 uCubeMat;
        uniform float uMenuAbsorb;
        uniform float uLayerAlpha;
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
          edge *= mix(1.0, 0.55, fly);
          vec3 world = home + lp * edge;
          vec4 mv = modelViewMatrix * vec4(world, 1.0);
          gl_Position = projectionMatrix * mv;
          vec3 n = normal;
          n = vec3(n.x * cs - n.z * sn, n.y, n.x * sn + n.z * cs);
          n = vec3(n.x * cy - n.y * sy, n.x * sy + n.y * cy, n.z);
          vShade = 0.3 + 0.7 * clamp(dot(normalize(n), normalize(vec3(0.45, 0.82, 0.4))), 0.0, 1.0);
          float appear = smoothstep(0.0, 0.08, max(local, menuT));
          vAlpha = appear * mix(0.78, 0.38 + aSeed * 0.16, morph) * uLayerAlpha;
          vForm = 1.0 - morph;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying float vShade;
        varying float vForm;
        void main() {
          if (vAlpha < 0.02) discard;
          vec3 lit = mix(vec3(0.45), vec3(0.95), vShade);
          vec3 sand = vec3(0.75 + vShade * 0.1);
          vec3 col = mix(sand, lit, 0.4 + 0.6 * vForm);
          gl_FragColor = vec4(col, vAlpha);
        }
      `,
    });

    var mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.frustumCulled = false;
    var id = new THREE.Matrix4();
    for (var ii = 0; ii < count; ii++) mesh.setMatrixAt(ii, id);
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);

    return {
      renderer: renderer,
      scene: scene,
      camera: camera,
      mat: mat,
      isFront: !!layerOpts.isFront,
      baseAlpha: layerOpts.alpha,
    };
  }

  layers.push(
    buildLayer(backCanvas, Math.floor(COUNT * 0.52), {
      seedOffset: 0,
      sizeBase: 0.016,
      sizeVar: 0.02,
      alpha: 0.72,
    })
  );
  layers.push(
    buildLayer(frontCanvas, Math.ceil(COUNT * 0.48), {
      seedOffset: 40000,
      sizeBase: 0.016,
      sizeVar: 0.02,
      alpha: 0.88,
      isFront: true,
    })
  );

  function resize() {
    layers.forEach(function (layer) {
      var w = layer.renderer.domElement.clientWidth;
      var h = layer.renderer.domElement.clientHeight;
      if (!w || !h) return;
      layer.renderer.setSize(w, h, false);
      layer.camera.aspect = w / h;
      layer.camera.updateProjectionMatrix();
    });
  }

  window.addEventListener("resize", resize);
  resize();

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function syncPointer() {
    var ptr = window.cosgralPointer;
    if (!ptr) return;
    mouse.tx = ptr.tnx;
    mouse.ty = ptr.tny;
  }

  var clock = new THREE.Clock();

  function sandPowerMul(menuBlend) {
    if (menuBlend > 0.001 || menuSandBoost || menuSandVisible || menuSandHold) return 1;
    if (state.break >= 0.85 && state.stream >= 0.85) return 1;
    return state.hero;
  }

  function sandLineActive() {
    return (
      menuSandVisible ||
      menuSandHold ||
      menuSandBoost ||
      displayStream > 0.14 ||
      displayBreak > 0.1 ||
      state.stream * state.hero > 0.14 ||
      state.stream > 0.45
    );
  }

  function menuSandAbsorb() {
    var blend = window.cosgralCube?.getMenuSideEntryBlend?.();
    if (blend == null) blend = window.cosgralCube?.getMenuBlend?.();
    if (blend == null) blend = 0;
    if (blend <= 0.001) return 0;
    return 1 - Math.pow(Math.max(0, 1 - blend), 0.68);
  }

  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    var t = clock.getElapsedTime();
    syncPointer();
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    var cubeMat = window.cosgralCube?.getCubeMatrixWorld?.();
    var absorbMat = window.cosgralCube?.getMenuAbsorbMatrixWorld?.();
    var menuBlend = window.cosgralCube?.getMenuBlend?.() || 0;
    var sideEntryBlend =
      window.cosgralCube?.getMenuSideEntryBlend?.() ?? menuBlend;
    var baseBreak = state.break * sandPowerMul(menuBlend);
    var baseStream = state.stream * sandPowerMul(menuBlend);

    if (!(menuBlend > 0.001 && (menuSandHold || menuSandVisible || menuSandBoost))) {
      if (state.stream < 0.97 || state.break < 0.97) {
        displayBreak = baseBreak;
        displayStream = baseStream;
      } else {
        displayBreak += (baseBreak - displayBreak) * 0.18;
        displayStream += (baseStream - displayStream) * 0.18;
      }
    }

    if (menuBlend <= 0.001 && (menuSandBoostClosing || menuParticlePassClosing)) {
      if (menuParticlePassClosing) releaseParticlePassMenu();
      else releaseMenuSandBoost();
    }

    var menuAbsorb = 0;
    var shardBreak = displayBreak;
    var shardStream = displayStream;
    var particleDissolve = window.cosgralCube?.getParticlePassDissolve?.() || 0;
    var particleAssemble = window.cosgralCube?.getParticlePassAssemble?.() || 0;
    var particlePass = window.cosgralCube?.getParticlePassPass?.() || 0;
    var particleBurst = window.cosgralCube?.getParticlePassBurst?.() || 0;
    var driftMat = window.cosgralCube?.getDriftMatrixWorld?.();
    var menuMat = window.cosgralCube?.getMenuAbsorbMatrixWorld?.();
    var PP_BREAK = 0.98;
    var PP_STREAM = 0.94;
    var homeMenuSand =
      menuSandVisible ||
      menuSandBoost ||
      (menuBlend > 0.001 && window.cosgralCube?.isSideEntry?.());
    var menuBgExit =
      window.cosgralCube?.isMenuBgExit?.() && window.cosgralCube?.getMenuBgExitProgress?.() < 1;

    if (menuBlend > 0.001 && sandLineActive()) {
      if (!menuSandHold) lockMenuSandLine();
      if (!menuBgExit && sideEntryBlend > 0.001 && !menuParticlePass) {
        menuAbsorb = menuSandAbsorb();
      }
      var hold = menuSandHold;
      shardBreak = hold.break;
      shardStream = hold.stream;
    }

    var menuLabelReveal =
      menuBlend > 0.001 && menuAbsorb > 0.12
        ? window.cosgralCube?.getMenuLabelReveal?.() || 0
        : 0;

    layers.forEach(function (layer) {
      var isFront = layer.isFront;
      var layerAbsorb = 0;
      var layerBreak = displayBreak;
      var layerStream = displayStream;
      var layerAlpha = layer.baseAlpha || 0.72;
      var matSrc = cubeMat;

      if (menuParticlePass && menuBlend > 0.001) {
        if (isFront) {
          if (particleAssemble > 0.02) {
            layerBreak = PP_BREAK;
            layerStream = PP_STREAM;
            layerAbsorb = particleAssemble;
            layerAlpha *= 0.82 + particleBurst * 0.62;
            matSrc = menuMat || cubeMat;
          } else {
            layerBreak = 0;
            layerStream = 0;
            layerAbsorb = 0;
          }
        } else {
          var backAmt = Math.max(
            particlePass,
            smooth01(0.04, 0.98, particleDissolve) * (1 - particleAssemble * 0.3)
          );
          layerBreak = PP_BREAK * backAmt;
          layerStream = PP_STREAM * Math.min(1, backAmt * 1.04);
          layerAbsorb = 0;
          layerAlpha *= 0.75 + backAmt * 0.78;
          matSrc = driftMat || cubeMat;
        }
      } else if (homeMenuSand && menuBlend > 0.001 && sandLineActive()) {
        layerBreak = shardBreak;
        layerStream = shardStream;
        layerAbsorb = menuAbsorb;
        matSrc = menuMat || cubeMat;
      } else if (menuBlend > 0.001) {
        layerAbsorb = menuAbsorb;
        layerBreak = menuAbsorb > 0.001 ? shardBreak : displayBreak;
        layerStream = menuAbsorb > 0.001 ? shardStream : displayStream;
        matSrc = menuMat || absorbMat || cubeMat;
      }

      if (menuSandVisible || menuSandBoost) {
        layerAlpha = layer.baseAlpha || layerAlpha;
      }

      if (menuLabelReveal > 0.001 && layerAbsorb > 0.12) {
        layerAlpha *= 1 - menuLabelReveal * 0.5;
      }

      layer.mat.uniforms.uTime.value = t;
      layer.mat.uniforms.uBreak.value = layerBreak;
      layer.mat.uniforms.uStream.value = layerStream;
      layer.mat.uniforms.uMenuAbsorb.value = layerAbsorb;
      layer.mat.uniforms.uLayerAlpha.value = layerAlpha;
      layer.mat.uniforms.uMouse.value.set(mouse.x, mouse.y);
      if (matSrc) layer.mat.uniforms.uCubeMat.value.copy(matSrc);
      layer.renderer.render(layer.scene, layer.camera);
    });
  }

  animate();

  window.addEventListener("cosgral:cube-menu", function (e) {
    if (e.detail && e.detail.open) {
      if (e.detail.particlePass) {
        armParticlePassMenu();
        return;
      }
      if (e.detail.showSand) {
        armMenuSandVisible();
      }
      if (e.detail.boostSand) {
        armMenuSandBoost();
        return;
      }
      if (sandLineActive()) {
        lockMenuSandLine();
      } else {
        menuSandHold = null;
      }
      return;
    }
    if (menuSandBoost) {
      menuSandBoostClosing = true;
      document.body.classList.remove("is-grafiki-menu-sand");
      return;
    }
    if (menuSandVisible) {
      releaseMenuSandVisible();
      return;
    }
    if (menuParticlePass) {
      menuParticlePassClosing = true;
      return;
    }
    if (menuSandHold) {
      displayBreak = menuSandHold.break;
      displayStream = menuSandHold.stream;
    }
    menuSandHold = null;
  });

  document.body.classList.add("is-portfolio-sand-active", "is-portfolio-intro-pending");

  var introBootHandled = false;

  function skipIntro(sectionIndex) {
    state.cube = 1;
    state.break = 0.98;
    state.stream = 0.98;
    displayBreak = 0.98;
    displayStream = 0.98;
    window.cosgralCube?.cancelPortfolioHeroPass?.();
    document.body.classList.remove("is-portfolio-intro-pending");
    if (sectionIndex > 0) {
      window.cosgralCube?.applyPortfolioBootSection?.(sectionIndex);
    }
  }

  function runIntro() {
    var breakDelay = MOBILE ? 0.55 : 0.72;
    var breakDur = MOBILE ? 2.6 : 3.35;

    window.cosgralCube?.startPortfolioHeroPass?.({
      delay: breakDelay,
      duration: breakDur,
      ease: "power2.inOut",
    });

    if (!window.gsap) {
      state.cube = 1;
      state.break = 0.98;
      state.stream = 0.98;
      document.body.classList.remove("is-portfolio-intro-pending");
      return;
    }

    gsap.timeline({
      defaults: { ease: "power3.out" },
    })
      .to(
        state,
        {
          cube: 1,
          duration: MOBILE ? 1.05 : 1.35,
          ease: "power2.out",
        },
        0
      )
      .to(
        state,
        {
          break: 0.98,
          stream: 0.98,
          duration: breakDur,
          ease: "power2.inOut",
        },
        breakDelay
      )
      .add(function () {
        document.body.classList.remove("is-portfolio-intro-pending");
      }, MOBILE ? 0.95 : 1.1);
  }

  function introSectionIndex() {
    if (window.scrollY < 64) return 0;
    var idx = 0;
    if (document.body.classList.contains("about-page")) {
      var team = document.querySelector(".about-team");
      if (team) {
        var teamTop = team.getBoundingClientRect().top + window.scrollY;
        idx = window.scrollY + window.innerHeight * 0.42 < teamTop ? 0 : 1;
      }
    } else if (document.body.classList.contains("graphics-gallery-page")) {
      var gallery = document.getElementById("graphics-gallery");
      if (gallery) {
        var galleryTop = gallery.getBoundingClientRect().top + window.scrollY;
        idx = window.scrollY + window.innerHeight * 0.42 < galleryTop ? 0 : 1;
      }
    } else if (document.body.classList.contains("reels-gallery-page")) {
      var reelsGallery = document.getElementById("reels-gallery");
      if (reelsGallery) {
        var reelsTop = reelsGallery.getBoundingClientRect().top + window.scrollY;
        idx = window.scrollY + window.innerHeight * 0.42 < reelsTop ? 0 : 1;
      }
    } else if (document.body.classList.contains("portfolio-page")) {
      idx = window.cosgralPortfolioStepper?.getIndex?.();
      if (typeof idx !== "number") {
        var strony = document.getElementById("strony");
        var stronyY = strony
          ? Math.max(0, strony.getBoundingClientRect().top + window.scrollY - (MOBILE ? 72 : 96))
          : window.innerHeight;
        idx = window.scrollY < stronyY - 48 ? 0 : 1;
      }
    }
    return idx;
  }

  function bootIntroIfNeeded(sectionIndex) {
    if (introBootHandled) return;
    var idx = typeof sectionIndex === "number" ? sectionIndex : introSectionIndex();
    if (window.scrollY < 64) idx = 0;
    handleIntroBoot(idx);
  }

  function handleIntroBoot(sectionIndex) {
    if (introBootHandled) return;
    introBootHandled = true;
    if (sectionIndex === 0) {
      window.setTimeout(runIntro, MOBILE ? 120 : 80);
      return;
    }
    skipIntro(sectionIndex);
  }

  window.addEventListener("cosgral:section-step", function (e) {
    if (e.detail && e.detail.initial) bootIntroIfNeeded(e.detail.index);
  });

  if (window.cosgralCube) {
    queueMicrotask(function () {
      bootIntroIfNeeded();
    });
  } else {
    window.addEventListener(
      "cosgral:cube-ready",
      function () {
        queueMicrotask(function () {
          bootIntroIfNeeded();
        });
      },
      { once: true }
    );
  }

  window.setTimeout(function () {
    bootIntroIfNeeded();
  }, 900);
})();
