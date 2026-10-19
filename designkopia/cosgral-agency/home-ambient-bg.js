/**
 * Full-page liquid waves — uniform B&W, cursor-reactive (fixed behind all sections).
 * Optimized: fast algebraic polynomial approximation (no heavy pow/log2),
 * unrolled octave loop, hardware-bilinear 540p buffer, smooth 60fps pacing,
 * and auto-pause when covered by footer/kontakt.
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
  var funnelLibrary = window.cosgralChromeFunnel;
  var hasFunnel = !!funnelLibrary;
  var defaultFunnel = new Float32Array([.5,.45,.18,0]);
  var defaultElastic = new Float32Array(2);
  var defaultShape = new Float32Array([2,0,.4,0]);

  var FRAG = `
    precision ${hasFunnel ? 'highp' : 'mediump'} float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform float uChromePaper;
    uniform float uChromeBoundary;
    uniform vec4 uChromeFunnelFrame;
    uniform vec2 uMouse;
    ${hasFunnel ? funnelLibrary.glsl : ''}

    float wave(vec2 p, float t) {
      float w = 0.0;
      // Octave 0
      p.x += sin(p.y * 1.4 + t * 0.7) * 0.18;
      w += sin(p.x * 1.8 + p.y * 1.1 + t * 0.5);
      // Octave 1
      p.x += sin(p.y * 1.75 + t * 0.7) * 0.18;
      w += sin(p.x * 2.5 + p.y * 1.1 + t * 0.58) * 0.58;
      // Octave 2
      p.x += sin(p.y * 2.1 + t * 0.7) * 0.18;
      w += sin(p.x * 3.2 + p.y * 1.1 + t * 0.66) * 0.3364;
      // Octave 3
      p.x += sin(p.y * 2.45 + t * 0.7) * 0.18;
      w += sin(p.x * 3.9 + p.y * 1.1 + t * 0.74) * 0.1951;

      return w * 0.5 + 0.5;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      ${hasFunnel ? `
      vec3 carbon=vec3(.03137255,.03529412,.03529412)/(.6+.4*uChromePaper);
      if(1.-uv.y>uChromeBoundary-.008){gl_FragColor=vec4(carbon,1.);return;}
      vec4 funnelOptics=cgFunnelOptics(uv,uRes,uChromeFunnelFrame,uChromeBoundary);
      if(funnelOptics.w<.0001&&funnelOptics.z>14./uRes.y){gl_FragColor=vec4(carbon,1.);return;}
      // Fully lit paper has no procedural waves underneath to calculate.
      if(uChromePaper>.999){
        gl_FragColor=vec4(cgFunnelPaint(vec3(0.),uv,uRes,uChromeFunnelFrame,uChromeBoundary,uChromePaper,funnelOptics),1.);return;
      }
      vec2 funnelUv=cgFunnelWarp(uv,funnelOptics,uRes,uChromeFunnelFrame);
      ` : 'vec2 funnelUv=uv;'}
      vec2 m = uMouse * 0.5 + 0.5;
      vec2 toM = uv - m;
      float mDist = length(toM);
      float mForce = smoothstep(0.62, 0.0, mDist);

      vec2 p = funnelUv * vec2(2.8, 2.0);
      p += normalize(toM + 0.0001) * mForce * 0.17 * sin(uTime * 1.7 + mDist * 13.0);
      p += vec2(sin(uTime * 0.2 + uv.y * 3.0), cos(uTime * 0.17 + uv.x * 2.5)) * 0.045;

      float t = uTime * 0.14;
      float w = wave(p, t);
      float s = 1.0 - abs(sin(w * 4.2 + t * 0.25));
      float s2 = s * s;
      float ridge = s2 * s2 * s2;

      vec3 base = vec3(0.055, 0.055, 0.055);
      vec3 dim = vec3(0.24, 0.24, 0.24);
      vec3 mid = vec3(0.58, 0.58, 0.58);
      vec3 hi = vec3(1.0, 1.0, 1.0);

      vec3 ribbon = mix(dim, mid, sin(uv.x * 2.2 + t * 0.15) * 0.5 + 0.5);
      ribbon = mix(ribbon, hi, ridge * 0.52);

      vec3 col = base;
      col = mix(col, ribbon, smoothstep(0.08, 0.88, ridge) * 0.58);

      float r2 = ridge * ridge;
      float r4 = r2 * r2;
      float r14 = r4 * r4 * r4 * r2;
      col += hi * r14 * 0.32;
      col += mid * mForce * 0.16;
      col += hi * mForce * ridge * 0.12;

      float vignette = smoothstep(1.15, 0.3, length(uv - 0.5));
      col *= 0.58 + vignette * 0.42;

      col = ((col - 0.5) * 1.04 + 0.5) * 0.78;

      ${hasFunnel ? 'col=cgFunnelPaint(col,uv,uRes,uChromeFunnelFrame,uChromeBoundary,uChromePaper,funnelOptics);' : `float chromeMask=1.0-smoothstep(.36,.86,1.0-uv.y);
      vec3 chromeLight=vec3(.91,.905,.88)-smoothstep(.05,1.25,uv.x+uv.y*.25)*.055;
      col=mix(col,chromeLight,uChromePaper*chromeMask);
      float chromeSeam=smoothstep(uChromeBoundary-.26,uChromeBoundary-.025,1.0-uv.y);
      vec3 seamColor=vec3(.03137255,.03529412,.03529412)/(.6+.4*uChromePaper);
      col=mix(col,seamColor,chromeSeam);
      `}
      gl_FragColor = vec4(col, 1.0);
    }
  `;

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
  var uChromePaper = gl.getUniformLocation(program, "uChromePaper");
  var uChromeBoundary = gl.getUniformLocation(program, "uChromeBoundary");
  var uChromeFunnelFrame = gl.getUniformLocation(program, "uChromeFunnelFrame");
  var uChromeFunnelElastic = gl.getUniformLocation(program, "uChromeFunnelElastic");
  var uChromeFunnelShape = gl.getUniformLocation(program, "uChromeFunnelShape");

  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  var running = false;
  var start = performance.now();
  window.cosgralAmbientFrame = { time: 0, at: start, mouse: mouse };
  var lastFrameTime = 0;
  var qualityTier = 0, coveredPainted = false;

  var SCALE_BY_TIER = hasFunnel ? (MOBILE ? [.75,.60,.45] : [.60,.48,.38]) : (MOBILE ? [.55,.45,.38] : [.52,.44,.36]);
  var dprCap = SCALE_BY_TIER[0];

  function resize() {
    var dpr = dprCap;
    var maxW = hasFunnel ? (MOBILE ? 780 : 1440) : (MOBILE ? 720 : 1280);
    var maxH = hasFunnel ? 900 : (MOBILE ? 540 : 720);
    if(hasFunnel)dpr=Math.min(dpr,maxW/window.innerWidth,maxH/window.innerHeight);
    var w = Math.min(maxW, Math.round(window.innerWidth * dpr));
    var h = Math.min(maxH, Math.round(window.innerHeight * dpr));
    if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      coveredPainted = false;
    }
  }

  if (window.cosgralPerf) {
    window.cosgralPerf.subscribe(function (t) {
      qualityTier = t;
      var cap = SCALE_BY_TIER[t] || SCALE_BY_TIER[0];
      if (cap === dprCap) return;
      dprCap = cap;
      resize();
    });
  }

  function frame(now) {
    if (!running) return;
    if (document.documentElement.classList.contains("is-nav-menu-open")) {
      requestAnimationFrame(frame);
      return;
    }
    var studio = window.cosgralChromeStudio;
    if(!studio?.covered)coveredPainted=false;
    if(studio?.covered&&coveredPainted){requestAnimationFrame(frame);return;}

    // Kiedy użytkownik jest w sekcji Kontakt lub Stopka, nieprzezroczyste tło (#030303)
    // całkowicie zasłania ten canvas — wstrzymujemy rysowanie (0% GPU/CPU na dole strony).
    if ((document.documentElement.classList.contains("is-footer-covered") || document.documentElement.classList.contains("is-ambient-covered"))) {
      requestAnimationFrame(frame);
      return;
    }

    // Limit 60 FPS dla monitorów 144Hz/240Hz, aby nie przepalać GPU
    var interval = hasFunnel ? (qualityTier===2 ? 30 : studio?.moving ? 14 : 30) : 14;
    if (now - lastFrameTime < interval) {
      requestAnimationFrame(frame);
      return;
    }
    lastFrameTime = now;

    var ptr = window.cosgralPointer;
    if (ptr) {
      mouse.tx = ptr.nx;
      mouse.ty = ptr.ny;
    }
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;

    gl.uniform2f(uRes, canvas.width, canvas.height);
    window.cosgralAmbientFrame.time = (now - start) / 1000;
    window.cosgralAmbientFrame.at = now;
    gl.uniform1f(uTime, window.cosgralAmbientFrame.time);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uChromePaper, window.cosgralChromeStudio?.paper || 0);
    gl.uniform1f(uChromeBoundary, window.cosgralChromeStudio?.boundary ?? 2);
    gl.uniform4fv(uChromeFunnelFrame, window.cosgralChromeStudio?.funnel || defaultFunnel);
    gl.uniform2fv(uChromeFunnelElastic, window.cosgralChromeStudio?.elastic || defaultElastic);
    gl.uniform4fv(uChromeFunnelShape, window.cosgralChromeStudio?.shape || defaultShape);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if(studio?.covered)coveredPainted=true;

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
  gl.uniform1f(uChromeBoundary, 2);
  gl.uniform4fv(uChromeFunnelFrame, defaultFunnel);
  gl.uniform2fv(uChromeFunnelElastic, defaultElastic);
  gl.uniform4fv(uChromeFunnelShape, defaultShape);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  play();

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) pause();
    else play();
  });
})();
