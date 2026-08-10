/**
 * Subpage ambient — domyślne fale (portfolio) lub unikalne efekty per usługa.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("subpage-ambient");
  if (!canvas) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;
  if (document.body && document.body.classList.contains("service-page")) return;

  var themeId =
    (document.body && document.body.getAttribute("data-service-theme")) || "default";

  var VERT =
    "attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }";

  var COMMON =
    "precision mediump float;\n" +
    "uniform vec2 uRes;\n" +
    "uniform float uTime;\n" +
    "uniform vec2 uMouse;\n" +
    "uniform vec3 uBase;\n" +
    "uniform vec3 uAccent;\n" +
    "uniform vec3 uHighlight;\n" +
    "float mForce(vec2 uv) {\n" +
    "  vec2 m = uMouse * 0.5 + 0.5;\n" +
    "  return smoothstep(0.58, 0.0, length(uv - m));\n" +
    "}\n" +
    "float hash(vec2 p) {\n" +
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n" +
    "}\n" +
    "float vignette(vec2 uv) {\n" +
    "  return smoothstep(1.18, 0.32, length(uv - 0.5));\n" +
    "}\n";

  var SHADERS = {
    default:
      COMMON +
      "float wave(vec2 p, float t) {\n" +
      "  float w = 0.0; float amp = 1.0;\n" +
      "  for (int i = 0; i < 4; i++) {\n" +
      "    float fi = float(i);\n" +
      "    p.x += sin(p.y * (1.4 + fi * 0.35) + t * 0.7) * 0.18;\n" +
      "    w += sin(p.x * (1.8 + fi * 0.7) + p.y * 1.1 + t * (0.5 + fi * 0.08)) * amp;\n" +
      "    amp *= 0.58;\n" +
      "  }\n" +
      "  return w * 0.5 + 0.5;\n" +
      "}\n" +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / uRes.xy;\n" +
      "  vec2 p = uv * vec2(2.8, 2.0);\n" +
      "  vec2 m = uMouse * 0.5 + 0.5;\n" +
      "  vec2 toM = uv - m;\n" +
      "  float mf = mForce(uv);\n" +
      "  p += normalize(toM + 0.0001) * mf * 0.17 * sin(uTime * 1.7 + length(toM) * 13.0);\n" +
      "  float t = uTime * 0.14;\n" +
      "  float w = wave(p, t);\n" +
      "  float ridge = pow(1.0 - abs(sin(w * 4.2 + t * 0.25)), 6.0);\n" +
      "  vec3 col = uBase;\n" +
      "  col = mix(col, uAccent, smoothstep(0.08, 0.88, ridge) * 0.58);\n" +
      "  col += uHighlight * pow(ridge, 14.0) * 0.32;\n" +
      "  col += uAccent * mf * 0.16;\n" +
      "  col *= 0.58 + vignette(uv) * 0.42;\n" +
      "  gl_FragColor = vec4(col, 1.0);\n" +
      "}",

    blue:
      COMMON +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / uRes.xy;\n" +
      "  float t = uTime * 0.11;\n" +
      "  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);\n" +
      "  float mf = mForce(uv);\n" +
      "  float horizon = 0.08 + sin(t * 0.3) * 0.02;\n" +
      "  float depth = 1.0 / max(0.12, p.y + 0.95 + horizon);\n" +
      "  float scroll = t * 0.55 + mf * 0.2;\n" +
      "  float gx = abs(fract(p.x * depth * 2.8 + scroll) - 0.5);\n" +
      "  float gy = abs(fract(depth * 2.2 - scroll * 0.7) - 0.5);\n" +
      "  float lineX = smoothstep(0.48, 0.0, gx);\n" +
      "  float lineY = smoothstep(0.48, 0.0, gy);\n" +
      "  float grid = max(lineX, lineY) * smoothstep(-0.35, 0.15, p.y);\n" +
      "  float glow = pow(grid, 5.0);\n" +
      "  vec3 col = uBase;\n" +
      "  col = mix(col, uAccent, grid * 0.42);\n" +
      "  col += uHighlight * glow * 0.55;\n" +
      "  col += uHighlight * mf * 0.12;\n" +
      "  col *= 0.62 + vignette(uv) * 0.38;\n" +
      "  gl_FragColor = vec4(col, 1.0);\n" +
      "}",

    purple:
      COMMON +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / uRes.xy;\n" +
      "  float t = uTime * 0.13;\n" +
      "  float mf = mForce(uv);\n" +
      "  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);\n" +
      "  vec3 col = uBase;\n" +
      "  for (int i = 0; i < 9; i++) {\n" +
      "    float fi = float(i);\n" +
      "    vec2 id = vec2(mod(fi, 3.0), floor(fi / 3.0));\n" +
      "    vec2 cell = (id + 0.5) / 3.0;\n" +
      "    vec2 npos = cell + vec2(sin(t * 0.7 + fi * 1.3) * 0.08, cos(t * 0.55 + fi * 0.9) * 0.08);\n" +
      "    vec2 np = (npos - uv) * aspect;\n" +
      "    float d = length(np);\n" +
      "    float node = smoothstep(0.09, 0.0, d);\n" +
      "    float pulse = sin(t * 2.0 + fi) * 0.5 + 0.5;\n" +
      "    col += uHighlight * node * (0.35 + pulse * 0.25);\n" +
      "    col += uAccent * smoothstep(0.22, 0.0, d) * 0.18;\n" +
      "    vec2 c2 = (vec2(hash(id + 1.7), hash(id + 4.2)) + vec2(sin(t + fi), cos(t * 0.8 + fi)) * 0.06);\n" +
      "    vec2 link = (c2 - uv) * aspect;\n" +
      "    float ld = length(link);\n" +
      "    float line = smoothstep(0.012, 0.0, abs(link.y)) * smoothstep(0.35, 0.0, ld);\n" +
      "    col += uAccent * line * 0.22;\n" +
      "  }\n" +
      "  col += uHighlight * mf * 0.14;\n" +
      "  col *= 0.64 + vignette(uv) * 0.36;\n" +
      "  gl_FragColor = vec4(col, 1.0);\n" +
      "}",

    gold:
      COMMON +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / uRes.xy;\n" +
      "  float t = uTime * 0.16;\n" +
      "  vec2 m = uMouse * 0.5 + 0.5;\n" +
      "  vec2 c = mix(vec2(0.5), m, 0.35);\n" +
      "  float d = length((uv - c) * vec2(uRes.x / uRes.y, 1.0));\n" +
      "  float mf = mForce(uv);\n" +
      "  float sweep = fract(d * 5.5 - t * 0.9);\n" +
      "  float ring = smoothstep(0.92, 1.0, sweep) + smoothstep(0.0, 0.06, sweep);\n" +
      "  ring *= smoothstep(1.1, 0.0, d);\n" +
      "  float ping = sin(d * 28.0 - t * 3.2) * 0.5 + 0.5;\n" +
      "  ping *= smoothstep(0.85, 0.0, abs(fract(d * 3.0 - t * 0.5) - 0.5));\n" +
      "  vec3 col = uBase;\n" +
      "  col = mix(col, uAccent, ring * 0.38);\n" +
      "  col += uHighlight * pow(ring, 6.0) * 0.45;\n" +
      "  col += uAccent * ping * 0.12;\n" +
      "  col += uHighlight * mf * 0.1;\n" +
      "  col *= 0.6 + vignette(uv) * 0.4;\n" +
      "  gl_FragColor = vec4(col, 1.0);\n" +
      "}",

    orange:
      COMMON +
      "float trace(vec2 p, float t) {\n" +
      "  float v = 0.0;\n" +
      "  p *= 4.0;\n" +
      "  vec2 id = floor(p);\n" +
      "  vec2 f = fract(p);\n" +
      "  float h = hash(id);\n" +
      "  float path = step(0.55, h);\n" +
      "  float horiz = smoothstep(0.04, 0.0, abs(f.y - 0.5 + sin(t + h * 6.0) * 0.35)) * path;\n" +
      "  float vert = smoothstep(0.04, 0.0, abs(f.x - 0.5 + cos(t * 0.8 + h * 4.0) * 0.35)) * (1.0 - path);\n" +
      "  return max(horiz, vert);\n" +
      "}\n" +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / uRes.xy;\n" +
      "  float t = uTime * 0.2;\n" +
      "  float mf = mForce(uv);\n" +
      "  vec2 p = uv * vec2(3.2, 2.4) + vec2(t * 0.08, 0.0);\n" +
      "  float tr = trace(p, t);\n" +
      "  float tr2 = trace(p * 1.6 + 2.1, t * 1.1);\n" +
      "  float pulse = sin(uTime * 3.0 + p.x * 8.0) * 0.5 + 0.5;\n" +
      "  vec3 col = uBase;\n" +
      "  col = mix(col, uAccent, max(tr, tr2 * 0.7) * 0.5);\n" +
      "  col += uHighlight * pow(max(tr, tr2), 5.0) * (0.35 + pulse * 0.2);\n" +
      "  col += uAccent * mf * 0.12;\n" +
      "  col *= 0.63 + vignette(uv) * 0.37;\n" +
      "  gl_FragColor = vec4(col, 1.0);\n" +
      "}",

    crimson:
      COMMON +
      "float branch(vec2 p, float t, float scale) {\n" +
      "  p *= scale;\n" +
      "  float v = 0.0;\n" +
      "  for (int i = 0; i < 3; i++) {\n" +
      "    float fi = float(i);\n" +
      "    float ang = t * 0.15 + fi * 2.1;\n" +
      "    vec2 dir = vec2(cos(ang), sin(ang * 0.7));\n" +
      "    float line = smoothstep(0.025, 0.0, abs(dot(p, vec2(-dir.y, dir.x))));\n" +
      "    line *= smoothstep(1.2, 0.0, abs(dot(p, dir) - sin(p.x * 3.0 + t) * 0.15));\n" +
      "    v = max(v, line);\n" +
      "  }\n" +
      "  return v;\n" +
      "}\n" +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / uRes.xy;\n" +
      "  float t = uTime * 0.14;\n" +
      "  float mf = mForce(uv);\n" +
      "  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);\n" +
      "  float net = branch(p + vec2(0.1, 0.0), t, 2.8);\n" +
      "  net = max(net, branch(p - vec2(0.15, 0.08), t * 1.1, 3.4) * 0.8);\n" +
      "  float nodes = 0.0;\n" +
      "  for (int j = 0; j < 5; j++) {\n" +
      "    float fj = float(j);\n" +
      "    vec2 n = vec2(hash(vec2(fj, 1.0)), hash(vec2(fj, 2.0)));\n" +
      "    n += vec2(sin(t + fj), cos(t * 0.7 + fj)) * 0.04;\n" +
      "    nodes += smoothstep(0.05, 0.0, length((uv - n) * vec2(uRes.x / uRes.y, 1.0)));\n" +
      "  }\n" +
      "  vec3 col = uBase;\n" +
      "  col = mix(col, uAccent, net * 0.45);\n" +
      "  col += uHighlight * pow(net, 5.0) * 0.4;\n" +
      "  col += uHighlight * nodes * 0.2;\n" +
      "  col += uAccent * mf * 0.11;\n" +
      "  col *= 0.62 + vignette(uv) * 0.38;\n" +
      "  gl_FragColor = vec4(col, 1.0);\n" +
      "}",

    green:
      COMMON +
      "void main() {\n" +
      "  vec2 uv = gl_FragCoord.xy / uRes.xy;\n" +
      "  float t = uTime * 0.12;\n" +
      "  float mf = mForce(uv);\n" +
      "  float band = 0.0;\n" +
      "  for (int i = 0; i < 4; i++) {\n" +
      "    float fi = float(i);\n" +
      "    float y = 0.25 + fi * 0.18 + sin(t * 0.6 + fi * 1.7) * 0.06;\n" +
      "    float curve = y + sin(uv.x * 6.0 + t + fi * 2.0) * 0.04;\n" +
      "    float stripe = smoothstep(0.06, 0.0, abs(uv.y - curve));\n" +
      "    float scan = sin(uv.x * 40.0 + t * 4.0 + fi * 3.0) * 0.5 + 0.5;\n" +
      "    band += stripe * (0.4 + scan * 0.35);\n" +
      "  }\n" +
      "  float mist = sin(uv.y * 8.0 + t) * sin(uv.x * 5.0 - t * 0.5) * 0.5 + 0.5;\n" +
      "  vec3 col = uBase;\n" +
      "  col = mix(col, uAccent, band * 0.42);\n" +
      "  col += uHighlight * pow(band, 4.0) * 0.38;\n" +
      "  col += uAccent * mist * 0.08;\n" +
      "  col += uHighlight * mf * 0.12;\n" +
      "  col *= 0.64 + vignette(uv) * 0.36;\n" +
      "  gl_FragColor = vec4(col, 1.0);\n" +
      "}",
  };

  function hexToRgb(hex) {
    var h = (hex || "#060606").replace("#", "");
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }

  function themeColors() {
    var theme = window.cosgralServiceThemes?.themes?.[themeId];
    if (theme) {
      return {
        base: hexToRgb(theme.bg),
        accent: hexToRgb(theme.accent),
        highlight: hexToRgb(theme.highlight),
      };
    }
    return {
      base: [0.055, 0.055, 0.055],
      accent: [0.24, 0.24, 0.24],
      highlight: [0.58, 0.58, 0.58],
    };
  }

  var fragSrc = SHADERS[themeId] || SHADERS.default;
  var colors = themeColors();

  function boot() {
    var gl =
      canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" }) ||
      canvas.getContext("experimental-webgl");

    if (!gl) {
      canvas.remove();
      return;
    }

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("[subpage-ambient-bg]", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }

    function buildProgram(src) {
      var vs = compile(gl.VERTEX_SHADER, VERT);
      var fs = compile(gl.FRAGMENT_SHADER, src);
      if (!vs || !fs) return null;

      var program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
      return program;
    }

    var program = buildProgram(fragSrc);
    if (!program && themeId !== "default") {
      program = buildProgram(SHADERS.default);
    }
    if (!program) {
      canvas.remove();
      return;
    }

    gl.useProgram(program);

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    var uRes = gl.getUniformLocation(program, "uRes");
    var uTime = gl.getUniformLocation(program, "uTime");
    var uMouse = gl.getUniformLocation(program, "uMouse");
    var uBase = gl.getUniformLocation(program, "uBase");
    var uAccent = gl.getUniformLocation(program, "uAccent");
    var uHighlight = gl.getUniformLocation(program, "uHighlight");

    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var running = false;
    var start = performance.now();
    var MOBILE =
      window.matchMedia("(max-width: 900px)").matches ||
      window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    function resize() {
      var cap = themeId !== "default" ? (MOBILE ? 1.1 : 1.35) : 1.5;
      var dpr = Math.min(window.devicePixelRatio || 1, cap);
      var w = Math.round(window.innerWidth * dpr);
      var h = Math.round(window.innerHeight * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    function frame(now) {
      if (!running) return;
      resize();

      var ptr = window.cosgralPointer;
      if (ptr) {
        mouse.tx = ptr.nx;
        mouse.ty = ptr.ny;
      }
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform3fv(uBase, colors.base);
      gl.uniform3fv(uAccent, colors.accent);
      gl.uniform3fv(uHighlight, colors.highlight);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      requestAnimationFrame(frame);
    }

    function play() {
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    }

    function pause() {
      running = false;
    }

    if (themeId !== "default") {
      canvas.classList.add("subpage-ambient--themed");
    }

    window.addEventListener("resize", resize);
    resize();
    play();

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause();
      else play();
    });
  }

  if (themeId !== "default" && "requestIdleCallback" in window) {
    requestIdleCallback(boot, { timeout: 120 });
  } else {
    requestAnimationFrame(boot);
  }
})();
