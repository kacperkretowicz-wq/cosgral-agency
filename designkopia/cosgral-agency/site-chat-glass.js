/** Live chat button — the clear glass cube from Realizacje, small. It turns
 * slowly, leans toward the pointer and faces front when the chat is open.
 * The page shows through it, softened inside its outline, with no tile
 * behind it on any ground.
 */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { installGlassCube } from './cosgral-glass-cube.js?v=20261018acrylic3';

(async function () {
  const root = document.documentElement;
  const reduced = root.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HALF = 1.35;
  const glassLook = { glass: { iridescence: 0.32, dispersion: 0.45, edgeGlow: 0.2, envMapIntensity: 1.3, farSideDim: 0.38, thickness: 0.7, rainbow: 0.3, acrylic: 0.95 }, env: { power: 1.5, sheen: 0.4 } };
  const clamp = THREE.MathUtils.clamp;
  const rate = (r, dt) => 1 - Math.exp(-dt * r);

  const canvas = await new Promise(resolve => {
    let tries = 0;
    (function find() {
      const c = document.querySelector('[data-cg-chat-cube]');
      if (c || ++tries > 80) resolve(c);
      else setTimeout(find, 60);
    })();
  });
  if (!canvas) return;
  const stage = canvas.parentElement;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  camera.position.set(0, 0, 8.1);
  const group = new THREE.Group();
  scene.add(group);

  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(Math.min(2.25, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();

  let glass;
  try {
    glass = await installGlassCube(THREE, renderer, scene, group, HALF, glassLook);
  } catch (error) {
    console.warn('COSGRAL: chat cube unavailable', error);
    return;
  }
  seeThrough(glass);
  stage.classList.add('has-glass-cube');

  /* Same clear glass as Realizacje: the ribbon inside is blacked out and
     coverage follows brightness, so only reflections and edges stay solid */
  function seeThrough(mesh) {
    const bm = mesh.userData.transmissionBackdrop.material;
    bm.fragmentShader = bm.fragmentShader
      .replace('precision highp float;', 'precision highp float;\n    uniform float uHaze;')
      .replace('gl_FragColor = vec4(col, 1.0);', 'gl_FragColor = vec4(col * uHaze, 1.0);');
    bm.uniforms.uHaze = { value: 0 };
    bm.needsUpdate = true;
    const m = mesh.material;
    const prev = m.onBeforeCompile;
    m.onBeforeCompile = (shader, r) => {
      if (prev) prev(shader, r);
      shader.fragmentShader = shader.fragmentShader.replace(/}\s*$/,
        '  float pfLum = max(max(gl_FragColor.r, gl_FragColor.g), gl_FragColor.b);\n' +
        '  gl_FragColor.a *= clamp(pow(pfLum, 1.7) * 1.9, 0.0, 1.0);\n}');
    };
    m.customProgramCacheKey = () => 'pf-clear-glass';
    m.needsUpdate = true;
  }

  /* The page behind, seen through the cube: softened inside its outline */
  const lens = document.createElement('span');
  lens.className = 'cg-chat-lens';
  lens.setAttribute('aria-hidden', 'true');
  stage.insertBefore(lens, canvas);
  const corners = Array.from({ length: 8 }, () => new THREE.Vector3());
  function updateLens(w, h) {
    const pts = [];
    let cx = 0, cy = 0;
    for (let k = 0; k < 8; k++) {
      const p = corners[k].set(k & 1 ? HALF : -HALF, k & 2 ? HALF : -HALF, k & 4 ? HALF : -HALF);
      p.applyMatrix4(group.matrixWorld).project(camera);
      const x = (p.x * 0.5 + 0.5) * w, y = (-p.y * 0.5 + 0.5) * h;
      pts.push([x, y]); cx += x; cy += y;
    }
    cx /= 8; cy /= 8;
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (let k = pts.length - 1; k >= 0; k--) { const p = pts[k]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
    lens.style.clipPath = 'polygon(' + hull.map(p => ((p[0] - cx) * 0.95 + cx).toFixed(1) + 'px ' + ((p[1] - cy) * 0.95 + cy).toFixed(1) + 'px').join(',') + ')';
  }

  const euler = new THREE.Euler();
  const targetQ = new THREE.Quaternion();
  let spin = 0.6, leanX = 0, leanY = 0, last = 0, lastRender = 0;
  const launcher = canvas.closest('.cg-chat-launcher');
  const chatRoot = document.querySelector('.cg-chat-root');

  function readPointer() {
    const ptr = window.cosgralPointer;
    if (!ptr) return [0, 0];
    if (ptr.fromOrientation || (window.cosgralOrientation && window.cosgralOrientation.active)) {
      return [clamp(ptr.ny || 0, -1, 1), clamp(ptr.nx || 0, -1, 1)];
    }
    const r = canvas.getBoundingClientRect();
    const px = ptr.x != null ? ptr.x : window.innerWidth / 2;
    const py = ptr.y != null ? ptr.y : window.innerHeight / 2;
    return [
      clamp((py - (r.top + r.height / 2)) / (window.innerHeight * 0.45), -1.1, 1.1),
      clamp((px - (r.left + r.width / 2)) / (window.innerWidth * 0.45), -1.1, 1.1)
    ];
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - (last || now - 16.7)) / 1000));
    last = now;
    if (document.hidden || (chatRoot && !chatRoot.classList.contains('is-chat-visible'))) return;
    const open = launcher && launcher.getAttribute('aria-expanded') === 'true';
    const [ty, tx] = open ? [0, 0] : readPointer();
    leanX += (ty * 0.5 - leanX) * rate(6, dt);
    leanY += (tx * 0.6 - leanY) * rate(6, dt);
    if (!open && !reduced) spin += dt * 0.32;
    const time = reduced ? 0 : now / 1000;
    glass.userData.rainbowTime.value = time;
    euler.set(
      0.42 + leanX + Math.sin(time * 0.37) * 0.04,
      (open ? -0.62 : -0.62 + spin) + leanY,
      Math.sin(time * 0.41) * 0.02
    );
    targetQ.setFromEuler(euler);
    group.quaternion.slerp(targetQ, rate(open ? 5 : 10, dt));
    group.updateMatrixWorld(true);
    /* About thirty frames a second is plenty for a button */
    if (now - lastRender < 30) return;
    lastRender = now;
    renderer.render(scene, camera);
    const r = canvas.getBoundingClientRect();
    updateLens(r.width, r.height);
  }

  window.addEventListener('resize', resize, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { last = 0; resize(); } });
  requestAnimationFrame(frame);
})();
