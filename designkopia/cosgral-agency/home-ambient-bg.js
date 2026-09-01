/**
 * Full-page liquid waves — uniform B&W, cursor-reactive (fixed behind all sections).
 */
(function () {
  "use strict";

  var canvas = document.getElementById("home-ambient");
  if (!canvas) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  var VERT = "\n    attribute vec2 aPos;\n    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }\n  ";

  // uGrade = korekcja barwna przeniesiona z CSS `filter` na .home-ambient
  // (x = kontrast, y = jasność). Shader i tak zwraca czystą szarość, więc
  // grayscale(1) był tam pełnoekranowym passem kompozytora bez żadnego efektu,
  // a contrast/brightness to tutaj jedno mnożenie na piksel.
  // pow(x, 6) i pow(x, 14) rozpisane na mnożenia — wynik ten sam, koszt niższy.
  var FRAG = "\n    precision mediump float;\n    uniform vec2 uRes;\n    uniform float uTime;\n    uniform vec2 uMouse;\n    uniform vec2 uGrade;\n\n    float wave(vec2 p, float t) {\n      float w = 0.0;\n      float amp = 1.0;\n      for (int i = 0; i < 4; i++) {\n        float fi = float(i);\n        p.x += sin(p.y * (1.4 + fi * 0.35) + t * 0.7) * 0.18;\n        w += sin(p.x * (1.8 + fi * 0.7) + p.y * 1.1 + t * (0.5 + fi * 0.08)) * amp;\n        amp *= 0.58;\n      }\n      return w * 0.5 + 0.5;\n    }\n\n    void main() {\n      vec2 uv = gl_FragCoord.xy / uRes.xy;\n      vec2 m = uMouse * 0.5 + 0.5;\n      vec2 toM = uv - m;\n      float mDist = length(toM);\n      float mForce = smoothstep(0.62, 0.0, mDist);\n\n      vec2 p = uv * vec2(2.8, 2.0);\n      p += (toM / max(mDist, 0.0001)) * mForce * 0.17 * sin(uTime * 1.7 + mDist * 13.0);\n      p += vec2(sin(uTime * 0.2 + uv.y * 3.0), cos(uTime * 0.17 + uv.x * 2.5)) * 0.045;\n\n      float t = uTime * 0.14;\n      float w = wave(p, t);\n      float r1 = 1.0 - abs(sin(w * 4.2 + t * 0.25));\n      float r2 = r1 * r1;\n      float r3 = r2 * r1;\n      float ridge = r3 * r3;\n      float ridge2 = ridge * ridge;\n      float ridge4 = ridge2 * ridge2;\n      float ridge14 = ridge4 * ridge4 * ridge4 * ridge2;\n\n      vec3 base = vec3(0.055, 0.055, 0.055);\n      vec3 dim = vec3(0.24, 0.24, 0.24);\n      vec3 mid = vec3(0.58, 0.58, 0.58);\n      vec3 hi = vec3(1.0, 1.0, 1.0);\n\n      vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);\n      ribbon = mix(ribbon, hi, ridge * 0.52);\n\n      vec3 col = base;\n      col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * 0.58);\n      col += hi * ridge14 * 0.32;\n      col += mid * mForce * 0.16;\n      col += hi * mForce * ridge * 0.12;\n\n      float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));\n      col *= 0.58 + vignette * 0.42;\n\n      col = clamp((col - 0.5) * uGrade.x + 0.5, 0.0, 1.0) * uGrade.y;\n\n      gl_FragColor = vec4(col, 1.0);\n    }\n  ";

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
      console.warn("[home-ambient-bg]", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    canvas.remove();
    return;
  }

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
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
  var uGrade = gl.getUniformLocation(program, "uGrade");

  // Odpowiednik dawnego CSS-owego `filter` na .home-ambient, teraz liczony
  // w shaderze. Wartości 1:1 z cosgral-home.css / theme-mode.css.
  var GRADE_DARK = [1.04, 0.78];
  var GRADE_LIGHT = [1.02, 1.08];

  function applyGrade() {
    var light = document.documentElement.getAttribute("data-theme") === "light";
    var g = light ? GRADE_LIGHT : GRADE_DARK;
    gl.uniform2f(uGrade, g[0], g[1]);
  }
  window.addEventListener("cosgral:themechange", function () {
    applyGrade();
    frameSkip = 0; // wymuś odrysowanie przy najbliższej klatce
  });

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var running = false;
  var start = performance.now();
  var frameSkip = 0;

  // Pełna jakość na tier 0 — cięcia dopiero, gdy sterownik zgłosi gubione klatki.
  var DPR_BY_TIER = MOBILE ? [1.1, 1, 0.85] : [1.5, 1.25, 1];
  var SKIP_BY_TIER = MOBILE ? [2, 3, 4] : [1, 2, 3];
  var dprCap = DPR_BY_TIER[0];
  var tierSkip = SKIP_BY_TIER[0];

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

  if (window.cosgralPerf) {
    window.cosgralPerf.subscribe(function (t) {
      tierSkip = SKIP_BY_TIER[t] || SKIP_BY_TIER[0];
      var cap = DPR_BY_TIER[t] || DPR_BY_TIER[0];
      if (cap === dprCap) return;
      dprCap = cap;
      resize();
    });
  }

  function frame(now) {
    if (!running) return;

    var sandHeavy = document.documentElement.classList.contains("is-sand-stream");
    var skipN = Math.max(tierSkip, sandHeavy ? (MOBILE ? 4 : 3) : MOBILE ? 2 : 1);
    frameSkip += 1;
    if (skipN > 1 && frameSkip % skipN !== 0) {
      requestAnimationFrame(frame);
      return;
    }

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

  window.addEventListener("resize", resize);
  resize();
  gl.uniform2f(uRes, canvas.width, canvas.height);
  gl.uniform1f(uTime, 0);
  gl.uniform2f(uMouse, 0, 0);
  applyGrade();
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  play();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause();
    else play();
  });
})();
