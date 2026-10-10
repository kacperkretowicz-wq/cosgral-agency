import * as THREE from "./vendor/three-0.170.0.module.min.js";
import { createGlassMaterial, attachGlassEnv, createRoundedBoxGeometry } from "./cube-shape.js?v=20261010p4";

function mesh(geo, mat, x, y, z) {
  var m = new THREE.Mesh(geo, mat);
  if (x || y || z) m.position.set(x || 0, y || 0, z || 0);
  return m;
}

export function buildServiceObject(kind, mat) {
  var g = new THREE.Group();
  var box = function (w, h, d) {
    return new THREE.BoxGeometry(w, h, d);
  };
  if (kind === "phone") {
    g.add(mesh(new THREE.BoxGeometry(0.72, 1.28, 0.08), mat));
  } else if (kind === "cart") {
    g.add(mesh(box(1.05, 0.62, 0.7), mat));
    g.add(mesh(new THREE.TorusGeometry(0.12, 0.035, 10, 16), mat, -0.32, -0.42, 0.22));
    g.add(mesh(new THREE.TorusGeometry(0.12, 0.035, 10, 16), mat, 0.32, -0.42, 0.22));
    var handle = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), mat);
    handle.position.set(0, 0.15, -0.48);
    handle.rotation.x = 0.6;
    g.add(handle);
  } else if (kind === "gear" || kind === "gear2") {
    g.add(mesh(new THREE.TorusGeometry(0.46, 0.14, 12, 24), mat));
    for (var i = 0; i < 8; i++) {
      var tooth = mesh(box(0.16, 0.22, 0.12), mat);
      var a = (i / 8) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0);
      tooth.rotation.z = a;
      g.add(tooth);
    }
    if (kind === "gear2") g.rotation.z = 0.4;
  } else if (kind === "prism") {
    g.add(mesh(new THREE.ConeGeometry(0.55, 1.15, 4), mat));
  } else if (kind === "magnifier") {
    g.add(mesh(new THREE.TorusGeometry(0.42, 0.06, 16, 32), mat));
    var stick = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 10), mat);
    stick.position.set(0.42, -0.48, 0);
    stick.rotation.z = 0.7;
    g.add(stick);
  } else if (kind === "lens") {
    g.add(mesh(new THREE.SphereGeometry(0.48, 32, 20), mat));
  } else if (kind === "chart") {
    g.add(mesh(box(0.22, 0.45, 0.22), mat, -0.32, -0.2, 0));
    g.add(mesh(box(0.22, 0.78, 0.22), mat, 0, 0, 0));
    g.add(mesh(box(0.22, 1.1, 0.22), mat, 0.32, 0.12, 0));
  } else if (kind === "card") {
    g.add(mesh(box(1.15, 0.72, 0.04), mat));
  } else if (kind === "clapper") {
    var board = mesh(box(1.2, 0.72, 0.06), mat);
    var stick = mesh(box(1.2, 0.16, 0.08), mat);
    stick.position.y = 0.42;
    stick.rotation.z = -0.35;
    g.add(board, stick);
  } else if (kind === "chat" || kind === "bubble") {
    g.add(mesh(new THREE.SphereGeometry(0.48, 28, 18), mat));
    var tail = mesh(new THREE.SphereGeometry(0.16, 16, 12), mat);
    tail.position.set(-0.28, -0.42, 0);
    g.add(tail);
    if (kind === "bubble") g.scale.set(1.1, 0.85, 0.85);
  } else if (kind === "ring") {
    g.add(mesh(new THREE.TorusGeometry(0.5, 0.08, 16, 40), mat));
  } else if (kind === "gamepad") {
    g.add(mesh(box(1.25, 0.62, 0.28), mat));
    g.add(mesh(new THREE.SphereGeometry(0.12, 16, 12), mat, -0.28, 0.08, 0.16));
    g.add(mesh(new THREE.SphereGeometry(0.12, 16, 12), mat, 0.32, 0.08, 0.16));
  } else {
    g.add(mesh(createRoundedBoxGeometry(0.55), mat));
  }
  return g;
}

export function mountObject(canvas, kind) {
  if (!canvas || canvas.dataset.p4Ready) return null;
  canvas.dataset.p4Ready = "1";
  var mobile = window.matchMedia("(max-width: 800px)").matches;
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !mobile, alpha: true });
  renderer.setPixelRatio(mobile ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  var scene = new THREE.Scene();
  attachGlassEnv(renderer, scene);
  var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20);
  camera.position.set(0.2, 0.15, 3.1);
  var mat = createGlassMaterial(mobile);
  var object = buildServiceObject(kind || "phone", mat);
  scene.add(object);
  var reduce = document.documentElement.classList.contains("reduce-motion");
  var running = true;
  function resize() {
    var w = canvas.clientWidth || 320;
    var h = canvas.clientHeight || 320;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  function frame() {
    if (!running) return;
    if (!reduce) object.rotation.y += 0.008;
    object.rotation.x = 0.2 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tilt-y")) || 0) * 0.15;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  resize();
  frame();
  window.addEventListener("resize", resize);
  return {
    setKind: function (next) {
      scene.remove(object);
      object = buildServiceObject(next, mat);
      scene.add(object);
    },
  };
}
