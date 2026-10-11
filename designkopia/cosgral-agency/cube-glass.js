/**
 * Grooved cube as real-time MeshPhysicalMaterial glass.
 * The page line field is drawn inside this same scene, so the built-in
 * transmission pass refracts those lines instead of an empty clear.
 * The studio HDR is reflections only. No custom refraction shader.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";
import { RGBELoader } from "./vendor/RGBELoader.js";
import { RectAreaLightUniformsLib } from "./vendor/RectAreaLightUniformsLib.js";

var specPromise = null;

export function whenGlassSpec() {
  if (!specPromise) {
    specPromise = fetch(new URL("./assets/cube/web_glass.json?v=20261011phys", import.meta.url))
      .then(function (res) {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .catch(function (err) {
        console.warn("[cube-look] web_glass.json", err);
        return null;
      });
  }
  return specPromise;
}

/* Same field as home-ambient-bg.js, so the in-scene plate matches the page. */
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
  "  float ridge = pow(1.0 - abs(sin(w * 3.4 + t * 0.25)), 2.4);",
  "  vec3 base = mix(vec3(0.055), vec3(0.94, 0.94, 0.96), uLight);",
  "  vec3 dim = mix(vec3(0.24), vec3(0.82, 0.83, 0.87), uLight);",
  "  vec3 mid = mix(vec3(0.58), vec3(0.62, 0.64, 0.7), uLight);",
  "  vec3 hi = mix(vec3(1.0), vec3(0.35, 0.37, 0.42), uLight);",
  "  vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);",
  "  ribbon = mix(ribbon, hi, ridge * mix(0.52, 0.45, uLight));",
  "  vec3 col = base;",
  "  col = mix(col, ribbon, smoothstep(0.04, 0.72, ridge) * mix(0.85, 0.62, uLight));",
  "  col += hi * pow(ridge, 3.0) * mix(0.72, 0.28, uLight);",
  "  col += mid * mForce * mix(0.16, 0.12, uLight);",
  "  col += hi * mForce * ridge * mix(0.12, 0.0, uLight);",
  "  float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));",
  "  col *= mix(0.58 + vignette * 0.42, 0.92 + vignette * 0.08, uLight);",
  "  col = mix(((col - 0.5) * 1.04 + 0.5) * 0.78, col, uLight);",
  "  gl_FragColor = vec4(col, 1.0);",
  "}",
].join("\n");

var lightsReady = false;

function ensureRectArea() {
  if (lightsReady) return;
  RectAreaLightUniformsLib.init();
  lightsReady = true;
}

export function createGlassMaterial() {
  var mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 2.8,
    ior: 1.5,
    dispersion: 0.8,
    iridescence: 0.5,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 600],
    specularIntensity: 1,
    specularColor: 0xffffff,
    envMapIntensity: 1.5,
    attenuationColor: new THREE.Color(0xb9c4d0),
    attenuationDistance: 24,
    clearcoat: 0,
    clearcoatRoughness: 0,
    transparent: true,
    opacity: 1,
    side: THREE.FrontSide,
    depthWrite: true,
    envMap: null,
  });
  mat.dispersion = 0.8;
  mat.roughness = 0;
  mat.thickness = 2.8;
  return mat;
}

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
    depthWrite: true,
    depthTest: true,
    toneMapped: false,
    fog: false,
    vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: WAVE_FRAG,
  });
  var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -2;
  mesh.name = "cosgral-line-plate";
  mesh.userData.uniforms = uniforms;
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

function addStudioLights(scene) {
  ensureRectArea();
  var rig = new THREE.Group();
  rig.name = "cosgral-studio-rig";
  scene.add(rig);

  function add(color, intensity, w, h, x, y, z) {
    var light = new THREE.RectAreaLight(color, intensity, w, h);
    light.position.set(x, y, z);
    rig.add(light);
    return light;
  }
  /* Local offsets: camera looks down -Z, so negative Z is toward the cube. */
  add(0xffffff, 10, 7.5, 3.2, 0.4, 2.4, -1.6);
  add(0xd7e6f6, 5, 3.6, 6.2, -3.4, 0.4, -2.2);
  add(0xfff1e6, 4.5, 3.2, 4.8, 3.2, -0.2, -2.4);
  add(0xffffff, 6, 6.5, 1.6, 0.1, 3.6, -3.2);
  return rig;
}

export function installGlassScene(renderer, scene, camera) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);

  var plate = createLinePlate();
  scene.add(plate);
  var rig = camera ? addStudioLights(scene) : null;
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
    if (scene.environmentRotation && view.rotation) {
      scene.environmentRotation.copy(view.rotation);
    }
    if (rig) {
      rig.position.copy(view.position);
      rig.quaternion.copy(view.quaternion);
      var i;
      for (i = 0; i < rig.children.length; i++) rig.children[i].lookAt(0, 0, 0);
    }
  };

  if (scene.userData.cosgralEnv) return;
  scene.userData.cosgralEnv = true;
  var loader = new RGBELoader();
  loader.load(
    new URL("./assets/cube/studio_small_09_1k.hdr", import.meta.url).href,
    function (tex) {
      tex.mapping = THREE.EquirectangularReflectionMapping;
      var pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromEquirectangular(tex).texture;
      scene.background = null;
      tex.dispose();
      pmrem.dispose();
    },
    undefined,
    function (err) {
      console.warn("[cube-look] studio hdr", err);
    }
  );
}
