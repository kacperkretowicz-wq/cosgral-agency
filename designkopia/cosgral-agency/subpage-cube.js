/**
 * Subpage cube — lighter variant of homepage hero cube.
 * Scroll-driven drift + rotation; subtle idle motion.
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
  var scrollProgress = 0;
  var mouse = { x: 0, y: 0 };

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

    cubeGroup.rotation.x = 0.22 + p * 0.9 + Math.sin(t * 0.35) * 0.04;
    cubeGroup.rotation.y = -0.35 + p * Math.PI * 1.5 + Math.cos(t * 0.28) * 0.05;
    cubeGroup.rotation.z = p * 0.28 + Math.sin(t * 0.22) * 0.02;

    root.position.x = -0.55 + p * 1.2 + Math.sin(t * 0.18) * 0.07;
    root.position.y = 0.3 - p * 0.85 + Math.cos(t * 0.15) * 0.05;
    root.position.z = -p * 0.35;

    var ptr = window.cosgralPointer;
    if (ptr) {
      mouse.x += (ptr.nx - mouse.x) * 0.06;
      mouse.y += (ptr.ny - mouse.y) * 0.06;
      root.rotation.y += ptr.nx * 0.06;
      root.rotation.x += ptr.ny * 0.04;
    }

    sMat.uniforms.uTime.value = t;
    sMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
    sMat.uniforms.uFade.value = 0.85 - p * 0.25;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
