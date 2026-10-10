/**
 * Glass look for the Cosgral cube: web_glass.json on MeshPhysicalMaterial.
 * The env is a dark studio (narrow strips only) so faces stay clear and
 * specular catches stay sharp. A transmission backdrop keeps the transmission
 * buffer from clearing to white on a transparent canvas.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";

var spec = {
  color: "#ffffff",
  metalness: 0,
  roughness: 0,
  transmission: 1,
  ior: 1.5,
  thickness: 1.5,
  dispersion: 0.4,
  attenuationColor: "#ffffff",
  attenuationDistance: 1000,
  clearcoat: 1,
  clearcoatRoughness: 0,
  specularIntensity: 1,
  specularColor: "#ffffff",
  envMapIntensity: 3,
  edgeGlow: 0.2,
  side: "double",
  exposure: 1.2,
  iridescence: 1,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 800],
  iridescenceNoise: 0.6,
  iridescenceEdgeBias: 0.2,
};

var specPromise = null;

function num(value, fallback) {
  return typeof value === "number" && isFinite(value) ? value : fallback;
}

export function whenGlassSpec() {
  if (!specPromise) {
    specPromise = fetch(new URL("./assets/cube/web_glass.json?v=20261010bright", import.meta.url))
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
  if ("dispersion" in mat) mat.dispersion = num(spec.dispersion, 0.4);
  /* edgeGlow is an emissive rim. It reads as a white halo, so it is not applied. */
  void edgeGlow;

  var biasLit = edgeBias.toFixed(4);
  var filmTime = { value: 0 };
  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uFilmTime = filmTime;
    var physical = THREE.ShaderChunk.lights_physical_fragment
      .replace(
        "material.iridescenceThickness = iridescenceThicknessMaximum;",
        [
          "float filmCos = clamp(dot(normalize(nonPerturbedNormal), normalize(vViewPosition)), 0.0, 1.0);",
          "float filmEdge = pow(1.0 - filmCos, 1.2);",
          "float filmNoise = fract(sin(dot(vWorldPosition.xyz, vec3(127.1, 311.7, 74.7))) * 43758.5453);",
          "float filmCrawl = 0.5 + 0.5 * sin(uFilmTime * 1.15 + filmNoise * 6.28318 + (1.0 - filmCos) * 8.0);",
          "float filmT = clamp(mix(filmNoise, filmCrawl, 0.82), 0.0, 1.0);",
          "material.iridescenceThickness = mix(iridescenceThicknessMinimum, iridescenceThicknessMaximum, filmT);",
          "material.iridescence *= mix(1.0 - " + biasLit + ", 1.0, filmEdge);",
        ].join("\n")
      );
    var lightsBegin = THREE.ShaderChunk.lights_fragment_begin.replace(
      "material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );",
      [
        "material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );",
        "material.iridescenceFresnel = clamp( mix( vec3( dot( material.iridescenceFresnel, vec3( 0.33333 ) ) ), material.iridescenceFresnel, 1.85 ), 0.0, 1.0 );",
      ].join("\n")
    );
    var opaque = THREE.ShaderChunk.opaque_fragment.replace(
      "gl_FragColor = vec4( outgoingLight, diffuseColor.a );",
      "gl_FragColor = vec4( outgoingLight, opacity );"
    );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <lights_physical_fragment>", physical)
      .replace("#include <lights_fragment_begin>", lightsBegin)
      .replace("#include <opaque_fragment>", opaque);
    if (shader.fragmentShader.indexOf("uniform float uFilmTime") === -1) {
      shader.fragmentShader = "uniform float uFilmTime;\n" + shader.fragmentShader;
    }
  };
  mat.customProgramCacheKey = function () {
    return "cosgral-glass-soap-" + biasLit;
  };
  mat.onBeforeRender = function () {
    filmTime.value = performance.now() * 0.001;
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

function createBrightStudio() {
  var env = spec.env || {};
  var ambient = num(env.ambient, 0.16);
  var studio = new THREE.Scene();
  studio.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(18, 18, 18),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setRGB(ambient, ambient, ambient, THREE.LinearSRGBColorSpace),
        side: THREE.BackSide,
      })
    )
  );

  function addSoftbox(x, y, z, sx, sy, hex, intensity) {
    var tint = new THREE.Color(hex);
    var mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        color: new THREE.Color().setRGB(
          tint.r * intensity,
          tint.g * intensity,
          tint.b * intensity,
          THREE.LinearSRGBColorSpace
        ),
      })
    );
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    mesh.scale.set(sx, sy, 0.18);
    studio.add(mesh);
  }
  /* Softboxes sit just behind the camera so front bevels catch them. Side rims are coloured, not sprites. */
  addSoftbox(0.2, 2.8, 5.2, 4.4, 1.7, "#ffffff", 12);
  addSoftbox(1.6, -2.4, 4.8, 3.4, 1.15, "#fff6ee", 9);
  addSoftbox(-4.2, 0.6, 3.1, 1.15, 3.6, "#9dffc4", 11);
  addSoftbox(4.2, -0.15, 3.2, 1.15, 3.6, "#ff9ec8", 11);
  return studio;
}

var WAVE_VERT = [
  "varying vec2 vUv;",
  "void main() {",
  "  vUv = uv;",
  "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
  "}",
].join("\n");

/* Same glowing-line field as home-ambient-bg.js, drawn only into the transmission pass. */
var WAVE_FRAG = [
  "precision mediump float;",
  "uniform float uTime;",
  "uniform vec2 uMouse;",
  "varying vec2 vUv;",
  "float wave(vec2 p, float t) {",
  "  float w = 0.0;",
  "  p.x += sin(p.y * 1.4 + t * 0.7) * 0.18;",
  "  w += sin(p.x * 1.8 + p.y * 1.1 + t * 0.5);",
  "  p.x += sin(p.y * 1.75 + t * 0.7) * 0.18;",
  "  w += sin(p.x * 2.5 + p.y * 1.1 + t * 0.58) * 0.58;",
  "  p.x += sin(p.y * 2.1 + t * 0.7) * 0.18;",
  "  w += sin(p.x * 3.2 + p.y * 1.1 + t * 0.66) * 0.3364;",
  "  p.x += sin(p.y * 2.45 + t * 0.7) * 0.18;",
  "  w += sin(p.x * 3.9 + p.y * 1.1 + t * 0.74) * 0.1951;",
  "  return w * 0.5 + 0.5;",
  "}",
  "void main() {",
  "  vec2 uv = vUv;",
  "  vec2 m = uMouse * 0.5 + 0.5;",
  "  vec2 toM = uv - m;",
  "  float mDist = length(toM);",
  "  float mForce = smoothstep(0.62, 0.0, mDist);",
  "  vec2 p = uv * vec2(2.8, 2.0);",
  "  p += normalize(toM + 0.0001) * mForce * 0.17 * sin(uTime * 1.7 + mDist * 13.0);",
  "  p += vec2(sin(uTime * 0.2 + uv.y * 3.0), cos(uTime * 0.17 + uv.x * 2.5)) * 0.045;",
  "  float t = uTime * 0.14;",
  "  float w = wave(p, t);",
  "  float s = 1.0 - abs(sin(w * 4.2 + t * 0.25));",
  "  float s2 = s * s;",
  "  float ridge = s2 * s2 * s2;",
  "  vec3 base = vec3(0.055);",
  "  vec3 dim = vec3(0.24);",
  "  vec3 mid = vec3(0.58);",
  "  vec3 hi = vec3(1.0);",
  "  vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);",
  "  ribbon = mix(ribbon, hi, ridge * 0.52);",
  "  vec3 col = mix(base, ribbon, smoothstep(0.08, 0.88, ridge) * 0.58);",
  "  float r2 = ridge * ridge;",
  "  float r4 = r2 * r2;",
  "  float r14 = r4 * r4 * r4 * r2;",
  "  col += hi * r14 * 0.32;",
  "  col += mid * mForce * 0.16;",
  "  col += hi * mForce * ridge * 0.12;",
  "  float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));",
  "  col *= 0.58 + vignette * 0.42;",
  "  col = ((col - 0.5) * 1.04 + 0.5) * 0.78;",
  "  gl_FragColor = vec4(col, 1.0);",
  "}",
].join("\n");

export function installGlassScene(renderer, scene, camera) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  /* Alpha stays 0 so the page shows through. three.js would otherwise clear the
     transmission target to white whenever clear alpha is below 1. */
  renderer.setClearColor(0x050505, 0);

  if (!scene.environment) {
    var pmrem = new THREE.PMREMGenerator(renderer);
    var studio = createBrightStudio();
    /* Capture the softboxes as linear HDR. ACES on this pass would crush them before the glass samples them. */
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    scene.environment = pmrem.fromScene(studio, 0).texture;
    studio.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    pmrem.dispose();
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = num(spec.exposure, 1.2);

  if (camera.parent == null) scene.add(camera);

  var dist = 2.5;
  var backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2() },
      },
      vertexShader: WAVE_VERT,
      fragmentShader: WAVE_FRAG,
    })
  );
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1000;
  backdrop.position.z = -dist;
  backdrop.material.colorWrite = false;
  camera.add(backdrop);

  var mouse = { x: 0, y: 0 };
  backdrop.onBeforeRender = function (r) {
    var rt = r.getRenderTarget();
    var transmission = !!(rt && rt.samples > 0 && rt.texture && rt.texture.generateMipmaps);
    backdrop.material.colorWrite = transmission;
    var vFov = (camera.fov * Math.PI) / 180;
    var height = 2 * Math.tan(vFov / 2) * dist;
    var width = height * Math.max(camera.aspect, 0.01);
    backdrop.scale.set(width * 1.35, height * 1.35, 1);
    backdrop.updateMatrixWorld(true);
    var ptr = window.cosgralPointer;
    if (ptr) {
      mouse.x += ((ptr.nx || 0) - mouse.x) * 0.08;
      mouse.y += ((ptr.ny || 0) - mouse.y) * 0.08;
    }
    backdrop.material.uniforms.uTime.value = performance.now() * 0.001;
    backdrop.material.uniforms.uMouse.value.set(mouse.x, mouse.y);
  };

  return backdrop;
}
