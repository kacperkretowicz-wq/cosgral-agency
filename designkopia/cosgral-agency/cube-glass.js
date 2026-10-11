/**
 * Phone-viewer glass (web_glass.json + the szescian viewer shader) on the
 * grooved cube. The page line field is sampled only in the transmission
 * pre-pass; #home-ambient stays the visible background.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js?v=20261011viewer";

var spec = {
  color: "#ffffff",
  metalness: 0,
  roughness: 0,
  transmission: 1,
  ior: 1.5,
  thickness: 1.5,
  dispersion: 0.5,
  attenuationColor: "#ffffff",
  attenuationDistance: 1000,
  clearcoat: 1,
  clearcoatRoughness: 0,
  specularIntensity: 1,
  specularColor: "#ffffff",
  envMapIntensity: 3,
  edgeGlow: 0.2,
  farSideDim: 0.7,
  side: "double",
  exposure: 1.2,
  iridescence: 1,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 800],
  iridescenceNoise: 0.6,
  iridescenceEdgeBias: 0.2,
  env: { power: 2.5, ambient: 0.16, floor: 0.06, sheen: 4 },
};

var specPromise = null;

function num(value, fallback) {
  return typeof value === "number" && isFinite(value) ? value : fallback;
}

export function whenGlassSpec() {
  if (!specPromise) {
    specPromise = fetch(new URL("./assets/cube/web_glass.json?v=20261011viewer", import.meta.url))
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then(function (json) {
        spec = Object.assign({}, spec, json);
        return spec;
      })
      .catch(function (err) {
        console.warn("[cube-look] web_glass.json", err);
        return spec;
      });
  }
  return specPromise;
}

export function createGlassMaterial() {
  var range = spec.iridescenceThicknessRange || [100, 800];
  var edgeBias = Math.min(0.92, Math.max(0, num(spec.iridescenceEdgeBias, 0.2)));
  var edgeGlow = num(spec.edgeGlow, 0.2);
  var mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.color || "#ffffff"),
    metalness: num(spec.metalness, 0),
    roughness: num(spec.roughness, 0),
    transmission: num(spec.transmission, 1),
    ior: num(spec.ior, 1.5),
    thickness: num(spec.thickness, 1.5),
    attenuationColor: new THREE.Color(spec.attenuationColor || "#ffffff"),
    attenuationDistance: num(spec.attenuationDistance, 1000),
    clearcoat: num(spec.clearcoat, 1),
    clearcoatRoughness: num(spec.clearcoatRoughness, 0),
    specularIntensity: num(spec.specularIntensity, 1),
    specularColor: new THREE.Color(spec.specularColor || "#ffffff"),
    envMapIntensity: num(spec.envMapIntensity, 3),
    iridescence: num(spec.iridescence, 1),
    iridescenceIOR: num(spec.iridescenceIOR, 1.3),
    iridescenceThicknessRange: [num(range[0], 100), num(range[1], 800)],
    side: THREE.DoubleSide,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    premultipliedAlpha: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
  if ("dispersion" in mat) mat.dispersion = num(spec.dispersion, 0.5);
  /* edgeGlow in web_glass.json is an emissive bevel boost. A full-face halo reads
     as a white blob, so it is applied only where the normal changes (the letter cuts). */
  var glow = Math.max(0, num(edgeGlow, 0.2));
  var glowLit = (glow <= 0 ? 0 : 1.15 * (glow / 0.2)).toFixed(4);

  var biasLit = edgeBias.toFixed(4);
  var noise = Math.max(0.05, num(spec.iridescenceNoise, 0.6)).toFixed(4);
  var farDim = Math.min(1, Math.max(0, num(spec.farSideDim, 0.7))).toFixed(4);
  var uBackGlass = { value: 0 };
  mat.userData.uBackGlass = uBackGlass;
  /* r170 resolves #include after onBeforeCompile, so the patch has to sit on the include. */
  var film = [
    "float cosT = clamp(dot(normalize(nonPerturbedNormal), normalize(vViewPosition)), 0.0, 1.0);",
    "float edge = pow(1.0 - cosT, 1.35);",
    "#ifdef USE_TRANSMISSION",
    "float iriNoise = fract(sin(dot(vWorldPosition.xyz * " + noise + ", vec3(127.1, 311.7, 74.7))) * 43758.5453);",
    "#else",
    "float iriNoise = fract(sin(dot(nonPerturbedNormal * " + noise + ", vec3(127.1, 311.7, 74.7))) * 43758.5453);",
    "#endif",
    "material.iridescenceThickness = mix(iridescenceThicknessMinimum, iridescenceThicknessMaximum, mix(iriNoise, 1.0, edge));",
    "material.iridescence *= mix(1.0 - " + biasLit + ", 1.0, edge);",
  ].join("\n");
  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uBackGlass = uBackGlass;
    var frag = shader.fragmentShader;
    if (frag.indexOf("#include <lights_physical_fragment>") < 0 || frag.indexOf("#include <opaque_fragment>") < 0) {
      console.warn("[cube-look] glass shader patch missed");
    }
    frag = frag.replace(
      "#include <lights_physical_fragment>",
      "#include <lights_physical_fragment>\n" + film
    );
    frag = frag.replace(
      "#include <opaque_fragment>",
      [
        "#ifdef OPAQUE",
        "diffuseColor.a = 1.0;",
        "#endif",
        "#ifdef USE_TRANSMISSION",
        "diffuseColor.a *= material.transmissionAlpha;",
        "#endif",
        "outgoingLight *= gl_FrontFacing ? 1.0 : " + farDim + ";",
        "float bevel = smoothstep(0.02, 0.2, length(fwidth(nonPerturbedNormal)));",
        "vec3 grooveTint = 0.62 + 0.38 * cos(6.28318 * (vec3(0.0, 0.27, 0.55) + iriNoise));",
        "outgoingLight += grooveTint * bevel * " + glowLit + ";",
        "if (uBackGlass > 0.5) {",
        "  float fres = pow(1.0 - clamp(dot(normalize(nonPerturbedNormal), normalize(vViewPosition)), 0.0, 1.0), 2.2);",
        "  gl_FragColor = vec4(outgoingLight * fres, fres);",
        "} else {",
        "  gl_FragColor = vec4(outgoingLight, opacity);",
        "}",
      ].join("\n")
    );
    shader.fragmentShader = "uniform float uBackGlass;\n" + frag;
  };
  mat.customProgramCacheKey = function () {
    return "cosgral-viewer-glass-" + biasLit + "-" + noise + "-" + farDim + "-" + glowLit;
  };
  /* DoubleSide transmission draws the far wall into the buffer it also samples.
     SwiftShader drops that draw (feedback loop). Render the far wall as a fresnel
     sheen over the line plate instead, then restore the real glass for the front. */
  function restoreGlass() {
    if (mat.userData._tx == null) return;
    mat.transmission = mat.userData._tx;
    mat.depthWrite = true;
    mat.userData._tx = null;
    uBackGlass.value = 0;
    mat.needsUpdate = true;
  }
  mat.onBeforeRender = function (renderer, _scene, _camera, _geometry, object) {
    if (object && !object.userData.cosgralGlassAfter) {
      object.userData.cosgralGlassAfter = true;
      var prevAfter = object.onAfterRender;
      object.onAfterRender = function () {
        restoreGlass();
        if (prevAfter) prevAfter.apply(this, arguments);
      };
    }
    var backPass = renderer.toneMapping === THREE.NoToneMapping && mat.side === THREE.BackSide;
    if (!backPass) {
      uBackGlass.value = 0;
      return;
    }
    if (mat.userData._tx == null) mat.userData._tx = mat.transmission;
    uBackGlass.value = 1;
    mat.transmission = 0;
    mat.depthWrite = false;
    mat.needsUpdate = true;
  };
  /* Transmission alpha would fringe the silhouette. Opacity still drives menu fades. */
  var opacityValue = 1;
  Object.defineProperty(mat, "opacity", {
    configurable: true,
    enumerable: true,
    get: function () {
      return opacityValue;
    },
    set: function (next) {
      opacityValue = next;
      var fade = next < 0.999;
      if (mat.transparent !== fade) {
        mat.transparent = fade;
        mat.needsUpdate = true;
      }
    },
  });
  return mat;
}

function createDarkStudio() {
  var env = spec.env || {};
  var power = num(env.power, 2.5);
  var ambient = num(env.ambient, 0.16);
  var floorLevel = num(env.floor, 0.06);
  var sheen = num(env.sheen, 4);
  var studio = new THREE.Scene();
  studio.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(16, 16, 16),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setRGB(ambient, ambient, ambient, THREE.LinearSRGBColorSpace),
        side: THREE.BackSide,
      })
    )
  );
  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setRGB(floorLevel, floorLevel, floorLevel, THREE.LinearSRGBColorSpace),
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5.5;
  studio.add(floor);

  /* Narrow ring just off the view axis. A continuous band, not sparse boxes,
     so the letter bevels catch it instead of reflecting the gap between lights. */
  var hi = Math.max(sheen, power);
  function lightRing(angleDeg, intensity, tube) {
    var a = (angleDeg * Math.PI) / 180;
    var dist = 7.2;
    var z = -Math.cos(a) * dist;
    var rad = Math.sin(a) * dist;
    var mesh = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(rad, 0.4), tube, 8, 64),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setRGB(intensity, intensity, intensity, THREE.LinearSRGBColorSpace),
      })
    );
    mesh.position.z = z;
    studio.add(mesh);
  }
  lightRing(28, hi * 0.55, 0.22);
  lightRing(48, hi * 0.35, 0.28);
  return studio;
}

/* Exact home-ambient-bg.js field (dark + light). No precision line: three prepends one. */
var WAVE_FRAG = [
  "uniform vec2 uRes;",
  "uniform float uTime;",
  "uniform vec2 uMouse;",
  "uniform float uLight;",
  "float wave(vec2 p, float t) {",
  "  float w = 0.0; float amp = 1.0;",
  "  for (int i = 0; i < 4; i++) {",
  "    float fi = float(i);",
  "    p.x += sin(p.y * (1.4 + fi * 0.35) + t * 0.7) * 0.18;",
  "    w += sin(p.x * (1.8 + fi * 0.7) + p.y * 1.1 + t * (0.5 + fi * 0.08)) * amp;",
  "    amp *= 0.58;",
  "  }",
  "  return w * 0.5 + 0.5;",
  "}",
  "void main() {",
  "  vec2 uv = gl_FragCoord.xy / uRes.xy;",
  "  vec2 m = uMouse * 0.5 + 0.5;",
  "  vec2 toM = uv - m;",
  "  float mDist = length(toM);",
  "  float mForce = smoothstep(0.62, 0.0, mDist);",
  "  vec2 p = uv * vec2(2.8, 2.0);",
  "  p += normalize(toM + 0.0001) * mForce * 0.17 * sin(uTime * 1.7 + mDist * 13.0);",
  "  p += vec2(sin(uTime * 0.2 + uv.y * 3.0), cos(uTime * 0.17 + uv.x * 2.5)) * 0.045;",
  "  float t = uTime * 0.14;",
  "  float w = wave(p, t);",
  "  float ridge = pow(1.0 - abs(sin(w * 4.2 + t * 0.25)), 6.0);",
  "  vec3 col;",
  "  if (uLight > 0.5) {",
  "    vec3 base = vec3(0.94, 0.94, 0.96);",
  "    vec3 dim = vec3(0.82, 0.83, 0.87);",
  "    vec3 mid = vec3(0.62, 0.64, 0.7);",
  "    vec3 hi = vec3(0.35, 0.37, 0.42);",
  "    vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);",
  "    ribbon = mix(ribbon, hi, ridge * 0.45);",
  "    col = base;",
  "    col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * 0.5);",
  "    col = mix(col, hi, pow(ridge, 14.0) * 0.18);",
  "    col = mix(col, mid, mForce * 0.12);",
  "    float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));",
  "    col *= 0.92 + vignette * 0.08;",
  "  } else {",
  "    vec3 base = vec3(0.055, 0.055, 0.055);",
  "    vec3 dim = vec3(0.24, 0.24, 0.24);",
  "    vec3 mid = vec3(0.58, 0.58, 0.58);",
  "    vec3 hi = vec3(1.0, 1.0, 1.0);",
  "    vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);",
  "    ribbon = mix(ribbon, hi, ridge * 0.52);",
  "    col = base;",
  "    col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * 0.58);",
  "    col += hi * pow(ridge, 14.0) * 0.32;",
  "    col += mid * mForce * 0.16;",
  "    col += hi * mForce * ridge * 0.12;",
  "    float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));",
  "    col *= 0.58 + vignette * 0.42;",
  "    col = ((col - 0.5) * 1.04 + 0.5) * 0.78;",
  "  }",
  "  gl_FragColor = vec4(col, 1.0);",
  "}",
].join("\n");

function createLinePlate() {
  var uniforms = {
    uRes: { value: new THREE.Vector2(2, 2) },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uLight: { value: 0 },
  };
  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: false,
    depthWrite: false,
    depthTest: false,
    colorWrite: false,
    toneMapped: false,
    fog: false,
    side: THREE.DoubleSide,
    vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: WAVE_FRAG,
  });
  var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -2;
  mesh.name = "cosgral-line-plate";
  mesh.userData.uniforms = uniforms;
  /* Transmission pre-pass is the only render that sets toneMapping to 0.
     The vendored transmission target uses samples 0, so a samples>0 test never fires. */
  mesh.onBeforeRender = function (renderer) {
    var sample = renderer.toneMapping === THREE.NoToneMapping;
    material.colorWrite = sample;
    material.depthWrite = sample;
    material.depthTest = sample;
  };
  return mesh;
}

function placePlate(plate, camera, width, height) {
  var dist = 14;
  var forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  plate.position.copy(camera.position).addScaledVector(forward, dist);
  plate.quaternion.copy(camera.quaternion);
  var vFov = (camera.fov * Math.PI) / 180;
  var planeH = 2 * Math.tan(vFov * 0.5) * dist;
  var planeW = planeH * Math.max(camera.aspect || width / Math.max(height, 1), 0.01);
  plate.scale.set(planeW * 1.08, planeH * 1.08, 1);
}

export function installGlassScene(renderer, scene, camera) {
  var toneName = spec.toneMapping || "NeutralToneMapping";
  renderer.toneMapping = THREE[toneName] || THREE.NeutralToneMapping;
  renderer.toneMappingExposure = num(spec.exposure, 1.2);
  /* Page lines are raw WebGL. sRGB output lifts that same dark into a milky fill on WebKit. */
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x050505, 0);

  if (!scene.environment) {
    var pmrem = new THREE.PMREMGenerator(renderer);
    var studio = createDarkStudio();
    scene.environment = pmrem.fromScene(studio, 0).texture;
    scene.background = null;
    studio.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    pmrem.dispose();
  }

  var plate = createLinePlate();
  scene.add(plate);
  var tmp = new THREE.Vector2();

  scene.onBeforeRender = function (gl, _scene, cam, target) {
    var view = cam || camera;
    if (!view) return;
    var w = target && target.width ? target.width : 0;
    var h = target && target.height ? target.height : 0;
    if (w < 2 || h < 2) {
      gl.getDrawingBufferSize(tmp);
      w = tmp.x;
      h = tmp.y;
    }
    var amb = window.__cosgralAmbient;
    var ptr = window.cosgralPointer;
    var uniforms = plate.userData.uniforms;
    uniforms.uRes.value.set(Math.max(2, w), Math.max(2, h));
    uniforms.uTime.value = amb && typeof amb.t === "number" ? amb.t : performance.now() * 0.001;
    uniforms.uMouse.value.set(
      amb && typeof amb.x === "number" ? amb.x : ptr && ptr.nx ? ptr.nx : 0,
      amb && typeof amb.y === "number" ? amb.y : ptr && ptr.ny ? ptr.ny : 0
    );
    uniforms.uLight.value = document.body.classList.contains("is-home-ambient-light") ? 1 : 0;
    placePlate(plate, view, w, h);
  };
}
