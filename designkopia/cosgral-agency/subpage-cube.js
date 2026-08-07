/**
 * Subpage cube — scroll drift + menu fly-in (jak homepage).
 */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

(function () {
  "use strict";

  var canvas = document.getElementById("subpage-cube");
  if (!canvas) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  var HALF = 1.35;
  var CUBE_SCALE = MOBILE ? 0.36 : 0.46;
  var MENU_SIZE_MULT = 1.5;
  var MENU_OPEN_DUR = 2.16;
  var MENU_CLOSE_DUR = 1.44;
  var scrollProgress = 0;
  var mouse = { x: 0, y: 0 };
  var menuBlend = 0;
  var menuTween = { blend: 0 };
  var menuFrom = {
    px: 0,
    py: 0,
    pz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    sc: CUBE_SCALE,
    sideEntry: true,
  };

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

  var _faceVec = new THREE.Vector3();
  var _faceScreen = new THREE.Vector3();

  function menuTargets() {
    return {
      x: mouse.x * 0.02,
      y: mouse.y * 0.015,
      z: 0.18,
      sc: CUBE_SCALE * 1.14 * MENU_SIZE_MULT,
      rx: 0,
      ry: 0,
      rz: 0,
    };
  }

  function captureMenuFrom() {
    menuFrom.sideEntry = true;
    menuFrom.px = -(MOBILE ? 10.2 : 12.2);
    menuFrom.py = MOBILE ? 4.1 : 4.75;
    menuFrom.pz = 0.42;
    menuFrom.rx = 0.18;
    menuFrom.ry = -Math.PI * 0.55;
    menuFrom.rz = 0.06;
    menuFrom.sc = CUBE_SCALE * 0.85;
  }

  function snapMenuFromPose() {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    cubeGroup.position.set(menuFrom.px, menuFrom.py, menuFrom.pz);
    cubeGroup.scale.set(menuFrom.sc, menuFrom.sc, menuFrom.sc);
    cubeGroup.rotation.set(menuFrom.rx, menuFrom.ry, menuFrom.rz);
    sMat.uniforms.uFade.value = 1;
    shell.material.opacity = 0.62;
    wire.material.opacity = 0.1;
    edges.material.opacity = 0.48;
  }

  function getMenuFaceRect() {
    if (menuBlend < 0.04) return null;

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

  function animate(now) {
    var t = now * 0.001;
    var p = scrollProgress;
    menuBlend = menuTween.blend;

    if (menuBlend > 0.001) {
      var target = menuTargets();
      var flyT = Math.min(1, menuBlend / 0.58);
      var flyEase = 1 - Math.pow(1 - flyT, 2.65);
      var rotT = Math.max(0, (menuBlend - 0.5) / 0.5);
      var rotEase = rotT * rotT * (3 - 2 * rotT);
      var cubeDim = 1 - menuBlend * 0.4;

      root.position.set(0, 0, 0);
      root.rotation.set(0, 0, 0);

      cubeGroup.position.x = menuFrom.px + (target.x - menuFrom.px) * flyEase;
      cubeGroup.position.y = menuFrom.py + (target.y - menuFrom.py) * flyEase;
      cubeGroup.position.z = menuFrom.pz + (target.z - menuFrom.pz) * flyEase;
      var sc = menuFrom.sc + (target.sc - menuFrom.sc) * flyEase;
      cubeGroup.scale.set(sc, sc, sc);
      cubeGroup.rotation.x = menuFrom.rx + (target.rx - menuFrom.rx) * rotEase;
      cubeGroup.rotation.y = menuFrom.ry + (target.ry - menuFrom.ry) * rotEase;
      cubeGroup.rotation.z = menuFrom.rz + (target.rz - menuFrom.rz) * rotEase;

      sMat.uniforms.uFade.value = cubeDim;
      shell.material.opacity = 0.62 * cubeDim;
      wire.material.opacity = 0.1 * cubeDim;
      edges.material.opacity = 0.48 * cubeDim;
    } else {
      cubeGroup.rotation.x = 0.22 + p * 0.9 + Math.sin(t * 0.35) * 0.04;
      cubeGroup.rotation.y = -0.35 + p * Math.PI * 1.5 + Math.cos(t * 0.28) * 0.05;
      cubeGroup.rotation.z = p * 0.28 + Math.sin(t * 0.22) * 0.02;
      cubeGroup.position.set(0, 0, 0);
      cubeGroup.scale.set(CUBE_SCALE, CUBE_SCALE, CUBE_SCALE);

      root.position.x = -0.55 + p * 1.2 + Math.sin(t * 0.18) * 0.07;
      root.position.y = 0.3 - p * 0.85 + Math.cos(t * 0.15) * 0.05;
      root.position.z = -p * 0.35;

      var ptr = window.cosgralPointer;
      if (ptr) {
        mouse.x += (ptr.nx - mouse.x) * 0.06;
        mouse.y += (ptr.ny - mouse.y) * 0.06;
        root.rotation.y += ptr.nx * 0.06;
        root.rotation.x += ptr.ny * 0.04;
      } else {
        mouse.x *= 0.94;
        mouse.y *= 0.94;
      }

      sMat.uniforms.uFade.value = 0.85 - p * 0.25;
      shell.material.opacity = 0.62;
      wire.material.opacity = 0.1;
      edges.material.opacity = 0.48;
    }

    sMat.uniforms.uTime.value = t;
    sMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
    camera.position.set(mouse.x * 0.08, mouse.y * 0.05, 5.4);
    camera.lookAt(0, 0, 0);
    cubeGroup.updateMatrixWorld(true);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);

  window.cosgralCube = {
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
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, { blend: 1, duration: MENU_OPEN_DUR, ease: "power3.out" });
      }
      menuTween.blend = 1;
      return null;
    },
    closeMenu: function () {
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, {
          blend: 0,
          duration: MENU_CLOSE_DUR,
          ease: "power3.in",
        });
      }
      menuTween.blend = 0;
      return null;
    },
  };
})();
