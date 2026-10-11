/**
 * Thick optical glass for the grooved cube.
 * Transmission is not used (it clears white on iOS). Each frame, in this
 * WebGL context: the page's line field is drawn into a color target, the
 * cube's back faces are drawn into a normal/depth target, then the front
 * faces refract through that thickness with an RGB ior split.
 *
 * The back target is RGBA8 (normal packed into RGB, distance into A). A
 * float color buffer is optional and often incomplete on SwiftShader and
 * iOS WebKit, which previously left this pass black.
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
    specPromise = fetch(new URL("./assets/cube/web_glass.json?v=20261011clear", import.meta.url))
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

/* Byte-safe: xyz = normal * 0.5 + 0.5, a = view distance / 16. */
var BACK_FRAG = [
  "varying vec3 vN;",
  "varying float vDist;",
  "void main() {",
  "  vec3 n = normalize(vN) * 0.5 + 0.5;",
  "  gl_FragColor = vec4(n, clamp(vDist / 16.0, 0.0, 1.0));",
  "}",
].join("\n");

/* Same dark line field as home-ambient-bg.js, so refraction continues the page. */
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

function makeTarget(w, h, depth) {
  var rt = new THREE.WebGLRenderTarget(Math.max(2, w), Math.max(2, h), {
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
    minFilter: depth ? THREE.NearestFilter : THREE.LinearFilter,
    magFilter: depth ? THREE.NearestFilter : THREE.LinearFilter,
    depthBuffer: !!depth,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  rt.texture.colorSpace = THREE.NoColorSpace;
  return rt;
}

function fitTarget(rt, w, h) {
  if (rt.width !== w || rt.height !== h) rt.setSize(Math.max(2, w), Math.max(2, h));
}

function floatTargetWorks(renderer) {
  var gl = renderer.getContext();
  var is2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  if (is2) {
    if (!gl.getExtension("EXT_color_buffer_float")) return false;
  } else if (!gl.getExtension("OES_texture_float") || !gl.getExtension("WEBGL_color_buffer_float")) {
    return false;
  }
  var probe = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.FloatType,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false,
  });
  var prev = renderer.getRenderTarget();
  renderer.setRenderTarget(probe);
  var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  renderer.setRenderTarget(prev);
  probe.dispose();
  return ok;
}

export function createGlassMaterial() {
  var fade = { value: 1 };
  var resolution = { value: new THREE.Vector2(2, 2) };
  var blank = new THREE.DataTexture(new Uint8Array([14, 16, 20, 255]), 1, 1);
  blank.needsUpdate = true;
  blank.colorSpace = THREE.NoColorSpace;
  var uBg = { value: blank };
  var uBack = { value: blank };
  var uDebug = { value: 0 };
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
  backMesh.matrixAutoUpdate = false;
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
  var probeBuf = null;

  var mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x000000),
    roughness: 0.06,
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
    shader.uniforms.uDebug = uDebug;
    shader.fragmentShader =
      "uniform sampler2D uBg;\nuniform sampler2D uBack;\nuniform vec2 uResolution;\nuniform float uFade;\nuniform float uDebug;\n" +
      shader.fragmentShader;
    var glass = [
      "vec3 N = normalize(normal);",
      "vec3 V = normalize(vViewPosition);",
      "float ndv = clamp(dot(N, V), 0.0, 1.0);",
      "float fres = pow(1.0 - ndv, 5.0);",
      "float F = 0.04 + 0.96 * fres;",
      "vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));",
      "if (uDebug > 0.5) {",
      "  gl_FragColor = vec4(texture2D(uBg, clamp(uv, 0.0, 1.0)).rgb, 1.0);",
      "} else {",
      "vec4 rawB = texture2D(uBack, clamp(uv, 0.002, 0.998));",
      "float hit = step(0.0015, rawB.a);",
      "float backDist = rawB.a * 16.0;",
      "float frontDist = max(vViewPosition.z, 0.25);",
      "float thickness = mix(0.72, clamp(backDist - frontDist, 0.05, 2.4), hit);",
      "vec3 Nb = rawB.rgb * 2.0 - 1.0;",
      "Nb = mix(vec3(0.0, 0.0, -1.0), normalize(Nb + 1e-5), hit);",
      "vec3 I = -V;",
      "vec3 rR = refract(I, N, 1.0 / 1.45);",
      "vec3 rG = refract(I, N, 1.0 / 1.47);",
      "vec3 rB = refract(I, N, 1.0 / 1.50);",
      "float bend = 0.03 + thickness * 0.09;",
      "vec2 nOff = N.xy * (0.02 + thickness * 0.07);",
      "vec2 oR = rR.xy * bend + nOff + N.xy * (0.01 + fres * 0.02);",
      "vec2 oG = rG.xy * bend + nOff;",
      "vec2 oB = rB.xy * bend + nOff - N.xy * (0.012 + fres * 0.022);",
      "vec3 transmitted;",
      "transmitted.r = texture2D(uBg, clamp(uv + oR, 0.0, 1.0)).r;",
      "transmitted.g = texture2D(uBg, clamp(uv + oG, 0.0, 1.0)).g;",
      "transmitted.b = texture2D(uBg, clamp(uv + oB, 0.0, 1.0)).b;",
      "vec3 ridge = max(transmitted - vec3(0.055), vec3(0.0));",
      "ridge = pow(ridge, vec3(0.62)) * 2.15;",
      "transmitted = vec3(0.045, 0.048, 0.055) + ridge;",
      "vec3 inside = rG;",
      "float entered = clamp(length(inside), 0.0, 1.0);",
      "vec3 exitRay = refract(normalize(inside + vec3(0.0, 0.0, -0.0001)), -Nb, 1.47);",
      "float cosExit = clamp(dot(-normalize(inside + 1e-4), -Nb), 0.0, 1.0);",
      "float tir = max(1.0 - entered, max(1.0 - clamp(length(exitRay), 0.0, 1.0), smoothstep(0.45, 0.05, cosExit)));",
      "tir *= hit;",
      "vec3 spec = outgoingLight;",
      "spec = spec / (vec3(1.0) + spec * 0.7);",
      "spec = pow(max(spec, vec3(0.0)), vec3(0.454545));",
      "vec3 R = reflect(I, N);",
      "float key = pow(clamp(dot(R, normalize(vec3(0.12, 0.48, 0.9))), 0.0, 1.0), 1.35);",
      "float fill = pow(clamp(dot(R, normalize(vec3(-0.9, 0.08, 0.45))), 0.0, 1.0), 1.2);",
      "float brow = pow(clamp(dot(R, normalize(vec3(0.1, 0.95, 0.2))), 0.0, 1.0), 1.5);",
      "vec3 studio = vec3(1.05, 1.06, 1.08) * key;",
      "studio += vec3(0.7, 0.82, 0.98) * fill * 0.55;",
      "studio += vec3(1.0, 0.93, 0.86) * brow * 0.35;",
      "float face = 0.2 + 0.8 * pow(1.0 - ndv, 1.7);",
      "float geo = length(fwidth(N));",
      "float bar = smoothstep(0.06, 0.28, geo);",
      "vec3 col = transmitted;",
      "col = mix(col, studio, face * 0.34);",
      "col += spec * F * 0.9;",
      "col += vec3(1.0, 1.0, 1.0) * bar * 1.7;",
      "col += vec3(0.15, 1.0, 0.48) * smoothstep(0.1, 0.36, geo) * 0.95;",
      "col += vec3(1.0, 0.28, 0.62) * smoothstep(0.14, 0.42, geo) * 0.8;",
      "col += vec3(0.85, 0.94, 1.0) * tir * (0.45 + bar);",
      "col += vec3(0.98, 0.99, 1.0) * pow(1.0 - ndv, 0.55) * 0.42;",
      "gl_FragColor = vec4(col, uFade);",
      "}",
    ].join("\n");
    if (shader.fragmentShader.indexOf("#include <opaque_fragment>") === -1) {
      console.warn("[cube-glass] opaque_fragment missing");
    }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <opaque_fragment>", glass)
      .replace("#include <tonemapping_fragment>", "")
      .replace("#include <colorspace_fragment>", "")
      .replace("#include <premultiplied_alpha_fragment>", "gl_FragColor.rgb *= gl_FragColor.a;");
  };
  mat.customProgramCacheKey = function () {
    return "cosgral-optic-glass-v3";
  };

  mat.onBeforeRender = function (renderer, scene, camera, geometry, object) {
    if (passing) return;
    var mesh = object && object.isMesh ? object : null;
    if (!mesh || !geometry || !camera) return;
    passing = true;
    var prevTarget = null;
    var prevAlpha = 1;
    var prevAuto = true;
    var prevColor = null;
    var prevScissor = false;
    try {
      prevTarget = renderer.getRenderTarget();
      prevAlpha = renderer.getClearAlpha();
      prevAuto = renderer.autoClear;
      prevScissor = renderer.getScissorTest();
      renderer.getClearColor(clearCol);
      prevColor = clearCol.clone();
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
      if (!bgRT) bgRT = makeTarget(w, h, false);
      if (!backRT) backRT = makeTarget(w, h, true);
      fitTarget(bgRT, w, h);
      fitTarget(backRT, w, h);
      resolution.value.set(w, h);
      uBg.value = bgRT.texture;
      uBack.value = backRT.texture;
      var probe = window.__cosgralGlassProbe;
      uDebug.value = probe && probe.mode === "bg" ? 1 : 0;

      var amb = window.__cosgralAmbient;
      var ptr = window.cosgralPointer;
      waveUniforms.uTime.value = amb && typeof amb.t === "number" ? amb.t : performance.now() * 0.001;
      waveUniforms.uMouse.value.set(
        amb && typeof amb.x === "number" ? amb.x : ptr && ptr.nx ? ptr.nx : 0,
        amb && typeof amb.y === "number" ? amb.y : ptr && ptr.ny ? ptr.ny : 0
      );
      waveUniforms.uLight.value = document.body.classList.contains("is-home-ambient-light") ? 1 : 0;
      waveUniforms.uRes.value.set(w, h);

      if (backMesh.geometry !== geometry) backMesh.geometry = geometry;
      mesh.updateWorldMatrix(true, false);
      backMesh.matrix.copy(mesh.matrixWorld);
      backMesh.matrixWorld.copy(mesh.matrixWorld);

      if (scene && scene.environmentRotation && camera.rotation) {
        scene.environmentRotation.copy(camera.rotation);
      }

      renderer.setScissorTest(false);
      renderer.autoClear = true;
      renderer.setClearColor(0x000000, 1);
      renderer.setRenderTarget(bgRT);
      renderer.render(waveScene, waveCam);
      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(backRT);
      renderer.clear();
      renderer.render(backScene, camera);

      if (probe) {
        if (!probeBuf || probeBuf.length !== 64 * 4) probeBuf = new Uint8Array(64 * 4);
        var x0 = Math.max(0, ((w * 0.5) | 0) - 32);
        var y0 = (h * 0.5) | 0;
        renderer.readRenderTargetPixels(bgRT, x0, Math.max(0, y0), 64, 1, probeBuf);
        var max = 0;
        var i;
        for (i = 0; i < probeBuf.length; i += 4) {
          if (probeBuf[i] > max) max = probeBuf[i];
          if (probeBuf[i + 1] > max) max = probeBuf[i + 1];
          if (probeBuf[i + 2] > max) max = probeBuf[i + 2];
        }
        probe.bgMax = max;
        probe.bg = [probeBuf[0], probeBuf[1], probeBuf[2], probeBuf[3]];
        var one = new Uint8Array(4);
        renderer.readRenderTargetPixels(backRT, (w * 0.5) | 0, y0, 1, 1, one);
        probe.back = [one[0], one[1], one[2], one[3]];
        probe.size = [w, h];
        probe.frames = (probe.frames || 0) + 1;
        if (probe.scan && probe.frames % 15 === 0) {
          var row = new Uint8Array(w * 4);
          var maxAll = 0;
          var bright = 0;
          var yy;
          for (yy = 0; yy < h; yy += 6) {
            renderer.readRenderTargetPixels(bgRT, 0, yy, w, 1, row);
            var k;
            for (k = 0; k < row.length; k += 16) {
              if (row[k] > maxAll) maxAll = row[k];
              if (row[k] > 90) bright++;
            }
          }
          probe.bgMaxAll = maxAll;
          probe.bgBright = bright;
          var bmax = 0;
          var bcount = 0;
          for (yy = 0; yy < h; yy += 6) {
            renderer.readRenderTargetPixels(backRT, 0, yy, w, 1, row);
            for (k = 3; k < row.length; k += 16) {
              if (row[k] > bmax) bmax = row[k];
              if (row[k] > 8) bcount++;
            }
          }
          probe.backMaxA = bmax;
          probe.backCount = bcount;
        }
        var gl = renderer.getContext();
        if (probe.floatRT === undefined) probe.floatRT = floatTargetWorks(renderer);
        probe.renderer =
          (gl.getParameter(7937) || "") +
          (gl.getExtension("WEBGL_debug_renderer_info")
            ? " | " + gl.getParameter(gl.getExtension("WEBGL_debug_renderer_info").UNMASKED_RENDERER_WEBGL)
            : "");
      }
    } finally {
      if (prevColor) renderer.setClearColor(prevColor, prevAlpha);
      renderer.setRenderTarget(prevTarget);
      renderer.autoClear = prevAuto;
      renderer.setScissorTest(prevScissor);
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
  var room = new THREE.Color(0.22, 0.24, 0.28);
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
  /* Large softboxes locked to the camera via scene.environmentRotation. */
  addPanel(0.2, 2.2, 6.2, 10.0, 4.4, "#ffffff", 6.5);
  addPanel(-4.2, 0.4, 3.0, 4.2, 6.4, "#e7f0f8", 3.4);
  addPanel(4.0, -0.2, 2.6, 3.8, 5.4, "#f6ece4", 2.6);
  addPanel(0.0, 6.2, 0.4, 8.5, 3.2, "#ffffff", 4.2);
  addPanel(0.2, -4.2, 1.6, 7.2, 2.6, "#d5dee8", 1.8);
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
    scene.environment = pmrem.fromScene(studio, 0.08).texture;
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
