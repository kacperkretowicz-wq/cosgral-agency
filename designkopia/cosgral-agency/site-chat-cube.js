/**
 * Live chat FAB — same glass cube as the homepage story (cube_web_raw.glb).
 * Small canvas: no sand field, one orange and one navy sphere so transmission
 * has something to refract, bright paper environment instead of a mirror box.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";

var GLB_URL = new URL("./assets/cube/cube_web_raw.glb", import.meta.url);

function loadRawGlb(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error("GLB " + res.status);
    return res.arrayBuffer();
  }).then(function (buf) {
    var view = new DataView(buf);
    var magic = view.getUint32(0, true);
    if (magic !== 0x46546c67) throw new Error("not glb");
    var jsonLen = view.getUint32(12, true);
    var json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
    var bin = new Uint8Array(buf, 20 + jsonLen + 8);
    function accessor(index, Ctor, itemSize) {
      var acc = json.accessors[index];
      var bv = json.bufferViews[acc.bufferView];
      var start = (bv.byteOffset || 0) + (acc.byteOffset || 0);
      return new Ctor(bin.buffer, bin.byteOffset + start, acc.count * itemSize);
    }
    var prim = json.meshes[0].primitives[0];
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(accessor(prim.attributes.POSITION, Float32Array, 3), 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(accessor(prim.attributes.NORMAL, Float32Array, 3), 3));
    geo.setIndex(new THREE.BufferAttribute(accessor(prim.indices, Uint16Array, 1), 1));
    geo.computeBoundingSphere();
    return geo;
  });
}

function glassMaterial() {
  var m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#ffffff"),
    metalness: 0,
    roughness: 0.04,
    transmission: 1,
    ior: 1.5,
    thickness: 1.2,
    dispersion: 0.45,
    attenuationColor: new THREE.Color("#f7f9fc"),
    attenuationDistance: 14,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    specularIntensity: 0.4,
    specularColor: new THREE.Color("#ffffff"),
    envMapIntensity: 0.7,
    iridescence: 1,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [350, 850],
    side: THREE.DoubleSide,
    transparent: true,
  });
  return m;
}

function buildEnv(renderer, pmrem) {
  var env = new THREE.Scene();
  env.background = new THREE.Color(0.97, 0.95, 0.92);
  var plane = new THREE.PlaneGeometry(1, 1);
  function add(pos, size, power, color) {
    var mat = new THREE.MeshBasicMaterial({ color: color || 0xffffff, side: THREE.DoubleSide });
    mat.color.multiplyScalar(power);
    var mesh = new THREE.Mesh(plane, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scale.set(size[0], size[1], 1);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  }
  add([0, 4, 2], [6, 4], 1.1);
  add([-3, 1, 2], [2, 2.4], 1.5, 0xff5a28);
  add([3, 0.4, 1.5], [2.2, 2.6], 1.3, 0x16307a);
  return pmrem.fromScene(env, 0.04).texture;
}

(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var canvas = null;
  var tries = 0;

  function findCanvas() {
    canvas = document.querySelector("[data-cg-chat-cube]");
    if (canvas) {
      boot();
      return;
    }
    tries += 1;
    if (tries < 40) window.setTimeout(findCanvas, 50);
  }

  function boot() {
    var MOBILE = window.matchMedia("(max-width: 900px)").matches;
    var renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40);
    camera.position.set(0, 0.08, MOBILE ? 7.6 : 7.1);

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      var dpr = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    }
    resize();

    var pmrem = new THREE.PMREMGenerator(renderer);
    try {
      scene.environment = buildEnv(renderer, pmrem);
      scene.environmentIntensity = 0.9;
    } catch (err) {
      console.error("[chat-cube] env", err);
    }
    pmrem.dispose();

    var root = new THREE.Group();
    root.scale.setScalar(MOBILE ? 0.92 : 1);
    scene.add(root);

    var orange = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xff4a1c })
    );
    var navy = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x13235e })
    );
    orange.position.set(-1.15, -0.15, -1.6);
    navy.position.set(1.2, 0.25, -1.8);
    scene.add(orange, navy);

    var mat = glassMaterial();
    var mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.visible = false;
    root.add(mesh);
    loadRawGlb(GLB_URL.href).then(function (geo) {
      mesh.geometry = geo;
      mesh.visible = true;
      renderer.render(scene, camera);
    }).catch(function (err) {
      console.error("[chat-cube]", err);
    });

    var spin = 0.35;
    var leanX = 0;
    var leanY = 0;
    var targetLeanX = 0;
    var targetLeanY = 0;
    var running = true;
    var last = performance.now();
    var LOOK = MOBILE ? 0.42 : 0.5;
    var IDLE_SPIN = MOBILE ? 0.2 : 0.26;

    function clamp(v, a, b) {
      return Math.max(a, Math.min(b, v));
    }

    function readPointer() {
      var ptr = window.cosgralPointer;
      if (!ptr) {
        targetLeanX = 0;
        targetLeanY = 0;
        return;
      }
      if (ptr.fromOrientation || (window.cosgralOrientation && window.cosgralOrientation.active)) {
        targetLeanY = clamp(ptr.nx || 0, -1, 1) * LOOK;
        targetLeanX = clamp(ptr.ny || 0, -1, 1) * LOOK * 0.88;
        return;
      }
      var rect = canvas.getBoundingClientRect();
      var cx = rect.left + rect.width * 0.5;
      var cy = rect.top + rect.height * 0.5;
      var px = ptr.x != null ? ptr.x : window.innerWidth * 0.5;
      var py = ptr.y != null ? ptr.y : window.innerHeight * 0.5;
      var dx = (px - cx) / Math.max(window.innerWidth * 0.45, 1);
      var dy = (py - cy) / Math.max(window.innerHeight * 0.45, 1);
      targetLeanY = clamp(dx, -1.1, 1.1) * LOOK;
      targetLeanX = clamp(-dy, -1.1, 1.1) * LOOK * 0.82;
    }

    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      var launcher = canvas.closest(".cg-chat-launcher");
      var open = launcher && launcher.getAttribute("aria-expanded") === "true";
      var chatRoot = document.querySelector(".cg-chat-root");
      var scrollHidden = chatRoot && !chatRoot.classList.contains("is-chat-visible");
      var hidden =
        document.hidden ||
        scrollHidden ||
        (canvas.offsetParent === null && getComputedStyle(canvas).visibility === "hidden");
      if (hidden) return;
      if (open) {
        targetLeanX = 0.18;
        targetLeanY = -0.12;
      } else {
        readPointer();
      }
      var follow = 1 - Math.pow(0.001, dt);
      leanX += (targetLeanX - leanX) * Math.min(1, follow * 12);
      leanY += (targetLeanY - leanY) * Math.min(1, follow * 12);
      if (!open) spin += dt * IDLE_SPIN;
      root.rotation.x = 0.42 + leanX;
      root.rotation.y = (open ? 0.22 : spin * 0.5) + leanY;
      root.rotation.z = leanY * -0.12 + leanX * 0.04;
      renderer.render(scene, camera);
    }

    resize();
    renderer.render(scene, camera);
    window.addEventListener("resize", resize, { passive: true });
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(canvas.parentElement || canvas);
    }
    requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        last = performance.now();
        resize();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", findCanvas, { once: true });
  } else {
    findCanvas();
  }
})();
