/* Realizacje: the grounds behind the chapters.
 * - Between paper and carbon chapters: the homepage thermal horizon, turned on
 *   its side. Carbon is transparent so the ambient lines show through.
 * - The cube shockwave enters/leaves the black montage ground in both directions.
 * The settled montage's interactive water is owned exclusively by
 * portfolio-montage-reveal.js; this pass only draws chapter transitions.
 */
(function () {
  "use strict";
  var scroller = document.querySelector("[data-chapters-scroller]");
  var canvas = document.querySelector("[data-pf-horizon]");
  if (!scroller || !canvas) return;
  var chapters = Array.prototype.slice.call(scroller.querySelectorAll("[data-portfolio-tile]"));
  var tones = chapters.map(function (c) { return c.getAttribute("data-ground") === "light" ? 1 : 0; });
  var abyss = chapters.map(function (c) { return c.getAttribute("data-ground-style") === "abyss"; });
  var shockInto = chapters.map(function (c) { return c.getAttribute("data-enter") === "shock"; });
  var body = document.body;
  var reduced = document.documentElement.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PAPER = [0.93333, 0.92941, 0.9098];
  var gl = null, uniforms = null, lost = false, raf = 0;
  var W = 1, H = 1, last = "", chapterWidth = 1;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function ss(a, b, x) { var p = clamp((x - a) / (b - a), 0, 1); return p * p * (3 - 2 * p); }
  function band() { return clamp(Math.min(W, H) * 0.13, 56, 140); }
  function arch() { return W * (W < 700 ? 0.16 : 0.22); }

  /* An opened chapter always sits on carbon: from paper, the horizon sweeps
     the whole screen dark, and back again on close. */
  var sweep = null;

  /* The ground trails the slide on a critically damped spring */
  var smoothPos = null, smoothVel = 0, lastTick = 0, OMEGA = 3.6;
  function rawPos() {
    return clamp(scroller.scrollLeft / chapterWidth, 0, chapters.length - 1);
  }
  function scrollState() {
    var n = chapters.length;
    var pos = smoothPos === null ? rawPos() : smoothPos;
    var i = Math.min(n - 1, Math.floor(pos));
    var t = pos - i;
    if (t < 0.0005) t = 0;
    if (t > 0.9995) { i = Math.min(n - 1, i + 1); t = 0; }
    var j = Math.min(n - 1, i + 1);
    var from = tones[i], to = t ? tones[j] : from;
    var darkIdx = t ? (tones[i] === 0 ? i : j) : i;
    return {
      t: t, i: i, from: from, to: to, active: Math.round(pos),
      shock: !!t && shockInto[j],
      abyss: abyss[darkIdx] && (t ? tones[i] !== tones[j] || abyss[i] : true)
    };
  }
  var openFlag = null;
  function expanded() { return openFlag !== null ? openFlag : body.classList.contains("is-tile-expanded"); }
  function state() {
    var s = scrollState();
    if (sweep) { s.t = sweep.t; s.from = sweep.from; s.to = sweep.to; s.shock = false; s.abyss = false; }
    else if (expanded() && tones[s.active] === 1) { s.from = 1; s.to = 0; s.t = 1; s.shock = false; s.abyss = false; }
    return s;
  }
  function solidTone(s) {
    if (s.from === s.to || s.t <= 0) return s.from;
    if (s.t >= 1) return s.to;
    return -1;
  }
  function runSweep(from, to, done) {
    sweep = { from: from, to: to, t: 0, start: performance.now(), duration: 1900, animating: true, done: done };
    queue();
  }
  window.addEventListener("portfolio-expand-open", function () {
    openFlag = true;
    if (tones[scrollState().active] === 1 && !(sweep && sweep.to === 0)) runSweep(1, 0);
  });
  window.addEventListener("portfolio-expand-close", function () {
    openFlag = false;
    if (tones[scrollState().active] === 1) runSweep(0, 1, function () { sweep = null; queue(); });
  });

  /* ——— Thermal geometry (CSS px) ——— */
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

  /* ——— Shockwave geometry: centred on where the cube is tapping ——— */
  function anchor(i) {
    var attr = W <= 900 ? "data-cube-at-m" : "data-cube-at";
    var v = (chapters[i].getAttribute(attr) || "0.5 0.5").split(" ").map(Number);
    return [v[0] * W, v[1] * H];
  }
  function shock(s) {
    var c = anchor(s.i);
    var far = Math.max(Math.hypot(c[0], c[1]), Math.hypot(W - c[0], c[1]), Math.hypot(c[0], H - c[1]), Math.hypot(W - c[0], H - c[1]));
    return { cx: c[0], cy: c[1], r: ss(0.12, 0.92, s.t) * far * 1.18, fade: 1 - ss(0.5, 1, s.t) };
  }

  function isLight(s, x, y) {
    var solid = solidTone(s);
    if (solid !== -1) return solid === 1;
    if (s.shock) { var k = shock(s); return Math.hypot(x - k.cx, y - k.cy) > k.r; }
    return rampAt(s, x, y) > 1.4;
  }

  function syncClasses(s) {
    var navL = isLight(s, 64, 48), navR = isLight(s, W - 120, 48), pager = isLight(s, W / 2, H - 36);
    var ground = sweep ? sweep.to : tones[s.active];
    var deep = !sweep && !expanded() && abyss[s.active] && solidTone(s) !== 1;
    var key = (navL ? 1 : 0) + "" + (navR ? 1 : 0) + (pager ? 1 : 0) + ground + (deep ? 1 : 0);
    if (key === last) return;
    last = key;
    body.classList.toggle("pf-nav-left-light", navL);
    body.classList.toggle("pf-nav-right-light", navR);
    body.classList.toggle("pf-pager-light", pager);
    body.classList.toggle("pf-ground-light", ground === 1);
    body.classList.toggle("pf-ground-abyss", deep);
  }

  /* ——— Shader ——— */
  var vertex = "attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}";
  var fragment = [
    "precision highp float;varying vec2 uv;",
    "uniform vec2 viewport;uniform vec2 resolution;uniform float edge;uniform float arch;uniform float band;uniform float dir;",
    "uniform float mode;uniform float abyss;uniform float time;uniform vec4 shock;",
    "vec3 deep(vec2 t){return vec3(0.);}",
    "void main(){",
    "  vec2 px=vec2(uv.x*viewport.x,(1.-uv.y)*viewport.y);",
    "  vec2 t=vec2(uv.x,1.-uv.y);",
    "  vec3 paper=vec3(.93333,.92941,.9098);",
    "  float grain=fract(sin(dot(floor(uv*resolution),vec2(12.9898,78.233)))*43758.5453)-.5;",
    "  if(mode>1.5){gl_FragColor=vec4(deep(t),1.);return;}",
    "  if(mode>.5){",
    "    vec2 p=px-shock.xy;float a=atan(p.y,p.x);",
    "    float n=.55*sin(3.*a+time*1.3)+.35*sin(5.*a-time*1.9)+.22*sin(9.*a+time*2.6)+.12*sin(15.*a-time*3.4);",
    "    float rr=shock.z*(1.+.12*n);float d=length(p)-rr;",
    "    float inside=1.-smoothstep(-1.5,1.5,d);",
    "    vec3 c=mix(paper*(1.-.2*exp(-max(d,0.)/70.)),deep(t),inside);",
    "    float front=exp(-abs(d)/2.6);",
    "    c+=vec3(1.)*front*.6;",
    "    float rd=length(p);",
    "    float echo=(exp(-abs(rd-rr*.74)/2.2)*.55+exp(-abs(rd-rr*.5)/2.)*.35+exp(-abs(rd-rr*.3)/1.8)*.2)*inside*shock.w;",
    "    c+=vec3(.8,.9,1.)*echo*.3;",
    "    gl_FragColor=vec4(clamp(c+grain*.008,0.,1.),1.);return;",
    "  }",
    "  float ny=(px.y/viewport.y-.5)/.36;float k=exp(-ny*ny);",
    "  float e=edge-k*arch;",
    "  float slope=(2.*ny/.36)*k*arch/viewport.y;",
    "  float q=(px.x-e)/sqrt(1.+slope*slope)/band;",
    "  float r=dir<.5?q:1.58-q;",
    "  float al=smoothstep(-.36,.2,r);",
    "  vec3 c=vec3(.64,.065,.025);",
    "  c=mix(c,vec3(1.,.28,.025),smoothstep(.05,.68,r));",
    "  c=mix(c,vec3(1.,.83,.12),smoothstep(.48,1.08,r));",
    "  c=mix(c,paper,smoothstep(.94,1.94,r));",
    "  float bandMask=smoothstep(-.45,.05,r)*(1.-smoothstep(1.55,2.,r));",
    "  c+=grain*.009*bandMask;",
    "  vec4 o=vec4(c*al,al);",
    "  if(abyss>.5)o=vec4(o.rgb+(1.-al)*deep(t),1.);",
    "  gl_FragColor=o;",
    "}"
  ].join("\n");

  function initGl() {
    gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    if (!gl) return false;
    function compile(type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error("horizon shader");
      return sh;
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
    ["viewport", "resolution", "edge", "arch", "band", "dir", "mode", "abyss", "time", "shock"].forEach(function (n) {
      uniforms[n] = gl.getUniformLocation(program, n);
    });
    return true;
  }

  function publishGroundState(s) {
    var raw = rawPos();
    var settled = !sweep && smoothPos === raw && solidTone(s) !== -1;
    var chapter = settled ? String(Math.round(raw)) : "";
    if (canvas.dataset.settledChapter === chapter) return;
    canvas.dataset.settledChapter = chapter;
    window.dispatchEvent(new CustomEvent("pf-horizon-state"));
  }

  function draw() {
    var s = state();
    publishGroundState(s);
    syncClasses(s);
    var solid = solidTone(s);
    if (!gl && !lost && (solid === -1 || s.abyss)) {
      try {
        if (initGl()) { gl.viewport(0, 0, canvas.width, canvas.height); canvas.style.backgroundColor = 'transparent'; }
        else lost = true;
      } catch (_) { gl = null; lost = true; }
    }
    if (!gl || lost) {
      var tone = solid === -1 ? (s.t > 0.5 ? s.to : s.from) : solid;
      canvas.style.backgroundColor = tone ? "#eeede8" : (s.abyss ? "#000" : "transparent");
      return;
    }
    var deepSolid = solid === 0 && s.abyss;
    if (solid !== -1 && !deepSolid) {
      if (solid) gl.clearColor(PAPER[0], PAPER[1], PAPER[2], 1); else gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    gl.uniform2f(uniforms.viewport, W, H);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, (performance.now() % 100000) / 1000);
    if (deepSolid) {
      gl.uniform1f(uniforms.mode, 2);
    } else if (s.shock) {
      var k = shock(s);
      gl.uniform1f(uniforms.mode, 1);
      gl.uniform4f(uniforms.shock, k.cx, k.cy, k.r, k.fade);
    } else {
      gl.uniform1f(uniforms.mode, 0);
      gl.uniform1f(uniforms.abyss, s.abyss ? 1 : 0);
      gl.uniform1f(uniforms.edge, edgeAt(s.t));
      gl.uniform1f(uniforms.arch, arch());
      gl.uniform1f(uniforms.band, band());
      gl.uniform1f(uniforms.dir, s.to === 1 ? 0 : 1);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function tick(now) {
    raf = 0;
    if (document.hidden) { lastTick = 0; return; }
    var sweepDone = null;
    if (sweep && sweep.animating) {
      var progress = clamp((now - sweep.start) / sweep.duration, 0, 1);
      sweep.t = 0.5 - Math.cos(Math.PI * progress) / 2;
      if (progress === 1) { sweep.animating = false; sweepDone = sweep.done; }
    }
    var raw = rawPos();
    if (smoothPos === null || reduced) { smoothPos = raw; smoothVel = 0; }
    var dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0.016;
    lastTick = now;
    smoothVel += (OMEGA * OMEGA * (raw - smoothPos) - 2 * OMEGA * smoothVel) * dt;
    smoothPos += smoothVel * dt;
    if (Math.abs(raw - smoothPos) < 0.0004 && Math.abs(smoothVel) < 0.002) { smoothPos = raw; smoothVel = 0; }
    var s = scrollState();
    draw();
    if (sweepDone) sweepDone();
    if (smoothPos !== raw || s.shock || (sweep && sweep.animating)) queue();
    else lastTick = 0;
  }
  function queue() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }

  function resize() {
    chapterWidth = Math.max(1, scroller.clientWidth);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    var ratio = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 1.25);
    var bufferWidth = Math.round(W * ratio), bufferHeight = Math.round(H * ratio);
    if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
    if (canvas.height !== bufferHeight) canvas.height = bufferHeight;
    if (gl && !lost) gl.viewport(0, 0, canvas.width, canvas.height);
    last = "";
    queue();
  }

  canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); lost = true; queue(); });
  canvas.addEventListener("webglcontextrestored", function () {
    try { lost = !initGl(); } catch (_) { lost = true; }
    if (!lost) canvas.style.backgroundColor = 'transparent';
    resize();
  });
  scroller.addEventListener("scroll", function () {
    // The water layer must release the horizon from the first scroll frame.
    if (canvas.dataset.settledChapter !== "") {
      canvas.dataset.settledChapter = "";
      window.dispatchEvent(new CustomEvent("pf-horizon-state"));
    }
    queue();
  }, { passive: true });
  new ResizeObserver(resize).observe(scroller);
  new MutationObserver(queue).observe(body, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", function () {
    cancelAnimationFrame(raf); raf = 0; lastTick = 0;
    if (!document.hidden) queue();
  });
  window.addEventListener("pageshow", queue);
  resize();
})();

