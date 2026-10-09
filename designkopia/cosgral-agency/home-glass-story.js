/**
 * Homepage scrollytelling — real COSGRAL glass cube (cube_web_raw.glb)
 * plus orange/navy sand in the same WebGL scene so transmission refracts it.
 * cube_web.glb is the meshopt twin (same mesh); the raw file avoids a decoder
 * on the scroll path. Glass values match assets/cube/web_glass.json.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";

var GLASS = {
  color: "#ffffff",
  metalness: 0,
  roughness: 0,
  transmission: 1,
  ior: 1.5,
  thickness: 1,
  dispersion: 0.7,
  attenuationColor: "#d5e0ea",
  attenuationDistance: 2.4,
  clearcoat: 1,
  clearcoatRoughness: 0,
  specularIntensity: 1,
  specularColor: "#ffffff",
  envMapIntensity: 1.7,
  iridescence: 1,
  iridescenceIOR: 1.8,
  iridescenceThicknessRange: [350, 850],
  iridescenceNoise: 0.6,
  iridescenceEdgeBias: 0.65,
  edgeGlow: -0.85,
  farSideDim: 0.72,
};

var ORANGE = new THREE.Color("#FF4A1C");
var NAVY = new THREE.Color("#13235E");
var PAPER = new THREE.Color("#F3F0EA");

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function smooth(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}
function range(p, a, b) {
  return clamp((p - a) / (b - a), 0, 1);
}

function loadRawGlb(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error("GLB " + res.status);
    return res.arrayBuffer();
  }).then(function (buf) {
    var view = new DataView(buf);
    if (view.getUint32(0, true) !== 0x46546c67) throw new Error("not glb");
    var off = 12;
    var json = null;
    var bin = null;
    while (off + 8 <= buf.byteLength) {
      var len = view.getUint32(off, true);
      var type = view.getUint32(off + 4, true);
      var start = off + 8;
      if (type === 0x4e4f534a) {
        json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, start, len)));
      } else if (type === 0x004e4942) {
        bin = buf.slice(start, start + len);
      }
      off = start + len;
    }
    if (!json || !bin) throw new Error("glb chunks");
    var prim = json.meshes[0].primitives[0];
    function accessor(index, Ctor, stride) {
      var acc = json.accessors[index];
      var bv = json.bufferViews[acc.bufferView];
      var startByte = bv.byteOffset || 0;
      return new Ctor(bin, startByte, acc.count * stride);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(accessor(prim.attributes.POSITION, Float32Array, 3), 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(accessor(prim.attributes.NORMAL, Float32Array, 3), 3));
    geo.setIndex(new THREE.BufferAttribute(accessor(prim.indices, Uint16Array, 1), 1));
    geo.computeBoundingSphere();
    return geo;
  });
}

function createGlassMaterial(edgeUniform, farUniform) {
  var m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(GLASS.color),
    metalness: GLASS.metalness,
    roughness: GLASS.roughness,
    transmission: GLASS.transmission,
    ior: GLASS.ior,
    thickness: GLASS.thickness,
    dispersion: GLASS.dispersion,
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
    side: THREE.DoubleSide,
  });
  m.onBeforeCompile = function (sh) {
    sh.uniforms.uEdge = edgeUniform;
    sh.uniforms.uFar = farUniform;
    sh.uniforms.uIridNoise = { value: GLASS.iridescenceNoise };
    sh.uniforms.uIridEdge = { value: GLASS.iridescenceEdgeBias };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjN;\nvarying vec3 vViewN;\nvarying vec3 vObjP;")
      .replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\nvObjN = normal;\nvViewN = normalMatrix * normal;\nvObjP = position;"
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vObjN;\nvarying vec3 vViewN;\nvarying vec3 vObjP;\nuniform float uEdge;\nuniform float uFar;\nuniform float uIridNoise;\nuniform float uIridEdge;\nfloat irHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\nfloat irNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);\n  return mix(mix(mix(irHash(i), irHash(i + vec3(1,0,0)), f.x), mix(irHash(i + vec3(0,1,0)), irHash(i + vec3(1,1,0)), f.x), f.y),\n             mix(mix(irHash(i + vec3(0,0,1)), irHash(i + vec3(1,0,1)), f.x), mix(irHash(i + vec3(0,1,1)), irHash(i + vec3(1,1,1)), f.x), f.y), f.z); }"
      )
      .replace(
        "#include <lights_physical_fragment>",
        "#include <lights_physical_fragment>\n#ifdef USE_IRIDESCENCE\nif (uIridNoise > 0.0) {\n  float n = irNoise(vObjP * uIridNoise + 3.1) * 0.65 + irNoise(vObjP * uIridNoise * 2.1 + 7.7) * 0.35;\n  material.iridescenceThickness = mix(iridescenceThicknessMinimum, iridescenceThicknessMaximum, smoothstep(0.2, 0.8, n));\n}\nmaterial.iridescence *= mix(1.0 - uIridEdge, 1.0, pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), 1.5));\n#endif"
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n{\n  vec3 on = normalize(vObjN);\n  float mx = max(max(abs(on.x), abs(on.y)), abs(on.z));\n  float edge = smoothstep(0.995, 0.80, mx);\n  float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.5);\n  bool farSide = dot(normalize(vViewN), normalize(vViewPosition)) < 0.0;\n  float nearFar = farSide ? uFar * 0.5 : 1.0;\n  totalEmissiveRadiance += uEdge * nearFar * edge * (0.55 + 0.9 * fres) * vec3(0.96, 0.98, 1.0);\n}"
      )
      .replace(
        "#include <dithering_fragment>",
        "#include <dithering_fragment>\nif (dot(normalize(vViewN), normalize(vViewPosition)) < 0.0) gl_FragColor.rgb *= mix(1.0, uFar, step(0.0, uEdge));"
      );
  };
  return m;
}

function buildEnv(renderer, pmrem) {
  var env = new THREE.Scene();
  env.background = new THREE.Color(0.08, 0.08, 0.09);
  var plane = new THREE.PlaneGeometry(1, 1);
  function add(pos, size, power, color) {
    var mat = new THREE.MeshBasicMaterial({ color: color || 0xffffff, side: THREE.DoubleSide });
    mat.color.multiplyScalar(power);
    var mesh = new THREE.Mesh(plane, mat);
    mesh.position.set(pos[0], pos[1], pos[2]);
    mesh.scale.set(size[0], size[1], 1);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  }
  add([0, 8, 0], [8, 8], 3.2);
  add([-7, 2, 2], [0.7, 8], 5.5);
  add([7, 1, -2], [0.7, 8], 5.2);
  add([2, 3, 7], [5, 0.7], 4.2);
  add([-3, 2, -7], [1, 6], 3.4);
  add([5, 4, 5], [2.2, 2.2], 3.6, 0xff6a2b);
  add([-5, 3, 4], [2.4, 3.2], 2.8, 0x1a2f86);
  add([4, -3, -5], [3, 2], 2.2, 0xff4a1c);
  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.16, 0.16, 0.17) })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5;
  env.add(floor);
  return pmrem.fromScene(env, 0.04).texture;
}

(function boot() {
  var canvas = document.getElementById("story-gl");
  var track = document.getElementById("top");
  if (!canvas || !track || !track.classList.contains("story-track")) return;

  var reduced = document.documentElement.classList.contains("reduce-motion");
  var mobile = window.matchMedia("(max-width: 900px)").matches;
  var chapters = Array.prototype.slice.call(track.querySelectorAll("[data-story-chapter]"));
  var counter = track.querySelector("[data-story-count]");
  var edgeUniform = { value: GLASS.edgeGlow };
  var farUniform = { value: GLASS.farSideDim };

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !mobile,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (err) {
    console.error("[glass-story] WebGL", err);
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.15 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(PAPER, 1);

  var scene = new THREE.Scene();
  scene.background = PAPER;
  scene.backgroundIntensity = 1.25;
  var camera = new THREE.PerspectiveCamera(mobile ? 38 : 32, 1, 0.08, 40);
  camera.position.set(0, 0.15, mobile ? 7.4 : 6.35);

  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = buildEnv(renderer, pmrem);
  scene.environmentIntensity = 1;

  var sheetUniforms = { uTime: { value: 0 }, uMix: { value: 0.35 } };
  var sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.ShaderMaterial({
      uniforms: sheetUniforms,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: [
        "varying vec2 vUv; uniform float uTime; uniform float uMix;",
        "void main(){",
        "  float n = sin(vUv.x * 9.0 + uTime * 0.45) * 0.5 + 0.5;",
        "  float m = sin(vUv.y * 6.5 - uTime * 0.28 + vUv.x * 2.4) * 0.5 + 0.5;",
        "  vec3 paper = vec3(0.953, 0.941, 0.918);",
        "  vec3 orange = vec3(1.0, 0.290, 0.110);",
        "  vec3 navy = vec3(0.075, 0.137, 0.369);",
        "  float band = smoothstep(0.25, 0.82, n * 0.65 + m * 0.55);",
        "  vec3 col = mix(paper, mix(navy, orange, n), band * (0.45 + uMix));",
        "  gl_FragColor = vec4(col, 1.0);",
        "}",
      ].join("\n"),
    })
  );
  sheet.position.set(0, 0, -1.15);
  scene.add(sheet);

  var orangeBlob = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, mobile ? 20 : 28, mobile ? 16 : 22),
    new THREE.MeshBasicMaterial({ color: ORANGE })
  );
  var navyBlob = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, mobile ? 20 : 28, mobile ? 16 : 22),
    new THREE.MeshBasicMaterial({ color: NAVY })
  );
  orangeBlob.position.set(-2.15, -0.35, -1.25);
  navyBlob.position.set(2.25, 0.45, -1.45);
  scene.add(orangeBlob, navyBlob);

  var cube = new THREE.Group();
  scene.add(cube);
  var cubeMat = null;

  var grainCount = reduced ? 0 : mobile ? 18 : 56;
  var pointCount = reduced ? 0 : mobile ? 520 : 2200;
  var grains = null;
  var points = null;
  var grainHome = null;
  var grainFlow = null;
  var dummy = new THREE.Object3D();
  var orangeC = new THREE.Color("#FF4A1C");
  var navyC = new THREE.Color("#0E1A4F");

  function buildSand(geo) {
    var src = geo.attributes.position.array;
    var vcount = src.length / 3;
    if (grainCount) {
      grains = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.042, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
        grainCount
      );
      grainHome = new Float32Array(grainCount * 3);
      grainFlow = new Float32Array(grainCount * 3);
      for (var i = 0; i < grainCount; i++) {
        var vi = Math.floor(Math.random() * vcount) * 3;
        grainHome[i * 3] = src[vi];
        grainHome[i * 3 + 1] = src[vi + 1];
        grainHome[i * 3 + 2] = src[vi + 2];
        var ang = Math.random() * Math.PI * 2;
        var y = (Math.random() - 0.5) * 4.4;
        var rad = 0.35 + Math.abs(y) * 0.55 + Math.random() * 1.6;
        grainFlow[i * 3] = Math.cos(ang) * rad * (i % 2 ? 1 : -1);
        grainFlow[i * 3 + 1] = y;
        grainFlow[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
        grains.setColorAt(i, i % 5 < 3 ? orangeC : navyC);
      }
      scene.add(grains);
    }
    if (!pointCount) return;
    var home = new Float32Array(pointCount * 3);
    var flow = new Float32Array(pointCount * 3);
    var col = new Float32Array(pointCount * 3);
    var seed = new Float32Array(pointCount);
    for (var p = 0; p < pointCount; p++) {
      var j = Math.floor(Math.random() * vcount) * 3;
      home[p * 3] = src[j];
      home[p * 3 + 1] = src[j + 1];
      home[p * 3 + 2] = src[j + 2];
      var a = Math.random() * Math.PI * 2;
      var py = (Math.random() - 0.5) * 4.6;
      var pr = 0.4 + Math.abs(py) * 0.62 + Math.random() * 1.8;
      var side = p % 2 ? 1 : -1;
      flow[p * 3] = Math.cos(a) * pr * side;
      flow[p * 3 + 1] = py;
      flow[p * 3 + 2] = (Math.random() - 0.5) * 1.5;
      var useOrange = p % 5 < 3;
      col[p * 3] = useOrange ? 1 : 0.055;
      col[p * 3 + 1] = useOrange ? 0.29 : 0.102;
      col[p * 3 + 2] = useOrange ? 0.11 : 0.31;
      seed[p] = Math.random();
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(home, 3));
    g.setAttribute("aFlow", new THREE.BufferAttribute(flow, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    points = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: false,
        alphaTest: 0.45,
        depthWrite: false,
        uniforms: {
          uBreak: { value: 0 },
          uTime: { value: 0 },
          uHour: { value: 0 },
        },
        vertexShader: [
          "attribute vec3 aFlow;",
          "attribute vec3 aColor;",
          "attribute float aSeed;",
          "uniform float uBreak;",
          "uniform float uTime;",
          "uniform float uHour;",
          "varying vec3 vColor;",
          "varying float vAlpha;",
          "void main(){",
          "  float b = clamp(uBreak, 0.0, 1.0);",
          "  vec3 flow = aFlow;",
          "  flow.x += sin(uTime * 0.32 + aSeed * 14.0) * 0.28;",
          "  flow.y += cos(uTime * 0.2 + aSeed * 9.0) * 0.16;",
          "  float pinch = mix(1.0, 0.16 + pow(abs(flow.y) * 0.42, 1.15), uHour);",
          "  flow.x *= pinch;",
          "  vec3 pos = mix(position, flow, b);",
          "  float burst = sin(b * 3.14159);",
          "  pos += normalize(position + 0.0001) * burst * 1.15;",
          "  vec4 mv = modelViewMatrix * vec4(pos, 1.0);",
          "  gl_PointSize = mix(2.1, 4.4, aSeed) * (1.0 + burst * 0.8) * (180.0 / max(1.2, -mv.z));",
          "  gl_Position = projectionMatrix * mv;",
          "  vColor = aColor;",
          "  vAlpha = mix(0.15, 1.0, smoothstep(0.0, 0.2, b));",
          "}",
        ].join("\n"),
        fragmentShader: [
          "varying vec3 vColor; varying float vAlpha;",
          "void main(){",
          "  float d = length(gl_PointCoord - 0.5);",
          "  if (d > 0.5) discard;",
          "  float a = smoothstep(0.5, 0.12, d) * vAlpha;",
          "  if (a < 0.45) discard;",
          "  gl_FragColor = vec4(vColor, 1.0);",
          "}",
        ].join("\n"),
      })
    );
    scene.add(points);
  }

  var quat = new THREE.Quaternion();
  var targetQ = new THREE.Quaternion();
  var euler = new THREE.Euler();
  var pose = { rx: 0.5, ry: -0.62, rz: 0.06, sc: 1.05, x: 0, br: 0, hour: 0, spin: 0 };
  var scrollP = 0;
  var running = true;
  var frames = 0;
  var fpsT0 = performance.now();
  var adapted = false;
  var clock = new THREE.Clock();

  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function applyPose(p, time) {
    var intro = range(p, 0, 0.08);
    var toC = range(p, 0.08, 0.16);
    var toG = range(p, 0.16, 0.26);
    var sand = range(p, 0.26, 0.44);
    var sandWave = Math.sin(clamp((p - 0.26) / 0.18, 0, 1) * Math.PI);
    var services = range(p, 0.44, 0.76);
    var hour = range(p, 0.74, 0.88);
    var motto = range(p, 0.86, 1);

    var rx = lerp(0.48, -1.05, smooth(toC));
    rx = lerp(rx, 0.08, smooth(toG));
    var ry = lerp(-0.62, 0.18, smooth(toC));
    ry = lerp(ry, 0.02, smooth(toG));
    ry += sand * 0.9 + services * 1.6 + time * (services > 0 && hour < 0.4 ? 0.15 : 0.05);
    var rz = lerp(0.08, 0, smooth(toG));
    var sc = lerp(1.05, 1.2, smooth(intro));
    sc = lerp(sc, 0.96, sand * 0.35);
    sc = lerp(sc, mobile ? 0.78 : 0.86, smooth(services) * (1 - motto));
    sc = lerp(sc, mobile ? 1.05 : 1.22, smooth(motto));
    var x = lerp(0, mobile ? 0.15 : 0.85, smooth(services) * (1 - smooth(hour)));
    x = lerp(x, 0, smooth(motto));

    pose.rx = rx;
    pose.ry = ry;
    pose.rz = rz;
    pose.sc = sc * (1 - sandWave * 0.18);
    pose.x = x;
    pose.br = Math.max(sandWave, smooth(hour) * 0.72) * (1 - smooth(motto) * 0.85);
    pose.hour = smooth(hour) * (1 - smooth(motto));
    pose.spin = services;
  }

  function updateChapters(p) {
    var active = 0;
    for (var i = 0; i < chapters.length; i++) {
      var el = chapters[i];
      var a = parseFloat(el.getAttribute("data-a"));
      var b = parseFloat(el.getAttribute("data-b"));
      var fade = parseFloat(el.getAttribute("data-fade") || "0.03");
      var inn = a <= 0.001 ? 1 : smooth(range(p, a - fade, a));
      var out = 1 - smooth(range(p, b, b + fade));
      var alpha = clamp(inn * out, 0, 1);
      el.style.opacity = String(alpha);
      el.style.setProperty("--a", String(alpha));
      var on = alpha > 0.45;
      el.style.pointerEvents = on ? "auto" : "none";
      if (alpha > 0.35) el.removeAttribute("aria-hidden");
      else el.setAttribute("aria-hidden", "true");
      if (alpha > 0.5) active = i;
    }
    if (counter) {
      var n = String(active + 1).padStart(2, "0");
      if (counter.textContent !== n) counter.textContent = n;
    }
  }

  function frame() {
    if (!running) return;
    var time = clock.getElapsedTime();
    var rect = track.getBoundingClientRect();
    var scrollable = Math.max(1, track.offsetHeight - window.innerHeight);
    scrollP = clamp(-rect.top / scrollable, 0, 1);
    applyPose(scrollP, time);
    updateChapters(scrollP);

    euler.set(pose.rx, pose.ry, pose.rz);
    targetQ.setFromEuler(euler);
    quat.slerp(targetQ, reduced ? 1 : 0.08);
    cube.quaternion.copy(quat);
    cube.scale.setScalar(Math.max(0.05, pose.sc));
    cube.position.x += (pose.x - cube.position.x) * 0.08;
    cube.position.y = Math.sin(time * 0.6) * 0.04;

    sheet.scale.setScalar(lerp(1, 2.35, pose.br));
    sheetUniforms.uTime.value = time;
    sheetUniforms.uMix.value = 0.62 + pose.br * 0.7;
    orangeBlob.position.x = lerp(-2.15, -1.15, pose.br);
    orangeBlob.position.y = lerp(-0.35, -0.05, pose.br) + Math.sin(time * 0.4) * 0.08;
    navyBlob.position.x = lerp(2.25, 1.2, pose.br);
    navyBlob.position.y = lerp(0.45, 0.1, pose.br);

    if (points) {
      points.material.uniforms.uBreak.value = pose.br;
      points.material.uniforms.uTime.value = time;
      points.material.uniforms.uHour.value = pose.hour;
    }
    if (grains && grainHome) {
      for (var i = 0; i < grainCount; i++) {
        var t = pose.br;
        var wob = Math.sin(time * 0.7 + i) * 0.12 * t;
        dummy.position.set(
          lerp(grainHome[i * 3], grainFlow[i * 3], t) + wob,
          lerp(grainHome[i * 3 + 1], grainFlow[i * 3 + 1], t),
          lerp(grainHome[i * 3 + 2], grainFlow[i * 3 + 2], t)
        );
        var s = lerp(0.35, 1.35, t) * (0.75 + (i % 5) * 0.08);
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        grains.setMatrixAt(i, dummy.matrix);
      }
      grains.instanceMatrix.needsUpdate = true;
    }

    renderer.render(scene, camera);

    frames++;
    if (!adapted && frames === 40) {
      adapted = true;
      var fps = 40000 / Math.max(1, performance.now() - fpsT0);
      if (fps < 42) {
        renderer.setPixelRatio(1);
        resize();
        if (cubeMat && fps < 28) {
          cubeMat.dispersion = 0;
          cubeMat.transmission = mobile ? 0.92 : 1;
          cubeMat.needsUpdate = true;
        }
      }
    }
  }

  function loop() {
    if (!running) return;
    frame();
    requestAnimationFrame(loop);
  }

  function startLoop() {
    if (reduced) {
      pose.br = 0;
      frame();
      frame();
      running = false;
      return;
    }
    requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener("resize", resize);

  var seen = true;
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      seen = entries[0].isIntersecting;
      running = seen && !reduced;
      if (running) requestAnimationFrame(loop);
    }, { threshold: 0 });
    io.observe(track);
  }

  window.cosgralCube = window.cosgralCube || {};
  window.cosgralCube.getMenuFaceRect = function () {
    var size = Math.min(window.innerWidth * (mobile ? 0.88 : 0.46), mobile ? 420 : 520);
    return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, size: size };
  };

  var glbUrl = new URL("./assets/cube/cube_web_raw.glb", import.meta.url);
  loadRawGlb(glbUrl.href).then(function (geo) {
    cubeMat = createGlassMaterial(edgeUniform, farUniform);
    if (mobile) {
      cubeMat.dispersion = 0.28;
    }
    var mesh = new THREE.Mesh(geo, cubeMat);
    cube.add(mesh);
    buildSand(geo);
    updateChapters(0);
    startLoop();
  }).catch(function (err) {
    console.error("[glass-story] cube", err);
  });
})();
