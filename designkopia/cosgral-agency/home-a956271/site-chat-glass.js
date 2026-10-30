/** Live chat button — the clear glass cube from Realizacje, small. It turns
 * slowly, leans toward the pointer and faces front when the chat is open.
 * The page shows through it, softened inside its outline, with no tile
 * behind it on any ground.
 */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { installGlassCube } from './cosgral-glass-cube.js?v=20261019editorial14';

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
  const launcher = canvas.closest('.cg-chat-launcher');
  let stageRect;
  // Prepare the hidden button shortly before it enters. An opened chat is
  // always ready immediately; an untouched hero keeps the GPU to itself.
  function waitForChatApproach() {
    return new Promise(resolve => {
      const hero = document.querySelector('#top.home-hero, .home-hero') ||
        document.querySelector('.portfolio-hero, .about-hero, .gallery-hero, .service-hero') ||
        document.querySelector('#main > header, #main > section');
      const ready = () => !hero || launcher?.getAttribute('aria-expanded') === 'true' ||
        hero.getBoundingClientRect().bottom <= (window.innerHeight || 1) * .70;
      if (ready()) { resolve(); return; }
      let pending = 0, finished = false;
      const observer = launcher && window.MutationObserver ? new MutationObserver(queue) : null;
      function finish() {
        finished = true;
        cancelAnimationFrame(pending);
        pending = 0;
        ['scroll', 'resize', 'pageshow'].forEach(type => window.removeEventListener(type, queue));
        observer?.disconnect();
        resolve();
      }
      function check() {
        pending = 0;
        if (!finished && ready()) finish();
      }
      function queue() {
        if (!finished && !pending) pending = requestAnimationFrame(check);
      }
      ['scroll', 'resize', 'pageshow'].forEach(type => window.addEventListener(type, queue, { passive: true }));
      observer?.observe(launcher, { attributes: true, attributeFilter: ['aria-expanded'] });
    });
  }
  await waitForChatApproach();
  // The existing launcher icon stays interactive during hero shader warmup.
  if(!reduced&&document.querySelector('#hero-3d')&&!root.classList.contains('has-hero-cube-frame')){
    await new Promise(resolve=>{
      const finish=()=>{clearTimeout(timer);window.removeEventListener('cosgral:cube-intro-done',finish);resolve();};
      const timer=setTimeout(finish,4500);
      window.addEventListener('cosgral:cube-intro-done',finish,{once:true});
    });
  }
  await new Promise(resolve=>window.requestIdleCallback?requestIdleCallback(resolve,{timeout:1200}):setTimeout(resolve,80));

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

  let renderWidth = 0, renderHeight = 0, renderRatio = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    stageRect=r;
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (w === renderWidth && h === renderHeight && ratio === renderRatio) return;
    renderWidth = w; renderHeight = h; renderRatio = ratio;
    renderer.setPixelRatio(ratio);
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
  await renderer.compileAsync(scene,camera);
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
  let spin = 0.6, leanX = 0, leanY = 0, last = 0, lastRender = 0, raf = 0;
  const chatRoot = document.querySelector('.cg-chat-root');

  function canAnimate() {
    if (document.hidden || (chatRoot && !chatRoot.classList.contains('is-chat-visible'))) return false;
    const open = launcher?.getAttribute('aria-expanded') === 'true';
    // Keep one quiet frame while the hero owns the composition. Hover,
    // keyboard focus and an open conversation resume the button immediately.
    return !lastRender || open || !root.classList.contains('is-hero-cube-focus') ||
      !!launcher?.matches(':hover, :focus-within');
  }
  function requestFrame() {
    if (!canAnimate()) {
      cancelAnimationFrame(raf);
      raf = 0; last = 0;
      return;
    }
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function readPointer() {
    const ptr = window.cosgralPointer;
    if (!ptr) return [0, 0];
    if (ptr.fromOrientation || (window.cosgralOrientation && window.cosgralOrientation.active)) {
      return [clamp(ptr.ny || 0, -1, 1), clamp(ptr.nx || 0, -1, 1)];
    }
    const r = stageRect;
    const px = ptr.x != null ? ptr.x : window.innerWidth / 2;
    const py = ptr.y != null ? ptr.y : window.innerHeight / 2;
    return [
      clamp((py - (r.top + r.height / 2)) / (window.innerHeight * 0.45), -1.1, 1.1),
      clamp((px - (r.left + r.width / 2)) / (window.innerWidth * 0.45), -1.1, 1.1)
    ];
  }

  function frame(now) {
    raf = 0;
    if (!canAnimate()) {last=0;return;}
    const open = launcher && launcher.getAttribute('aria-expanded') === 'true';
    const interval=1000/30,elapsed=now-lastRender;
    if(elapsed<interval-.65){requestFrame();return;}
    // Integrate the time between rendered frames, including skipped rAF ticks.
    const dt = Math.min(0.05, Math.max(0.001, (now - (last || now - 16.7)) / 1000));
    last = now;
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
    lastRender = elapsed>=interval ? now-elapsed%interval : now;
    renderer.render(scene, camera);
    updateLens(stageRect.width, stageRect.height);
    requestFrame();
  }

  function resizeAndWake() { resize(); requestFrame(); }
  function resume() { last = 0; if (!document.hidden) resize(); requestFrame(); }
  window.addEventListener('resize', resizeAndWake, { passive: true });
  window.addEventListener('pageshow', resume, { passive: true });
  if (window.ResizeObserver) new ResizeObserver(resizeAndWake).observe(stage);
  if (window.MutationObserver) {
    const activity = new MutationObserver(requestFrame);
    activity.observe(root, { attributes: true, attributeFilter: ['class'] });
    if (chatRoot) activity.observe(chatRoot, { attributes: true, attributeFilter: ['class'] });
    if (launcher) activity.observe(launcher, { attributes: true, attributeFilter: ['aria-expanded'] });
  }
  ['pointerenter', 'pointerleave', 'focusin', 'focusout'].forEach(type =>
    launcher?.addEventListener(type, requestFrame, { passive: true }));
  document.addEventListener('visibilitychange', resume);
  requestFrame();
})();
