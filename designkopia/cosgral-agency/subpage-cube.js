/**
 * Subpage cube — scroll drift + menu fly-in (jak homepage, side entry).
 */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";
import { createIntactCubeParts } from "./cube-shape.js";

(function () {
  "use strict";

  var canvas = document.getElementById("subpage-cube");
  if (!canvas) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  var portal = document.querySelector(".subpage-cube-portal");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var HALF = 1.35;
  var CUBE_SCALE = MOBILE ? 0.36 : 0.46;
  var MENU_OPEN_DUR = 2.4;
  var MENU_CLOSE_DUR = 2.0;
  var MENU_OPEN_SIDE_DUR = 4.1;
  var MENU_OPEN_SIDE_BG_DUR = 4.4;
  var MENU_OPEN_HOME_SIDE_DUR = 6.1;
  var MENU_CLOSE_SIDE_DUR = 3.9;
  var MENU_CLOSE_SIDE_BG_DUR = 2.6;
  var MENU_CLOSE_HOME_SIDE_DUR = 1.95;
  var MENU_OPEN_PASS_DUR = 3.4;
  var MENU_CLOSE_PASS_DUR = 2.8;
  var MENU_Z_FRONT = 0.4;
  var PP_DISSOLVE_END = 0.36;
  var PP_ASSEMBLE_START = 0.64;
  var MENU_OPEN_EASE = "power2.out";
  var MENU_PASS_OPEN_EASE = "power2.out";
  var MENU_CLOSE_EASE = "power2.in";
  var MENU_SIDE_EASE = "power2.inOut";
  var MENU_SIDE_BG_EASE = "power1.inOut";
  var MENU_SIDE_BG_EXIT_END = 0.3;
  var MENU_LINKS_LEAD = 0.07;
  var MENU_LABELS_BEFORE_CUBE = 1.0;
  var MENU_CUBE_LABEL_DIM = 0.5;
  var MENU_SEG_MIN_DUR = 0.14;
  var MENU_CAM = { x: 0, y: 0, z: 5.4 };
  var scrollProgress = 0;
  var mouse = { x: 0, y: 0 };
  var menuBlend = 0;
  var menuTween = { blend: 0, closing: false };
  var grafikiMenuActive = false;
  var grafikiFade = 0.68;
  var isPortfolioPage = document.body.classList.contains("portfolio-page");
  var isAboutPage = document.body.classList.contains("about-page");
  var isGraphicsGalleryPage = document.body.classList.contains("graphics-gallery-page");
  var isReelsGalleryPage = document.body.classList.contains("reels-gallery-page");
  var isGallerySubpage = isGraphicsGalleryPage || isReelsGalleryPage;
  var isSandHeroSubpage = isAboutPage || isGallerySubpage;
  var isPortfolioMainPage = isPortfolioPage && !isSandHeroSubpage;
  var isSandHeroPage = isPortfolioMainPage || isSandHeroSubpage;
  var portfolioFlight = {
    phase: isSandHeroPage ? "hidden" : "drift",
    t: 0,
    driftP: 0,
    hideAfter: false,
  };
  var portfolioSectionIndex = 0;
  var PORTFOLIO_STRONY_IN_DUR = MOBILE ? 3.1 : 3.9;
  var PORTFOLIO_STRONY_OUT_DUR = MOBILE ? 3.0 : 3.7;
  var menuFrom = {
    px: 0,
    py: 0,
    pz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    sc: CUBE_SCALE,
    sideEntry: false,
    galleryMenu: false,
    bgExit: false,
    sideEntrySnapped: false,
    sandBoosted: false,
    particlePass: false,
    driftP: 0,
    target: null,
    qStart: null,
    qEnd: null,
    faceIdx: null,
  };

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
  var _faceVec = new THREE.Vector3();
  var _faceScreen = new THREE.Vector3();
  var _absorbPos = new THREE.Vector3();
  var _absorbScale = new THREE.Vector3();
  var _absorbQuat = new THREE.Quaternion();
  var _absorbMatrix = new THREE.Matrix4();
  var _euler = new THREE.Euler();
  var _qDrift = new THREE.Quaternion();
  var menuPhase = { time: 0, qHold: new THREE.Quaternion() };
  var lastAnimT = 0;
  var mobileDriftSpinReady = false;
  var mobileDriftSeedP = null;

  function applyMobileIdleSpin(group) {
    _axisSpin.set(0.12, 1, 0.08).normalize();
    _qFaceSpin.setFromAxisAngle(_axisSpin, 0.00135);
    group.quaternion.multiply(_qFaceSpin);
    group.rotation.setFromQuaternion(group.quaternion, "XYZ");
  }

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

  function getSandHeroContentSelector() {
    if (isAboutPage) return ".about-team";
    if (isGraphicsGalleryPage) return "#graphics-gallery";
    if (isReelsGalleryPage) return "#reels-gallery";
    return null;
  }

  function smooth01(edge0, edge1, x) {
    var t = Math.max(0, Math.min(1, (x - edge0) / Math.max(1e-4, edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function particlePassState(blend) {
    var b = Math.max(0, Math.min(1, blend));
    var dissolve = smooth01(0, PP_DISSOLVE_END, b);
    var assemble = smooth01(PP_ASSEMBLE_START, 1, b);
    var pass = dissolve * (1 - assemble);
    var particleBurst = Math.max(
      pass,
      smooth01(0.05, 0.95, dissolve) * (1 - assemble * 0.25),
      smooth01(0.06, 0.98, assemble)
    );
    var cubeMeshOpacity;
    if (b < PP_DISSOLVE_END) {
      var dissolveT = smooth01(0, PP_DISSOLVE_END, b);
      cubeMeshOpacity = Math.pow(1 - dissolveT, 1.75);
    } else if (b < PP_ASSEMBLE_START) {
      cubeMeshOpacity = 0;
    } else {
      cubeMeshOpacity = smooth01(0.5, 0.88, assemble);
    }
    return {
      dissolve: dissolve,
      pass: pass,
      assemble: assemble,
      particleBurst: particleBurst,
      cubeOpacity: cubeMeshOpacity,
      cubeMeshOpacity: cubeMeshOpacity,
    };
  }

  function getScrollProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, window.scrollY / max) : 0;
  }

  function syncCameraNeutral() {
    camera.position.set(MENU_CAM.x, MENU_CAM.y, MENU_CAM.z);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
  }

  function syncCamera() {
    camera.position.set(mouse.x * 0.08, mouse.y * 0.05, MENU_CAM.z);
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

  function easeMenuBgExit(t) {
    return 1 - Math.pow(1 - t, 1.62);
  }

  function sideEntryFlyEase(t, useSoft) {
    var pow = useSoft ? 1.48 : 2.65;
    return 1 - Math.pow(1 - t, pow);
  }

  function isMenuBgExitPhase() {
    if (!menuFrom.bgExit) return false;
    return (
      (!menuTween.closing && menuBlend < MENU_SIDE_BG_EXIT_END) ||
      (menuTween.closing && menuBlend <= MENU_SIDE_BG_EXIT_END)
    );
  }

  function syncSideEntryPortalLayer() {
    var behind = isMenuBgExitPhase();
    var driftBg = menuFrom.keepDriftVisible && !behind;
    document.body.classList.toggle("is-cube-menu-bg-exit", behind);
    document.body.classList.toggle("is-cube-menu-passing", behind);
    document.body.classList.toggle("is-cube-menu-front", !behind && !driftBg);
    document.body.classList.toggle("is-cube-menu-drift-bg", driftBg);
    if (portal) portal.style.opacity = "1";
  }

  function triggerMenuSandBoost() {
    if (menuFrom.sandBoosted) return;
    menuFrom.sandBoosted = true;
    window.dispatchEvent(
      new CustomEvent("cosgral:cube-menu", {
        detail: { open: true, boostSand: true, phase: "side-entry" },
      })
    );
  }

  function releaseMenuSandBoost() {
    if (!menuFrom.sandBoosted) return;
    menuFrom.sandBoosted = false;
    window.dispatchEvent(
      new CustomEvent("cosgral:cube-menu", {
        detail: { open: false, boostSand: true },
      })
    );
  }

  function getScreenCornerWorld(corner, planeZ) {
    var pad = MOBILE ? 32 : 52;
    var sx = corner === "tr" || corner === "br" ? window.innerWidth - pad : pad;
    var sy = corner === "bl" || corner === "br" ? window.innerHeight - pad : pad;
    return worldPosFromScreen(sx, sy, planeZ);
  }

  function quadArc(t, sx, sy, cx, cy, ex, ey) {
    var u = 1 - t;
    return {
      x: u * u * sx + 2 * u * t * cx + t * t * ex,
      y: u * u * sy + 2 * u * t * cy + t * t * ey,
    };
  }

  function easeOutSmooth(t) {
    return 1 - Math.pow(1 - t, 2.35);
  }

  function getSectionScrollProgress(selector) {
    var el = document.querySelector(selector);
    if (!el) return 0;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    return Math.min(1, Math.max(0, (el.getBoundingClientRect().top + window.scrollY) / max));
  }

  function getDriftPose(progress, time) {
    return {
      rootX: -0.55 + progress * 1.2 + Math.sin(time * 0.18) * 0.07,
      rootY: 0.3 - progress * 0.85 + Math.cos(time * 0.15) * 0.05,
      rootZ: -progress * 0.35,
      rotX: 0.22 + progress * 0.9 + Math.sin(time * 0.35) * 0.04,
      rotY: -0.35 + progress * Math.PI * 1.5 + Math.cos(time * 0.28) * 0.05,
      rotZ: progress * 0.28 + Math.sin(time * 0.22) * 0.02,
    };
  }

  function galleryHidesMenuCubeMesh() {
    return menuFrom.galleryMenu && menuBlend > 0.001 && menuFrom.sideEntry && !menuFrom.keepDriftVisible;
  }

  function setCubeVisualFade(dim) {
    if (galleryHidesMenuCubeMesh()) dim = 0;
    var fade = Math.max(0, Math.min(1, dim * getMenuCubeDimMul()));
    sMat.uniforms.uFade.value = fade;
    shell.material.opacity = 0.62 * fade;
    setWireOpacity(wire, 0.1 * fade);
    edges.material.opacity = 0.44 * fade;
    if (portal && menuBlend <= 0.001 && !grafikiMenuActive) {
      portal.style.opacity = fade < 0.98 ? String(0.68 * fade) : "";
    }
  }

  function killPortfolioFlightTweens() {
    if (window.gsap) gsap.killTweensOf(portfolioFlight);
  }

  function setPortfolioDriftIdle() {
    killPortfolioFlightTweens();
    portfolioFlight.phase = "drift";
    portfolioFlight.t = 1;
    portfolioFlight.hideAfter = false;
    cubeGroup.visible = true;
  }

  var heroPassToken = 0;

  function cancelPortfolioHeroPass() {
    heroPassToken++;
    killPortfolioFlightTweens();
  }

  function paintPortfolioDriftNow(opts) {
    scrollProgress = getScrollProgress();
    var now = performance.now() * 0.001;
    var time = opts && opts.keepPhase ? menuPhase.time : now;
    menuPhase.time = time;
    applyPortfolioDrift(scrollProgress, time);
    syncCamera();
    if (portal) portal.style.opacity = "";
  }

  function applyPortfolioBootSection(index) {
    if (!isSandHeroPage) return;
    killPortfolioFlightTweens();
    portfolioSectionIndex = index;

    if (index === 0) {
      portfolioFlight.phase = "hidden";
      portfolioFlight.t = 1;
      portfolioFlight.hideAfter = false;
      cubeGroup.visible = false;
      setCubeVisualFade(0);
      return;
    }

    if (isSandHeroSubpage && index === 1) {
      var contentSel = getSandHeroContentSelector();
      portfolioFlight.driftP = contentSel ? getSectionScrollProgress(contentSel) : getScrollProgress();
      setPortfolioDriftIdle();
      paintPortfolioDriftNow();
      return;
    }

    if (!isPortfolioMainPage) return;

    portfolioFlight.driftP = index === 1 ? getSectionScrollProgress("#strony") : getScrollProgress();
    setPortfolioDriftIdle();
    paintPortfolioDriftNow();
  }

  function startPortfolioHeroPass(opts) {
    if (!isSandHeroPage) return;
    opts = opts || {};
    var duration = opts.duration != null ? opts.duration : MOBILE ? 2.6 : 3.35;
    var delay = opts.delay != null ? opts.delay : MOBILE ? 0.55 : 0.72;
    var ease = opts.ease || "power2.inOut";

    heroPassToken++;
    var token = heroPassToken;
    killPortfolioFlightTweens();
    portfolioFlight.phase = "hidden";
    portfolioFlight.t = 0;
    cubeGroup.visible = false;
    setCubeVisualFade(0);

    function begin() {
      if (token !== heroPassToken) return;
      portfolioFlight.phase = "hero-pass";
      portfolioFlight.t = 0;
      cubeGroup.visible = true;
      if (window.gsap) {
        gsap.to(portfolioFlight, {
          t: 1,
          duration: duration,
          ease: ease,
          onComplete: function () {
            if (token !== heroPassToken) return;
            portfolioFlight.phase = "hidden";
            portfolioFlight.t = 1;
            cubeGroup.visible = false;
            setCubeVisualFade(0);
          },
        });
        return;
      }
      portfolioFlight.t = 1;
      portfolioFlight.phase = "hidden";
      cubeGroup.visible = false;
      setCubeVisualFade(0);
    }

    if (window.gsap && delay > 0) {
      gsap.delayedCall(delay, begin);
    } else {
      window.setTimeout(begin, Math.max(0, delay * 1000));
    }
  }

  function startPortfolioStroniesEnter() {
    if (!isSandHeroPage) return;
    killPortfolioFlightTweens();
    var contentSel = getSandHeroContentSelector();
    portfolioFlight.driftP = isSandHeroSubpage && contentSel
      ? getSectionScrollProgress(contentSel)
      : getSectionScrollProgress("#strony");
    portfolioFlight.phase = "stronies-enter";
    portfolioFlight.t = 0;
    cubeGroup.visible = true;
    if (window.gsap) {
      gsap.to(portfolioFlight, {
        t: 1,
        duration: PORTFOLIO_STRONY_IN_DUR,
        ease: "power2.out",
        onComplete: function () {
          portfolioFlight.phase = "drift";
          portfolioFlight.t = 1;
        },
      });
      return;
    }
    portfolioFlight.t = 1;
    portfolioFlight.phase = "drift";
  }

  function startPortfolioStroniesExit(opts) {
    if (!isSandHeroPage) return;
    opts = opts || {};
    killPortfolioFlightTweens();
    portfolioFlight.hideAfter = !!opts.hideAfter;
    portfolioFlight.driftP = opts.hideAfter ? getScrollProgress() : getSectionScrollProgress("#strony");
    portfolioFlight.phase = "stronies-exit";
    portfolioFlight.t = 0;
    cubeGroup.visible = true;
    if (window.gsap) {
      gsap.to(portfolioFlight, {
        t: 1,
        duration: PORTFOLIO_STRONY_OUT_DUR,
        ease: "power2.inOut",
        onComplete: function () {
          if (portfolioFlight.hideAfter) {
            portfolioFlight.phase = "hidden";
            portfolioFlight.t = 1;
            portfolioFlight.hideAfter = false;
            cubeGroup.visible = false;
            setCubeVisualFade(0);
          } else {
            portfolioFlight.phase = "drift";
            portfolioFlight.t = 1;
            cubeGroup.visible = true;
          }
          if (opts.onDone) opts.onDone();
        },
      });
      return;
    }
    if (portfolioFlight.hideAfter) {
      portfolioFlight.phase = "hidden";
      portfolioFlight.hideAfter = false;
      cubeGroup.visible = false;
      setCubeVisualFade(0);
    } else {
      portfolioFlight.phase = "drift";
      cubeGroup.visible = true;
    }
    portfolioFlight.t = 1;
    if (opts.onDone) opts.onDone();
  }

  function applyPortfolioHeroPass(ft, time) {
    syncCameraNeutral();
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    var z = MOBILE ? 0.3 : 0.36;
    var outPad = MOBILE ? 36 : 54;
    var br = worldPosFromScreen(
      window.innerWidth + outPad * 0.55,
      window.innerHeight + outPad * 0.55,
      z
    );
    var exit = worldPosFromScreen(-outPad * 0.95, -outPad * 0.95, z);
    cubeGroup.position.set(
      br.x + (exit.x - br.x) * ft,
      br.y + (exit.y - br.y) * ft,
      z
    );
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    cubeGroup.rotation.x = 0.32 + ft * 0.42 + Math.sin(time * 0.4) * 0.02;
    cubeGroup.rotation.y = -0.58 + ft * 1.05 + Math.cos(time * 0.32) * 0.03;
    cubeGroup.rotation.z = ft * 0.16;
    var fadeStart = 0.9;
    var fade = 0.85;
    if (ft > fadeStart) {
      var exitT = (ft - fadeStart) / (1 - fadeStart);
      exitT = exitT * exitT * (3 - 2 * exitT);
      fade = 0.85 * (1 - exitT);
    }
    setCubeVisualFade(fade);
  }

  function applyPortfolioStroniesEnter(ft, time) {
    syncCamera();
    root.rotation.set(0, 0, 0);
    var drift = getDriftPose(portfolioFlight.driftP, time);
    var z = MOBILE ? 0.3 : 0.36;
    var tl = getScreenCornerWorld("tl", z);
    var ease = easeOutSmooth(ft);
    var ctrlX = tl.x * 0.34 + drift.rootX * 0.66;
    var ctrlY = tl.y * 0.18 + drift.rootY * 0.82;
    var arc = quadArc(ease, tl.x, tl.y, ctrlX, ctrlY, drift.rootX, drift.rootY);
    root.position.set(arc.x, arc.y, drift.rootZ);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    cubeGroup.rotation.x = drift.rotX;
    cubeGroup.rotation.y = drift.rotY + (1 - ease) * -0.85;
    cubeGroup.rotation.z = drift.rotZ;
    _axisSpin.set(0.16, 1, 0.1).normalize();
    _qFaceSpin.setFromAxisAngle(_axisSpin, (1 - ease) * Math.PI * 1.15);
    cubeGroup.quaternion.setFromEuler(cubeGroup.rotation);
    cubeGroup.quaternion.multiply(_qFaceSpin);
    cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    var fade = Math.min(1, 0.55 + ease * 0.45);
    setCubeVisualFade(0.85 * fade * (grafikiMenuActive ? grafikiFade / 0.68 : 1));
  }

  function applyPortfolioStroniesExit(ft, time) {
    syncCamera();
    var drift = getDriftPose(portfolioFlight.driftP, time);
    var z = MOBILE ? 0.3 : 0.36;
    var outPad = MOBILE ? 36 : 54;
    var end = portfolioFlight.hideAfter
      ? worldPosFromScreen(-outPad * 0.95, -outPad * 0.95, z)
      : getScreenCornerWorld("tl", z);
    var ease = easeOutSmooth(ft);
    var ctrlX = drift.rootX * 0.42 + end.x * 0.58;
    var ctrlY = drift.rootY * 0.28 + end.y * 0.72;
    var arc = quadArc(ease, drift.rootX, drift.rootY, ctrlX, ctrlY, end.x, end.y);
    root.position.set(arc.x, arc.y, drift.rootZ);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    cubeGroup.rotation.x = drift.rotX;
    cubeGroup.rotation.y = drift.rotY + ease * 0.7;
    cubeGroup.rotation.z = drift.rotZ;
    var fade = 0.85;
    if (portfolioFlight.hideAfter) {
      if (ft > 0.88) {
        var exitT = (ft - 0.88) / 0.12;
        exitT = exitT * exitT * (3 - 2 * exitT);
        fade = 0.85 * (1 - exitT);
      }
    } else if (ease > 0.68) {
      fade = 0.85 * (1 - (ease - 0.68) / 0.32);
    }
    setCubeVisualFade(fade * (grafikiMenuActive ? grafikiFade / 0.68 : 1));
  }

  function applyPortfolioDrift(p, time) {
    menuPhase.time = time;
    var drift = getDriftPose(p, time);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    root.position.x = drift.rootX;
    root.position.y = drift.rootY;
    root.position.z = drift.rootZ;

    if (MOBILE) {
      if (
        !mobileDriftSpinReady ||
        mobileDriftSeedP == null ||
        Math.abs(p - mobileDriftSeedP) > 0.18
      ) {
        driftQuaternion(p, time);
        cubeGroup.quaternion.copy(_qDrift);
        cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion);
        mobileDriftSpinReady = true;
        mobileDriftSeedP = p;
      }
      applyMobileIdleSpin(cubeGroup);
    } else {
      mobileDriftSpinReady = false;
      mobileDriftSeedP = null;
      driftQuaternion(p, time);
      cubeGroup.quaternion.copy(_qDrift);
      cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion);
    }

    var inf = getCubePointerInfluence();
    if (inf.nx || inf.ny) {
      mouse.x += (inf.nx - mouse.x) * 0.06;
      mouse.y += (inf.ny - mouse.y) * 0.06;
      root.rotation.y += inf.nx * 0.06;
      root.rotation.x += inf.ny * 0.04;
    } else {
      mouse.x *= 0.94;
      mouse.y *= 0.94;
    }

    var driftFade = 0.85 - p * 0.25;
    setCubeVisualFade(driftFade * (grafikiMenuActive ? grafikiFade / 0.68 : 1));
  }

  function getBestFaceIndex() {
    cubeGroup.getWorldPosition(_cubePos);
    _toCam.copy(camera.position).sub(_cubePos).normalize();
    var best = 0;
    var bestDot = -Infinity;
    for (var fi = 0; fi < FACE_NORMALS.length; fi++) {
      _worldNormal.copy(FACE_NORMALS[fi]).applyQuaternion(cubeGroup.quaternion).normalize();
      var dot = _worldNormal.dot(_toCam);
      if (dot > bestDot) {
        bestDot = dot;
        best = fi;
      }
    }
    return best;
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

  function applyMenuFaceOrientation(strength, closing, target) {
    if (strength <= 0) return;
    var group = target || cubeGroup;
    if (closing && menuFrom.qStart) {
      group.quaternion.slerp(menuFrom.qStart, strength);
      group.rotation.setFromQuaternion(group.quaternion, "XYZ");
      return;
    }
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

  function getCubePointerInfluence() {
    var ptr = window.cosgralPointer;
    if (!ptr || !portal) return { nx: 0, ny: 0 };
    if (ptr.fromOrientation) {
      return { nx: ptr.nx, ny: ptr.ny };
    }
    var r = portal.getBoundingClientRect();
    if (r.width < 1) return { nx: 0, ny: 0 };
    var cx = r.left + r.width * 0.5;
    var cy = r.top + r.height * 0.5;
    var dx = ptr.x - cx;
    var dy = ptr.y - cy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var refPx = 76;
    var near = Math.min(1, refPx / Math.max(dist, refPx * 0.35));
    return {
      nx: (dx / (window.innerWidth * 0.5)) * near,
      ny: (dy / (window.innerHeight * 0.5)) * near,
    };
  }

  function menuTargets() {
    if (menuFrom.target) return menuFrom.target;
    if (menuFrom.sideEntry) {
      var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
      return {
        x: MOBILE ? 0.3 : 0.4,
        y: MOBILE ? 0.54 : 0.7,
        z: 0.36,
        sc: heroScale * 1.14,
      };
    }
    return {
      x: MOBILE ? 0.3 : 0.4,
      y: MOBILE ? 0.54 : 0.7,
      z: MOBILE ? 0.32 : 0.42,
      sc: menuFrom.sc || CUBE_SCALE,
    };
  }

  function menuZProgress() {
    if (menuBlend <= 0.001 || menuFrom.sideEntry) return menuBlend;
    var target = menuTargets();
    var travel = menuTravel();
    var zRange = target.z - menuFrom.pz;
    if (zRange <= 0.001) return travel;
    return (menuFrom.pz + zRange * travel - menuFrom.pz) / zRange;
  }

  function isSandHeroSubpageCubeVisible() {
    if (!isSandHeroSubpage) return false;
    if (!cubeGroup.visible) return false;
    if (portfolioFlight.phase === "hidden" || portfolioFlight.phase === "hero-pass") return false;
    if (sMat.uniforms.uFade.value <= 0.12) return false;
    return true;
  }

  function isSubpageCubeVisible() {
    if (!cubeGroup.visible) return false;
    if (isSandHeroPage && (portfolioFlight.phase === "hidden" || portfolioFlight.phase === "hero-pass")) {
      return false;
    }
    if (isPortfolioMainPage && grafikiMenuActive && menuBlend <= 0.001) return false;
    if (sMat.uniforms.uFade.value <= 0.12) return false;
    return true;
  }

  function isGallerySubpageCubeVisible() {
    if (!isGallerySubpage) return false;
    if (portfolioFlight.phase === "drift" && cubeGroup.visible) return true;
    return isSandHeroSubpageCubeVisible();
  }

  function captureHomeSideEntryMenuFrom() {
    var heroZ = 0.36;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
    menuFrom.sideEntry = true;
    menuFrom.galleryMenu = false;
    menuFrom.keepDriftVisible = false;
    syncCamera();
    var corner = getMenuCornerWorld(heroZ);
    menuFrom.px = corner.x;
    menuFrom.py = corner.y;
    menuFrom.pz = corner.z;
    if (cubeGroup.visible && sMat.uniforms.uFade.value > 0.12) {
      menuFrom.sc = cubeGroup.scale.x;
      _qMenuStart.copy(cubeGroup.quaternion);
    } else {
      menuFrom.sc = heroScale * 1.02;
      _qMenuStart.setFromEuler(new THREE.Euler(0.16, -Math.PI * 0.52, 0.05, "XYZ"));
    }
    menuFrom.qStart = _qMenuStart.clone();
  }

  function captureGalleryMenuFrom() {
    var heroZ = 0.36;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
    menuFrom.sideEntry = true;
    menuFrom.galleryMenu = true;
    menuFrom.keepDriftVisible = false;
    syncCamera();
    var entry = getMenuEntryStartWorld(heroZ);
    menuFrom.px = entry.x;
    menuFrom.py = entry.y;
    menuFrom.pz = entry.z;
    if (isSubpageCubeVisible() && portfolioFlight.phase === "drift") {
      syncCamera();
      root.updateMatrixWorld(true);
      cubeGroup.updateMatrixWorld(true);
      menuFrom.keepDriftVisible = true;
      menuFrom.driftRoot = root.position.clone();
      menuFrom.driftQ = cubeGroup.quaternion.clone();
      menuFrom.driftFade = sMat.uniforms.uFade.value;
      menuFrom.driftP = portfolioFlight.driftP;
    }
    if (cubeGroup.visible && sMat.uniforms.uFade.value > 0.12 && !menuFrom.keepDriftVisible) {
      menuFrom.sc = cubeGroup.scale.x;
      _qMenuStart.copy(cubeGroup.quaternion);
    } else {
      menuFrom.sc = heroScale * 1.02;
      _qMenuStart.setFromEuler(new THREE.Euler(0.16, -Math.PI * 0.52, 0.05, "XYZ"));
    }
    menuFrom.qStart = _qMenuStart.clone();
  }

  function applyCapturedDriftPose() {
    if (!menuFrom.driftRoot) return;
    syncCamera();
    root.position.copy(menuFrom.driftRoot);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    if (menuFrom.driftQ) cubeGroup.quaternion.copy(menuFrom.driftQ);
    cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    cubeGroup.updateMatrixWorld(true);
  }

  function captureParticlePassMenuFrom() {
    menuFrom.particlePass = true;
    menuFrom.sideEntry = false;
    menuFrom.target = null;
    delete menuFrom.qEnd;
    menuFrom.faceIdx = null;

    paintPortfolioDriftNow({ keepPhase: true });
    syncCamera();
    root.updateMatrixWorld(true);
    cubeGroup.updateMatrixWorld(true);

    menuFrom.driftRoot = root.position.clone();
    menuFrom.driftQ = cubeGroup.quaternion.clone();
    menuFrom.driftFade = sMat.uniforms.uFade.value;
    root.updateMatrixWorld(true);
    cubeGroup.updateMatrixWorld(true);
    menuFrom.driftMatrix = cubeGroup.matrixWorld.clone();

    var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
    menuFrom.target = {
      x: MOBILE ? 0.3 : 0.4,
      y: MOBILE ? 0.54 : 0.7,
      z: MOBILE ? 0.32 : 0.42,
      sc: heroScale * 1.14,
    };
    menuFrom.px = 0;
    menuFrom.py = 0;
    menuFrom.pz = 0;
    menuFrom.sc = CUBE_SCALE;
    menuFrom.qStart = menuFrom.driftQ.clone();
    menuPhase.time = performance.now() * 0.001;
    menuPhase.qHold.copy(menuFrom.driftQ);

    var savedRoot = root.position.clone();
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    captureMenuFaceEnd();
    root.position.copy(savedRoot);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.quaternion.copy(menuFrom.driftQ);
    cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    cubeGroup.updateMatrixWorld(true);
  }

  function bgExitMenuBlend(blend) {
    if (!menuFrom.bgExit) return 1;
    return Math.min(1, Math.max(0, blend / MENU_SIDE_BG_EXIT_END));
  }

  function sideEntryMenuBlend(blend) {
    if (!menuFrom.bgExit) return blend;
    if (blend <= MENU_SIDE_BG_EXIT_END) return 0;
    return (blend - MENU_SIDE_BG_EXIT_END) / (1 - MENU_SIDE_BG_EXIT_END);
  }

  function applyMenuBgExit(exitT, time) {
    var start = menuFrom.driftRoot;
    if (!start) return;
    syncCamera();
    var driftP = menuFrom.driftP != null ? menuFrom.driftP : portfolioFlight.driftP;
    var drift = getDriftPose(driftP, time);
    var planeZ = drift.rootZ;
    var end = worldPosFromScreen(
      -window.innerWidth * (MOBILE ? 0.4 : 0.48),
      window.innerHeight * (MOBILE ? 0.34 : 0.38),
      planeZ
    );
    var ease = easeMenuBgExit(exitT);
    var arcLift = MOBILE ? 0.32 : 0.46;
    var ctrlX = start.x * 0.44 + end.x * 0.56;
    var ctrlY = Math.max(start.y + 0.04, end.y + 0.08) + arcLift * (1 - ease * 0.35);
    var arc = quadArc(ease, start.x, start.y, ctrlX, ctrlY, end.x, end.y);
    root.position.set(arc.x, arc.y, planeZ);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    if (menuFrom.driftQ) {
      cubeGroup.quaternion.copy(menuFrom.driftQ);
      _axisSpin.set(0.12, 1, 0.06).normalize();
      _qFaceSpin.setFromAxisAngle(_axisSpin, ease * 1.05);
      cubeGroup.quaternion.multiply(_qFaceSpin);
      cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    }
    var fade = menuFrom.driftFade || 0.85;
    if (exitT > 0.9) {
      var fadeT = (exitT - 0.9) / 0.1;
      fadeT = fadeT * fadeT * (3 - 2 * fadeT);
      fade *= 1 - fadeT;
    }
    cubeGroup.visible = exitT < 0.985;
    setCubeVisualFade(fade);
  }

  function applyMenuBgReenter(reenterT, time) {
    var end = menuFrom.driftRoot;
    if (!end) return;
    syncCamera();
    var driftP = menuFrom.driftP != null ? menuFrom.driftP : portfolioFlight.driftP;
    var drift = getDriftPose(driftP, time);
    var planeZ = drift.rootZ;
    var start = worldPosFromScreen(
      -window.innerWidth * (MOBILE ? 0.4 : 0.48),
      window.innerHeight * (MOBILE ? 0.34 : 0.38),
      planeZ
    );
    var ease = easeMenuBgExit(reenterT);
    var arcLift = MOBILE ? 0.32 : 0.46;
    var ctrlX = start.x * 0.56 + end.x * 0.44;
    var ctrlY = Math.max(start.y + 0.04, end.y + 0.08) + arcLift * (1 - ease * 0.35);
    var arc = quadArc(ease, start.x, start.y, ctrlX, ctrlY, end.x, end.y);
    root.position.set(arc.x, arc.y, planeZ);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    driftQuaternion(driftP, time);
    cubeGroup.quaternion.copy(_qDrift);
    cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    var fade = (menuFrom.driftFade || 0.85) * Math.min(1, 0.35 + ease * 0.65);
    cubeGroup.visible = true;
    setCubeVisualFade(fade);
  }

  function captureGalleryBgExitMenuFrom() {
    menuFrom.bgExit = true;
    menuFrom.sideEntrySnapped = false;
    menuFrom.sandBoosted = false;
    paintPortfolioDriftNow({ keepPhase: true });
    syncCamera();
    root.updateMatrixWorld(true);
    cubeGroup.updateMatrixWorld(true);
    menuFrom.driftRoot = root.position.clone();
    menuFrom.driftQ = cubeGroup.quaternion.clone();
    menuFrom.driftFade = sMat.uniforms.uFade.value;
    menuFrom.driftP = portfolioFlight.driftP;
    captureSideEntryMenuFrom();
    var entry = getMenuEntryStartWorld(0.36);
    menuFrom.px = entry.x;
    menuFrom.py = entry.y;
    menuFrom.pz = entry.z;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
    menuFrom.sc = heroScale * 1.02;
    _qMenuStart.setFromEuler(new THREE.Euler(0.16, -Math.PI * 0.52, 0.05, "XYZ"));
    menuFrom.qStart = _qMenuStart.clone();
  }

  function captureSideEntryMenuFrom() {
    if (isSubpageCubeVisible()) captureGalleryMenuFrom();
    else captureHomeSideEntryMenuFrom();
  }

  function restoreSandHeroMenuCloseState() {
    if (grafikiMenuActive && portal) portal.style.opacity = "0";
    if (!isSandHeroPage || grafikiMenuActive) return;
    if (isSandHeroSubpage && portfolioFlight.phase === "hidden") {
      cubeGroup.visible = false;
      setCubeVisualFade(0);
      if (portal) portal.style.opacity = "";
      return;
    }
    paintPortfolioDriftNow({ keepPhase: true });
  }

  function captureMenuFrom() {
    menuFrom.sideEntry = false;
    menuFrom.galleryMenu = false;
    menuFrom.particlePass = false;
    menuFrom.bgExit = false;
    menuFrom.sideEntrySnapped = false;
    menuFrom.sandBoosted = false;
    menuFrom.keepDriftVisible = false;
    menuFrom.target = null;
    delete menuFrom.qEnd;
    menuFrom.faceIdx = null;
    delete menuFrom.driftRoot;
    delete menuFrom.driftQ;
    delete menuFrom.driftMatrix;
    menuFrom.driftP = 0;

    if (isSubpageCubeVisible()) {
      captureGalleryMenuFrom();
      return;
    }

    if (isSandHeroPage || isGallerySubpage) {
      captureHomeSideEntryMenuFrom();
      return;
    }

    syncCameraNeutral();

    root.updateMatrixWorld(true);
    cubeGroup.updateMatrixWorld(true);
    cubeGroup.getWorldPosition(_cubePos);
    cubeGroup.getWorldQuaternion(_qMenuStart);

    menuFrom.px = _cubePos.x;
    menuFrom.py = _cubePos.y;
    menuFrom.pz = _cubePos.z;
    menuFrom.sc = cubeGroup.scale.x;
    menuFrom.qStart = _qMenuStart.clone();
    menuPhase.time = performance.now() * 0.001;
    menuPhase.qHold.copy(_qMenuStart);

    menuFrom.target = {
      x: menuFrom.px,
      y: menuFrom.py,
      z: Math.max(menuFrom.pz + (MOBILE ? 0.4 : 0.48), MOBILE ? 0.32 : 0.42),
      sc: menuFrom.sc,
    };

    captureMenuFaceEnd();
  }

  function captureMenuFaceEnd() {
    syncCameraNeutral();

    var t = menuFrom.target;
    var px = cubeGroup.position.x;
    var py = cubeGroup.position.y;
    var pz = cubeGroup.position.z;
    var sc = cubeGroup.scale.x;
    var q = cubeGroup.quaternion.clone();

    cubeGroup.position.set(t.x, t.y, t.z);
    cubeGroup.scale.set(t.sc, t.sc, t.sc);
    cubeGroup.quaternion.copy(menuFrom.qStart);
    cubeGroup.updateMatrixWorld(true);
    menuFrom.qEnd = getFaceCameraQuaternion();
    menuFrom.faceIdx = getBestFaceIndex();

    cubeGroup.position.set(px, py, pz);
    cubeGroup.scale.set(sc, sc, sc);
    cubeGroup.quaternion.copy(q);
  }

  function snapMenuSandTargetPose() {
    menuSandTarget.position.set(menuFrom.px, menuFrom.py, menuFrom.pz);
    menuSandTarget.scale.set(menuFrom.sc, menuFrom.sc, menuFrom.sc);
    if (menuFrom.qStart) {
      menuSandTarget.quaternion.copy(menuFrom.qStart);
      menuSandTarget.rotation.setFromQuaternion(menuSandTarget.quaternion, "XYZ");
    }
    menuSandTarget.updateMatrixWorld(true);
  }

  function applyGalleryDriftFreeze(driftFade) {
    if (!menuFrom.driftRoot || !menuFrom.driftQ) return;
    root.position.copy(menuFrom.driftRoot);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(0, 0, 0);
    cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
    cubeGroup.quaternion.copy(menuFrom.driftQ);
    cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    cubeGroup.visible = true;
    var fade = (menuFrom.driftFade != null ? menuFrom.driftFade : 0.85) * driftFade * getMenuCubeDimMul();
    sMat.uniforms.uFade.value = fade;
    shell.material.opacity = 0.62 * fade;
    setWireOpacity(wire, 0.1 * fade);
    edges.material.opacity = 0.44 * fade;
  }

  function applySideEntryPose(arrive, targetGroup) {
    var heroX = MOBILE ? 0.3 : 0.4;
    var heroY = MOBILE ? 0.54 : 0.7;
    var heroZ = 0.36;
    var heroScale = CUBE_SCALE * (MOBILE ? 0.67 : 0.78);
    var menuScale = heroScale * 1.14;
    var useSoftFly = menuFrom.bgExit || menuFrom.galleryMenu;
    var startX = menuFrom.px;
    var startY = menuFrom.py;
    var startZ = menuFrom.pz;

    if (useSoftFly) {
      var ctrlX = startX * 0.56 + heroX * 0.44;
      var ctrlY = startY * 0.18 + heroY * 0.82;
      var arc = quadArc(arrive, startX, startY, ctrlX, ctrlY, heroX, heroY);
      targetGroup.position.x = arc.x;
      targetGroup.position.y = arc.y;
    } else {
      targetGroup.position.x = startX + (heroX - startX) * arrive;
      targetGroup.position.y = startY + (heroY - startY) * arrive;
    }
    targetGroup.position.z = startZ + (heroZ - startZ) * arrive;
    var sc = menuFrom.sc + (menuScale - menuFrom.sc) * arrive;
    targetGroup.scale.set(sc, sc, sc);
    if (menuFrom.qStart) {
      _axisSpin.set(0.18, 1, 0.12).normalize();
      _qFaceSpin.setFromAxisAngle(_axisSpin, arrive * Math.PI * 1.65);
      targetGroup.quaternion.copy(menuFrom.qStart).multiply(_qFaceSpin);
      targetGroup.rotation.setFromQuaternion(targetGroup.quaternion, "XYZ");
    }
    targetGroup.updateMatrixWorld(true);
    return { arrive: arrive, menuScale: menuScale };
  }

  function snapMenuFromPose() {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(menuFrom.px, menuFrom.py, menuFrom.pz);
    cubeGroup.scale.set(menuFrom.sc, menuFrom.sc, menuFrom.sc);
    if (menuFrom.qStart) {
      cubeGroup.quaternion.copy(menuFrom.qStart);
      cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    }
    cubeGroup.visible = true;
    setCubeVisualFade(1);
  }

  function driftQuaternion(p, time) {
    var drift = getDriftPose(p, time);
    _euler.set(drift.rotX, drift.rotY, drift.rotZ);
    return _qDrift.setFromEuler(_euler);
  }

  function getMenuSpinWeight() {
    if (menuBlend <= 0.001) return 1;
    if (menuFrom.particlePass) {
      var pp = particlePassState(menuBlend);
      if (pp.assemble < 0.12) return 1;
      if (!menuTween.closing) {
        var u = Math.min(1, (pp.assemble - 0.12) / 0.55);
        return 1 - menuEase(u);
      }
      return menuEase(1 - pp.assemble);
    }
    if (menuFrom.sideEntry) {
      var sideBlend = menuFrom.bgExit ? sideEntryMenuBlend(menuBlend) : menuBlend;
      return menuTween.closing ? 1 - menuEase(sideBlend) : Math.max(0, 1 - menuEase(sideBlend));
    }
    if (!menuTween.closing) {
      var linksProgress = (getMenuLinksDelay() - MENU_LINKS_LEAD * 0.35) / MENU_OPEN_DUR;
      var linksBlend = menuBlendAtProgress(Math.max(0, linksProgress), MENU_OPEN_EASE);
      if (menuBlend >= linksBlend) return 0;
      var u = menuBlend / Math.max(linksBlend, 1e-4);
      return 1 - menuEase(Math.min(1, u));
    }
    return menuEase(1 - menuBlend);
  }

  function applyMenuSpinRotation(p, dt, t) {
    var spinW = getMenuSpinWeight();

    if (menuTween.closing) {
      menuPhase.time += dt * spinW;
      if (spinW > 0.2) {
        var catchUp = Math.min(1, ((spinW - 0.2) / 0.8) * dt * 5.5);
        menuPhase.time += (t - menuPhase.time) * catchUp;
      }
    } else {
      menuPhase.time += dt * spinW;
    }

    driftQuaternion(p, menuPhase.time);

    if (!menuTween.closing) {
      if (spinW <= 0.001) {
        cubeGroup.quaternion.copy(menuPhase.qHold);
      } else {
        cubeGroup.quaternion.copy(_qDrift).slerp(menuPhase.qHold, 1 - spinW);
        if (spinW < 0.14) menuPhase.qHold.copy(cubeGroup.quaternion);
      }
    } else if (spinW <= 0.001) {
      cubeGroup.quaternion.copy(menuPhase.qHold);
    } else {
      cubeGroup.quaternion.copy(menuPhase.qHold).slerp(_qDrift, spinW);
    }
    cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion);
  }

  function menuEase(blend) {
    return blend * blend * (3 - 2 * blend);
  }

  function menuTravel() {
    return menuEase(menuBlend);
  }

  function menuBlendAtProgress(progress, easeName) {
    if (window.gsap && gsap.parseEase) {
      return gsap.parseEase(easeName)(progress);
    }
    if (easeName === "power2.in") return progress * progress;
    return 1 - Math.pow(1 - progress, 2);
  }

  function menuLabelsBlendAt(openDur) {
    return Math.max(0, (openDur - MENU_LABELS_BEFORE_CUBE) / openDur);
  }

  function menuLabelRevealAtBlend(blend, labelsAt) {
    if (blend < labelsAt - 0.02) return 0;
    return smooth01(labelsAt - 0.02, labelsAt + 0.06, blend);
  }

  function getMenuLinksDelay() {
    if (menuFrom.sideEntry) {
      var sideDur = menuFrom.bgExit
        ? MENU_OPEN_SIDE_BG_DUR
        : menuFrom.galleryMenu
          ? MENU_OPEN_SIDE_DUR
          : MENU_OPEN_HOME_SIDE_DUR;
      if (menuFrom.galleryMenu && !menuFrom.bgExit) {
        return Math.max(0, sideDur - MENU_LABELS_BEFORE_CUBE) + MENU_LINKS_LEAD;
      }
      var delay = sideDur * 0.128;
      if (menuFrom.bgExit) delay += MENU_OPEN_SIDE_BG_DUR * MENU_SIDE_BG_EXIT_END;
      return delay;
    }
    if (menuFrom.particlePass) {
      return Math.max(0, MENU_OPEN_PASS_DUR - MENU_LABELS_BEFORE_CUBE) + MENU_LINKS_LEAD;
    }
    for (var step = 0; step <= 100; step++) {
      var progress = step / 100;
      var blend = menuBlendAtProgress(progress, MENU_OPEN_EASE);
      if (menuEase(blend) >= MENU_Z_FRONT) {
        return MENU_OPEN_DUR * progress + MENU_LINKS_LEAD;
      }
    }
    return MENU_OPEN_DUR * 0.42 + MENU_LINKS_LEAD;
  }

  function resolveMenuOpenDuration() {
    if (menuFrom.bgExit) return MENU_OPEN_SIDE_BG_DUR;
    if (menuFrom.galleryMenu) return MENU_OPEN_SIDE_DUR;
    if (menuFrom.sideEntry) return MENU_OPEN_HOME_SIDE_DUR;
    if (menuFrom.particlePass) return MENU_OPEN_PASS_DUR;
    return MENU_OPEN_DUR;
  }

  function resolveMenuCloseDuration() {
    if (menuFrom.bgExit) return MENU_CLOSE_SIDE_BG_DUR;
    if (menuFrom.galleryMenu) return MENU_CLOSE_SIDE_DUR;
    if (menuFrom.sideEntry) return MENU_CLOSE_HOME_SIDE_DUR;
    if (menuFrom.particlePass) return MENU_CLOSE_PASS_DUR;
    return MENU_CLOSE_DUR;
  }

  function resolveMenuOpenEase() {
    if (menuFrom.bgExit) return MENU_SIDE_BG_EASE;
    if (menuFrom.galleryMenu) return MENU_SIDE_EASE;
    if (menuFrom.sideEntry) return "power3.out";
    if (menuFrom.particlePass) return MENU_PASS_OPEN_EASE;
    return MENU_OPEN_EASE;
  }

  function resolveMenuCloseEase() {
    if (menuFrom.bgExit) return MENU_SIDE_BG_EASE;
    if (menuFrom.galleryMenu) return MENU_SIDE_EASE;
    if (menuFrom.sideEntry) return "power3.out";
    return MENU_CLOSE_EASE;
  }

  function notifyMenuOpen() {
    window.dispatchEvent(
      new CustomEvent("cosgral:cube-menu", {
        detail: {
          open: true,
          showSand: menuFrom.galleryMenu && isSandHeroPage,
          boostSand: menuFrom.galleryMenu && !menuFrom.bgExit && isSandHeroPage,
          particlePass: menuFrom.particlePass,
        },
      })
    );
  }

  function prepareMenuOpenFromClosed() {
    captureMenuFrom();
    if (menuFrom.particlePass) {
      applyCapturedDriftPose();
      setCubeVisualFade(menuFrom.driftFade || 0.85);
    } else if (menuFrom.bgExit) {
      applyCapturedDriftPose();
      cubeGroup.visible = true;
      setCubeVisualFade(menuFrom.driftFade || 0.85);
      syncSideEntryPortalLayer();
    } else {
      if (menuFrom.keepDriftVisible) snapMenuSandTargetPose();
      else snapMenuFromPose();
    }
    if (portal && window.gsap) {
      gsap.killTweensOf(portal);
    }
    if (portal) portal.style.opacity = "";
    if (menuFrom.sideEntry) {
      syncSideEntryPortalLayer();
    } else if (menuFrom.particlePass) {
      document.body.classList.remove(
        "is-cube-menu-front",
        "is-cube-menu-passing",
        "is-cube-menu-bg-exit",
        "is-cube-menu-drift-bg"
      );
    }
    notifyMenuOpen();
  }

  function resetMenuCloseState() {
    menuTween.blend = 0;
    menuTween.closing = false;
    menuFrom.target = null;
    delete menuFrom.qEnd;
    menuFrom.faceIdx = null;
    menuFrom.sideEntry = false;
    menuFrom.galleryMenu = false;
    menuFrom.particlePass = false;
    menuFrom.bgExit = false;
    menuFrom.sideEntrySnapped = false;
    menuFrom.sandBoosted = false;
    menuFrom.keepDriftVisible = false;
    delete menuFrom.driftRoot;
    delete menuFrom.driftQ;
    delete menuFrom.driftMatrix;
    document.body.classList.remove(
      "is-cube-menu-front",
      "is-cube-menu-passing",
      "is-cube-menu-bg-exit",
      "is-cube-menu-drift-bg"
    );
    if (isSandHeroPage && !grafikiMenuActive) restoreSandHeroMenuCloseState();
    else if (grafikiMenuActive && portal) portal.style.opacity = "0";
  }

  function syncMenuPortalLayer() {
    if (menuBlend <= 0.001) {
      document.body.classList.remove("is-cube-menu-front", "is-cube-menu-passing", "is-cube-menu-bg-exit", "is-cube-menu-drift-bg");
      if (portal) {
        if (grafikiMenuActive) portal.style.opacity = String(grafikiFade);
        else if (isSandHeroPage && portfolioFlight.phase === "hidden") {
          portal.style.opacity = "0";
        } else portal.style.opacity = "";
      }
      return;
    }

    if (menuFrom.sideEntry) {
      syncSideEntryPortalLayer();
      return;
    }

    if (menuFrom.particlePass) {
      var ppLayer = particlePassState(menuBlend);
      var passing = ppLayer.pass > 0.28 && ppLayer.assemble < 0.22;
      var front = ppLayer.assemble > 0.58;
      document.body.classList.toggle("is-cube-menu-passing", passing);
      document.body.classList.toggle("is-cube-menu-front", front);
      if (portal) {
        portal.style.opacity =
          ppLayer.particleBurst > 0.08 || ppLayer.cubeMeshOpacity > 0.03 ? "1" : "0";
      }
      return;
    }

    var front = menuZProgress() > MENU_Z_FRONT;
    document.body.classList.remove("is-cube-menu-passing");
    document.body.classList.toggle("is-cube-menu-front", front);
    if (portal) portal.style.opacity = "1";
  }

  function getMenuFaceAlignStrength() {
    if (menuBlend <= 0.001) return 0;
    if (menuFrom.particlePass) {
      var ppAlign = particlePassState(menuBlend);
      if (ppAlign.assemble < 0.5) return 0;
      return smooth01(0.5, 0.94, ppAlign.assemble) * 0.92;
    }
    if (menuFrom.sideEntry) {
      var sideAlign = menuFrom.bgExit ? sideEntryMenuBlend(menuBlend) : menuBlend;
      if (menuTween.closing) return Math.max(0, 1 - menuEase(sideAlign)) * 0.2;
      return sideAlign > 0.68 ? Math.min(1, ((sideAlign - 0.68) / 0.32) * 0.92) : 0;
    }
    var spinW = getMenuSpinWeight();
    var raw = 1 - spinW;
    return raw * raw * (3 - 2 * raw);
  }

  function getMenuLabelReveal() {
    if (menuBlend <= 0.001) return 0;
    if (menuFrom.particlePass) {
      return menuLabelRevealAtBlend(menuBlend, menuLabelsBlendAt(MENU_OPEN_PASS_DUR));
    }
    if (menuFrom.galleryMenu && !menuFrom.bgExit) {
      return menuLabelRevealAtBlend(menuBlend, menuLabelsBlendAt(resolveMenuOpenDuration()));
    }
    if (menuFrom.sideEntry) {
      var sideAlign = menuFrom.bgExit ? sideEntryMenuBlend(menuBlend) : menuBlend;
      if (menuTween.closing) return 0;
      if (sideAlign < 0.72) return 0;
      return smooth01(0.72, 0.92, sideAlign);
    }
    var spinW = getMenuSpinWeight();
    var raw = 1 - spinW;
    return raw * raw * (3 - 2 * raw);
  }

  function getMenuCubeDimMul() {
    return 1 - getMenuLabelReveal() * MENU_CUBE_LABEL_DIM;
  }

  function getMenuLabelReadability() {
    return getMenuLabelReveal();
  }

  function getMenuPoseGroup() {
    if (menuFrom.galleryMenu && menuBlend > 0.001 && menuFrom.sideEntry && menuFrom.keepDriftVisible) {
      return menuSandTarget;
    }
    return cubeGroup;
  }

  function shouldUseMenuAnchorRect() {
    if (menuBlend < 0.04) return false;
    if (menuFrom.galleryMenu) return true;
    if (menuFrom.particlePass) return true;
    return false;
  }

  function syncMenuAnchorPose() {
    syncCameraNeutral();
    if (menuFrom.sideEntry) {
      applySideEntryPose(1, menuAnchorGroup);
      applyMenuFaceOrientation(1, false, menuAnchorGroup);
      return;
    }
    if (menuFrom.particlePass) {
      var passTarget = menuTargets();
      menuAnchorGroup.position.set(passTarget.x, passTarget.y, passTarget.z);
      menuAnchorGroup.scale.set(passTarget.sc, passTarget.sc, passTarget.sc);
      if (menuFrom.qEnd) {
        menuAnchorGroup.quaternion.copy(menuFrom.qEnd);
      } else if (menuFrom.qStart) {
        menuAnchorGroup.quaternion.copy(menuFrom.qStart);
        applyMenuFaceOrientation(1, false, menuAnchorGroup);
      }
      menuAnchorGroup.rotation.setFromQuaternion(menuAnchorGroup.quaternion, "XYZ");
      menuAnchorGroup.updateMatrixWorld(true);
      return;
    }
    var target = menuTargets();
    menuAnchorGroup.position.set(target.x, target.y, target.z);
    menuAnchorGroup.scale.set(target.sc, target.sc, target.sc);
    if (menuFrom.qEnd) {
      menuAnchorGroup.quaternion.copy(menuFrom.qEnd);
    }
    menuAnchorGroup.updateMatrixWorld(true);
  }

  function computeFaceRectForGroup(poseGroup) {
    poseGroup.updateMatrixWorld(true);
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
    if (!shouldUseMenuAnchorRect()) return null;
    syncMenuAnchorPose();
    return computeFaceRectForGroup(menuAnchorGroup);
  }

  function getMenuFaceRect() {
    if (menuBlend < 0.04) return null;

    syncCameraNeutral();
    return computeFaceRectForGroup(getMenuPoseGroup());
  }

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var root = new THREE.Group();
  scene.add(root);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.z = 5.4;

  var cubeGroup = new THREE.Group();
  cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
  cubeGroup.rotation.set(0.22, -0.35, 0);
  root.add(cubeGroup);

  var menuSandTarget = new THREE.Group();
  root.add(menuSandTarget);

  var menuAnchorGroup = new THREE.Group();
  root.add(menuAnchorGroup);

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

  function resize() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (w < 1 || h < 1) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function onScroll() {
    scrollProgress = getScrollProgress();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", resize);
  onScroll();
  resize();

  function animate() {
    try {
      var nowMs = performance.now();
      var t = nowMs * 0.001;
      var dt = Math.min(0.05, Math.max(0, t - lastAnimT));
      if (!lastAnimT) dt = 0.016;
      lastAnimT = t;
      var p = scrollProgress;
      menuBlend = menuTween.blend;

      if (menuBlend > 0.001) {
        mobileDriftSpinReady = false;
        mobileDriftSeedP = null;
        var target = menuTargets();
        var travel = menuTravel();
        var driftFade = (0.85 - p * 0.25) * (grafikiMenuActive ? grafikiFade / 0.68 : 1);

        var inBgExit = menuFrom.sideEntry && menuFrom.bgExit && isMenuBgExitPhase();
        if (!inBgExit && !menuFrom.keepDriftVisible) {
          root.position.set(0, 0, 0);
          root.rotation.set(0, 0, 0);
        }

        if (menuFrom.sideEntry) {
          syncCamera();

          if (menuFrom.bgExit && !menuTween.closing && menuBlend < MENU_SIDE_BG_EXIT_END) {
            applyMenuBgExit(bgExitMenuBlend(menuBlend), t);
            cubeGroup.updateMatrixWorld(true);
          } else if (menuFrom.bgExit && menuTween.closing && menuBlend <= MENU_SIDE_BG_EXIT_END) {
            releaseMenuSandBoost();
            applyMenuBgReenter(1 - menuBlend / MENU_SIDE_BG_EXIT_END, t);
            cubeGroup.updateMatrixWorld(true);
          } else {
            if (menuFrom.bgExit && !menuFrom.sideEntrySnapped && !menuTween.closing) {
              snapMenuFromPose();
              menuFrom.sideEntrySnapped = true;
              triggerMenuSandBoost();
            }

            var activeBlend = menuFrom.bgExit ? sideEntryMenuBlend(menuBlend) : menuBlend;
            var flyT = menuTween.closing ? 1 - activeBlend : activeBlend;
            var useSoftFly = menuFrom.bgExit || menuFrom.galleryMenu;
            var flyEase = sideEntryFlyEase(flyT, useSoftFly);
            var arrive = menuTween.closing ? 1 - flyEase : flyEase;

            if (menuFrom.keepDriftVisible) {
              applyGalleryDriftFreeze(driftFade);
              applySideEntryPose(arrive, menuSandTarget);
              if (!menuTween.closing && activeBlend > 0.72) {
                applyMenuFaceOrientation(((activeBlend - 0.72) / 0.28) * 0.14, false, menuSandTarget);
              }
            } else {
              root.position.set(0, 0, 0);
              root.rotation.set(0, 0, 0);
              applySideEntryPose(arrive, cubeGroup);
              if (!menuTween.closing && activeBlend > 0.72) {
                applyMenuFaceOrientation(((activeBlend - 0.72) / 0.28) * 0.14);
              }
              var cubeDim = 1 - activeBlend * 0.4;
              if (!menuTween.closing && arrive < 0.12) {
                cubeDim *= Math.max(0.12, arrive / 0.12);
              }
              if (menuTween.closing && flyT > 0.86) {
                cubeDim *= Math.max(0, 1 - (flyT - 0.86) / 0.14);
              }
              cubeGroup.visible = true;
              setCubeVisualFade(cubeDim);
            }
          }
        } else if (menuFrom.particlePass) {
          var pp = particlePassState(menuBlend);
          var passTarget = menuTargets();
          var passFade = (0.85 - p * 0.25) * (grafikiMenuActive ? grafikiFade / 0.68 : 1);

          root.position.set(0, 0, 0);
          root.rotation.set(0, 0, 0);

          if (pp.cubeMeshOpacity > 0.001) {
            if (pp.assemble > 0.001) {
              cubeGroup.position.set(passTarget.x, passTarget.y, passTarget.z);
              cubeGroup.scale.set(passTarget.sc, passTarget.sc, passTarget.sc);
              applyMenuSpinRotation(p, dt, t);
              cubeGroup.updateMatrixWorld(true);
              var passAlign = getMenuFaceAlignStrength();
              if (passAlign > 0.002) applyMenuFaceOrientation(passAlign);
              cubeGroup.visible = true;
              var meshReveal = pp.cubeMeshOpacity;
              setCubeVisualFade(meshReveal * passFade);
            } else {
              applyCapturedDriftPose();
              cubeGroup.visible = true;
              setCubeVisualFade(pp.cubeMeshOpacity * (menuFrom.driftFade || passFade));
            }
          } else {
            cubeGroup.visible = false;
            setCubeVisualFade(0);
          }
        } else {
          cubeGroup.position.x = menuFrom.px + (target.x - menuFrom.px) * travel;
          cubeGroup.position.y = menuFrom.py + (target.y - menuFrom.py) * travel;
          cubeGroup.position.z = menuFrom.pz + (target.z - menuFrom.pz) * travel;
          cubeGroup.scale.set(menuFrom.sc, menuFrom.sc, menuFrom.sc);
          applyMenuSpinRotation(p, dt, t);
          cubeGroup.updateMatrixWorld(true);
          var faceAlign = getMenuFaceAlignStrength();
          if (faceAlign > 0.002) applyMenuFaceOrientation(faceAlign);
          setCubeVisualFade(driftFade);
        }
      } else if (isSandHeroPage && portfolioFlight.phase === "hero-pass") {
        applyPortfolioHeroPass(portfolioFlight.t, t);
      } else if (isSandHeroPage && portfolioFlight.phase === "hidden") {
        syncCamera();
        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);
        cubeGroup.visible = false;
        setCubeVisualFade(0);
      } else if (isSandHeroPage && portfolioFlight.phase === "stronies-enter") {
        applyPortfolioStroniesEnter(portfolioFlight.t, t);
      } else if (isSandHeroPage && portfolioFlight.phase === "stronies-exit") {
        applyPortfolioStroniesExit(portfolioFlight.t, t);
      } else if (isSandHeroPage) {
        if (isPortfolioMainPage && grafikiMenuActive && menuBlend <= 0.001) {
          syncCamera();
          root.position.set(0, 0, 0);
          root.rotation.set(0, 0, 0);
          cubeGroup.visible = false;
          setCubeVisualFade(0);
          if (portal) portal.style.opacity = "0";
        } else {
          cubeGroup.visible = true;
          applyPortfolioDrift(p, t);
        }
      } else {
        var driftFade = 0.85 - p * 0.25;
        var drift = getDriftPose(p, t);
        cubeGroup.position.set(0, 0, 0);
        cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);
        root.position.x = drift.rootX;
        root.position.y = drift.rootY;
        root.position.z = drift.rootZ;

        if (MOBILE) {
          if (
            !mobileDriftSpinReady ||
            mobileDriftSeedP == null ||
            Math.abs(p - mobileDriftSeedP) > 0.18
          ) {
            cubeGroup.rotation.x = drift.rotX;
            cubeGroup.rotation.y = drift.rotY;
            cubeGroup.rotation.z = drift.rotZ;
            cubeGroup.quaternion.setFromEuler(cubeGroup.rotation);
            mobileDriftSpinReady = true;
            mobileDriftSeedP = p;
          }
          applyMobileIdleSpin(cubeGroup);
        } else {
          mobileDriftSpinReady = false;
          mobileDriftSeedP = null;
          cubeGroup.rotation.x = drift.rotX;
          cubeGroup.rotation.y = drift.rotY;
          cubeGroup.rotation.z = drift.rotZ;
        }

        var inf = getCubePointerInfluence();
        if (inf.nx || inf.ny) {
          mouse.x += (inf.nx - mouse.x) * 0.06;
          mouse.y += (inf.ny - mouse.y) * 0.06;
          root.rotation.y += inf.nx * 0.06;
          root.rotation.x += inf.ny * 0.04;
        } else {
          mouse.x *= 0.94;
          mouse.y *= 0.94;
        }

        setCubeVisualFade(driftFade * (grafikiMenuActive ? grafikiFade / 0.68 : 1));
      }

      if (menuBlend > 0.001) {
        if (menuFrom.sideEntry) syncCamera();
        else syncCameraNeutral();
      } else {
        syncCamera();
      }

      syncMenuPortalLayer();

      sMat.uniforms.uTime.value = t;
      if (menuBlend > 0.001) {
        sMat.uniforms.uMouse.value.set(0, 0);
      } else {
        sMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
      }
      cubeGroup.updateMatrixWorld(true);
      renderer.render(scene, camera);
    } catch (err) {
      console.error("[subpage-cube]", err);
    }
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  if (isSandHeroPage) {
    window.addEventListener("cosgral:section-step", function (e) {
      var next = e.detail && typeof e.detail.index === "number" ? e.detail.index : 0;
      if (e.detail && e.detail.initial) {
        applyPortfolioBootSection(next);
        return;
      }

      var prev = portfolioSectionIndex;
      portfolioSectionIndex = next;

      if (next === 0) {
        if (prev > 0) {
          startPortfolioStroniesExit({ hideAfter: true });
        } else {
          killPortfolioFlightTweens();
          portfolioFlight.phase = "hidden";
          portfolioFlight.t = 1;
          portfolioFlight.hideAfter = false;
          cubeGroup.visible = false;
          setCubeVisualFade(0);
        }
        return;
      }

      if (next === 1 && prev !== 1) {
        if (prev < next) {
          startPortfolioStroniesEnter();
        } else {
          setPortfolioDriftIdle();
        }
        return;
      }

      if (isPortfolioMainPage && prev === 1 && next > 1) {
        setPortfolioDriftIdle();
      }
    });
  }

  window.cosgralCube = {
    getMenuFaceRect: getMenuFaceRect,
    getMenuFaceAnchorRect: getMenuFaceAnchorRect,
    getMenuBlend: function () {
      return menuTween.blend;
    },
    getMenuZProgress: menuZProgress,
    isSideEntry: function () {
      return menuFrom.sideEntry;
    },
    isMenuBgExit: function () {
      return !!menuFrom.bgExit;
    },
    getMenuSideEntryBlend: function () {
      if (!menuFrom.sideEntry) return menuTween.blend;
      return sideEntryMenuBlend(menuTween.blend);
    },
    getMenuBgExitProgress: function () {
      if (!menuFrom.bgExit) return 1;
      return bgExitMenuBlend(menuTween.blend);
    },
    isParticlePass: function () {
      return menuFrom.particlePass;
    },
    getParticlePassDissolve: function () {
      return particlePassState(menuBlend).dissolve;
    },
    getParticlePassAssemble: function () {
      return particlePassState(menuBlend).assemble;
    },
    getParticlePassPass: function () {
      return particlePassState(menuBlend).pass;
    },
    getParticlePassBurst: function () {
      return particlePassState(menuBlend).particleBurst;
    },
    getDriftMatrixWorld: function () {
      return menuFrom.driftMatrix || cubeGroup.matrixWorld;
    },
    getMenuOpenDuration: function () {
      if (menuFrom.bgExit) return MENU_OPEN_SIDE_BG_DUR;
      if (menuFrom.galleryMenu) return MENU_OPEN_SIDE_DUR;
      if (menuFrom.sideEntry) return MENU_OPEN_HOME_SIDE_DUR;
      if (menuFrom.particlePass) return MENU_OPEN_PASS_DUR;
      return MENU_OPEN_DUR;
    },
    getMenuCloseDuration: function () {
      if (menuFrom.bgExit) return MENU_CLOSE_SIDE_BG_DUR;
      if (menuFrom.galleryMenu) return MENU_CLOSE_SIDE_DUR;
      if (menuFrom.sideEntry) return MENU_CLOSE_HOME_SIDE_DUR;
      if (menuFrom.particlePass) return MENU_CLOSE_PASS_DUR;
      return MENU_CLOSE_DUR;
    },
    getMenuLinksDelay: getMenuLinksDelay,
    getMenuLabelReadability: getMenuLabelReadability,
    getMenuLabelReveal: getMenuLabelReveal,
    getMenuCubeDimMul: getMenuCubeDimMul,
    setGrafikiMenuActive: function (active) {
      grafikiMenuActive = !!active;
      grafikiFade = active ? 0 : 0.68;
      if (!portal) return;
      if (grafikiMenuActive && menuBlend <= 0.001) {
        portal.style.opacity = "0";
        return;
      }
      if (window.gsap) {
        gsap.set(portal, { clearProps: "opacity,visibility" });
      } else {
        portal.style.removeProperty("opacity");
        portal.style.removeProperty("visibility");
      }
      if (menuBlend <= 0.001) {
        if (isSandHeroPage && portfolioFlight.phase === "hidden") {
          portal.style.opacity = "0";
        } else {
          portal.style.opacity = "";
        }
      }
    },
    isGrafikiMenuActive: function () {
      return grafikiMenuActive;
    },
    isSandHeroSubpage: function () {
      return isSandHeroSubpage;
    },
    isAboutPage: function () {
      return isAboutPage;
    },
    setGrafikiFade: function (opacity) {
      var next = parseFloat(opacity);
      grafikiFade = Number.isFinite(next) ? Math.max(0, Math.min(1, next)) : 0.68;
      if (grafikiMenuActive && menuBlend <= 0.001 && portal) {
        portal.style.opacity = String(grafikiFade);
      }
    },
    getGrafikiFade: function () {
      return grafikiFade;
    },
    getCubeMatrixWorld: function () {
      cubeGroup.updateMatrixWorld(true);
      return cubeGroup.matrixWorld;
    },
    getMenuAbsorbMatrixWorld: function () {
      if (menuFrom.galleryMenu && menuBlend > 0.001 && menuFrom.sideEntry && menuFrom.keepDriftVisible) {
        menuSandTarget.updateMatrixWorld(true);
        return menuSandTarget.matrixWorld;
      }
      cubeGroup.updateMatrixWorld(true);
      return cubeGroup.matrixWorld;
    },
    setPortfolioIntroBlend: function () {
      /* legacy no-op — lot sześcianu sterowany przez portfolioFlight */
    },
    startPortfolioHeroPass: startPortfolioHeroPass,
    cancelPortfolioHeroPass: cancelPortfolioHeroPass,
    applyPortfolioBootSection: applyPortfolioBootSection,
    openMenu: function () {
      var freshOpen = menuTween.blend < 0.02;
      var wasClosing = menuTween.closing;
      if (freshOpen) prepareMenuOpenFromClosed();
      else if (wasClosing) notifyMenuOpen();
      menuTween.closing = false;
      var openDur = resolveMenuOpenDuration();
      var remaining = Math.max(MENU_SEG_MIN_DUR, openDur * (1 - menuTween.blend));
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, {
          blend: 1,
          duration: remaining,
          ease: resolveMenuOpenEase(),
        });
      }
      menuTween.blend = 1;
      return null;
    },
    closeMenu: function () {
      menuTween.closing = true;
      var closeDur = resolveMenuCloseDuration();
      var remaining = Math.max(MENU_SEG_MIN_DUR, closeDur * menuTween.blend);
      window.dispatchEvent(
        new CustomEvent("cosgral:cube-menu", {
          detail: {
            open: false,
            boostSand:
              menuFrom.galleryMenu &&
              menuFrom.sandBoosted &&
              isSandHeroPage,
            particlePass: menuFrom.particlePass,
          },
        })
      );
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, {
          blend: 0,
          duration: remaining,
          ease: resolveMenuCloseEase(),
          onComplete: function () {
            if (menuTween.blend > 0.02) return;
            resetMenuCloseState();
          },
        });
      }
      resetMenuCloseState();
      return null;
    },
  };

  window.dispatchEvent(new CustomEvent("cosgral:cube-ready"));
})();
