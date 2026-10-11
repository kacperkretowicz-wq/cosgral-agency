/**
 * Thick optical glass for the grooved cube.
 * Transmission is not used (it clears white on iOS). Each frame, in this
 * WebGL context: the page's line field is drawn into a color target, the
 * cube's back faces are drawn into a normal/depth target, then the front
 * faces refract through that thickness with an RGB ior split.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";

var spec = {
  exposure: 1.2,
};

var specPromise = null;

function num(value, fallback) {
  return typeof value === "number" && isFinite(value) ? value : fallback;
}

export function whenGlassSpec() {
  if (!specPromise) {
    specPromise = fetch(new URL("./assets/cube/web_glass.json?v=20261011optic", import.meta.url))
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

var BACK_VERT = [
  "varying vec3 vN;",
  "varying float vDist;",
  "void main() {",
  "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
  "  vDist = -mv.z;",
  "  vN = normalize(normalMatrix * normal);",
  "  gl_Position = projectionMatrix * mv;",
  "}",
].join("\n");

var BACK_FRAG = [
  "precision highp float;",
  "varying vec3 vN;",
  "varying float vDist;",
  "void main() {",
  "  gl_FragColor = vec4(normalize(vN), vDist);",
  "}",
].join("\n");

/* Same dark line field as home-ambient-bg.js, so refraction continues the page. */
var WAVE_FRAG = [
  "precision mediump float;",
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
  "  vec3 base = mix(vec3(0.055), vec3(0.94, 0.94, 0.96), uLight);",
  "  vec3 dim = mix(vec3(0.24), vec3(0.82, 0.83, 0.87), uLight);",
  "  vec3 mid = mix(vec3(0.58), vec3(0.62, 0.64, 0.7), uLight);",
  "  vec3 hi = mix(vec3(1.0), vec3(0.35, 0.37, 0.42), uLight);",
  "  vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);",
  "  ribbon = mix(ribbon, hi, ridge * mix(0.52, 0.45, uLight));",
  "  vec3 col = base;",
  "  col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * mix(0.58, 0.5, uLight));",
  "  col += hi * pow(ridge, 14.0) * mix(0.32, 0.18, uLight);",
  "  col += mid * mForce * mix(0.16, 0.12, uLight);",
  "  col += hi * mForce * ridge * mix(0.12, 0.0, uLight);",
  "  float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));",
  "  col *= mix(0.58 + vignette * 0.42, 0.92 + vignette * 0.08, uLight);",
  "  col = mix(((col - 0.5) * 1.04 + 0.5) * 0.78, col, uLight);",
  "  gl_FragColor = vec4(col, 1.0);",
  "}",
].join("\n");

function makeTarget(w, h, floatTex, depth) {
  return new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
    type: floatTex ? THREE.FloatType : THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: floatTex ? THREE.NearestFilter : THREE.LinearFilter,
    magFilter: floatTex ? THREE.NearestFilter : THREE.LinearFilter,
    depthBuffer: !!depth,
    stencilBuffer: false,
    generateMipmaps: false,
    colorSpace: THREE.LinearSRGBColorSpace,
  });
}

function fitTarget(rt, w, h) {
  if (rt.width !== w || rt.height !== h) rt.setSize(Math.max(2, w), Math.max(2, h));
}

export function createGlassMaterial() {
  var fade = { value: 1 };
  var resolution = { value: new THREE.Vector2(2, 2) };
  var blank = new THREE.DataTexture(new Uint8Array([8, 8, 10, 255]), 1, 1);
  blank.needsUpdate = true;
  blank.colorSpace = THREE.LinearSRGBColorSpace;
  var uBg = { value: blank };
  var uBack = { value: blank };
  var passing = false;
  var backScene = new THREE.Scene();
  var backMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthTest: true,
    depthWrite: true,
    toneMapped: false,
    vertexShader: BACK_VERT,
    fragmentShader: BACK_FRAG,
  });
  var backMesh = new THREE.Mesh(new THREE.BufferGeometry(), backMat);
  backMesh.frustumCulled = false;
  backMesh.matrixAutoUpdate = true;
  backScene.add(backMesh);

  var waveUniforms = {
    uRes: { value: new THREE.Vector2(2, 2) },
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2() },
    uLight: { value: 0 },
  };
  var waveMat = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    uniforms: waveUniforms,
    vertexShader: "void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: WAVE_FRAG,
  });
  var waveGeo = new THREE.BufferGeometry();
  waveGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
  );
  var waveMesh = new THREE.Mesh(waveGeo, waveMat);
  waveMesh.frustumCulled = false;
  var waveScene = new THREE.Scene();
  waveScene.add(waveMesh);
  var waveCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  var bgRT = null;
  var backRT = null;
  var clearCol = new THREE.Color();

  var mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x000000),
    roughness: 0.22,
    metalness: 0,
    envMapIntensity: 1.15,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 1,
    depthWrite: true,
    toneMapped: false,
    fog: false,
    premultipliedAlpha: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });

  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uBg = uBg;
    shader.uniforms.uBack = uBack;
    shader.uniforms.uResolution = resolution;
    shader.uniforms.uFade = fade;
    shader.fragmentShader =
      "uniform sampler2D uBg;\nuniform sampler2D uBack;\nuniform vec2 uResolution;\nuniform float uFade;\n" +
      shader.fragmentShader;
    var glass = [
      "vec3 N = normalize(normal);",
      "vec3 V = normalize(vViewPosition);",
      "float ndv = clamp(dot(N, V), 0.0, 1.0);",
      "float vDist = max(vViewPosition.z, 0.35);",
      "vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));",
      "vec4 backHere = texture2D(uBack, clamp(uv, 0.001, 0.999));",
      "float backDist = backHere.a;",
      "float thickness = backDist > 0.15 ? max(backDist - vDist, 0.0) : 0.42;",
      "vec3 rR = refract(-V, N, 1.0 / 1.45);",
      "vec3 rG = refract(-V, N, 1.0 / 1.47);",
      "vec3 rB = refract(-V, N, 1.0 / 1.50);",
      "vec2 bR = (rR.xy / vDist) * thickness * 2.6;",
      "vec2 bG = (rG.xy / vDist) * thickness * 2.6;",
      "vec2 bB = (rB.xy / vDist) * thickness * 2.6;",
      "vec3 transmitted;",
      "transmitted.r = texture2D(uBg, clamp(uv + bR, 0.0, 1.0)).r;",
      "transmitted.g = texture2D(uBg, clamp(uv + bG, 0.0, 1.0)).g;",
      "transmitted.b = texture2D(uBg, clamp(uv + bB, 0.0, 1.0)).b;",
      "vec3 absorb = exp(-thickness * vec3(0.07, 0.045, 0.02));",
      "transmitted *= vec3(0.90, 0.935, 0.99) * absorb;",
      "vec3 Nb = texture2D(uBack, clamp(uv + bG, 0.001, 0.999)).xyz;",
      "if (dot(Nb, Nb) < 0.04) Nb = vec3(0.0, 0.0, -1.0);",
      "Nb = normalize(Nb);",
      "vec3 inside = rG;",
      "vec3 exitRay = refract(normalize(inside), -Nb, 1.47);",
      "float cosExit = clamp(dot(-normalize(inside), -Nb), 0.0, 1.0);",
      "float tir = max(1.0 - clamp(length(exitRay), 0.0, 1.0), smoothstep(0.34, 0.04, cosExit));",
      "vec3 spec = outgoingLight;",
      "spec = spec / (vec3(1.0) + spec);",
      "vec3 specS = pow(max(spec, vec3(0.0)), vec3(0.454545));",
      "vec3 tirCol = vec3(0.78, 0.84, 0.9);",
      "float rim = pow(1.0 - ndv, 1.35);",
      "vec3 col = transmitted + specS * 0.9 + tirCol * tir * rim * 0.95 + transmitted * rim * 0.45;",
      "float alpha = uFade;",
      "gl_FragColor = vec4(col, alpha);",
    ].join("\n");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <opaque_fragment>", glass)
      .replace("#include <tonemapping_fragment>", "")
      .replace("#include <colorspace_fragment>", "")
      .replace("#include <premultiplied_alpha_fragment>", "gl_FragColor.rgb *= gl_FragColor.a;");
  };
  mat.customProgramCacheKey = function () {
    return "cosgral-optic-glass-v1";
  };

  mat.onBeforeRender = function (renderer, scene, camera) {
    if (passing) return;
    var mesh = this;
    if (!mesh || !mesh.geometry || !camera) return;
    passing = true;
    var prevTarget = null;
    var prevAlpha = 0;
    var prevAuto = true;
    var prevColor = null;
    try {
    prevTarget = renderer.getRenderTarget();
    var prevAlpha = renderer.getClearAlpha();
    var prevAuto = renderer.autoClear;
    renderer.getClearColor(clearCol);
    var prevColor = clearCol.clone();
    var w;
    var h;
    if (prevTarget) {
      w = prevTarget.width;
      h = prevTarget.height;
    } else {
      renderer.getDrawingBufferSize(resolution.value);
      w = resolution.value.x;
      h = resolution.value.y;
    }
    w = Math.max(2, w | 0);
    h = Math.max(2, h | 0);
    if (!bgRT) bgRT = makeTarget(w, h, false, false);
    if (!backRT) backRT = makeTarget(w, h, true, true);
    fitTarget(bgRT, w, h);
    fitTarget(backRT, w, h);
    resolution.value.set(w, h);
    uBg.value = bgRT.texture;
    uBack.value = backRT.texture;

    var amb = window.__cosgralAmbient;
    var ptr = window.cosgralPointer;
    waveUniforms.uTime.value = amb && typeof amb.t === "number" ? amb.t : performance.now() * 0.001;
    waveUniforms.uMouse.value.set(
      amb && typeof amb.x === "number" ? amb.x : ptr && ptr.nx ? ptr.nx : 0,
      amb && typeof amb.y === "number" ? amb.y : ptr && ptr.ny ? ptr.ny : 0
    );
    waveUniforms.uLight.value = document.body.classList.contains("is-home-ambient-light") ? 1 : 0;
    waveUniforms.uRes.value.set(w, h);

    if (backMesh.geometry !== mesh.geometry) backMesh.geometry = mesh.geometry;
    mesh.updateWorldMatrix(true, false);
    mesh.matrixWorld.decompose(backMesh.position, backMesh.quaternion, backMesh.scale);
    backMesh.updateMatrixWorld(true);

    if (scene && scene.environmentRotation && camera.rotation) {
      scene.environmentRotation.copy(camera.rotation);
    }

    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(bgRT);
    renderer.render(waveScene, waveCam);
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(backRT);
    renderer.clear();
    renderer.render(backScene, camera);
    } finally {
      if (prevColor) renderer.setClearColor(prevColor, prevAlpha);
      renderer.setRenderTarget(prevTarget);
      renderer.autoClear = prevAuto;
      passing = false;
    }
  };

  Object.defineProperty(mat, "opacity", {
    configurable: true,
    enumerable: true,
    get: function () {
      return fade.value;
    },
    set: function (next) {
      fade.value = next;
      if (!mat.transparent) {
        mat.transparent = true;
        mat.needsUpdate = true;
      }
    },
  });
  return mat;
}

function createSoftStudio() {
  var studio = new THREE.Scene();
  var room = new THREE.Color(0.16, 0.175, 0.21);
  studio.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(24, 24, 24),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setRGB(room.r, room.g, room.b, THREE.LinearSRGBColorSpace),
        side: THREE.BackSide,
      })
    )
  );
  function addPanel(x, y, z, sx, sy, hex, intensity) {
    var tint = new THREE.Color(hex);
    var mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
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
    mesh.scale.set(sx, sy, 1);
    studio.add(mesh);
  }
  /* Large softboxes. Faces pick up a smooth gradient, not a wire of pin lights. */
  addPanel(0.3, 2.6, 5.0, 8.5, 3.6, "#f4f7fb", 3.3);
  addPanel(-3.8, 0.5, 2.4, 3.4, 5.2, "#d7e3ef", 1.9);
  addPanel(3.6, -0.3, 2.2, 3.2, 4.6, "#efe6dc", 1.45);
  addPanel(0.0, 5.4, 0.2, 7.2, 2.8, "#ffffff", 2.1);
  addPanel(0.2, -3.8, 1.4, 6.4, 2.4, "#c5ced8", 1.15);
  return studio;
}

export function installGlassScene(renderer, scene) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  if (!scene.environment) {
    var pmrem = new THREE.PMREMGenerator(renderer);
    var studio = createSoftStudio();
    var prevTone = renderer.toneMapping;
    var prevExp = renderer.toneMappingExposure;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    scene.environment = pmrem.fromScene(studio, 0.04).texture;
    studio.traverse(function (obj) {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    pmrem.dispose();
    renderer.toneMapping = prevTone;
    renderer.toneMappingExposure = prevExp;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = num(spec.exposure, 1.2);
}
