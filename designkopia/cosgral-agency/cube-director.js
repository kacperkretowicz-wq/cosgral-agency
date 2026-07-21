/**
 * COSGRAL V3 — cube-director: scena Three.js sterowana jednym master-timeline
 * GSAP, przypięta na #act-wrapper (akty 1-4). Patrz PLAN-PRZEBUDOWY-V3.md §3.
 *
 * Jednostki czasu w master timeline: 0..10 (arbitralne), mapowane liniowo na
 * progress ScrollTriggera 0..1 (progress * 10 = t). Tabela progów z planu:
 *   0.00-0.10 EMERGE      -> t 0-1
 *   0.10-0.20 LOGO        -> t 1-2   (hero-text-reveal gra tutaj)
 *   0.20-0.26 DISSOLVE    -> t 2-2.6
 *   0.26-0.36 PARTICLES   -> t 2.6-3.6
 *   0.36-0.42 ASSEMBLED   -> t 3.6-4.2
 *   0.42-0.54 ORBIT_R     -> t 4.2-5.4
 *   0.54-0.60 RETURN      -> t 5.4-6.0
 *   0.60-0.74 BLUR_MORPH  -> t 6.0-7.4
 *   0.74-1.00 hold/RELEASED -> t 7.4-10
 *
 * Importy three.js są DYNAMICZNE (await import(...) wewnątrz initCubeDirector) —
 * pod reduced-motion nie ma sceny 3D w ogóle, więc użytkownik nie powinien
 * płacić za pobranie ~600 kB three.js, którego nigdy nie zobaczy.
 */

// ?forceMotion=1 wymusza pełną narrację niezależnie od prefers-reduced-motion —
// wyłącznie do testów wizualnych w środowiskach, które zawsze zgłaszają "reduce"
// (np. część przeglądarek agentowych); realni użytkownicy nigdy nie dopisują tego
// parametru, więc systemowe ustawienie dostępności działa normalnie.
const REDUCED_MOTION = false;
const wrapper = document.querySelector(".act-wrapper");
const canvas = document.getElementById("cube-stage");

if (!wrapper || !canvas || REDUCED_MOTION) {
  // Reduced-motion / brak elementów: żadnej sceny 3D, żadnego pina. CSS-owy
  // fallback (patrz cosgral-v3.css @media prefers-reduced-motion) pokazuje
  // wszystkie akty statycznie, jeden pod drugim.
  if (canvas) canvas.remove();
} else {
  initCubeDirector();
}

// ─── seedowany PRNG (mulberry32) — deterministyczna rozsypka drobin ─────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function initCubeDirector() {
  const [THREE, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/loaders/DRACOLoader.js"),
  ]);

  const isMobile = window.matchMedia("(max-width: 767px)").matches;
  const PARTICLE_COUNT = isMobile ? 500 : 1200;

  // ─── renderer / scene / camera ────────────────────────────────────────
  // Twarda awaria WebGL -> degradacja do statycznego układu reduce-motion
  // (akty widoczne jeden pod drugim) + wideo sześcianu (#cube-fallback) w akcie 1.
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.warn("[cube-director] WebGL niedostępny — fallback na wideo + układ statyczny", err);
    document.documentElement.classList.add("reduce-motion");
    canvas.remove();
    const video = document.getElementById("cube-fallback");
    if (video && !REDUCED_MOTION) video.play().catch(() => {});
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  // Filmowy tone mapping — bez niego odbicia env na szkle są płaskie i gasną
  // na czarnym tle (kierunek inspo: szklany klawisz na czerni).
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 5.4);

  // Environment map — bez niego MeshPhysicalMaterial z transmission renderuje się
  // jako czarny drut na czarnym tle (szkło musi mieć CO odbijać/załamywać).
  // RoomEnvironment ma za małe źródła: przy roughness ~0.06 na czerni odbicia
  // to pojedyncze punkciki. Studio produktowe dla szkła = wielkie softboxy —
  // długie pasy światła widoczne na każdej ścianie przy niemal każdym obrocie
  // (referencja: szklane klawisze esc/hot&sweet z inspo/).
  function buildStudioEnv() {
    const env = new THREE.Scene();
    env.background = new THREE.Color(0x000000);
    const strip = (w, h, x, y, z, ry, rx, brightness) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(brightness), side: THREE.DoubleSide })
      );
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, 0);
      env.add(m);
    };
    strip(16, 3.2, 0, 6.5, 0, 0, Math.PI / 2, 7);        // szeroki pas nad sceną
    strip(3, 13, -7, 0, 2.5, Math.PI / 2.6, 0, 4);       // wysoki pas z lewej
    strip(2.4, 11, 7, 1, -1.5, -Math.PI / 2.4, 0, 2.6);  // słabszy kontrujący z prawej
    strip(10, 1.6, 0, -6, 3, 0, -Math.PI / 2.6, 1.8);    // delikatny odblask od dołu
    return env;
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(buildStudioEnv(), 0.06).texture;
  pmrem.dispose();

  const ambient = new THREE.AmbientLight(0xf5f0eb, 0);
  const key = new THREE.DirectionalLight(0xffffff, 0);
  key.position.set(3, 4, 5);
  const rim = new THREE.PointLight(0xd0d6de, 0, 8);
  rim.position.set(-2.5, -1, 2);
  scene.add(ambient, key, rim);

  const cubeGroup = new THREE.Group();
  cubeGroup.rotation.set(0.42, -0.65, 0.08);
  scene.add(cubeGroup);

  function resize() {
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ─── glb: sześcian-logo ───────────────────────────────────────────────
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://unpkg.com/three@0.163.0/examples/jsm/libs/draco/");
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  // Funkcja tworząca luksusowy materiał szklany (glassmorphism) z refrakcją
  const createGlassMaterial = (THREE) => new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.05,
    metalness: 0,           // szkło nie jest metalem — metalness gasi transmisję/odbicia
    transmission: 0.92,     // wysoka transmisja na czarnym tle = ciemne wnętrze szkła
                            // (kierunek inspo: ciemny szklany klawisz, nie mleczna kostka)
    thickness: 1.2,
    ior: 1.5,
    transparent: true,
    opacity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    specularIntensity: 1.3,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide,
    depthWrite: false,      // Zapobiega artefaktom sortowania przy przezroczystości
  });

  const addEdgeOutline = (THREE, mesh) => {
    if (!mesh) return;
    const geom = mesh.geometry || new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    });
    const lineSegments = new THREE.LineSegments(edges, lineMat);
    mesh.add(lineSegments);
  };

  let solidCube = null;
  try {
    const gltf = await loader.loadAsync("assets/cosgral-cube.glb");
    solidCube = gltf.scene;
    solidCube.traverse((o) => {
      if (o.isMesh) {
        // glb eksportuje ściany BEZ atrybutu normal (zdiagnozowane 2026-07-20:
        // 4 wierzchołki/ścianę, hasNormals=false) — bez normalnych każdy materiał
        // PBR renderuje się na czarno, niezależnie od świateł i env.
        if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
        o.material = createGlassMaterial(THREE);
        addEdgeOutline(THREE, o);
      }
    });
    cubeGroup.add(solidCube);
  } catch (err) {
    console.warn("[cube-director] nie udało się wczytać cosgral-cube.glb — fallback BoxGeometry z glass material", err);
    const glassMat = createGlassMaterial(THREE);
    solidCube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glassMat);
    addEdgeOutline(THREE, solidCube);
    cubeGroup.add(solidCube);
  }

  // ─── drobiny "szklane" (akt 2) ──────────────────────────────────────────
  const rand = mulberry32(20260720);
  const particleGeo = new THREE.TetrahedronGeometry(isMobile ? 0.05 : 0.045);
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, // biały bazowo — realny kolor (ink/accent mix) niesie instanceColor
    // UWAGA: bez vertexColors! Geometria nie ma atrybutu color, więc vertexColors:true
    // mnożyło instanceColor przez (0,0,0) — drobiny renderowały się na czarno.
    // instanceColor działa niezależnie (USE_INSTANCING_COLOR).
    transparent: true,
    opacity: 0,
    depthWrite: false, // przy opacity 0 zapis głębi wybijał czarne "dziury" w tle
  });
  const particles = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
  particles.visible = false; // włączane dopiero w oknie PARTICLES (patrz timeline)
  particles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3);
  cubeGroup.add(particles);

  const scatterPos = new Array(PARTICLE_COUNT);
  const targetPos = new Array(PARTICLE_COUNT);
  const targetRot = new Array(PARTICLE_COUNT);
  const accentMix = new Array(PARTICLE_COUNT);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // start: rozsypka w sferze
    const r = 2.2 + rand() * 2.4;
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    scatterPos[i] = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );

    // cel: punkt na jednej z 6 ścian jednostkowego sześcianu (siatka + jitter)
    const face = i % 6;
    const u = (rand() - 0.5) * 0.98;
    const v = (rand() - 0.5) * 0.98;
    const half = 0.5;
    let x, y, z;
    if (face === 0) { x = half; y = u; z = v; }
    else if (face === 1) { x = -half; y = u; z = v; }
    else if (face === 2) { y = half; x = u; z = v; }
    else if (face === 3) { y = -half; x = u; z = v; }
    else if (face === 4) { z = half; x = u; y = v; }
    else { z = -half; x = u; y = v; }
    targetPos[i] = new THREE.Vector3(x, y, z);

    targetRot[i] = new THREE.Euler(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
    accentMix[i] = rand() < 0.12 ? 1 : 0; // ~12% drobin z akcentem chromu
  }

  const _m = new THREE.Matrix4();
  const _pos = new THREE.Vector3();
  const _quat = new THREE.Quaternion();
  const _scale = new THREE.Vector3(1, 1, 1);
  const _euler = new THREE.Euler();
  const _color = new THREE.Color();
  const inkColor = new THREE.Color(0xf5f0eb);
  const accentColor = new THREE.Color(0xc8d0d8);

  function updateParticles(progress) {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      _pos.lerpVectors(scatterPos[i], targetPos[i], progress);
      _euler.set(
        targetRot[i].x * (1 - progress),
        targetRot[i].y * (1 - progress),
        targetRot[i].z * (1 - progress)
      );
      _quat.setFromEuler(_euler);
      const s = THREE.MathUtils.lerp(0.4, 1, progress);
      _scale.setScalar(s);
      _m.compose(_pos, _quat, _scale);
      particles.setMatrixAt(i, _m);
      _color.copy(inkColor).lerp(accentColor, accentMix[i] * 0.85);
      particles.setColorAt(i, _color);
    }
    particles.instanceMatrix.needsUpdate = true;
    if (particles.instanceColor) particles.instanceColor.needsUpdate = true;
  }
  updateParticles(0);
  particles.count = PARTICLE_COUNT;

  // ─── render loop — start/stop, pauza gdy karta ukryta lub poza aktem ────
  const clock = new THREE.Clock();
  // spin.speed jest scrubowany deterministycznie przez tl; rotation.y akumuluje się z
  // realnego czasu (rAF), więc NIE jest 1:1 odtwarzalna po scrollu wstecz — to celowe:
  // "dalej powoli w nieskończoność się obraca" (brief, akt 3) ma być żywą pętlą, nie
  // zablokowaną do pozycji scrolla. Wszystkie inne własności (pozycja/skala/światła/
  // drobiny) SĄ w pełni deterministyczne względem progressu.
  const spin = { speed: 0 };
  let running = false;
  let rafId = null;

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    cubeGroup.rotation.y += spin.speed * dt;
    if (particleMat.opacity > 0.001) updateParticles(particlesState.progress);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  function startLoop() {
    if (running) return;
    running = true;
    clock.getDelta();
    rafId = requestAnimationFrame(frame);
    canvas.style.display = "";
  }
  function stopLoop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopLoop();
    else if (wrapperInView) startLoop();
  });

  let wrapperInView = false;
  new IntersectionObserver((entries) => {
    wrapperInView = entries[0].isIntersecting;
    if (wrapperInView && !document.hidden) startLoop();
    else stopLoop();
  }, { threshold: 0 }).observe(wrapper);

  // ─── master timeline ─────────────────────────────────────────────────
  const particlesState = { progress: 0 };
  const acts = {
    1: document.querySelector(".act--1"),
    2: document.querySelector(".act--2"),
    3: document.querySelector(".act--3"),
    4: document.querySelector(".act--4"),
  };
  // Akt 1 jest widoczny OD PIERWSZEJ KLATKI (intro gra na load, patrz niżej) —
  // ukrywamy tylko akty 2-4. Pierwszy ekran nie może być pustą czernią.
  [acts[2], acts[3], acts[4]].forEach((el) => { if (el) gsap.set(el, { opacity: 0, visibility: "hidden" }); });
  if (acts[1]) gsap.set(acts[1], { opacity: 1, visibility: "visible" });
  if (acts[4]) gsap.set(acts[4], { pointerEvents: "none" });

  await window.heroTextReveal?.ready;

  // ─── INTRO (na load, czasowe — NIE scrub) ──────────────────────────────
  // EMERGE + LOGO + reveal wordmarku grają same po wejściu na stronę; scroll
  // przejmuje narrację dopiero od DISSOLVE (t=2.0 w scrub-timeline poniżej).
  const introLead = acts[1]?.querySelector(".act__lead");
  const introSub = acts[1]?.querySelector(".act__sub");
  if (introLead) gsap.set(introLead, { opacity: 0, y: 16 });
  if (introSub) gsap.set(introSub, { opacity: 0, y: 16 });

  const intro = gsap.timeline({ defaults: { ease: "power2.out" } });
  intro
    .fromTo(ambient, { intensity: 0 }, { intensity: 0.55, duration: 1.1 }, 0)
    .fromTo(key, { intensity: 0 }, { intensity: 1.1, duration: 1.1 }, 0)
    .fromTo(rim, { intensity: 0 }, { intensity: 0.6, duration: 1.1 }, 0)
    .fromTo(cubeGroup.scale, { x: 0.001, y: 0.001, z: 0.001 }, { x: 1, y: 1, z: 1, duration: 1.0, ease: "back.out(1.4)" }, 0)
    .fromTo(spin, { speed: 7.5 }, { speed: 0, duration: 1.3, ease: "power3.out" }, 0)
    .to(cubeGroup.rotation, { x: -0.32, duration: 1.2 }, 0);
  window.heroTextReveal?.appendToTimeline(intro, 0.9);
  if (introLead) intro.to(introLead, { opacity: 1, y: 0, duration: 0.6 }, 1.7);
  if (introSub) intro.to(introSub, { opacity: 1, y: 0, duration: 0.6 }, 1.9);

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: wrapper,
      start: "top top",
      end: "+=400%",
      pin: true,
      scrub: 1.1,
      invalidateOnRefresh: true,
      onLeave: stopLoop,
      onEnterBack: () => { wrapperInView = true; startLoop(); },
    },
  });

  const fadeActIn = (el, at, dur = 0.5) => {
    if (!el) return;
    tl.set(el, { visibility: "visible" }, at)
      .to(el, { opacity: 1, duration: dur, ease: "power2.out" }, at);
  };
  const fadeActOut = (el, at, dur = 0.4) => {
    if (!el) return;
    tl.to(el, { opacity: 0, duration: dur, ease: "power2.in" }, at)
      .set(el, { visibility: "hidden" }, at + dur);
  };

  // — EMERGE/LOGO (0 -> 2): HOLD — intro (na load, wyżej) już pokazało akt 1;
  //   scrub w tym oknie niczego nie animuje, więc powrót scrollem do góry
  //   deterministycznie odtwarza w pełni widoczny akt 1. —
  tl.to({}, { duration: 2.0 }, 0);

  // — DISSOLVE (2 -> 2.6): sześcian znika ponownie w mroku —
  fadeActOut(acts[1], 2.0, 0.4);
  tl.to(ambient, { intensity: 0, duration: 0.55, ease: "power2.in" }, 2.0)
    .to(key, { intensity: 0, duration: 0.55, ease: "power2.in" }, 2.0)
    .to(rim, { intensity: 0, duration: 0.55, ease: "power2.in" }, 2.0)
    .to(cubeGroup.scale, { x: 0.55, y: 0.55, z: 0.55, duration: 0.6, ease: "power2.in" }, 2.0);

  // — PARTICLES (2.6 -> 3.6): drobiny szklane składają się w sześcian —
  tl.set(particles, { visible: true }, 2.6)
    .to(particleMat, { opacity: 1, duration: 0.3 }, 2.65)
    .to(particlesState, { progress: 1, duration: 1.0, ease: "power2.inOut" }, 2.6);
  fadeActIn(acts[2], 3.0, 0.6);

  // — ASSEMBLED (3.6 -> 4.2): crossfade drobiny -> sześcian; start rotacji —
  tl.set(particles, { visible: false }, 4.05);
  tl.to(particleMat, { opacity: 0, duration: 0.4 }, 3.6)
    .to(ambient, { intensity: 0.5, duration: 0.4 }, 3.6)
    .to(key, { intensity: 1.05, duration: 0.4 }, 3.6)
    .to(rim, { intensity: 0.5, duration: 0.4 }, 3.6)
    .to(cubeGroup.scale, { x: 1, y: 1, z: 1, duration: 0.5, ease: "power2.out" }, 3.6)
    .to(spin, { speed: 0.55, duration: 0.6, ease: "power1.inOut" }, 3.6);
  fadeActOut(acts[2], 3.9, 0.3);

  // — ORBIT_R (4.2 -> 5.4): obrót + puls + odjazd w prawo —
  const orbitX = isMobile ? 0 : window.innerWidth * 0.0016; // world-unit-ish offset
  tl.to(cubeGroup.position, { x: orbitX, duration: 0.6, ease: "power2.inOut" }, 4.2)
    .to(spin, { speed: 0.9, duration: 0.4 }, 4.2)
    .to(cubeGroup.scale, {
      x: 1.06, y: 1.06, z: 1.06, duration: 0.5, ease: "sine.inOut", yoyo: true, repeat: 3,
    }, 4.2);
  fadeActIn(acts[3], 4.35, 0.55);

  // — RETURN (5.4 -> 6.0): sześcian wraca na środek —
  tl.to(cubeGroup.position, { x: 0, duration: 0.6, ease: "power2.inOut" }, 5.4)
    .to(spin, { speed: 0.35, duration: 0.5 }, 5.4);
  fadeActOut(acts[3], 5.55, 0.35);

  // — BLUR_MORPH (6.0 -> 7.4): rozmycie + skala + fade -> formularz —
  tl.to(canvas, { filter: "blur(26px)", duration: 0.8, ease: "power2.in" }, 6.0)
    .to(cubeGroup.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.8, ease: "power2.in" }, 6.0)
    .to(ambient, { intensity: 0, duration: 0.7 }, 6.1)
    .to(key, { intensity: 0, duration: 0.7 }, 6.1)
    .to(rim, { intensity: 0, duration: 0.7 }, 6.1)
    .to(spin, { speed: 0, duration: 0.7 }, 6.0);
  fadeActIn(acts[4], 6.35, 0.6);
  const scrollHint = document.querySelector(".act-scroll-hint");
  if (scrollHint) tl.to(scrollHint, { opacity: 0, duration: 0.4 }, 6.0);
  tl.set(acts[4], { pointerEvents: "auto" }, 7.4);
  tl.set(canvas, { display: "none" }, 7.4);

  // — hold (7.4 -> 10): normalny scroll za wrapperem —
  tl.to({}, { duration: 10 - 7.4 }, 7.4);

  startLoop();

  // Panel deweloperski — TYLKO ?debug=1, usunąć w ETAP 6 (patrz PLAN-PRZEBUDOWY-V3.md).
  if (new URLSearchParams(location.search).has("debug")) {
    window.__cubeDebug = { tl, ambient, key, rim, cubeGroup, spin, particlesState, camera, scene };
  }
}
