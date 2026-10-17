/* Realizacje: the homepage thermal horizon, turned on its side. The ground of
 * each chapter is carbon or paper; sliding between two different grounds
 * raises the same vermilion-to-yellow edge the homepage tone-wipe uses, from
 * the side the next chapter comes in. Dark ground is transparent so the
 * ambient lines underneath stay visible. Redraws only when the slide moves.
 */
(function () {
  "use strict";
  var scroller = document.querySelector("[data-chapters-scroller]");
  var canvas = document.querySelector("[data-pf-horizon]");
  if (!scroller || !canvas) return;
  var chapters = Array.prototype.slice.call(scroller.querySelectorAll("[data-portfolio-tile]"));
  var tones = chapters.map(function (c) { return c.getAttribute("data-ground") === "light" ? 1 : 0; });
  var body = document.body;
  var reduced = document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PAPER = [0.93333, 0.92941, 0.9098];
  var gl = null, uniforms = null, lost = false, raf = 0;
  var W = 1, H = 1, last = "";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function band() { return clamp(Math.min(W, H) * 0.13, 56, 140); }
  function arch() { return W * (W < 700 ? 0.16 : 0.22); }

  /* An opened chapter always sits on carbon: from paper, the horizon sweeps
     the whole screen dark, and back again on close. */
  var sweep = null;

  /* The ground trails the slide on a soft spring instead of being glued to
     every scroll frame, so the horizon eases in and out of each crossing. */
  var smoothPos = null, lastTick = 0;
  function rawPos() {
    return clamp(scroller.scrollLeft / Math.max(1, scroller.clientWidth), 0, chapters.length - 1);
  }
  function scrollState() {
    var n = chapters.length;
    var pos = smoothPos === null ? rawPos() : smoothPos;
    var i = Math.min(n - 1, Math.floor(pos));
    var t = pos - i;
    if (t < 0.0005) t = 0;
    if (t > 0.9995) { i = Math.min(n - 1, i + 1); t = 0; }
    var from = tones[i], to = t ? tones[Math.min(n - 1, i + 1)] : from;
    return { t: t, from: from, to: to, active: Math.round(pos) };
  }
  var openFlag = null;
  function expanded() { return openFlag !== null ? openFlag : body.classList.contains("is-tile-expanded"); }
  function state() {
    var s = scrollState();
    if (sweep) { s.t = sweep.t; s.from = sweep.from; s.to = sweep.to; }
    else if (expanded() && tones[s.active] === 1) { s.from = 1; s.to = 0; s.t = 1; }
    return s;
  }
  function solidTone(s) {
    if (s.from === s.to || s.t <= 0) return s.from;
    if (s.t >= 1) return s.to;
    return -1;
  }
  function runSweep(from, to, done) {
    var start = performance.now(), dur = 1900;
    sweep = { from: from, to: to, t: 0 };
    (function step(now) {
      if (!sweep || sweep.from !== from) return;
      var p = clamp((now - start) / dur, 0, 1);
      sweep.t = 0.5 - Math.cos(Math.PI * p) / 2;
      draw();
      if (p < 1) requestAnimationFrame(step); else if (done) done();
    })(start);
  }
  window.addEventListener("portfolio-expand-open", function () {
    openFlag = true;
    if (tones[scrollState().active] === 1 && !(sweep && sweep.to === 0)) runSweep(1, 0);
  });
  window.addEventListener("portfolio-expand-close", function () {
    openFlag = false;
    if (tones[scrollState().active] === 1) runSweep(0, 1, function () { sweep = null; queue(); });
  });

  /* Same geometry as the shader, in CSS pixels: is (x, y) on paper right now? */
  function edgeAt(t) {
    var b = band(), a = arch();
    return (W + 0.45 * b + a) + (-2.1 * b - (W + 0.45 * b + a)) * t;
  }
  function rampAt(s, x, y) {
    var ny = (y / H - 0.5) / 0.36, k = Math.exp(-ny * ny);
    var e = edgeAt(s.t) - k * arch();
    var slope = (2 * ny / 0.36) * k * arch() / H;
    var q = (x - e) / Math.sqrt(1 + slope * slope) / band();
    return s.to === 1 ? q : 1.58 - q;
  }
  function isLight(s, x, y) {
    var solid = solidTone(s);
    if (solid !== -1) return solid === 1;
    return rampAt(s, x, y) > 1.4;
  }

  function syncClasses(s) {
    var navL = isLight(s, 64, 48), navR = isLight(s, W - 120, 48), pager = isLight(s, W / 2, H - 36);
    var ground = sweep ? sweep.to : tones[s.active];
    var key = (navL ? 1 : 0) + "" + (navR ? 1 : 0) + (pager ? 1 : 0) + ground;
    if (key === last) return;
    last = key;
    body.classList.toggle("pf-nav-left-light", navL);
    body.classList.toggle("pf-nav-right-light", navR);
    body.classList.toggle("pf-pager-light", pager);
    body.classList.toggle("pf-ground-light", ground === 1);
  }

  var vertex = "attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}";
  var fragment = [
    "precision highp float;varying vec2 uv;",
    "uniform vec2 viewport;uniform vec2 resolution;uniform float edge;uniform float arch;uniform float band;uniform float dir;",
    "void main(){",
    "  vec2 px=vec2(uv.x*viewport.x,(1.-uv.y)*viewport.y);",
    "  float ny=(px.y/viewport.y-.5)/.36;float k=exp(-ny*ny);",
    "  float e=edge-k*arch;",
    "  float slope=(2.*ny/.36)*k*arch/viewport.y;",
    "  float q=(px.x-e)/sqrt(1.+slope*slope)/band;",
    "  float r=dir<.5?q:1.58-q;",
    "  float a=smoothstep(-.36,.2,r);",
    "  vec3 c=vec3(.64,.065,.025);",
    "  c=mix(c,vec3(1.,.28,.025),smoothstep(.05,.68,r));",
    "  c=mix(c,vec3(1.,.83,.12),smoothstep(.48,1.08,r));",
    "  c=mix(c,vec3(.93333,.92941,.9098),smoothstep(.94,1.94,r));",
    "  float grain=fract(sin(dot(floor(uv*resolution),vec2(12.9898,78.233)))*43758.5453)-.5;",
    "  float bandMask=smoothstep(-.45,.05,r)*(1.-smoothstep(1.55,2.,r));",
    "  c+=grain*.009*bandMask;",
    "  gl_FragColor=vec4(c*a,a);",
    "}"
  ].join("\n");

  function initGl() {
    gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return false;
    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error("horizon shader");
      return s;
    }
    var program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("horizon program");
    gl.useProgram(program);
    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uniforms = {};
    ["viewport", "resolution", "edge", "arch", "band", "dir"].forEach(function (n) { uniforms[n] = gl.getUniformLocation(program, n); });
    return true;
  }

  function draw() {
    var s = state();
    syncClasses(s);
    var solid = solidTone(s);
    if (!gl || lost) {
      canvas.style.backgroundColor = (solid === -1 ? s.t > 0.5 ? s.to : s.from : solid) ? "#eeede8" : "transparent";
      return;
    }
    if (solid !== -1) {
      if (solid) gl.clearColor(PAPER[0], PAPER[1], PAPER[2], 1); else gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    gl.uniform2f(uniforms.viewport, W, H);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.edge, edgeAt(s.t));
    gl.uniform1f(uniforms.arch, arch());
    gl.uniform1f(uniforms.band, band());
    gl.uniform1f(uniforms.dir, s.to === 1 ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function tick(now) {
    raf = 0;
    var raw = rawPos();
    if (smoothPos === null || reduced) smoothPos = raw;
    var dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0.016;
    lastTick = now;
    smoothPos += (raw - smoothPos) * (1 - Math.exp(-dt * 4.5));
    if (Math.abs(raw - smoothPos) < 0.0005) smoothPos = raw;
    draw();
    if (smoothPos !== raw) raf = requestAnimationFrame(tick);
    else lastTick = 0;
  }
  function queue() { if (!raf) raf = requestAnimationFrame(tick); }

  function resize() {
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    var ratio = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 1.25);
    canvas.width = Math.round(W * ratio);
    canvas.height = Math.round(H * ratio);
    if (gl && !lost) gl.viewport(0, 0, canvas.width, canvas.height);
    last = "";
    queue();
  }

  try { if (!initGl()) gl = null; } catch (_) { gl = null; }
  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; queue(); });
  canvas.addEventListener("webglcontextrestored", function () {
    try { lost = !initGl(); } catch (_) { lost = true; }
    resize();
  });
  scroller.addEventListener("scroll", queue, { passive: true });
  new MutationObserver(queue).observe(body, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", resize, { passive: true });
  resize();
})();
