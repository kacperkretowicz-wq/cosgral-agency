/**
 * Full-page liquid waves — dark (home) or light (grafiki) cursor-reactive ambient.
 * Boots every #home-ambient / [data-home-ambient] canvas on the page.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var MOBILE =
    window.matchMedia("(max-width: 900px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  var VERT = "attribute vec2 aPos; void main() { gl_Position = vec4(aPos, 0.0, 1.0); }";

  function fragSrc(light) {
    if (light) {
      return [
        "precision mediump float;",
        "uniform vec2 uRes;",
        "uniform float uTime;",
        "uniform vec2 uMouse;",
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
        "  vec3 base = vec3(0.94, 0.94, 0.96);",
        "  vec3 dim = vec3(0.82, 0.83, 0.87);",
        "  vec3 mid = vec3(0.62, 0.64, 0.7);",
        "  vec3 hi = vec3(0.35, 0.37, 0.42);",
        "  vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);",
        "  ribbon = mix(ribbon, hi, ridge * 0.45);",
        "  vec3 col = base;",
        "  col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * 0.5);",
        "  col = mix(col, hi, pow(ridge, 14.0) * 0.18);",
        "  col = mix(col, mid, mForce * 0.12);",
        "  float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));",
        "  col *= 0.92 + vignette * 0.08;",
        "  gl_FragColor = vec4(col, 1.0);",
        "}",
      ].join("\n");
    }
    return [
      "precision mediump float;",
      "uniform vec2 uRes;",
      "uniform float uTime;",
      "uniform vec2 uMouse;",
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
      "  vec3 base = vec3(0.055, 0.055, 0.055);",
      "  vec3 dim = vec3(0.24, 0.24, 0.24);",
      "  vec3 mid = vec3(0.58, 0.58, 0.58);",
      "  vec3 hi = vec3(1.0, 1.0, 1.0);",
      "  vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);",
      "  ribbon = mix(ribbon, hi, ridge * 0.52);",
      "  vec3 col = base;",
      "  col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * 0.58);",
      "  col += hi * pow(ridge, 14.0) * 0.32;",
      "  col += mid * mForce * 0.16;",
      "  col += hi * mForce * ridge * 0.12;",
      "  float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));",
      "  col *= 0.58 + vignette * 0.42;",
      "  col = ((col - 0.5) * 1.04 + 0.5) * 0.78;",
      "  gl_FragColor = vec4(col, 1.0);",
      "}",
    ].join("\n");
  }

  function bootCanvas(canvas) {
    var light =
      canvas.getAttribute("data-ambient-tone") === "light" ||
      document.body.classList.contains("is-home-ambient-light");

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
    var fs = compile(gl.FRAGMENT_SHADER, fragSrc(light));
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

    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var running = false;
    var start = performance.now();
    var frameSkip = 0;
    var SCALE_BY_TIER = MOBILE ? [0.75, 0.6, 0.5] : [0.66, 0.5, 0.4];
    var SKIP_BY_TIER = MOBILE ? [2, 3, 4] : [1, 2, 3];
    var dprCap = SCALE_BY_TIER[0];
    var tierSkip = SKIP_BY_TIER[0];

    function resize() {
      var dpr = dprCap;
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
        var cap = SCALE_BY_TIER[t] || SCALE_BY_TIER[0];
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

    window.addEventListener("resize", resize);
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

  var nodes = document.querySelectorAll("#home-ambient, [data-home-ambient]");
  var seen = [];
  for (var i = 0; i < nodes.length; i++) {
    if (seen.indexOf(nodes[i]) !== -1) continue;
    seen.push(nodes[i]);
    bootCanvas(nodes[i]);
  }
})();
