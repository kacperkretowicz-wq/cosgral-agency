/**
 * Subpage ambient — liquid WebGL background (matches homepage look).
 */
(function () {
  "use strict";

  var canvas = document.getElementById("subpage-ambient");
  if (!canvas) return;
  if (document.documentElement.classList.contains("reduce-motion")) return;

  var VERT = "\n    attribute vec2 aPos;\n    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }\n  ";

  var FRAG = "\n    precision mediump float;\n    uniform vec2 uRes;\n    uniform float uTime;\n    uniform vec2 uMouse;\n\n    float wave(vec2 p, float t) {\n      float w = 0.0;\n      float amp = 1.0;\n      for (int i = 0; i < 4; i++) {\n        float fi = float(i);\n        p.x += sin(p.y * (1.4 + fi * 0.35) + t * 0.7) * 0.18;\n        w += sin(p.x * (1.8 + fi * 0.7) + p.y * 1.1 + t * (0.5 + fi * 0.08)) * amp;\n        amp *= 0.58;\n      }\n      return w * 0.5 + 0.5;\n    }\n\n    void main() {\n      vec2 uv = gl_FragCoord.xy / uRes.xy;\n      vec2 m = uMouse * 0.5 + 0.5;\n      vec2 toM = uv - m;\n      float mDist = length(toM);\n      float mForce = smoothstep(0.62, 0.0, mDist);\n\n      vec2 p = uv * vec2(2.8, 2.0);\n      p += normalize(toM + 0.0001) * mForce * 0.17 * sin(uTime * 1.7 + mDist * 13.0);\n      p += vec2(sin(uTime * 0.2 + uv.y * 3.0), cos(uTime * 0.17 + uv.x * 2.5)) * 0.045;\n\n      float t = uTime * 0.14;\n      float w = wave(p, t);\n      float ridge = pow(1.0 - abs(sin(w * 4.2 + t * 0.25)), 6.0);\n\n      vec3 base = vec3(0.055, 0.055, 0.055);\n      vec3 dim = vec3(0.24, 0.24, 0.24);\n      vec3 mid = vec3(0.58, 0.58, 0.58);\n      vec3 hi = vec3(1.0, 1.0, 1.0);\n\n      vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);\n      ribbon = mix(ribbon, hi, ridge * 0.52);\n\n      vec3 col = base;\n      col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * 0.58);\n      col += hi * pow(ridge, 14.0) * 0.32;\n      col += mid * mForce * 0.16;\n      col += hi * mForce * ridge * 0.12;\n\n      float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));\n      col *= 0.58 + vignette * 0.42;\n\n      gl_FragColor = vec4(col, 1.0);\n    }\n  ";

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

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var running = false;
  var start = performance.now();

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
  play();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause();
    else play();
  });
})();
