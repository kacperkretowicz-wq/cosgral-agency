/**
 * Montaż theme — animated abstract aesthetic field (pin-style), no reel media.
 * Soft luminous orbs + grain on deep black; reacts to cosgralPointer (mouse / gyro).
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  var VERT = "attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }";

  var FRAG = [
    "precision mediump float;",
    "uniform vec2 uRes;",
    "uniform float uTime;",
    "uniform vec2 uMouse;",
    "float hash(vec2 p){",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
    "}",
    "float noise(vec2 p){",
    "  vec2 i = floor(p);",
    "  vec2 f = fract(p);",
    "  float a = hash(i);",
    "  float b = hash(i + vec2(1.0, 0.0));",
    "  float c = hash(i + vec2(0.0, 1.0));",
    "  float d = hash(i + vec2(1.0, 1.0));",
    "  vec2 u = f * f * (3.0 - 2.0 * f);",
    "  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;",
    "}",
    "float fbm(vec2 p){",
    "  float v = 0.0; float a = 0.5;",
    "  for (int i = 0; i < 5; i++) {",
    "    v += a * noise(p);",
    "    p = p * 2.05 + vec2(1.7, 9.2);",
    "    a *= 0.5;",
    "  }",
    "  return v;",
    "}",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / uRes.xy;",
    "  float aspect = uRes.x / max(uRes.y, 1.0);",
    "  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);",
    "  vec2 m = uMouse * 0.5;",
    "  float t = uTime * 0.12;",
    "  /* Slow drift of the whole field toward pointer / gyro */",
    "  p -= m * 0.22;",
    "  vec2 q = p + vec2(sin(t * 0.7), cos(t * 0.55)) * 0.08;",
    "  float n = fbm(q * 1.65 + vec2(t * 0.35, -t * 0.28));",
    "  float n2 = fbm(q * 2.8 - vec2(t * 0.2, t * 0.15) + n * 0.9);",
    "  /* Soft luminous orbs */",
    "  vec2 c1 = vec2(sin(t * 0.6) * 0.35, cos(t * 0.45) * 0.22) + m * 0.35;",
    "  vec2 c2 = vec2(cos(t * 0.5 + 1.2) * 0.42, sin(t * 0.7 + 0.8) * 0.28) - m * 0.25;",
    "  vec2 c3 = vec2(sin(t * 0.35 + 2.4) * 0.2, cos(t * 0.55 + 1.6) * 0.38) + m * 0.18;",
    "  float o1 = exp(-length(p - c1) * 2.4);",
    "  float o2 = exp(-length(p - c2) * 2.1);",
    "  float o3 = exp(-length(p - c3) * 2.8);",
    "  float glow = o1 * 0.9 + o2 * 0.7 + o3 * 0.55;",
    "  glow += pow(n2, 2.2) * 0.45;",
    "  /* Silk ridges — abstract aesthetic wash */",
    "  float ridge = pow(1.0 - abs(sin(n * 5.5 + t * 0.4 + n2 * 2.0)), 8.0);",
    "  vec3 base = vec3(0.035, 0.035, 0.038);",
    "  vec3 mid = vec3(0.18, 0.18, 0.2);",
    "  vec3 hi = vec3(0.78, 0.78, 0.82);",
    "  vec3 warm = vec3(0.55, 0.52, 0.48);",
    "  vec3 col = base;",
    "  col = mix(col, mid, smoothstep(0.15, 0.85, n) * 0.75);",
    "  col = mix(col, warm * 0.55, glow * 0.35);",
    "  col += hi * ridge * 0.22;",
    "  col += hi * glow * 0.28;",
    "  col += mid * pow(max(0.0, 1.0 - length(p - m * 0.5) * 1.8), 3.0) * 0.35;",
    "  /* Fine grain */",
    "  float g = hash(uv * uRes.xy * 0.5 + fract(uTime) * 40.0) - 0.5;",
    "  col += g * 0.028;",
    "  float vig = smoothstep(1.25, 0.2, length(p));",
    "  col *= 0.55 + vig * 0.45;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}",
  ].join("\n");

  function bootCanvas(canvas) {
    var gl =
      canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" }) ||
      canvas.getContext("experimental-webgl");
    if (!gl) {
      canvas.style.background =
        "radial-gradient(ellipse 120% 80% at 40% 35%, #2a2a2e 0%, #0a0a0a 55%, #050505 100%)";
      return;
    }

    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("[portfolio-montaz-bg]", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }

    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
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

    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var running = false;
    var start = performance.now();
    var frameSkip = 0;
    var dprCap = MOBILE ? 0.7 : 0.85;

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, dprCap);
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
      frameSkip += 1;
      if (MOBILE && frameSkip % 2 !== 0) {
        requestAnimationFrame(frame);
        return;
      }
      var ptr = window.cosgralPointer;
      if (ptr) {
        mouse.tx = ptr.nx;
        mouse.ty = ptr.ny;
      }
      mouse.x += (mouse.tx - mouse.x) * 0.07;
      mouse.y += (mouse.ty - mouse.y) * 0.07;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }

    function play() {
      if (!running) {
        running = true;
        requestAnimationFrame(frame);
      }
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, 0);
    gl.uniform2f(uMouse, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    play();

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) running = false;
      else play();
    });
  }

  var nodes = document.querySelectorAll("[data-montaz-ambient]");
  for (var i = 0; i < nodes.length; i++) bootCanvas(nodes[i]);
})();
