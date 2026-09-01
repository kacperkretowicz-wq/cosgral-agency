/**
 * Mini globe for contact section background.
 */
import * as THREE from "three";

(function () {
  "use strict";

  var canvas = document.getElementById("contact-3d");
  if (!canvas) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
  camera.position.z = 4;

  var R = 1.2;
  var geo = new THREE.SphereGeometry(R, 32, 24);
  var wire = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.07 })
  );
  scene.add(wire);

  var count = 1200;
  var pos = new Float32Array(count * 3);
  for (var i = 0; i < count; i++) {
    var t = Math.random() * Math.PI * 2;
    var p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = R * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = R * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = R * Math.cos(p);
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  var pts = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(pts);

  function resize() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener("mousemove", function (e) {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  var t0 = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    var ptr = window.cosgralPointer;
    if (ptr) {
      mouse.tx = ptr.tnx;
      mouse.ty = ptr.tny;
    }
    mouse.x += (mouse.tx - mouse.x) * 0.07;
    mouse.y += (mouse.ty - mouse.y) * 0.07;

    var t = (now - t0) * 0.001;
    wire.rotation.y = t * 0.15 + mouse.x * 0.4;
    pts.rotation.y = t * 0.15 + mouse.x * 0.4;
    wire.rotation.x = Math.sin(t * 0.2) * 0.15 + mouse.y * 0.35;
    pts.rotation.x = mouse.y * 0.25;
    camera.position.x = mouse.x * 0.5;
    camera.position.y = mouse.y * 0.3;
    camera.lookAt(mouse.x * 0.2, mouse.y * 0.15, 0);
    renderer.render(scene, camera);
  }
  loop(performance.now());
})();
