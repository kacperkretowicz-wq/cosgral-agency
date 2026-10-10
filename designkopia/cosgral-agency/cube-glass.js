/**
 * Glass look for the Cosgral cube.
 * MeshPhysicalMaterial transmission is not used: on a transparent canvas,
 * especially iOS WebKit, the transmission buffer clears white and the cube
 * becomes an opaque milky block. This is a fresnel glass shader instead.
 * The body stays a low alpha so the page shows through. Reflections come
 * from a camera-locked studio. Refraction is a normal-offset sample of the
 * ambient canvas.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";

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
    specPromise = fetch(new URL("./assets/cube/web_glass.json?v=20261010alpha", import.meta.url))
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
  var fade = { value: 1 };
  var filmTime = { value: 0 };
  var resolution = { value: new THREE.Vector2(1, 1) };
  var viewRect = { value: new THREE.Vector4(0, 0, 1, 1) };
  var bgEnable = { value: 0 };
  var blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  blank.needsUpdate = true;
  blank.colorSpace = THREE.LinearSRGBColorSpace;
  var bgHolder = { value: blank };
  var mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x000000),
    metalness: 0,
    roughness: 0.16,
    envMapIntensity: 2.4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
    depthWrite: true,
    toneMapped: false,
    premultipliedAlpha: true,
    forceSinglePass: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });

  mat.onBeforeCompile = function (shader) {
    shader.uniforms.uFilmTime = filmTime;
    shader.uniforms.uFade = fade;
    shader.uniforms.uResolution = resolution;
    shader.uniforms.uView = viewRect;
    shader.uniforms.uBgMap = bgHolder;
    shader.uniforms.uBgEnable = bgEnable;
    shader.fragmentShader =
      "uniform float uFilmTime;\nuniform float uFade;\nuniform vec2 uResolution;\nuniform vec4 uView;\nuniform sampler2D uBgMap;\nuniform float uBgEnable;\n" +
      shader.fragmentShader;
    var opaque = [
      "vec3 glassN = normalize(normal);",
      "float glassNd = clamp(dot(glassN, normalize(vViewPosition)), 0.0, 1.0);",
      "float glassRim = pow(1.0 - glassNd, 1.45);",
      "float glassHue = atan(glassN.y, glassN.x);",
      "vec3 glassSplit = 0.55 + 0.45 * cos(vec3(0.0, 2.094395, 4.18879) + glassHue * 2.7 + glassRim * 14.0 + uFilmTime * 1.15);",
      "vec3 glassTint = mix(vec3(0.2, 0.9, 0.5), vec3(0.95, 0.32, 0.6), clamp(glassN.x * 0.5 + 0.5, 0.0, 1.0));",
      "vec3 glassSpec = outgoingLight * mix(0.0, 0.42, smoothstep(0.15, 0.95, glassRim));",
      "vec3 glassLin = glassSpec + glassTint * glassSplit * glassRim * 0.95;",
      "float glassAlpha = mix(0.10, 0.68, glassRim) * uFade;",
      "gl_FragColor = vec4(glassLin, glassAlpha);",
    ].join("\n");
    var refract = [
      "vec3 refrN = normalize(normal);",
      "float refrRim = pow(1.0 - clamp(dot(refrN, normalize(vViewPosition)), 0.0, 1.0), 1.45);",
      "if (uBgEnable > 0.5) {",
      "  vec2 screenUv = uView.xy + (gl_FragCoord.xy / max(uResolution, vec2(1.0))) * uView.zw;",
      "  vec2 bend = refrN.xy * 0.045;",
      "  vec3 refr;",
      "  refr.r = texture2D(uBgMap, screenUv + bend * 1.55).r;",
      "  refr.g = texture2D(uBgMap, screenUv + bend).g;",
      "  refr.b = texture2D(uBgMap, screenUv + bend * 0.55).b;",
      "  gl_FragColor.rgb += refr * mix(0.18, 0.85, refrRim);",
      "}",
    ].join("\n");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <opaque_fragment>", opaque)
      .replace("#include <tonemapping_fragment>", "")
      .replace("#include <colorspace_fragment>", THREE.ShaderChunk.colorspace_fragment + "\n" + refract);
  };
  mat.customProgramCacheKey = function () {
    return "cosgral-glass-alpha-v1";
  };
  mat.onBeforeRender = function (renderer, scene, camera) {
    filmTime.value = performance.now() * 0.001;
    if (scene && scene.environmentRotation && camera) scene.environmentRotation.copy(camera.rotation);
    if (renderer && renderer.getDrawingBufferSize) renderer.getDrawingBufferSize(resolution.value);
    var el = renderer && renderer.domElement;
    if (el && el.getBoundingClientRect) {
      var rect = el.getBoundingClientRect();
      var vw = window.innerWidth || 1;
      var vh = window.innerHeight || 1;
      viewRect.value.set(rect.left / vw, 1 - rect.bottom / vh, rect.width / vw, rect.height / vh);
    }
    var canvas = document.getElementById("home-ambient") || document.getElementById("subpage-ambient");
    if (canvas && canvas.width > 2) {
      if (!bgHolder.value || bgHolder.value.image !== canvas) {
        var tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.LinearSRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        bgHolder.value = tex;
      }
      bgHolder.value.needsUpdate = true;
      bgEnable.value = 1;
    }
  };
  /* Callers fade the cube through opacity. The shader stays transparent so the body never becomes an opaque fill. */
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

function createBrightStudio() {
  var env = spec.env || {};
  var ambient = num(env.ambient, 0.05);
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
  /* View-locked tent. A ring around the camera axis hits bevels and grooves at every cube yaw.
     Left of the view stays green, right stays pink, the top arc stays white. */
  var i;
  var a;
  for (i = 0; i < 20; i++) {
    a = (i / 20) * Math.PI * 2;
    addSoftbox(
      Math.cos(a) * 5.15,
      Math.sin(a) * 5.15,
      0.25,
      0.42,
      1.15,
      a > Math.PI * 0.5 && a < Math.PI * 1.5 ? "#9dffc8" : "#ffb0d0",
      Math.abs(Math.sin(a)) > 0.85 ? 15 : 12
    );
  }
  for (i = 0; i < 14; i++) {
    a = (i / 14) * Math.PI * 2;
    addSoftbox(Math.cos(a) * 3.5, 4.55, Math.sin(a) * 3.5, 0.85, 0.36, "#f6fff9", 16);
  }
  for (i = 0; i < 10; i++) {
    a = (i / 10) * Math.PI * 2;
    addSoftbox(Math.cos(a) * 3.8, -3.15, Math.sin(a) * 3.8, 0.7, 0.32, "#fff4ea", 8);
  }
  addSoftbox(0.0, 0.15, 6.4, 2.4, 1.6, "#141820", 1.1);
  addSoftbox(0.0, 0.4, -6.2, 3.2, 2.2, "#d8dbe2", 4.5);
  return studio;
}

export function installGlassScene(renderer, scene) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  if (!scene.environment) {
    var pmrem = new THREE.PMREMGenerator(renderer);
    var studio = createBrightStudio();
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
}
