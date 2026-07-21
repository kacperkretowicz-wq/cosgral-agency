/**
 * COSGRAL V3 — teksturowane tła sekcji, goły WebGL (bez Reacta / three-fiber).
 *
 * Dwie odmiany, obie wg kierunków z `inspo.html` (7-pinowy moodboard klienta —
 * "grain, glitch lo-fi, liquid metal, bionic, ribbed glass, cinematic haze,
 * editorial") i `efekty.txt` (paper-design shaders MeshGradient, adaptacja
 * na vanilla — patrz PLAN-PRZEBUDOWY-V3.md §5.3):
 *
 *   data-mesh-canvas="mesh"         — usługi: miękki, muted mesh-gradient
 *                                      (editorial tech), kierunek grain_field.
 *   data-mesh-canvas="liquid-metal" — proces: hipnotyczne czarno-srebrne
 *                                      wstęgi, kierunek liquid_metal (pin B:
 *                                      "Abstract black wavy lines").
 *
 * Uwaga: pinterest.com w inspo.html to WYŁĄCZNIE mood-referencja — miniatury
 * stamtąd celowo NIE są hotlinkowane na produkcję (obcy CDN, wątpliwa
 * licencja do redystrybucji, ryzyko martwych linków). Efekt jest własnym
 * shaderem inspirowanym tym klimatem, nie kopią zdjęcia.
 */
(function () {
  "use strict";

  const REDUCED_MOTION = false;

  const VERT = `
    attribute vec2 aPos;
    void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
  `;

  const FRAG_MESH = `
    precision mediump float;
    uniform vec2 uRes;
    uniform float uTime;
    vec3 c0 = vec3(0.0, 0.0, 0.0);
    vec3 c1 = vec3(0.102, 0.102, 0.102);
    vec3 c2 = vec3(0.2, 0.2, 0.2);
    vec3 c3 = vec3(0.961, 0.941, 0.922);
    void main() {
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      float t = uTime * 0.06;
      float n = sin(uv.x * 6.0 + t) * cos(uv.y * 4.5 + t * 0.8);
      n += sin(uv.x * 11.0 - t * 1.6) * cos(uv.y * 8.0 + t * 1.1) * 0.5;
      n = n * 0.5 + 0.5;
      vec3 col = mix(c0, c1, smoothstep(0.0, 0.6, n));
      col = mix(col, c2, smoothstep(0.35, 0.85, n) * 0.7);
      float highlight = pow(max(0.0, n - 0.75) * 4.0, 2.0);
      col = mix(col, c3, highlight * 0.18);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // liquid_metal (pin B): warstwowe, wolno płynące wstęgi zagęszczane do
  // metalicznych grzbietów (pow(sin,6)) na niemal czarnym tle — hipnotyczny,
  // powtarzalny ruch bez migotania (bez Math.random, czysto deterministyczne).
  const FRAG_LIQUID_METAL = `
    precision mediump float;
    uniform vec2 uRes;
    uniform float uTime;
    void main() {
      vec2 uv = gl_FragCoord.xy / uRes.xy;
      
      // Skalowanie współrzędnych dla fal i organicznego ruchu
      vec2 p = uv * vec2(2.5, 1.8);
      float t = uTime * 0.16;
      
      float wave = 0.0;
      float amp = 1.0;
      for (int i = 0; i < 4; i++) {
        float fi = float(i);
        p.x += sin(p.y * (1.5 + fi * 0.4) + t * 0.9) * 0.22;
        wave += sin(p.x * (2.0 + fi * 0.8) + p.y * 1.2 + t * (0.6 + fi * 0.1)) * amp;
        amp *= 0.6;
      }
      wave = wave * 0.5 + 0.5;
      
      // Ostre, lśniące grzbiety (silk wave ribbons)
      float ridge = pow(1.0 - abs(sin(wave * 4.5 + t * 0.3)), 7.0);
      
      // Ciemna baza tła
      vec3 col = vec3(0.0, 0.0, 0.0);
      
      // Kolory kinematograficzne z inspiracji (ciepły bursztyn/cynober oraz chłodny indygo/fiolet)
      vec3 colWarm = vec3(0.95, 0.38, 0.12); // cynober/bursztyn
      vec3 colCool = vec3(0.18, 0.32, 0.88); // głęboki niebieski/indygo
      vec3 colHighlight = vec3(1.0, 0.82, 0.58); // ciepłe złote rozświetlenie
      
      // Mieszanie kolorów fal na podstawie pozycji X i samej fali
      vec3 waveColor = mix(colCool, colWarm, sin(uv.x * 2.5 + t * 0.2) * 0.5 + 0.5);
      waveColor = mix(waveColor, colHighlight, ridge * 0.45);
      
      // Nałożenie koloru na grzbiety i miękka poświata
      float glow = smoothstep(0.12, 0.85, ridge);
      col = mix(col, waveColor, glow * 0.8);
      
      // Intensywne lśnienie na samych krawędziach
      col += colHighlight * pow(ridge, 16.0) * 0.85;
      
      // Subtelny ambient glow w tle w odcieniach indygo
      col += colCool * (sin(uv.y * 1.5 - t * 0.4) * 0.5 + 0.5) * 0.06;
      
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(gl, type, src, label) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[mesh-gradient-bg:" + label + "]", gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  function mountMeshCanvas(canvas, mode) {
    const gl = canvas.getContext("webgl", { antialias: true, alpha: true }) ||
               canvas.getContext("experimental-webgl", { antialias: true, alpha: true });
    if (!gl) { canvas.remove(); return; }

    const frag = mode === "liquid-metal" ? FRAG_LIQUID_METAL : FRAG_MESH;
    const vs = compile(gl, gl.VERTEX_SHADER, VERT, mode);
    const fs = compile(gl, gl.FRAGMENT_SHADER, frag, mode);
    if (!vs || !fs) { canvas.remove(); return; }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[mesh-gradient-bg:" + mode + "]", gl.getProgramInfoLog(program));
      canvas.remove();
      return;
    }
    gl.useProgram(program);

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    let running = false;
    let rafId = null;
    const start = performance.now ? performance.now() : 0;

    function frame(now) {
      if (!running) return;
      resize();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      rafId = requestAnimationFrame(frame);
    }
    function play() { if (!running) { running = true; rafId = requestAnimationFrame(frame); } }
    function pause() { running = false; if (rafId) cancelAnimationFrame(rafId); }

    new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !document.hidden) play();
      else pause();
    }, { threshold: 0 }).observe(canvas);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pause();
    });

    window.addEventListener("resize", resize);
    resize();
  }

  document.querySelectorAll("[data-mesh-canvas]").forEach((canvas) => {
    if (REDUCED_MOTION) { canvas.remove(); return; }
    mountMeshCanvas(canvas, canvas.dataset.meshCanvas);
  });
})();
