/**
 * COSGRAL — continuous glass camera tunnel.
 * Blender glass (ribbon, knot, arch, shards) + logo cube dissolving into
 * the baked sand sim. Scroll drives a camera flying from the hero through
 * every section to the footer. Section DOM, type, and copy stay as they are.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";
import { GLTFLoader } from "./vendor/three-addons/GLTFLoader.js";
import { MeshoptDecoder } from "./vendor/three-addons/meshopt_decoder.module.js";

(function () {
  "use strict";

  var ASSET = "assets/tunnel/";
  var qs = new URLSearchParams(location.search);
  var REDUCE =
    document.documentElement.classList.contains("reduce-motion") ||
    qs.has("reduceMotion") ||
    (!qs.has("forceMotion") && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  var canvas = document.getElementById("hero-3d");
  document.documentElement.classList.add("is-glass-tunnel");

  var MENU_OPEN_SIDE = 6.1;
  var MENU_OPEN_HERO = 5.3;
  var MENU_CLOSE_SIDE = 1.95;
  var MENU_CLOSE_HERO = 1.45;
  var MENU_LABELS_BEFORE = 1.0;
  var MENU_CUBE_DIM = 0.5;
  var MENU_LINKS_LEAD = 0.07;
  var MENU_SEG_MIN = 0.14;

  var CENTRE = new THREE.Vector3(-0.55, -0.35, 0);
  var FRONT_DIR = new THREE.Vector3(0.6214621561237835, 0.7818394867363728, -0.05011791581643416);
  var CUBE_TILT = 0.4886921905584123;
  var CUBE_SPIN0 = -0.7853981633974483;
  var CUBE_SPIN = 0.007853981633974483;
  var HERO_SCALE = MOBILE ? 0.42 : 0.5;
  var HERO_FOCUS_Z = 0.18;
  var CAM_HERO_Z = MOBILE ? 6.15 : 6.55;
  var CAM_SAND_Z = 3.35;
  var CAM_END_Z = MOBILE ? -62 : -78;
  var SIZE_SCALE = 1.05;
  var CHIP_SCALE = 0.72;
  var INTRO_DUR = MOBILE ? 2000 : 2600;

  var GLASS = {
    color: "#ffffff",
    metalness: 0,
    roughness: 0,
    transmission: 1,
    ior: 1.5,
    thickness: 0.85,
    dispersion: 0.7,
    attenuationColor: "#f6f9ff",
    attenuationDistance: 12,
    clearcoat: 1,
    clearcoatRoughness: 0,
    specularIntensity: 1,
    specularColor: "#ffffff",
    envMapIntensity: 1.8,
    edgeGlow: 0.22,
    farSideDim: 0.7,
    iridescence: 1,
    iridescenceIOR: 1.8,
    iridescenceThicknessRange: [350, 850],
    iridescenceNoise: 0.6,
    iridescenceEdgeBias: 0.65,
    exposure: 1.05,
    env: { power: 2.5, ambient: 0.02, floor: 0.06, sheen: 3.2 },
  };

  function smooth01(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function clamp01(t) {
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function stubCube() {
    window.cosgralCube = {
      introDone: function () { return true; },
      forceIntro: function () {},
      openMenu: function () { return null; },
      closeMenu: function () { return null; },
      getMenuBlend: function () { return 0; },
      getMenuOpenDuration: function () { return MENU_OPEN_HERO; },
      getMenuCloseDuration: function () { return MENU_CLOSE_HERO; },
      getMenuLinksDelay: function () { return MENU_OPEN_HERO * 0.42; },
      getMenuLabelReveal: function () { return 1; },
      getMenuFaceRect: function () { return null; },
      getMenuFaceAnchorRect: function () { return null; },
      isSideEntry: function () { return false; },
      getMenuCubeDimMul: function () { return 1; },
      group: null,
    };
  }

  function signalIntro() {
    try { window.dispatchEvent(new CustomEvent("cosgral:cube-intro-done")); } catch (e) {}
  }

  if (!canvas || typeof WebGLRenderingContext === "undefined") {
    stubCube();
    signalIntro();
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });
  } catch (err) {
    stubCube();
    signalIntro();
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = GLASS.exposure;
  renderer.localClippingEnabled = true;
  var forceFast = qs.get("glass") === "fast" || MOBILE || REDUCE;
  var forceFull = qs.get("glass") === "full";
  var quality = { transmission: forceFast && !forceFull ? 0 : 1 };
  if ("transmissionResolutionScale" in renderer) {
    renderer.transmissionResolutionScale = MOBILE ? 0.4 : 0.55;
  }

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.08, 120);
  camera.position.set(0, 0.08, CAM_HERO_Z);
  scene.add(camera);

  var glassTime = { value: 0 };
  var menuTween = { blend: 0, closing: false };
  var menuFrom = { sideEntry: false };
  var menuBlend = 0;
  var introStart = 0;
  var introDone = false;
  var introSent = false;
  var cubeMesh = null;
  var sandReady = false;
  var shapesReady = false;
  var closePass = 0;
  var lastSandFrame = -1;
  var running = true;

  function dprCap() {
    var tier = window.cosgralPerf ? window.cosgralPerf.tier : 0;
    var cap = MOBILE ? 1.1 : 1.35;
    if (tier >= 1) cap = Math.min(cap, MOBILE ? 1 : 1.15);
    if (tier >= 2) cap = 1;
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  function resize() {
    var w = window.innerWidth || 1;
    var h = window.innerHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dprCap());
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener("resize", resize);

  /* Studio env: white strips for bevels, navy + orange so the glass refracts them. */
  function buildEnv() {
    var env = new THREE.Scene();
    var P = GLASS.env;
    env.background = new THREE.Color(P.ambient, P.ambient, P.ambient);
    var plane = new THREE.PlaneGeometry(1, 1);
    function add(pos, size, power, color) {
      var m = new THREE.MeshBasicMaterial({ color: color || 0xffffff, side: THREE.DoubleSide });
      m.color.multiplyScalar(power);
      var mesh = new THREE.Mesh(plane, m);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.scale.set(size[0], size[1], 1);
      mesh.lookAt(0, 0, 0);
      env.add(mesh);
    }
    var p = P.power;
    add([0, 10, 0], [7, 7], 1.5 * p);
    add([-8, 2, 3], [1.0, 9], 3.2 * p);
    add([8, 2, -3], [1.0, 9], 3.2 * p);
    add([3, 3, 8], [5, 1.0], 2.2 * p);
    add([-4, 1, -8], [1.2, 7], 2.6 * p);
    add([-7, 1.2, 2], [3.2, 5], 2.4 * p, 0x2f4dff);
    add([6.5, 2.2, 1.5], [2.6, 4.2], 3.1 * p, 0xff4a1c);
    add([2, -1, 7], [4, 2.2], 1.6 * p, 0xff6a2b);
    add([-3, 3, -6], [3, 3], 1.4 * p, 0x13235e);
    var floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(P.floor, P.floor, P.floor) })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -6;
    env.add(floor);
    return env;
  }
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(buildEnv(), 0.04).texture;
  if ("environmentIntensity" in scene) scene.environmentIntensity = 1;
  pmrem.dispose();

  scene.add(new THREE.AmbientLight(0xf4f2ee, 0.22));
  var navyKey = new THREE.PointLight(0x2a46ff, MOBILE ? 40 : 70, 0, 2);
  navyKey.position.set(-1.7, -0.35, -2.1);
  var orangeKey = new THREE.PointLight(0xff4a1c, MOBILE ? 34 : 58, 0, 2);
  orangeKey.position.set(1.8, 0.85, -1.8);
  camera.add(navyKey);
  camera.add(orangeKey);

  var rig = new THREE.Group();
  scene.add(rig);
  var cubeHolder = new THREE.Group();
  cubeHolder.position.copy(CENTRE);
  rig.add(cubeHolder);
  var sandRoot = new THREE.Group();
  rig.add(sandRoot);
  var edgeLight = new THREE.PointLight(0xff6a2b, 0, 6, 2);
  rig.add(edgeLight);

  var localPlane = new THREE.Plane(FRONT_DIR.clone().negate(), 0);
  var worldPlane = new THREE.Plane();

  function glassMaterial(opts) {
    opts = opts || {};
    var lite = !quality.transmission;
    var uWobble = { value: opts.wobble != null ? opts.wobble : 0.036 };
    var uEdge = { value: (opts.edge != null ? opts.edge : GLASS.edgeGlow) * (lite ? 1.85 : 1) };
    var uFar = { value: GLASS.farSideDim };
    var uNoise = { value: GLASS.iridescenceNoise };
    var uIridEdge = { value: GLASS.iridescenceEdgeBias };
    var uLite = { value: lite ? 1 : 0 };
    var uAlpha = { value: opts.alpha != null ? opts.alpha : 0.62 };
    var mat = lite
      ? new THREE.MeshStandardMaterial({
          color: new THREE.Color("#f7f8ff"),
          metalness: 0.72,
          roughness: 0.045,
          envMapIntensity: 3.1,
          emissive: new THREE.Color("#10182e"),
          emissiveIntensity: 0.22,
          side: opts.side != null ? opts.side : THREE.FrontSide,
        })
      : new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(GLASS.color),
          metalness: GLASS.metalness,
          roughness: GLASS.roughness,
          transmission: GLASS.transmission,
          ior: GLASS.ior,
          thickness: GLASS.thickness,
          dispersion: opts.dispersion != null ? opts.dispersion : GLASS.dispersion,
          attenuationColor: new THREE.Color(GLASS.attenuationColor),
          attenuationDistance: GLASS.attenuationDistance,
          clearcoat: GLASS.clearcoat,
          clearcoatRoughness: GLASS.clearcoatRoughness,
          specularIntensity: GLASS.specularIntensity,
          specularColor: new THREE.Color(GLASS.specularColor),
          envMapIntensity: GLASS.envMapIntensity,
          iridescence: GLASS.iridescence,
          iridescenceIOR: GLASS.iridescenceIOR,
          iridescenceThicknessRange: GLASS.iridescenceThicknessRange.slice(),
          side: opts.side != null ? opts.side : THREE.DoubleSide,
        });
    if (lite) {
      mat.transparent = true;
      mat.depthWrite = false;
    }
    mat.userData.glassOpts = opts;
    mat.userData.isTunnelGlass = true;
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uTime = glassTime;
      sh.uniforms.uWobble = uWobble;
      sh.uniforms.uEdge = uEdge;
      sh.uniforms.uFar = uFar;
      sh.uniforms.uIridNoise = uNoise;
      sh.uniforms.uIridEdge = uIridEdge;
      sh.uniforms.uLite = uLite;
      sh.uniforms.uAlpha = uAlpha;
      sh.vertexShader = sh.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uTime;\nuniform float uWobble;\nvarying vec3 vObjN;\nvarying vec3 vViewN;\nvarying vec3 vObjP;"
        )
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nvObjN = objectNormal;\nvViewN = normalMatrix * objectNormal;\nvObjP = position;"
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n{\nfloat wn = sin(position.y * 3.15 + uTime * 1.22) * cos(position.x * 2.35 - uTime * 0.74);\nfloat wb = sin((position.x + position.z) * 4.3 + uTime * 0.88) * 0.42;\ntransformed += objectNormal * (wn + wb) * uWobble;\n}"
        );
      sh.fragmentShader = sh.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float uTime;\nuniform float uLite;\nuniform float uAlpha;\nvarying vec3 vObjN;\nvarying vec3 vViewN;\nvarying vec3 vObjP;\nuniform float uEdge;\nuniform float uFar;\nuniform float uIridNoise;\nuniform float uIridEdge;\nfloat irHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\nfloat irNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);\n  return mix(mix(mix(irHash(i), irHash(i + vec3(1,0,0)), f.x), mix(irHash(i + vec3(0,1,0)), irHash(i + vec3(1,1,0)), f.x), f.y),\n             mix(mix(irHash(i + vec3(0,0,1)), irHash(i + vec3(1,0,1)), f.x), mix(irHash(i + vec3(0,1,1)), irHash(i + vec3(1,1,1)), f.x), f.y), f.z); }"
        )
        .replace(
          "#include <lights_physical_fragment>",
          "#include <lights_physical_fragment>\n#ifdef USE_IRIDESCENCE\nif (uIridNoise > 0.0) {\n  float n = irNoise(vObjP * uIridNoise + 3.1) * 0.65 + irNoise(vObjP * uIridNoise * 2.1 + uTime * 0.07) * 0.35;\n  material.iridescenceThickness = mix(iridescenceThicknessMinimum, iridescenceThicknessMaximum, smoothstep(0.2, 0.8, n));\n}\nmaterial.iridescence *= mix(1.0 - uIridEdge, 1.0, pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), 1.5));\n#endif"
        )
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n{\n  vec3 on = normalize(vObjN);\n  float mx = max(max(abs(on.x), abs(on.y)), abs(on.z));\n  float edge = smoothstep(0.995, 0.80, mx);\n  float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.5);\n  bool farSide = dot(normalize(vViewN), normalize(vViewPosition)) < 0.0;\n  float nearFar = farSide ? uFar * 0.5 : 1.0;\n  totalEmissiveRadiance += uEdge * nearFar * edge * (0.55 + 0.9 * fres) * vec3(0.96, 0.98, 1.0);\n}"
        )
        .replace(
          "#include <dithering_fragment>",
          "#include <dithering_fragment>\nif (uLite > 0.5) {\n  float fresA = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.25);\n  gl_FragColor.a *= mix(uAlpha, 0.94, fresA);\n}"
        );
    };
    mat.customProgramCacheKey = function () {
      return lite ? "cosgral-glass-wobble-lite" : "cosgral-glass-wobble-full";
    };
    return mat;
  }

  var cubeMat = glassMaterial({
    wobble: REDUCE ? 0 : 0.016,
    edge: 0.28,
    alpha: 0.2,
    side: THREE.FrontSide,
  });
  cubeMat.clippingPlanes = [worldPlane];

  var glowTex = (function () {
    var c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    var g = c.getContext("2d");
    var rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, "rgba(255,255,255,0.95)");
    rg.addColorStop(0.28, "rgba(255,255,255,0.4)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = rg;
    g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  function makeGlow(kind) {
    var mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: kind === "orange" ? 0xff4a1c : 0x3d5bff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: kind === "orange" ? 0.32 : 0.26,
    });
    var s = new THREE.Sprite(mat);
    s.scale.set(1.55, 1.55, 1);
    s.position.set(0, 0, -0.55);
    return s;
  }

  function placeRig(cubeWorld) {
    rig.position.copy(cubeWorld).addScaledVector(CENTRE, -HERO_SCALE);
    rig.scale.setScalar(HERO_SCALE);
    rig.updateMatrixWorld(true);
  }

  function restFocus() {
    var y = 0.02 + Math.sin(glassTime.value * 0.45) * 0.02;
    /* Sand centre sits inside the cube mesh. Shift the rig so the mesh, not the sim origin, meets the wordmark. */
    return new THREE.Vector3(CENTRE.x * HERO_SCALE, y + CENTRE.y * HERO_SCALE, HERO_FOCUS_Z);
  }

  function introWorld(p) {
    var e = 1 - Math.pow(1 - clamp01(p), 2.55);
    var ang = (1 - e) * Math.PI * 1.65;
    var rad = (1 - e) * (MOBILE ? 1.35 : 1.85);
    var rest = restFocus();
    return new THREE.Vector3(
      Math.cos(ang) * rad,
      -1.05 * (1 - e) + Math.sin(ang) * rad * 0.35 + rest.y * e,
      lerp(-9.2, rest.z, e)
    );
  }

  /* Section beats. Ribbon and knot lead; prism is a rare distant accent. */
  var BEATS = [
    { id: "uslugi", key: "ribbon", mode: "sweep", x: -0.2, y: 0.04, s: 0.7, lead: 2.0, sweep: -2.3, spin: 0.35, mobile: true, glow: "navy", anchor: 0.08 },
    { id: "uslugi", key: "knot", mode: "spiral", x: 1.2, y: -0.12, s: 0.46, lead: 0.55, spin: -0.28, mobile: true, glow: "orange", anchor: 0.62 },
    { id: "realizacje", key: "ribbon", mode: "spiral", x: -1.05, y: 0.08, s: 0.58, lead: 1.7, spin: 0.42, mobile: false, glow: "orange", anchor: 0.12 },
    { id: "realizacje", key: "shards", mode: "spin", x: 1.2, y: 0.22, s: 0.5, lead: 0.45, spin: 0.55, mobile: true, glow: "navy", anchor: 0.55 },
    { id: "faq", key: "knot", mode: "sweep", x: 0.95, y: 0.0, s: 0.64, lead: 1.9, sweep: 2.5, spin: 0.22, mobile: true, glow: "navy", anchor: 0.1 },
    { id: "faq", key: "ribbon", mode: "spiral", x: -1.15, y: -0.1, s: 0.4, lead: 0.4, spin: -0.4, mobile: false, glow: "orange", anchor: 0.68 },
    { id: "proces", key: "arch", mode: "pass", x: 0.05, y: 0.02, s: 0.58, lead: 1.55, passFrom: -1.7, passTo: 1.85, spin: 0.18, mobile: true, glow: "orange", anchor: 0.08 },
    { id: "proces", key: "knot", mode: "spiral", x: 1.15, y: 0.16, s: 0.38, lead: 0.35, spin: 0.33, mobile: false, glow: "navy", anchor: 0.62 },
    { id: "kontakt", key: "ribbon", mode: "pass", x: 0.15, y: 0.0, s: 0.66, lead: 2.1, passFrom: 1.7, passTo: -1.65, spin: -0.3, mobile: true, glow: "navy", anchor: 0.08 },
    { id: "kontakt", key: "arch", mode: "sweep", x: -0.95, y: -0.06, s: 0.48, lead: 0.5, sweep: -1.7, spin: 0.2, mobile: true, glow: "orange", anchor: 0.58 },
    { id: "kontakt", key: "prism", mode: "spin", x: 1.3, y: 0.4, s: 0.26, lead: 1.0, spin: 0.6, mobile: false, glow: "orange", anchor: 0.35 },
  ];

  var actors = [];
  var templates = {};

  function spawnBeat(beat) {
    var src = templates[beat.key];
    if (!src || beat.spawned) return;
    beat.spawned = true;
    var obj = src.clone(true);
    var mat = glassMaterial({
      wobble: REDUCE ? 0 : beat.key === "prism" ? 0.02 : 0.04,
      dispersion: beat.key === "prism" ? 1.6 : GLASS.dispersion,
      edge: beat.key === "shards" ? 0.32 : 0.2,
      alpha: 0.58,
    });
    obj.traverse(function (o) {
      if (!o.isMesh) return;
      o.material = mat;
      o.frustumCulled = false;
      o.castShadow = false;
    });
    var glow = makeGlow(beat.glow);
    obj.add(glow);
    obj.visible = false;
    scene.add(obj);
    actors.push({ obj: obj, beat: beat, glow: glow, phase: Math.random() * 6.28 });
  }

  var loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  function loadInto(url, onMesh, onFail) {
    loader.load(url, function (gltf) {
      onMesh(gltf.scene);
    }, undefined, function (err) {
      var msg = err && (err.message || err.type || err);
      console.error("GLB load failed", url, msg);
      if (onFail) onFail(err);
    });
  }

  loadInto(ASSET + "cube_web.glb", function (root) {
    root.traverse(function (o) {
      if (!o.isMesh) return;
      o.material = cubeMat;
      o.frustumCulled = false;
      cubeMesh = o;
    });
    cubeHolder.add(root);
  });

  function loadShape(key) {
    if (REDUCE) return;
    loadInto(ASSET + "glass/" + key + "_web.glb", function (root) {
      templates[key] = root;
      BEATS.forEach(function (beat) {
        if (beat.key === key && (beat.mobile || !MOBILE)) spawnBeat(beat);
      });
      shapesReady = true;
      layoutActors();
    });
  }

  var keys = MOBILE ? ["ribbon", "knot", "arch", "shards"] : ["ribbon", "knot", "arch", "shards", "prism"];
  function loadShapes() {
    var i = 0;
    function next() {
      if (i >= keys.length) return;
      var key = keys[i++];
      loadInto(ASSET + "glass/" + key + "_web.glb", function (root) {
        templates[key] = root;
        BEATS.forEach(function (beat) {
          if (beat.key === key && (beat.mobile || !MOBILE)) spawnBeat(beat);
        });
        shapesReady = true;
        layoutActors();
        next();
      }, function () { next(); });
    }
    next();
  }

  /* Sand ---------------------------------------------------------------- */
  var POS, REL, SIZE, sandMeshes;
  var _m = new THREE.Matrix4();
  var _q = new THREE.Quaternion();
  var _pv = new THREE.Vector3();
  var _sv = new THREE.Vector3();
  var _eu = new THREE.Euler();
  var FRONT_VALUES = null;
  var SAND_LAST = 48;
  var SAND_STEP = 4;
  var SAND_N = 8000;

  function halfFloats(buf, view) {
    var u = new Uint16Array(buf, view.byteOffset, view.byteLength / 2);
    var o = new Float32Array(u.length);
    for (var i = 0; i < u.length; i++) o[i] = THREE.DataUtils.fromHalfFloat(u[i]);
    return o;
  }

  function buildSand(meta, bin, geometries) {
    var buffers = {};
    meta.buffers.forEach(function (b) { buffers[b.name] = b; });
    POS = halfFloats(bin, buffers.positions);
    REL = halfFloats(bin, buffers.release);
    SIZE = halfFloats(bin, buffers.size);
    var variant = new Uint8Array(bin, buffers.variant.byteOffset, meta.count);
    FRONT_VALUES = meta.front.values;
    SAND_N = meta.count;
    SAND_LAST = meta.keyframes[meta.keyframes.length - 1];
    SAND_STEP = meta.keyframes[1] - meta.keyframes[0];
    if (meta.cube) {
      CENTRE.set(meta.cube.centre[0], meta.cube.centre[1], meta.cube.centre[2]);
      cubeHolder.position.copy(CENTRE);
    }

    var tier = window.cosgralPerf ? window.cosgralPerf.tier : 0;
    /* Full desktop keeps every grain. The reflective fallback and phones draw a subset. */
    var step = MOBILE ? 5 : !quality.transmission ? 4 : tier >= 2 ? 4 : tier >= 1 ? 2 : 1;
    var groups = { 0: [], 1: [], 2: [], 3: [], 8: [] };
    for (var i = 0; i < variant.length; i++) {
      if (variant[i] !== 8 && i % step !== 0) continue;
      if (MOBILE && variant[i] === 8 && i % 2 !== 0) continue;
      if (groups[variant[i]]) groups[variant[i]].push(i);
    }

    var sandMat = new THREE.MeshStandardMaterial({
      color: 0xe6e0d6,
      roughness: 0.62,
      metalness: 0.04,
      emissive: 0x4a4036,
      emissiveIntensity: 0.45,
      vertexColors: true,
    });
    var chipMat = quality.transmission
      ? new THREE.MeshPhysicalMaterial({
          color: 0xf7f4ef,
          transmission: 1,
          roughness: 0.04,
          ior: 1.5,
          thickness: 0.04,
          iridescence: 0.85,
          iridescenceIOR: 1.5,
          iridescenceThicknessRange: [280, 620],
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          envMapIntensity: 1.4,
        })
      : new THREE.MeshStandardMaterial({
          color: 0xf3efe8,
          roughness: 0.32,
          metalness: 0.06,
          envMapIntensity: 1.1,
        });

    sandMeshes = [];
    function addMesh(indices, geo, mat, mul) {
      if (!indices.length || !geo) return;
      var im = new THREE.InstancedMesh(geo, mat, indices.length);
      im.frustumCulled = false;
      im.userData.idx = indices;
      im.userData.mul = mul;
      var col = new THREE.Color();
      for (var j = 0; j < indices.length; j++) {
        var gi = indices[j];
        var roll = (gi * 0.173) % 1;
        var lit = 0.7 + 0.22 * ((gi * 0.618033988) % 1);
        var hue = 0.08;
        var sat = 0.05;
        if (roll > 0.84) { hue = 0.04; sat = 0.55; lit = Math.min(0.78, lit); }
        else if (roll > 0.7) { hue = 0.64; sat = 0.42; lit = Math.min(0.62, lit); }
        col.setHSL(hue, sat, lit);
        im.setColorAt(j, col);
      }
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      sandRoot.add(im);
      sandMeshes.push(im);
      return im;
    }

    var geos = geometries;
    addMesh(groups[0], geos[0], sandMat, SIZE_SCALE);
    addMesh(groups[1], geos[1], sandMat, SIZE_SCALE);
    addMesh(groups[2], geos[2], sandMat, SIZE_SCALE);
    addMesh(groups[3], geos[3], sandMat, SIZE_SCALE);
    var chipMesh = addMesh(groups[8], geos[8], chipMat, CHIP_SCALE);
    if (chipMesh) chipMesh.userData.sandChip = true;
    sandReady = true;
    writeSand(0);
  }

  function writeSand(frame) {
    if (!sandMeshes) return;
    var f = Math.max(0, Math.min(SAND_LAST, frame));
    var k = Math.min(Math.floor(f / SAND_STEP), Math.floor(SAND_LAST / SAND_STEP) - 1);
    if (k < 0) k = 0;
    var t = (f - k * SAND_STEP) / SAND_STEP;
    for (var m = 0; m < sandMeshes.length; m++) {
      var im = sandMeshes[m];
      var idx = im.userData.idx;
      var mul = im.userData.mul;
      for (var j = 0; j < idx.length; j++) {
        var i = idx[j];
        var a = (k * SAND_N + i) * 3;
        var b = ((k + 1) * SAND_N + i) * 3;
        var age = f - REL[i];
        var grow = clamp01((age + 0.35) / 1.5);
        var s = SIZE[i] * mul * grow;
        if (s < 0.00004) {
          _pv.set(0, -40, 0);
          _sv.set(0, 0, 0);
        } else {
          _pv.set(
            POS[a] + (POS[b] - POS[a]) * t,
            POS[a + 1] + (POS[b + 1] - POS[a + 1]) * t,
            POS[a + 2] + (POS[b + 2] - POS[a + 2]) * t
          );
          _eu.set(i * 1.17 + age * 0.12, i * 2.03 + age * 0.08, i * 0.67);
          _q.setFromEuler(_eu);
          _sv.set(s, s, s);
        }
        if (s >= 0.00004) _m.compose(_pv, _q, _sv);
        else _m.compose(_pv, _q, _sv);
        im.setMatrixAt(j, _m);
      }
      im.instanceMatrix.needsUpdate = true;
    }
    lastSandFrame = f;
  }

  function loadSand() {
    if (REDUCE) return;
    var metaP = fetch(ASSET + "sand/sand_points.json").then(function (r) { return r.json(); });
    var binP = fetch(ASSET + "sand/sand_points.bin").then(function (r) { return r.arrayBuffer(); });
    var geoP = new Promise(function (resolve) {
      loader.load(ASSET + "sand/sand_grains.glb", function (gltf) {
        var map = {};
        gltf.scene.traverse(function (o) {
          if (!o.isMesh) return;
          var name = o.name || "";
          var geo = o.geometry;
          if (name.indexOf("chip") === 0) map[8] = geo;
          else if (name.indexOf("grain_") === 0) {
            var n = parseInt(name.split("_")[1], 10);
            if (n === n) map[n] = geo;
          }
        });
        resolve(map);
      }, undefined, function () { resolve({}); });
    });
    Promise.all([metaP, binP, geoP]).then(function (all) {
      try { buildSand(all[0], all[1], all[2]); }
      catch (err) { console.error("sand build", err && err.stack ? err.stack : err); sandReady = false; }
    }).catch(function (err) { console.error("sand fetch", err && err.stack ? err.stack : err); sandReady = false; });
  }

  /* Scroll layout ------------------------------------------------------- */
  var layout = { tunnelStart: 0, max: 1 };
  var layoutStamp = { max: -1, start: -1 };

  function scrollY() {
    var lenis = window.cosgralSmoothScroll && window.cosgralSmoothScroll.lenis;
    if (lenis && typeof lenis.scroll === "number") return lenis.scroll;
    return window.scrollY || window.pageYOffset || 0;
  }

  function readScroll() {
    var y = scrollY();
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var heroP = 0;
    var sandP = 0;
    var tunnelStart = window.innerHeight * 1.7;
    if (window.ScrollTrigger) {
      var heroSt = ScrollTrigger.getById("hero-pin");
      var sandSt = ScrollTrigger.getById("shatter-beat");
      if (heroSt) heroP = heroSt.progress || 0;
      if (sandSt && isFinite(sandSt.start) && isFinite(sandSt.end) && sandSt.end > sandSt.start) {
        sandP = clamp01((y - sandSt.start) / (sandSt.end - sandSt.start));
        tunnelStart = sandSt.end;
      }
    }
    if (!sandP && window.cosgralSand && typeof window.cosgralSand.cinema === "number") {
      sandP = clamp01(window.cosgralSand.cinema);
    }
    var tunnelP = clamp01((y - tunnelStart) / Math.max(1, max - tunnelStart));
    layout.tunnelStart = tunnelStart;
    layout.max = max;
    return { y: y, heroP: heroP, sandP: sandP, tunnelP: tunnelP, max: max, tunnelStart: tunnelStart };
  }

  function cameraZFor(tunnelP) {
    return lerp(CAM_SAND_Z, CAM_END_Z, clamp01(tunnelP));
  }

  function layoutActors() {
    var sc = readScroll();
    BEATS.forEach(function (beat) {
      var el = document.getElementById(beat.id);
      if (!el) {
        beat.z = cameraZFor(0.2) - beat.lead;
        return;
      }
      var top = el.getBoundingClientRect().top + sc.y;
      var anchorY = top + el.offsetHeight * (beat.anchor || 0);
      var p = clamp01((anchorY - sc.tunnelStart) / Math.max(1, sc.max - sc.tunnelStart));
      beat.z = cameraZFor(p) - beat.lead;
    });
    layoutStamp.max = sc.max;
    layoutStamp.start = sc.tunnelStart;
  }

  if (window.ScrollTrigger) {
    ScrollTrigger.addEventListener("refresh", layoutActors);
  }
  window.addEventListener("load", function () {
    window.setTimeout(layoutActors, 400);
  });

  /* Menu API ------------------------------------------------------------- */
  var _box = new THREE.Box3();
  var _corner = new THREE.Vector3();
  var _proj = new THREE.Vector3();
  var _menuWorld = new THREE.Vector3();
  var _viewDir = new THREE.Vector3();
  var _faceQuat = new THREE.Quaternion();

  function menuLabelsAt(openDur) {
    return Math.max(0, (openDur - MENU_LABELS_BEFORE) / openDur);
  }
  function getMenuLabelReveal() {
    if (menuBlend <= 0.001) return 0;
    if (menuFrom.sideEntry) {
      if (menuTween.closing) return 0;
      if (menuBlend < 0.72) return 0;
      return smooth01(0.72, 0.92, menuBlend);
    }
    if (menuBlend < 0.35) return 0;
    return smooth01(0.35, 0.72, menuBlend);
  }
  function getMenuLinksDelay() {
    if (menuFrom.sideEntry) return MENU_OPEN_SIDE * 0.128;
    return MENU_OPEN_HERO * 0.42 + MENU_LINKS_LEAD;
  }
  function getMenuFaceRect() {
    if (menuBlend < 0.04 || !cubeMesh) return null;
    cubeMesh.updateWorldMatrix(true, false);
    _box.setFromObject(cubeMesh);
    if (_box.isEmpty()) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var xs = [_box.min.x, _box.max.x];
    var ys = [_box.min.y, _box.max.y];
    var zs = [_box.min.z, _box.max.z];
    for (var ix = 0; ix < 2; ix++) {
      for (var iy = 0; iy < 2; iy++) {
        for (var iz = 0; iz < 2; iz++) {
          _corner.set(xs[ix], ys[iy], zs[iz]);
          _proj.copy(_corner).project(camera);
          var sx = (_proj.x * 0.5 + 0.5) * window.innerWidth;
          var sy = (-_proj.y * 0.5 + 0.5) * window.innerHeight;
          if (sx < minX) minX = sx;
          if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy;
          if (sy > maxY) maxY = sy;
        }
      }
    }
    var size = Math.min(maxX - minX, maxY - minY) * 0.92;
    return { x: (minX + maxX) * 0.5, y: (minY + maxY) * 0.5, size: size };
  }

  function prepareMenu() {
    var idx = window.cosgralSectionSnap && window.cosgralSectionSnap.getIndex ? window.cosgralSectionSnap.getIndex() : 0;
    menuFrom.sideEntry = idx > 0;
  }

  window.cosgralCube = {
    group: cubeHolder,
    introDone: function () { return introDone || REDUCE; },
    forceIntro: function () { introStart = performance.now() - INTRO_DUR; },
    getMenuFaceRect: getMenuFaceRect,
    getMenuFaceAnchorRect: function () { return null; },
    getMenuBlend: function () { return menuBlend; },
    isSideEntry: function () { return menuFrom.sideEntry; },
    getMenuOpenDuration: function () { return menuFrom.sideEntry ? MENU_OPEN_SIDE : MENU_OPEN_HERO; },
    getMenuCloseDuration: function () { return menuFrom.sideEntry ? MENU_CLOSE_SIDE : MENU_CLOSE_HERO; },
    getMenuLinksDelay: getMenuLinksDelay,
    getMenuLabelReveal: getMenuLabelReveal,
    getMenuCubeDimMul: function () { return 1 - getMenuLabelReveal() * MENU_CUBE_DIM; },
    openMenu: function () {
      if (menuTween.blend < 0.02) prepareMenu();
      menuTween.closing = false;
      var openDur = menuFrom.sideEntry ? MENU_OPEN_SIDE : MENU_OPEN_HERO;
      var remaining = Math.max(MENU_SEG_MIN, openDur * (1 - menuTween.blend));
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, { blend: 1, duration: remaining, ease: "power3.out" });
      }
      menuTween.blend = 1;
      return null;
    },
    closeMenu: function () {
      menuTween.closing = true;
      var closeDur = menuFrom.sideEntry ? MENU_CLOSE_SIDE : MENU_CLOSE_HERO;
      var remaining = Math.max(MENU_SEG_MIN, closeDur * menuTween.blend);
      if (window.gsap) {
        gsap.killTweensOf(menuTween);
        return gsap.to(menuTween, {
          blend: 0,
          duration: remaining,
          ease: "power3.out",
          onComplete: function () {
            menuFrom.sideEntry = false;
            menuTween.closing = false;
          },
        });
      }
      menuTween.blend = 0;
      return null;
    },
  };

  try { window.dispatchEvent(new CustomEvent("cosgral:cube-ready")); } catch (eReady) {}

  if (REDUCE) {
    introDone = true;
    document.body.classList.add("is-hero-intro-done");
    signalIntro();
    introSent = true;
    placeRig(restFocus());
    cubeHolder.rotation.set(CUBE_TILT, CUBE_SPIN0, 0);
  }

  function kickLoads() {
    if (REDUCE) return;
    var run = function () {
      loadSand();
      loadShapes();
    };
    if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 900 });
    else window.setTimeout(run, 280);
  }
  kickLoads();

  /* Frame ---------------------------------------------------------------- */
  var clock = new THREE.Clock();
  var camZ = CAM_HERO_Z;
  var camX = 0;
  var camY = 0.08;
  var _look = new THREE.Vector3();

  function frontValue(frame) {
    if (!FRONT_VALUES || !FRONT_VALUES.length) {
      return lerp(1.75, -1.75, clamp01(frame / 48));
    }
    var f = Math.max(0, Math.min(FRONT_VALUES.length - 1, frame));
    var i = Math.floor(f);
    var n = Math.min(FRONT_VALUES.length - 1, i + 1);
    return lerp(FRONT_VALUES[i], FRONT_VALUES[n], f - i);
  }

  function updatePlane(frame) {
    var fv = frontValue(frame);
    localPlane.normal.copy(FRONT_DIR).negate();
    localPlane.constant = fv + CENTRE.dot(FRONT_DIR);
    rig.updateMatrixWorld(true);
    worldPlane.copy(localPlane).applyMatrix4(rig.matrixWorld);
    edgeLight.position.copy(CENTRE).addScaledVector(FRONT_DIR, fv);
    var hot = sandReady && frame > 1 && frame < 46;
    edgeLight.intensity = hot ? (MOBILE ? 6 : 12) * smooth01(0, 6, frame) * (1 - smooth01(40, 48, frame)) : 0;
  }

  function updateActors(sc, time) {
    closePass = 0;
    var menuHide = menuBlend > 0.08;
    var heroClear = camZ > CAM_SAND_Z + 0.2;
    var ranked = [];
    for (var i = 0; i < actors.length; i++) {
      var a = actors[i];
      var dz = camZ - (a.beat.z || -80);
      /* Approach from deep in the tunnel, hold through the section, then slip behind. */
      var vis = heroClear || menuHide || REDUCE ? 0 : smooth01(13.5, 7.2, dz) * (1 - smooth01(0.85, -1.7, dz));
      a._dz = dz;
      a._vis = vis;
      if (vis > 0.05) ranked.push(a);
    }
    ranked.sort(function (p, q) {
      return Math.abs(p._dz - 2.4) - Math.abs(q._dz - 2.4);
    });
    var keep = MOBILE || !quality.transmission ? 1 : 2;
    for (var n = 0; n < actors.length; n++) {
      var actor = actors[n];
      var b = actor.beat;
      var dz = actor._dz;
      var vis = actor._vis;
      var allowed = vis > 0.05 && ranked.indexOf(actor) < keep;
      actor.obj.visible = allowed;
      if (!allowed) continue;
      var x = b.x;
      var y = b.y;
      var z = b.z;
      var u = 1 - clamp01((dz + 0.6) / 12);
      if (b.mode === "sweep") {
        x = b.x + (1 - u) * (b.sweep || -2.4);
        y = b.y + Math.sin(time * 0.6 + actor.phase) * 0.12;
      } else if (b.mode === "spiral") {
        var ang = time * 0.42 + actor.phase + dz * 0.22;
        var rad = 0.38 + Math.min(1.7, Math.abs(dz) * 0.12);
        x = b.x + Math.cos(ang) * rad;
        y = b.y + Math.sin(ang * 0.85) * rad * 0.62;
      } else if (b.mode === "pass") {
        var pu = 1 - clamp01((dz + 0.8) / 8);
        x = lerp(b.passFrom || -2, b.passTo || 2, pu);
        if (dz > 0.15 && dz < 2.6) z = camZ - (MOBILE ? 3.6 : 3.15);
      } else {
        y = b.y + Math.sin(time * 0.5 + actor.phase) * 0.1;
      }
      /* Stay beside the section while the camera travels through it, then fall behind. */
      var escort = smooth01(9.2, 4.4, dz) * (1 - smooth01(0.35, -3.4, dz));
      if (escort > 0.001 && b.mode !== "pass") {
        var side = b.x < 0 ? -1 : 1;
        if (Math.abs(b.x) < 0.2) side = (b.sweep || -1) < 0 ? -1 : 1;
        x = lerp(x, side * (MOBILE ? 0.82 : 1.12), escort);
        z = lerp(z, camZ - (MOBILE ? 4.5 : 4.05), escort);
      }
      if (dz > 0.7 && dz < 2.15) {
        closePass = Math.max(closePass, 1 - Math.abs(dz - 1.35) / 0.85);
      }
      actor.obj.position.set(x, y, z);
      var breathe = 1 + Math.sin(time * 0.85 + actor.phase) * (REDUCE ? 0 : 0.028);
      var distScale = 0.82 + 0.18 * vis;
      actor.obj.scale.setScalar(b.s * breathe * distScale);
      actor.obj.rotation.y = time * b.spin + actor.phase;
      actor.obj.rotation.x = Math.sin(time * 0.37 + actor.phase) * 0.35;
      actor.obj.rotation.z = Math.cos(time * 0.29 + actor.phase) * 0.22;
      if (actor.glow && actor.glow.material) {
        actor.glow.material.opacity = (b.glow === "orange" ? 0.62 : 0.5) * (0.45 + 0.55 * vis);
      }
    }
    document.documentElement.classList.toggle("is-tunnel-pass", closePass > 0.42 && menuBlend < 0.05);
  }

  var frameSamples = [];
  var degraded = quality.transmission === 0;
  var framesSeen = 0;
  var slowFrames = 0;
  function degradeGlass() {
    if (degraded || forceFull) return;
    degraded = true;
    quality.transmission = 0;
    scene.traverse(function (o) {
      if (!o.isMesh || !o.material || !o.material.isMeshPhysicalMaterial) return;
      var prev = o.material;
      var next;
      if (o.userData.sandChip) {
        next = new THREE.MeshStandardMaterial({
          color: 0xf3efe8,
          roughness: 0.32,
          metalness: 0.06,
          envMapIntensity: 1.1,
        });
      } else if (prev.userData.isTunnelGlass) {
        next = glassMaterial(prev.userData.glassOpts || {});
        if (prev.clippingPlanes && prev.clippingPlanes.length) next.clippingPlanes = prev.clippingPlanes;
      } else {
        prev.transmission = 0;
        prev.iridescence = 0;
        prev.needsUpdate = true;
        return;
      }
      o.material = next;
      prev.dispose();
    });
    cubeMat = cubeMesh && cubeMesh.material && cubeMesh.material.userData.isTunnelGlass ? cubeMesh.material : cubeMat;
  }

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    var dt = Math.min(0.05, clock.getDelta());
    if (!degraded && !forceFull && !REDUCE) {
      framesSeen++;
      /* Ignore the first frames — shader compile is a one-time hitch on fast GPUs. */
      if (framesSeen > 18) {
        if (dt > 0.034) slowFrames++;
        else slowFrames = Math.max(0, slowFrames - 1);
        if (slowFrames >= 6) degradeGlass();
      }
    }
    var time = clock.elapsedTime;
    glassTime.value = REDUCE ? 0 : time;
    menuBlend = menuTween.blend;

    if (!REDUCE && !introStart && document.body.classList.contains("is-ready")) {
      introStart = performance.now();
    }
    if (!REDUCE && !introStart && performance.now() > 4000) introStart = performance.now();

    var sc = readScroll();
    var introP = introStart ? clamp01((performance.now() - introStart) / INTRO_DUR) : 0;
    if (sc.y > 8) introP = 1;
    if (introP >= 1 && !introSent) {
      introDone = true;
      introSent = true;
      signalIntro();
    }

    var targetZ = CAM_HERO_Z - Math.min(1, sc.heroP) * 0.4;
    if (sc.sandP > 0.001) targetZ = lerp(CAM_HERO_Z - 0.35, CAM_SAND_Z, sc.sandP);
    if (sc.tunnelP > 0.0008) targetZ = cameraZFor(sc.tunnelP);
    if (REDUCE) targetZ = CAM_HERO_Z;

    var sway = REDUCE ? 0 : sc.tunnelP;
    var targetX = Math.sin(sway * Math.PI * 2.0) * (MOBILE ? 0.12 : 0.28);
    var targetY = 0.06 + Math.sin(sway * Math.PI) * 0.16;
    var ptr = window.cosgralPointer;
    if (ptr && sc.sandP < 0.04 && sc.tunnelP < 0.01 && menuBlend < 0.02 && !REDUCE) {
      targetX += (ptr.nx || 0) * 0.12;
      targetY += (ptr.ny || 0) * 0.06;
    }
    var damp = 1 - Math.pow(0.001, dt);
    camZ += (targetZ - camZ) * damp;
    camX += (targetX - camX) * damp;
    camY += (targetY - camY) * damp;
    camera.position.set(camX, camY, camZ);
    _look.set(camX * 0.25, camY * 0.35 - 0.02, camZ - 7.5);
    if (menuBlend < 0.2) camera.lookAt(_look);

    var frameSand = sc.sandP * SAND_LAST;
    if (REDUCE) frameSand = 0;

    var cubeWorld;
    if (REDUCE || introP >= 1) cubeWorld = restFocus();
    else cubeWorld = introWorld(introP);
    if (sc.sandP > 0.02) {
      cubeWorld = restFocus();
      cubeWorld.x += sc.sandP * 0.15;
      cubeWorld.y += sc.sandP * 0.08;
    }
    if (menuBlend < 0.001) placeRig(cubeWorld);

    var spinExtra = (1 - introP) * 1.8 + (REDUCE ? 0 : Math.sin(time * 0.33) * 0.06 * (1 - sc.sandP));
    var holderPos = CENTRE.clone();
    var holderScale = 1 + Math.sin(time * 0.8) * (REDUCE ? 0 : 0.012);
    if (menuBlend > 0.001) {
      camera.getWorldDirection(_viewDir);
      _menuWorld.copy(camera.position).addScaledVector(_viewDir, MOBILE ? 3.05 : 3.35);
      rig.worldToLocal(_menuWorld);
      holderPos.copy(CENTRE).lerp(_menuWorld, smooth01(0, 1, menuBlend));
      holderScale = lerp(holderScale, 1, menuBlend);
      _faceQuat.copy(camera.quaternion);
      cubeHolder.quaternion.slerp(_faceQuat, smooth01(0.05, 0.7, menuBlend));
    }
    cubeHolder.position.copy(holderPos);
    if (menuBlend < 0.05) {
      cubeHolder.rotation.set(CUBE_TILT, CUBE_SPIN0 + CUBE_SPIN * frameSand + spinExtra, Math.sin(time * 0.27) * 0.04 * (1 - menuBlend));
    }
    cubeHolder.scale.setScalar(holderScale);

    updatePlane(frameSand);
    var diving = sc.tunnelP > 0.012 || camZ < 2.55;
    var showSand = sandReady && menuBlend < 0.12 && frameSand > 0.35 && frameSand < 47.2 && !diving && !REDUCE;
    sandRoot.visible = showSand;
    if (showSand && Math.abs(frameSand - lastSandFrame) > 0.035) writeSand(frameSand);
    if (cubeHolder) {
      cubeHolder.visible = menuBlend > 0.02 || (!diving && sc.sandP < 0.9);
    }

    if (Math.abs(sc.max - layoutStamp.max) > 80 || Math.abs(sc.tunnelStart - layoutStamp.start) > 40) {
      layoutActors();
    }
    updateActors(sc, time);

    if (menuBlend > 0.15) {
      actors.forEach(function (a) { a.obj.visible = false; });
      sandRoot.visible = false;
    }

    var blurPx = !MOBILE && !REDUCE && !degraded && closePass > 0.5 && menuBlend < 0.05 ? (closePass - 0.5) * 2.2 : 0;
    canvas.style.filter = blurPx > 0.2 ? "blur(" + blurPx.toFixed(2) + "px)" : "";

    renderer.info.reset();
    var tRender = performance.now();
    renderer.render(scene, camera);
    var renderMs = performance.now() - tRender;
    window.__tunnel = {
      calls: renderer.info.render.calls,
      tris: renderer.info.render.triangles,
      renderMs: Math.round(renderMs),
      actors: actors.length,
      keys: Object.keys(templates),
      sand: !!sandReady,
      cube: !!cubeMesh,
      transmission: quality.transmission,
      camZ: Math.round(camZ * 10) / 10,
      pass: Math.round(closePass * 100) / 100,
      frame: Math.round(frameSand * 10) / 10,
      beats: BEATS.map(function (b) {
        return b.key + "@" + Math.round((b.z || 0) * 10) / 10 + (b.spawned ? "" : "?");
      }),
      scroll: {
        y: Math.round(sc.y),
        heroP: Math.round(sc.heroP * 100) / 100,
        sandP: Math.round(sc.sandP * 100) / 100,
        tunnelP: Math.round(sc.tunnelP * 1000) / 1000,
        start: Math.round(sc.tunnelStart),
        max: Math.round(sc.max),
      },
    };
  }

  requestAnimationFrame(frame);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) clock.getDelta();
  });
})();
