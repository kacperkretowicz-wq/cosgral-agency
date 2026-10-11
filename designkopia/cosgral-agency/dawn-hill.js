/**
 * Scroll-scrubbed dawn hill between #uslugi and #realizacje.
 * White convex dome rises from the bottom; the rim is a banded
 * red → orange → yellow corona; the dark page leaves upward as a U.
 * Progress is read from layout (no second lerp) so iOS scroll stays 1:1.
 */
(function () {
  "use strict";

  if (document.documentElement.classList.contains("reduce-motion")) return;

  var track = document.getElementById("dawn-hill");
  var canvas = document.getElementById("dawn-hill-canvas");
  if (!track || !canvas) return;

  var root = document.documentElement;
  var work = document.getElementById("realizacje");
  var faq = document.getElementById("faq");
  var gl = null;
  var prog = null;
  var uRes = null;
  var uLift = null;
  var uDpr = null;
  var bufW = 0;
  var bufH = 0;
  var lastLift = -1;
  var scheduled = false;
  var running = false;
  var cssW = 0;
  var cssH = 0;

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function smoothstep(a, b, x) {
    var t = clamp01((x - a) / (b - a || 1));
    return t * t * (3 - 2 * t);
  }

  /* slow climb → snap → ease-out, mapped onto 0..1 scroll progress */
  function liftFromProgress(p) {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    if (p < 0.58) {
      var t0 = p / 0.58;
      t0 = t0 * t0 * t0;
      return 0.38 * t0;
    }
    if (p < 0.74) {
      var t1 = (p - 0.58) / 0.16;
      t1 = Math.pow(t1, 0.55);
      return 0.38 + 0.46 * t1;
    }
    var t2 = (p - 0.74) / 0.26;
    t2 = 1 - Math.pow(1 - t2, 3);
    return 0.84 + 0.16 * t2;
  }

  function viewportBox() {
    var vv = window.visualViewport;
    if (vv) {
      return {
        top: vv.offsetTop || 0,
        left: vv.offsetLeft || 0,
        width: vv.width || window.innerWidth,
        height: vv.height || window.innerHeight,
      };
    }
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  var FS = [
    "precision highp float;",
    "uniform vec2 uRes;",
    "uniform float uLift;",
    "uniform float uDpr;",
    "void main(){",
    "  float vh = uRes.y;",
    "  float vw = uRes.x;",
    "  float y = gl_FragCoord.y / vh;",
    "  float x = (gl_FragCoord.x - vw * 0.5) / vh;",
    "  float halfW = vw * 0.5 / vh;",
    "  float aspect = vw / max(vh, 1.0);",
    "  float k = aspect < 0.85 ? 1.12 : 1.38;",
    "  float R = k * halfW;",
    "  float edgeDrop = R - sqrt(max(R * R - halfW * halfW, 0.0001));",
    "  float crest = mix(-0.06, 1.04 + edgeDrop, clamp(uLift, 0.0, 1.0));",
    "  float cy = crest - R;",
    "  float d = length(vec2(x, y - cy)) - R;",
    "  float dPx = d * vh / max(uDpr, 1.0);",
    "  vec3 white = vec3(1.0);",
    "  vec3 yellow = vec3(1.0, 0.84, 0.2);",
    "  vec3 orange = vec3(1.0, 0.4, 0.04);",
    "  vec3 red = vec3(0.62, 0.04, 0.015);",
    "  float yb = 16.0;",
    "  float ob = 36.0;",
    "  float rb = 74.0;",
    "  vec3 col = white;",
    "  float a = 0.0;",
    "  if (dPx <= 0.0) {",
    "    float warm = smoothstep(-18.0, 0.0, dPx);",
    "    col = mix(white, vec3(1.0, 0.96, 0.88), warm * 0.45);",
    "    a = 1.0;",
    "  } else if (dPx < yb) {",
    "    float t = smoothstep(0.0, yb, dPx);",
    "    col = mix(vec3(1.0, 0.95, 0.7), yellow, t);",
    "    a = 1.0;",
    "  } else if (dPx < ob) {",
    "    float t = smoothstep(yb, ob, dPx);",
    "    col = mix(yellow, orange, t);",
    "    a = 1.0;",
    "  } else if (dPx < rb) {",
    "    float t = smoothstep(ob, rb, dPx);",
    "    col = mix(orange, red, t);",
    "    a = 1.0 - smoothstep(ob + (rb - ob) * 0.42, rb, dPx);",
    "  }",
    "  gl_FragColor = vec4(col, a);",
    "}",
  ].join("\n");

  var VS = "attribute vec2 aPos;void main(){gl_Position=vec4(aPos,0.0,1.0);}";

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function initGL() {
    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
    } catch (e) {
      gl = null;
    }
    if (!gl) return false;
    var vs = compile(gl.VERTEX_SHADER, VS);
    var fs = compile(gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return false;
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, "aPos");
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    uRes = gl.getUniformLocation(prog, "uRes");
    uLift = gl.getUniformLocation(prog, "uLift");
    uDpr = gl.getUniformLocation(prog, "uDpr");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  function resize() {
    var box = viewportBox();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(box.width * dpr));
    var h = Math.max(1, Math.round(box.height * dpr));
    cssW = box.width;
    cssH = box.height;
    canvas.style.top = box.top + "px";
    canvas.style.left = box.left + "px";
    canvas.style.width = box.width + "px";
    canvas.style.height = box.height + "px";
    if (w !== bufW || h !== bufH) {
      bufW = w;
      bufH = h;
      canvas.width = w;
      canvas.height = h;
      if (gl) gl.viewport(0, 0, w, h);
      lastLift = -1;
    }
  }

  function drawGL(lift) {
    gl.viewport(0, 0, bufW, bufH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog);
    gl.uniform2f(uRes, bufW, bufH);
    gl.uniform1f(uLift, lift);
    gl.uniform1f(uDpr, cssW > 0 ? bufW / cssW : 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function draw2D(lift) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var w = cssW || canvas.clientWidth || window.innerWidth;
    var h = cssH || canvas.clientHeight || window.innerHeight;
    if (canvas.width !== Math.round(w) || canvas.height !== Math.round(h)) {
      canvas.width = Math.max(1, Math.round(w));
      canvas.height = Math.max(1, Math.round(h));
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var halfW = canvas.width * 0.5;
    var aspect = canvas.width / Math.max(canvas.height, 1);
    var k = aspect < 0.85 ? 1.12 : 1.38;
    var R = k * halfW;
    var edgeDrop = R - Math.sqrt(Math.max(R * R - halfW * halfW, 0.0001));
    var crest = -0.06 * canvas.height + lift * (1.04 * canvas.height + edgeDrop);
    var cy = canvas.height - (crest - R);
    var cx = canvas.width * 0.5;
    var grd = ctx.createRadialGradient(cx, cy, Math.max(0, R - 2), cx, cy, R + 52);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(Math.max(0, R / (R + 52) - 0.01), "#fff6e0");
    grd.addColorStop(R / (R + 52), "#ffd12e");
    grd.addColorStop((R + 14) / (R + 52), "#ff6a0d");
    grd.addColorStop((R + 32) / (R + 52), "rgba(140,8,4,0.85)");
    grd.addColorStop(1, "rgba(90,4,2,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 52, 0, Math.PI * 2);
    ctx.fill();
  }

  var useGL = initGL();

  function sample() {
    var vh = window.innerHeight || 1;
    var rect = track.getBoundingClientRect();
    var p = clamp01((vh - rect.top) / Math.max(rect.height, 1));
    var lift = liftFromProgress(p);
    var workTop = work ? work.getBoundingClientRect().top : vh * 2;
    var faqTop = faq ? faq.getBoundingClientRect().top : vh * 4;
    var faqIn = 1 - clamp01(faqTop / vh);
    var hillCover = smoothstep(0.78, 1, lift);
    var cover = hillCover * (1 - smoothstep(0, 0.5, faqIn));
    var show = p > 0.004 && workTop > 2;
    return { p: p, lift: lift, cover: cover, show: show };
  }

  function apply(state) {
    root.style.setProperty("--dawn-cover", state.cover.toFixed(4));
    root.classList.toggle("is-dawn-active", state.cover > 0.004 || state.show);
    root.classList.toggle("is-dawn-light", state.cover > 0.62);
    var vis = state.show ? "visible" : "hidden";
    if (canvas.style.visibility !== vis) canvas.style.visibility = vis;
    window.__cosgralDawn = state;
    if (!state.show) {
      lastLift = -1;
      return false;
    }
    resize();
    if (Math.abs(state.lift - lastLift) < 0.0004 && state.lift !== 0) return false;
    lastLift = state.lift;
    if (useGL && gl && !gl.isContextLost()) drawGL(state.lift);
    else draw2D(state.lift);
    return true;
  }

  function tick() {
    scheduled = false;
    var state = sample();
    var drew = apply(state);
    if (drew && running) requestDraw();
  }

  function requestDraw() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(tick);
  }

  window.addEventListener("scroll", requestDraw, { passive: true });
  window.addEventListener("resize", function () {
    lastLift = -1;
    requestDraw();
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () {
      lastLift = -1;
      requestDraw();
    });
    window.visualViewport.addEventListener("scroll", requestDraw);
  }

  function bindLenis(tries) {
    var api = window.cosgralSmoothScroll;
    var lenis = api && api.lenis;
    if (lenis && typeof lenis.on === "function") {
      lenis.on("scroll", requestDraw);
      return;
    }
    if (tries > 40) return;
    setTimeout(function () { bindLenis(tries + 1); }, 150);
  }
  bindLenis(0);

  canvas.addEventListener("webglcontextlost", function (e) {
    e.preventDefault();
    useGL = false;
    lastLift = -1;
  }, false);
  canvas.addEventListener("webglcontextrestored", function () {
    useGL = initGL();
    lastLift = -1;
    requestDraw();
  }, false);

  running = true;
  requestDraw();
})();
