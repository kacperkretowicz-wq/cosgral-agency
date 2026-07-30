/**
 * Three.js — wireframe cube + surface particles (hero).
 */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

(function () {
  "use strict";

  var canvas = document.getElementById("hero-3d");
  if (!canvas) return;

  var REDUCED = document.documentElement.classList.contains("reduce-motion");
  var MOBILE = window.matchMedia("(max-width: 900px)").matches;
  if (REDUCED) return;

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var scrollY = 0;
  var HALF = 1.35;
  var COUNT = MOBILE ? 2200 : 5600;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var cubeGroup = new THREE.Group();
  cubeGroup.rotation.set(0.38, -0.52, 0.12);
  scene.add(cubeGroup);

  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 5.2;

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

  var positions = new Float32Array(COUNT * 3);
  var sizes = new Float32Array(COUNT);

  for (var i = 0; i < COUNT; i++) {
    var p = randomOnCube(HALF);
    positions[i * 3] = p[0];
    positions[i * 3 + 1] = p[1];
    positions[i * 3 + 2] = p[2];
    sizes[i] = 0.4 + Math.random() * 1.7;
  }

  var geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  var mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      uniform vec2 uMouse;
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
        vAlpha = 0.14 + smoothstep(2.8, 0.0, dist) * 0.38;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(0.88, 0.88, 0.88, vAlpha * glow);
      }
    `,
  });

  var boxGeo = new THREE.BoxGeometry(HALF * 2, HALF * 2, HALF * 2);

  cubeGroup.add(
    new THREE.Mesh(
      boxGeo,
      new THREE.MeshBasicMaterial({
        color: 0x080808,
        transparent: true,
        opacity: 0.62,
        depthWrite: true,
      })
    )
  );

  cubeGroup.add(
    new THREE.Mesh(
      boxGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.1,
      })
    )
  );

  cubeGroup.add(
    new THREE.LineSegments(
      new THREE.EdgesGeometry(boxGeo),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.48 })
    )
  );

  cubeGroup.add(new THREE.Points(geo, mat));

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

  window.addEventListener("scroll", function () {
    scrollY = window.scrollY / window.innerHeight;
  }, { passive: true });

  function syncPointer() {
    var ptr = window.cosgralPointer;
    if (!ptr) return;
    mouse.tx = ptr.tnx;
    mouse.ty = ptr.tny;
  }

  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    syncPointer();
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    mat.uniforms.uTime.value = t;
    mat.uniforms.uMouse.value.set(mouse.x, mouse.y);

    cubeGroup.rotation.y = t * 0.1 + mouse.x * 0.5;
    cubeGroup.rotation.x = 0.38 + mouse.y * 0.32 + scrollY * 0.25;
    cubeGroup.rotation.z = 0.12 + mouse.x * 0.08;
    cubeGroup.position.x = mouse.x * 0.16;
    cubeGroup.position.y = mouse.y * 0.1;

    camera.position.x = mouse.x * 0.4;
    camera.position.y = mouse.y * 0.24;
    camera.position.z = 5.2 - Math.abs(mouse.x) * 0.12;
    camera.lookAt(mouse.x * 0.06, mouse.y * 0.05, 0);

    renderer.render(scene, camera);
  }

  animate();
  window.cosgralCube = { group: cubeGroup };
})();
