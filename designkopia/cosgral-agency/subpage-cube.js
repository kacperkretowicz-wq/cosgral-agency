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
  var MENU_OPEN_DUR = 2.85;
  var MENU_CLOSE_DUR = 1.15;
  var WAVE_SPEED = 0.5;
  /* Stały krok obrotu — odpowiada ~2 cm od środka kostki na ekranie */
  var MENU_FACE_SLERP = 0.046;
  var MENU_CAM = { x: 0, y: 0, z: 5.4 };
  var scrollProgress = 0;
  var mouse = { x: 0, y: 0 };
  var menuBlend = 0;
  var menuTween = { blend: 0, closing: false };
  var menuFrom = {
    px: 0,
    py: 0,
    pz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    sc: CUBE_SCALE,
    sideEntry: false,
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

  function applyMenuFaceOrientation(strength, closing) {
    if (strength <= 0) return;
    if (closing && menuFrom.qStart) {
      cubeGroup.quaternion.slerp(menuFrom.qStart, strength);
      cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
      return;
    }
    var idx = menuFrom.faceIdx != null ? menuFrom.faceIdx : getBestFaceIndex();
    _worldNormal.copy(FACE_NORMALS[idx]).applyQuaternion(cubeGroup.quaternion).normalize();
    cubeGroup.getWorldPosition(_cubePos);
    _toCam.copy(camera.position).sub(_cubePos).normalize();
    if (_worldNormal.dot(_toCam) > 0.9995) return;
    _qAlign.setFromUnitVectors(_worldNormal, _toCam);
    _qTarget.copy(cubeGroup.quaternion).premultiply(_qAlign);
    cubeGroup.quaternion.slerp(_qTarget, strength);
    cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
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
    return {
      x: MOBILE ? 0.3 : 0.4,
      y: MOBILE ? 0.54 : 0.7,
      z: MOBILE ? 0.32 : 0.42,
      sc: CUBE_SCALE * (MOBILE ? 0.84 : 0.89) * 1.14,
    };
  }

  function captureMenuFrom() {
    menuFrom.sideEntry = false;
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

    menuFrom.target = {
      x: menuFrom.px,
      y: menuFrom.py,
      z: Math.max(menuFrom.pz + (MOBILE ? 0.4 : 0.48), MOBILE ? 0.32 : 0.42),
      sc: CUBE_SCALE * (MOBILE ? 0.84 : 0.89) * 1.14,
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

  function snapMenuFromPose() {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(menuFrom.px, menuFrom.py, menuFrom.pz);
    cubeGroup.scale.set(menuFrom.sc, menuFrom.sc, menuFrom.sc);
    if (menuFrom.qStart) {
      cubeGroup.quaternion.copy(menuFrom.qStart);
      cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
    }
    sMat.uniforms.uFade.value = 1;
    shell.material.opacity = 0.62;
    setWireOpacity(wire, 0.1);
    edges.material.opacity = 0.44;
  }

  function syncMenuPortalLayer() {
    var html = document.documentElement;
    if (menuBlend <= 0.001) {
      document.body.classList.remove("is-cube-menu-front", "is-cube-menu-passing");
      html.style.removeProperty("--menu-water-bend");
      html.style.removeProperty("--menu-wave-x");
      html.style.removeProperty("--menu-wave-y");
      html.style.removeProperty("--menu-wave-progress");
      html.style.removeProperty("--menu-wave-punch");
      if (portal) portal.style.opacity = "";
      return;
    }

    var target = menuTargets();
    var mb = menuBlend * menuBlend * (3 - 2 * menuBlend);
    var arrive = menuTween.closing ? 1 - mb : mb;
    var zRange = target.z - menuFrom.pz;
    var currentZ = menuFrom.pz + zRange * arrive;
    var zProgress = zRange > 0.001 ? (currentZ - menuFrom.pz) / zRange : mb;
    var front =
      zProgress > 0.42 && !(menuTween.closing && zProgress < 0.5);

    var cross = Math.sin(Math.min(1, Math.max(0, zProgress)) * Math.PI);
    var warp = cross;
    if (menuTween.closing) {
      warp *= Math.min(1, menuBlend * 1.5);
    } else {
      warp *= Math.min(1, menuBlend * 1.25);
      if (front) warp *= Math.max(0, 1 - (zProgress - 0.42) / 0.22);
    }

    cubeGroup.getWorldPosition(_cubePos);
    _faceScreen.copy(_cubePos).project(camera);
    var sx = (_faceScreen.x * 0.5 + 0.5) * window.innerWidth;
    var sy = (-_faceScreen.y * 0.5 + 0.5) * window.innerHeight;

    var waveProgress = Math.min(1, zProgress * WAVE_SPEED);
    var wavePunch = Math.sin(Math.min(1, Math.max(0, waveProgress)) * Math.PI);

    html.style.setProperty("--menu-water-bend", warp.toFixed(4));
    html.style.setProperty("--menu-wave-x", sx.toFixed(1) + "px");
    html.style.setProperty("--menu-wave-y", sy.toFixed(1) + "px");
    html.style.setProperty("--menu-wave-progress", waveProgress.toFixed(4));
    html.style.setProperty("--menu-wave-punch", wavePunch.toFixed(4));
    document.body.classList.toggle("is-cube-menu-passing", warp > 0.035);
    document.body.classList.toggle("is-cube-menu-front", front);
    if (portal) portal.style.opacity = "1";
  }

  function getMenuFaceRect() {
    if (menuBlend < 0.04) return null;

    var faceIdx =
      menuFrom.faceIdx != null ? menuFrom.faceIdx : getBestFaceIndex();
    var corners = FACE_CORNERS[faceIdx];
    var minX = Infinity;
    var maxX = -Infinity;
    var minY = Infinity;
    var maxY = -Infinity;

    for (var i = 0; i < corners.length; i++) {
      _faceVec.set(corners[i][0] * HALF, corners[i][1] * HALF, corners[i][2] * HALF);
      cubeGroup.localToWorld(_faceVec);
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
      var p = scrollProgress;
      menuBlend = menuTween.blend;

      if (menuBlend > 0.001) {
        var target = menuTargets();
        var mb = menuBlend * menuBlend * (3 - 2 * menuBlend);
        var arrive = menuTween.closing ? 1 - mb : mb;
        var cubeDim = 1 - menuBlend * 0.4;

        root.position.set(0, 0, 0);
        root.rotation.set(0, 0, 0);

        cubeGroup.position.x = menuFrom.px + (target.x - menuFrom.px) * arrive;
        cubeGroup.position.y = menuFrom.py + (target.y - menuFrom.py) * arrive;
        cubeGroup.position.z = menuFrom.pz + (target.z - menuFrom.pz) * arrive;
        var sc = menuFrom.sc + (target.sc - menuFrom.sc) * arrive;
        cubeGroup.scale.set(sc, sc, sc);
        applyMenuFaceOrientation(
          menuTween.closing ? MENU_FACE_SLERP * 0.88 : MENU_FACE_SLERP,
          menuTween.closing
        );
        if (!menuTween.closing) {
          _axisSpin.set(0.12, 1, 0.08).normalize();
          _qFaceSpin.setFromAxisAngle(_axisSpin, 0.0019);
          cubeGroup.quaternion.multiply(_qFaceSpin);
          cubeGroup.rotation.setFromQuaternion(cubeGroup.quaternion, "XYZ");
        }

        if (menuTween.closing && menuBlend < 0.12) {
          cubeDim *= menuBlend / 0.12;
        }

        sMat.uniforms.uFade.value = cubeDim;
        setWireOpacity(wire, 0.1 * cubeDim);
        shell.material.opacity = 0.62 * cubeDim;
        edges.material.opacity = 0.44 * cubeDim;
      } else {
        cubeGroup.rotation.x = 0.22 + p * 0.9 + Math.sin(t * 0.35) * 0.04;
        cubeGroup.rotation.y = -0.35 + p * Math.PI * 1.5 + Math.cos(t * 0.28) * 0.05;
        cubeGroup.rotation.z = p * 0.28 + Math.sin(t * 0.22) * 0.02;
        cubeGroup.position.set(0, 0, 0);
        cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);

        root.position.x = -0.55 + p * 1.2 + Math.sin(t * 0.18) * 0.07;
        root.position.y = 0.3 - p * 0.85 + Math.cos(t * 0.15) * 0.05;
        root.position.z = -p * 0.35;

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

        sMat.uniforms.uFade.value = 0.85 - p * 0.25;
        shell.material.opacity = 0.62;
        setWireOpacity(wire, 0.1);
        edges.material.opacity = 0.44;
      }

      if (menuBlend > 0.001) {
        syncCameraNeutral();
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

  window.cosgralCube = {
    getMenuFaceRect: getMenuFaceRect,
    getMenuBlend: function () {
      return menuTween.blend;
    },
    isSideEntry: function () {
      return menuFrom.sideEntry;
    },
    getMenuOpenDuration: function () {
      return MENU_OPEN_DUR;
    },
    getMenuCloseDuration: function () {
      return MENU_CLOSE_DUR;
    },
    openMenu: function () {
      captureMenuFrom();
      snapMenuFromPose();
      menuTween.closing = false;
      menuTween.blend = 0;
      if (portal && window.gsap) {
        gsap.killTweensOf(portal);
      }
      if (portal) portal.style.opacity = "";
      window.dispatchEvent(new CustomEvent("cosgral:cube-menu", { detail: { open: true } }));
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, { blend: 1, duration: MENU_OPEN_DUR, ease: "power3.out" });
      }
      menuTween.blend = 1;
      return null;
    },
    closeMenu: function () {
      menuTween.closing = true;
      window.dispatchEvent(new CustomEvent("cosgral:cube-menu", { detail: { open: false } }));
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, {
          blend: 0,
          duration: MENU_CLOSE_DUR,
          ease: "power3.out",
          onComplete: function () {
            menuTween.blend = 0;
            menuTween.closing = false;
            menuFrom.target = null;
            menuFrom.qEnd = null;
            menuFrom.faceIdx = null;
            document.body.classList.remove("is-cube-menu-front", "is-cube-menu-passing");
            document.documentElement.style.removeProperty("--menu-water-bend");
            document.documentElement.style.removeProperty("--menu-wave-x");
            document.documentElement.style.removeProperty("--menu-wave-y");
            document.documentElement.style.removeProperty("--menu-wave-progress");
            document.documentElement.style.removeProperty("--menu-wave-punch");
          },
        });
      }
      menuTween.blend = 0;
      menuTween.closing = false;
      menuFrom.target = null;
      menuFrom.qEnd = null;
      menuFrom.faceIdx = null;
      document.body.classList.remove("is-cube-menu-front", "is-cube-menu-passing");
      document.documentElement.style.removeProperty("--menu-water-bend");
      document.documentElement.style.removeProperty("--menu-wave-x");
      document.documentElement.style.removeProperty("--menu-wave-y");
      document.documentElement.style.removeProperty("--menu-wave-progress");
      document.documentElement.style.removeProperty("--menu-wave-punch");
      return null;
    },
  };

  window.dispatchEvent(new CustomEvent("cosgral:cube-ready"));
})();
