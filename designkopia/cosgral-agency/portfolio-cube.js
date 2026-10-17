/** Realizacje: the homepage glass cube as the hinge of the chapter slider.
 * Between chapters it recedes into depth, then enters every chapter from the
 * left edge along that chapter's own line, slowly, landing one face further
 * on. It leans toward the pointer, can be spun by dragging, gives
 * under a press, and folds away when a chapter opens.
 */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { installGlassCube } from './cosgral-glass-cube.js?v=20261015text2';

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
  const HALF = 1.35;
  const QUARTER = Math.PI / 2;
  const glassLook = { glass: { iridescence: 0.12, dispersion: 0.25, edgeGlow: 0.12, envMapIntensity: 1.15, farSideDim: 0.38, thickness: 0.7 }, env: { power: 1.5, sheen: 0.4 } };
  const clamp = THREE.MathUtils.clamp;
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
  let hover = 0, hoverTarget = 0, dive = 0, hide = 0, press = 0, pressTarget = 0;
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
  function bezier(a, b, c, d, t) {
    const u = 1 - t;
    return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
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
    if (Math.abs(e.clientX - drag.x0) + Math.abs(e.clientY - drag.y0) > 6) { dragged = true; setDragging(true); }
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
    if (e.target.closest && e.target.closest('[data-tile-expand-hit]')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('portfolio-expand-open', () => { openFlag = true; hoverTarget = 0; });
  window.addEventListener('portfolio-expand-close', () => { openFlag = false; });

  try {
    glass = await installGlassCube(THREE, renderer, scene, group, HALF, glassLook);
  } catch (error) {
    portal.classList.add('has-cube-fallback');
    console.warn('COSGRAL: portfolio cube unavailable', error);
    return;
  }
  portal.classList.add('has-glass-model');
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); portal.classList.add('has-cube-fallback'); });

  /* Every chapter is entered from the left edge, each along its own line:
     a flat glide, a swoop from above, a spiral out of depth, a rise from below.
     Points are [x, y] screen fractions and z depth; the last point is the
     chapter's anchor. */
  const EXIT = 0.85, ENTER = 2.9;
  const PATHS = [
    (bx, by) => [[-0.26, by + 0.06, -1.2], [0.12, by + 0.2, -0.8], [bx - 0.22, by + 0.06, 0.25]],
    (bx, by) => [[-0.24, -0.22, -2.6], [0.08, -0.18, -3.2], [bx - 0.26, by + 0.3, 0.6]],
    (bx, by) => [[-0.32, by, -10], [0.24, by - 0.36, -8], [bx + 0.2, by + 0.26, -2.6]],
    (bx, by) => [[-0.24, 1.22, -1.6], [0.04, 1.02, -1], [bx - 0.16, by - 0.24, 0.35]]
  ];
  let home = null, flight = null;
  const cur = { x: 0.5, y: 0.5, z: 0, s: 1 };
  function startFlight(to, now, withExit) {
    flight = {
      to,
      start: now,
      exit: withExit,
      from: { x: cur.x, y: cur.y, z: cur.z, s: cur.s },
      fromFace: flight ? flight.to : (home ?? to)
    };
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - (lastTime || now - 16.7)) / 1000));
    lastTime = now;
    if (document.hidden) return;
    const time = reduced ? 0 : now / 1000;
    const n = chapters.length;
    const raw = clamp(scroller.scrollLeft / Math.max(1, scroller.clientWidth), 0, n - 1);
    const settledRaw = Math.abs(raw - Math.round(raw)) < 0.02;
    hover += (hoverTarget - hover) * rate(6, dt);
    press += (pressTarget - press) * rate(pressTarget ? 18 : 7, dt);
    const isOpen = openFlag !== null ? openFlag : document.body.classList.contains('is-tile-expanded');
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

    /* Where should the cube be? As soon as the slide leaves its chapter, the
       next one in the direction of travel; once the slide rests, that one. */
    let wanted = home;
    if (settledRaw) wanted = Math.round(raw);
    else if (home !== null && Math.abs(raw - home) > 0.05) wanted = raw > home ? Math.ceil(raw) : Math.floor(raw);
    if (home === null) wanted = Math.round(raw);
    if (reduced) { home = wanted; flight = null; }
    else if (!flight && wanted !== home) startFlight(wanted, now, home !== null);
    else if (flight && wanted !== flight.to) {
      if (now - flight.start < EXIT * 1000) flight.to = wanted;
      else startFlight(wanted, now, true);
    }

    const set = mobile ? mobileAnchors : anchors;
    let sx, sy, sz, sc = 1, op = 1, exPitch = 0, exYaw = 0, exRoll = 0, faceIndex = home ?? 0;
    if (flight) {
      const el = (now - flight.start) / 1000 + (flight.exit ? 0 : EXIT);
      const [bx, by] = set[flight.to];
      faceIndex = flight.to;
      if (el < EXIT) {
        /* Recede into depth and fade */
        const u = clamp(el / EXIT, 0, 1), e = u * u * u;
        const f = flight.from;
        sx = f.x; sy = f.y - e * 0.08; sz = f.z - e * 7; sc = f.s * (1 - e * 0.3);
        op = 1 - smooth(0.25, 1, u);
        faceIndex = flight.fromFace;
        exYaw = -e * 1.2; exPitch = e * 0.5;
      } else {
        const v = clamp((el - EXIT) / ENTER, 0, 1);
        const e = 1 - Math.pow(1 - v, 3), r = 1 - e;
        const k = flight.to % 4;
        const path = PATHS[k](bx, by);
        sx = bezier(path[0][0], path[1][0], path[2][0], bx, e);
        sy = bezier(path[0][1], path[1][1], path[2][1], by, e);
        sz = bezier(path[0][2], path[1][2], path[2][2], 0, e);
        sc = 0.72 + 0.28 * e;
        op = smooth(0, 0.14, v);
        if (k === 0) { exYaw = r * Math.PI * 2; exRoll = -r * 0.25; }
        else if (k === 1) { exPitch = r * Math.PI * 1.5; exYaw = r * 0.4; }
        else if (k === 2) { exRoll = r * Math.PI * 2; exYaw = r * QUARTER; }
        else { exYaw = -r * Math.PI; exPitch = Math.sin(r * Math.PI * 4) * 0.28 * r; }
        if (v >= 1) { home = flight.to; flight = null; }
      }
    } else {
      [sx, sy] = set[home ?? 0];
      sz = 0;
    }
    sy += Math.sin(time * 0.6) * 0.006;
    cur.x = sx; cur.y = sy; cur.z = sz; cur.s = sc;
    toWorld(sx, sy, sz, group.position);

    /* Lean toward the pointer, harder when it is on the cube */
    let lx = px * 0.35, ly = py * 0.35;
    if (hover > 0.01 && clientX >= 0 && !flight) {
      const c = cubeScreen(), rr = cubeSize() * 0.9;
      lx = lx * (1 - hover) + clamp((clientX - c.x) / rr, -1, 1) * hover;
      ly = ly * (1 - hover) + clamp((clientY - c.y) / rr, -1, 1) * hover;
    }
    euler.set(
      0.38 + exPitch + ly * 0.42 + Math.sin(time * 0.37) * 0.05,
      -0.62 - faceIndex * QUARTER + exYaw + lx * 0.55 + Math.sin(time * 0.29) * 0.07 + dive * Math.PI * 0.6,
      exRoll + Math.sin(time * 0.41) * 0.02
    );
    targetQ.setFromEuler(euler);
    spinQ.setFromAxisAngle(axisY, spinY);
    targetQ.premultiply(spinQ);
    spinQ.setFromAxisAngle(axisX, spinX);
    targetQ.premultiply(spinQ);
    if (op < 0.02) group.quaternion.copy(targetQ);
    else group.quaternion.slerp(targetQ, rate(drag ? 22 : flight ? 14 : 9, dt));
    const scale = worldHeight(0) * cubeSize() / height / (2 * HALF);
    const bounce = 1 + hover * 0.09 - press * 0.08;
    group.scale.setScalar(scale * sc * bounce * (1 - smooth(0, 1, dive) * 0.5));
    group.updateMatrixWorld(true);

    const opacity = op * (1 - smooth(0.15, 0.85, dive)) * (1 - hide);
    glass.material.opacity = opacity;
    glass.material.depthWrite = opacity > 0.995;
    group.visible = glass.visible = opacity > 0.01;
    glass.userData.transmissionBackdrop.visible = group.visible;
    if (!group.visible) {
      if (canvas.style.visibility !== 'hidden') canvas.style.visibility = 'hidden';
      return;
    }
    const settling = Math.abs(Math.round(spinY / QUARTER) * QUARTER - spinY) + Math.abs(spinX) > 0.002;
    const active = flight || drag || settling || Math.abs(velX) + Math.abs(velY) > 0.01
      || Math.abs(hoverTarget - hover) > 0.002 || Math.abs(pressTarget - press) > 0.002
      || Math.abs(dive - (isOpen ? 1 : 0)) > 0.002 || Math.abs(pointerX - px) + Math.abs(pointerY - py) > 0.004;
    if (now - lastRender < (active ? 14 : 42)) return;
    lastRender = now;
    crop();
    canvas.style.visibility = 'visible';
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
})();
