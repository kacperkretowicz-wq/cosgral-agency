/** Realizacje: the homepage glass cube as the hinge of the chapter slider.
 * It never leaves the screen: each chapter has its own place for it, and a
 * slide carries it there on a critically damped spring — arcing back through
 * depth and turning one face — so there is no cut however fast the slider
 * moves. It leans toward the pointer, can be spun by dragging, gives under a
 * press, and folds away when a chapter opens.
 */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { installGlassCube } from './cosgral-glass-cube.js?v=20261018perf1';

(async function () {
  const canvas = document.getElementById('pf-cube');
  const scroller = document.querySelector('[data-chapters-scroller]');
  if (!canvas || !scroller) return;
  const portal = canvas.parentElement;
  const root = document.documentElement;
  const reduced = root.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chapters = [...scroller.querySelectorAll('[data-portfolio-tile]')];
  const anchors = chapters.map(c => (c.getAttribute('data-cube-at') || '0.5 0.5').split(' ').map(Number));
  const mobileAnchors = chapters.map(c => (c.getAttribute('data-cube-at-m') || '0.5 0.42').split(' ').map(Number));
  const hits = [...document.querySelectorAll('[data-tile-expand-hit]')];
  const shockInto = chapters.map(c => c.getAttribute('data-enter') === 'shock');
  const HALF = 1.35;
  const QUARTER = Math.PI / 2;
  const OMEGA = 3.1;
  const glassLook = { glass: { iridescence: 0.32, dispersion: 0.45, edgeGlow: 0.2, envMapIntensity: 1.3, farSideDim: 0.38, thickness: 0.7, rainbow: 0.3, acrylic: 0.95 }, env: { power: 1.5, sheen: 0.4 } };
  const clamp = THREE.MathUtils.clamp;
  const lerp = THREE.MathUtils.lerp;
  const smooth = (a, b, x) => { const p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); };
  const rate = (r, dt) => 1 - Math.exp(-dt * r);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    portal.classList.add('has-cube-fallback');
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 5.4);
  const full = camera.clone();
  const group = new THREE.Group();
  scene.add(group);
  const euler = new THREE.Euler();
  const targetQ = new THREE.Quaternion();
  const spinQ = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const axisX = new THREE.Vector3(1, 0, 0), axisY = new THREE.Vector3(0, 1, 0);

  let width = 1, height = 1, tile = 0, mobile = false;
  let lastX = NaN, lastY = NaN;
  let pos = null, vel = 0;
  let hover = 0, hoverTarget = 0, dive = 0, hide = 0, press = 0, pressTarget = 0, intro = reduced ? 1 : 0;
  let pointerX = 0, pointerY = 0, px = 0, py = 0, clientX = -1, clientY = -1;
  let spinX = 0, spinY = 0, velX = 0, velY = 0;
  let drag = null, dragged = false;
  let lastTime = 0, lastRender = 0, glass = null, openFlag = null;

  function worldHeight(z) { return 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - z); }
  function cubeSize() { return 0.86 * (mobile ? Math.min(width * 0.4, height * 0.21) : Math.min(width * 0.2, height * 0.3)); }
  function toWorld(x, y, z, out) {
    const h = worldHeight(z);
    return out.set((x - 0.5) * h * full.aspect, (0.5 - y) * h, z);
  }
  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    mobile = width <= 900;
    full.aspect = camera.aspect = width / height;
    full.updateProjectionMatrix(); full.updateMatrixWorld(true);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const size = Math.min(Math.max(width, height), Math.ceil((cubeSize() * 2.05 + 40) / 32) * 32);
    tile = size;
    renderer.setSize(size, size, false);
    canvas.style.width = canvas.style.height = size + 'px';
    lastX = lastY = NaN;
  }
  function crop() {
    v.copy(group.position).project(full);
    const x = Math.round(((v.x * 0.5 + 0.5) * width - tile / 2) * 2) / 2;
    const y = Math.round(((-v.y * 0.5 + 0.5) * height - tile / 2) * 2) / 2;
    if (x === lastX && y === lastY) return;
    lastX = x; lastY = y;
    canvas.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    camera.setViewOffset(width, height, x, y, tile, tile);
  }
  function cubeScreen() {
    v.copy(group.position).project(full);
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
  }
  function setDragging(on) { root.classList.toggle('is-pf-cube-dragging', on); }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', e => {
    clientX = e.clientX; clientY = e.clientY;
    pointerX = (e.clientX / width) * 2 - 1;
    pointerY = (e.clientY / height) * 2 - 1;
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const now = performance.now(), step = Math.max(8, now - drag.t) / 1000;
    if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 6) { dragged = true; window.__pfCubeDragged = true; setDragging(true); }
    spinY += dx * 0.011; spinX += dy * 0.009;
    velY = dx * 0.011 / step; velX = dy * 0.009 / step;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
  }, { passive: true });
  hits.forEach(hit => {
    hit.addEventListener('pointerenter', () => { hoverTarget = 1; });
    hit.addEventListener('pointerleave', () => { hoverTarget = 0; pressTarget = 0; });
    hit.addEventListener('focus', () => { hoverTarget = 1; });
    hit.addEventListener('blur', () => { hoverTarget = 0; });
    hit.addEventListener('pointerdown', e => {
      pressTarget = 1;
      dragged = false;
      if (e.pointerType !== 'mouse' || reduced) return;
      drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() };
      velX = velY = 0;
    });
  });
  window.addEventListener('pointerup', () => {
    pressTarget = 0;
    if (!drag) return;
    if (performance.now() - drag.t > 90) { velX = 0; velY = 0; }
    drag = null;
    setDragging(false);
  });
  /* A drag that spun the cube is not a click on it */
  window.addEventListener('click', e => {
    if (!dragged) return;
    dragged = false;
    window.__pfCubeDragged = false;
    if (e.target.closest && e.target.closest('[data-tile-expand-hit]')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('portfolio-expand-open', () => { openFlag = true; hoverTarget = 0; });
  window.addEventListener('portfolio-expand-close', () => { openFlag = false; });
  /* Montaż: the cube taps the glass to send out the wave that uncovers the
     reel wall, then steps back while the wall is up */
  let tapAt = -1e9, wallOpen = false;
  window.addEventListener('pf-wall-open', () => { tapAt = performance.now(); wallOpen = true; hoverTarget = 0; });
  window.addEventListener('pf-wall-close', () => { wallOpen = false; });

  try {
    glass = await installGlassCube(THREE, renderer, scene, group, HALF, glassLook);
  } catch (error) {
    portal.classList.add('has-cube-fallback');
    console.warn('COSGRAL: portfolio cube unavailable', error);
    return;
  }
  portal.classList.add('has-glass-model');
  seeThrough(glass);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); portal.classList.add('has-cube-fallback'); });

  /* Clear glass: the animated ribbon inside is blacked out (hiding it would
     let three fill the refraction with grey), and coverage follows
     brightness, so reflections and edges stay crisp while the body lets the
     page through. Only this page's copy of the material is changed. */
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

  /* What lies behind the cube, seen through it: softened and lifted, clipped
     to the cube's outline on screen */
  const lens = document.createElement('div');
  lens.className = 'pf-cube-lens';
  portal.insertBefore(lens, canvas);

  const hullPts = Array.from({ length: 8 }, () => new THREE.Vector3());
  function updateLens(opacity) {
    if (opacity < 0.02) {
      if (lens.style.visibility !== 'hidden') lens.style.visibility = 'hidden';
      return;
    }
    const pts = [];
    let cx = 0, cy = 0;
    for (let k = 0; k < 8; k++) {
      const p = hullPts[k].set(k & 1 ? HALF : -HALF, k & 2 ? HALF : -HALF, k & 4 ? HALF : -HALF);
      p.applyMatrix4(group.matrixWorld).project(full);
      const x = (p.x * 0.5 + 0.5) * width, y = (-p.y * 0.5 + 0.5) * height;
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
    lens.style.opacity = opacity.toFixed(3);
    lens.style.visibility = 'visible';
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - (lastTime || now - 16.7)) / 1000));
    lastTime = now;
    if (document.hidden) return;
    const time = reduced ? 0 : now / 1000;
    glass.userData.rainbowTime.value = time;
    const n = chapters.length;
    const raw = clamp(scroller.scrollLeft / Math.max(1, scroller.clientWidth), 0, n - 1);

    /* Critically damped follow: no overshoot, no velocity jumps, retargets
       mid-travel without a seam. */
    if (pos === null || reduced) { pos = raw; vel = 0; }
    else {
      vel += (OMEGA * OMEGA * (raw - pos) - 2 * OMEGA * vel) * dt;
      pos += vel * dt;
      if (Math.abs(raw - pos) < 0.0004 && Math.abs(vel) < 0.002) { pos = raw; vel = 0; }
    }
    intro += (1 - intro) * rate(1.6, dt);
    hover += (hoverTarget - hover) * rate(6, dt);
    press += (pressTarget - press) * rate(pressTarget ? 18 : 7, dt);
    const isOpen = (openFlag !== null ? openFlag : document.body.classList.contains('is-tile-expanded'))
      || (wallOpen && now - tapAt > 650);
    const tk = clamp((now - tapAt) / 520, 0, 1);
    const tap = tk < 1 ? Math.sin(Math.PI * Math.min(1, tk * 1.8)) * (tk < 0.56 ? 1 : 0) + (tk > 0.5 ? Math.sin((tk - 0.5) * Math.PI * 9) * 0.25 * (1 - tk) : 0) : 0;
    dive += ((isOpen ? 1 : 0) - dive) * rate(isOpen ? 4.5 : 2.4, dt);
    hide += ((root.classList.contains('is-nav-menu-open') ? 1 : 0) - hide) * rate(9, dt);
    const pb = rate(4, dt);
    px += (pointerX - px) * pb; py += (pointerY - py) * pb;

    if (!drag) {
      /* Inertia, then settle on the chapter's face */
      spinY += velY * dt; spinX += velX * dt;
      velY *= Math.exp(-dt * 2.4); velX *= Math.exp(-dt * 2.4);
      const settle = Math.abs(velY) + Math.abs(velX) < 1.2 ? rate(2.2, dt) : 0;
      spinY += (Math.round(spinY / QUARTER) * QUARTER - spinY) * settle;
      spinX += (0 - spinX) * settle;
    }

    const i = Math.min(n - 1, Math.floor(pos));
    const t = pos - i;
    const set = mobile ? mobileAnchors : anchors;
    const [ax, ay] = set[i], [bx, by] = set[Math.min(n - 1, i + 1)];
    /* sin² keeps the arc smooth across chapter boundaries during long slides */
    let arc = reduced ? 0 : Math.pow(Math.sin(Math.PI * t), 2);
    const dir = vel >= 0 ? 1 : -1;
    let sx = lerp(ax, bx, t);
    let sy = lerp(ay, by, t) - arc * 0.07 + Math.sin(time * 0.6) * 0.006;
    let sz = -arc * 2.3 - (1 - intro) * 6;
    let dunk = 0;
    if (!reduced && shockInto[i + 1]) {
      /* It stays put and taps the glass: a quick push toward the viewer, a
         springy return with a small tremor; the shockwave starts from here.
         Only once the black has spread does it glide to its new place. */
      const move = smooth(0.72, 1, t);
      arc = Math.pow(Math.sin(Math.PI * move), 2) * 0.6;
      sx = lerp(ax, bx, move);
      sy = lerp(ay, by, move) - Math.pow(Math.sin(Math.PI * move), 2) * 0.05;
      const k = clamp((t - 0.03) / 0.3, 0, 1);
      const push = Math.sin(Math.PI * Math.min(1, k * 1.8)) * (k < 0.56 ? 1 : 0);
      const tremor = k > 0.5 ? Math.sin((k - 0.5) * Math.PI * 9) * 0.25 * (1 - k) : 0;
      sz = 1.45 * push + tremor - Math.pow(Math.sin(Math.PI * move), 2) * 1.2 - (1 - intro) * 6;
      dunk = push * 0.35 + tremor * 0.4;
    }
    sz += tap * 1.45;
    toWorld(sx, sy, sz, group.position);

    /* Lean toward the pointer, harder when it is on the cube */
    let lx = px * 0.35, ly = py * 0.35;
    if (hover > 0.01 && clientX >= 0) {
      const c = cubeScreen(), rr = cubeSize() * 0.9;
      lx = lx * (1 - hover) + clamp((clientX - c.x) / rr, -1, 1) * hover;
      ly = ly * (1 - hover) + clamp((clientY - c.y) / rr, -1, 1) * hover;
    }
    euler.set(
      0.38 + arc * 0.75 + dunk * 1.1 + ly * 0.42 + Math.sin(time * 0.37) * 0.05 + (1 - intro) * 1.4,
      -0.62 - pos * QUARTER + lx * 0.55 + Math.sin(time * 0.29) * 0.07 + dive * Math.PI * 0.6 - (1 - intro) * 2.2,
      -arc * 0.3 * dir - dunk * 0.5 + Math.sin(time * 0.41) * 0.02
    );
    targetQ.setFromEuler(euler);
    spinQ.setFromAxisAngle(axisY, spinY);
    targetQ.premultiply(spinQ);
    spinQ.setFromAxisAngle(axisX, spinX);
    targetQ.premultiply(spinQ);
    group.quaternion.slerp(targetQ, rate(drag ? 22 : 10, dt));
    const scale = worldHeight(0) * cubeSize() / height / (2 * HALF);
    const bounce = 1 + hover * 0.09 - press * 0.08;
    group.scale.setScalar(scale * (1 - arc * 0.14) * bounce * (1 - smooth(0, 1, dive) * 0.5));
    group.updateMatrixWorld(true);

    const opacity = smooth(0, 0.35, intro) * (1 - smooth(0.15, 0.85, dive)) * (1 - hide);
    glass.material.opacity = opacity;
    glass.material.depthWrite = opacity > 0.995;
    group.visible = glass.visible = opacity > 0.01;
    glass.userData.transmissionBackdrop.visible = group.visible;
    if (!group.visible) {
      if (canvas.style.visibility !== 'hidden') canvas.style.visibility = 'hidden';
      updateLens(0);
      return;
    }
    const settling = Math.abs(Math.round(spinY / QUARTER) * QUARTER - spinY) + Math.abs(spinX) > 0.002;
    const active = tk < 1 || vel !== 0 || intro < 0.999 || drag || settling || Math.abs(velX) + Math.abs(velY) > 0.01
      || Math.abs(hoverTarget - hover) > 0.002 || Math.abs(pressTarget - press) > 0.002
      || Math.abs(dive - (isOpen ? 1 : 0)) > 0.002 || Math.abs(pointerX - px) + Math.abs(pointerY - py) > 0.004;
    if (now - lastRender < (active ? 14 : 42)) return;
    lastRender = now;
    crop();
    canvas.style.visibility = 'visible';
    renderer.render(scene, camera);
    updateLens(opacity);
  }
  requestAnimationFrame(frame);
})();
