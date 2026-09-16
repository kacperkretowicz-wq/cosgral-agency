/**
 * Tani post-pass FXAA dla scen Three.js zamiast MSAA.
 *
 * MSAA 4× (antialias: true) na pełnoekranowym canvasie z dużymi, addytywnymi
 * sprite'ami punktów kosztował na iGPU (Intel HD) ~8–10 ms/klatkę w 720p —
 * każdy piksel sprite'a to 4 blendowane sample. FXAA: render do render-targetu
 * bez MSAA + jeden pełnoekranowy pass (5–9 próbek tekstury/piksel) daje
 * gładkie krawędzie sześcianu za ułamek tego kosztu.
 *
 * Użycie:
 *   var renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
 *   var fxaa = createFxaaPass(THREE, renderer);
 *   // po każdym renderer.setSize / setPixelRatio:
 *   fxaa.resize();
 *   // zamiast renderer.render(scene, camera):
 *   fxaa.render(scene, camera);
 *
 * Bufor jest kopiowany 1:1 (NoBlending) — po blendowaniu w RT dane są
 * premultiplied, więc liniowe uśrednianie RGBA w FXAA jest poprawne także dla
 * kanału alfa, a kompozycja z tłem strony zostaje po stronie przeglądarki.
 */
export function createFxaaPass(THREE, renderer) {
  var target = new THREE.WebGLRenderTarget(2, 2, {
    depthBuffer: true,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

  var material = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: target.texture },
      uInvRes: { value: new THREE.Vector2(0.5, 0.5) },
    },
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    // FXAA (wariant 5-tap jak glsl-fxaa): kierunek krawędzi z lumy 4 sąsiadów,
    // 4 próbki wzdłuż krawędzi; płaskie obszary wychodzą po 5 próbkach.
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 uInvRes;
      varying vec2 vUv;
      #define FXAA_REDUCE_MIN (1.0 / 128.0)
      #define FXAA_REDUCE_MUL (1.0 / 8.0)
      #define FXAA_SPAN_MAX 8.0
      void main() {
        vec3 rgbNW = texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * uInvRes).rgb;
        vec3 rgbNE = texture2D(tDiffuse, vUv + vec2( 1.0, -1.0) * uInvRes).rgb;
        vec3 rgbSW = texture2D(tDiffuse, vUv + vec2(-1.0,  1.0) * uInvRes).rgb;
        vec3 rgbSE = texture2D(tDiffuse, vUv + vec2( 1.0,  1.0) * uInvRes).rgb;
        vec4 texM = texture2D(tDiffuse, vUv);
        vec3 luma = vec3(0.299, 0.587, 0.114);
        float lumaNW = dot(rgbNW, luma);
        float lumaNE = dot(rgbNE, luma);
        float lumaSW = dot(rgbSW, luma);
        float lumaSE = dot(rgbSE, luma);
        float lumaM = dot(texM.rgb, luma);
        float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
        float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
        if (lumaMax - lumaMin < 0.03) {
          gl_FragColor = texM;
          return;
        }
        vec2 dir;
        dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
        dir.y = ((lumaNW + lumaSW) - (lumaNE + lumaSE));
        float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) * (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
        float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
        dir = min(vec2(FXAA_SPAN_MAX), max(vec2(-FXAA_SPAN_MAX), dir * rcpDirMin)) * uInvRes;
        vec4 rgbA = 0.5 * (
          texture2D(tDiffuse, vUv + dir * (1.0 / 3.0 - 0.5)) +
          texture2D(tDiffuse, vUv + dir * (2.0 / 3.0 - 0.5))
        );
        vec4 rgbB = rgbA * 0.5 + 0.25 * (
          texture2D(tDiffuse, vUv + dir * -0.5) +
          texture2D(tDiffuse, vUv + dir * 0.5)
        );
        float lumaB = dot(rgbB.rgb, luma);
        gl_FragColor = (lumaB < lumaMin || lumaB > lumaMax) ? rgbA : rgbB;
      }
    `,
  });

  // Jeden trójkąt pokrywający cały ekran (uv poza [0,1] i tak jest obcięte).
  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
  );
  geometry.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  var quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  var postScene = new THREE.Scene();
  postScene.add(quad);
  var postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var size = new THREE.Vector2();

  function resize() {
    renderer.getDrawingBufferSize(size);
    var w = Math.max(1, Math.floor(size.x));
    var h = Math.max(1, Math.floor(size.y));
    if (target.width !== w || target.height !== h) target.setSize(w, h);
    material.uniforms.uInvRes.value.set(1 / w, 1 / h);
  }

  function render(scene, camera) {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(postScene, postCamera);
  }

  resize();
  return { render: render, resize: resize, target: target };
}
