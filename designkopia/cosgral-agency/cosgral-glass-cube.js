/** Imported COSGRAL model and glass shader from the supplied cube archive. */
let cubeAssets;
export async function installGlassCube(THREE, renderer, scene, group, half, options = {}) {
  const assetURL = new URL('./assets/glass-cube/', import.meta.url);
  cubeAssets ||= Promise.all([
    fetch(new URL('web_glass.json', assetURL)).then(r=>{if(!r.ok)throw new Error('Cube settings unavailable');return r.json();}),
    fetch(new URL('cube_web_raw.glb', assetURL)).then(r=>{if(!r.ok)throw new Error('Cube model unavailable');return r.arrayBuffer();})
  ]).catch(error=>{cubeAssets=null;throw error;});
  const [settings, modelBytes]=await cubeAssets;
  const GLASS=structuredClone(settings);
  Object.assign(GLASS, options.glass || {});
  Object.assign(GLASS.env, options.env || {});
  const PARAMS = GLASS.env;
  const edgeUniform = { value: GLASS.edgeGlow };
  const farUniform = { value: GLASS.farSideDim };
  const rainbowUniform = { value: GLASS.rainbow || 0 };
  const rainbowTime = { value: 0 };
  const acrylicUniform = { value: GLASS.acrylic || 0 };
function buildEnvScene() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(PARAMS.ambient, PARAMS.ambient, PARAMS.ambient);
  const plane = new THREE.PlaneGeometry(1, 1);
  const add = (pos, size, power, color = 0xffffff) => {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    m.color.multiplyScalar(power);
    const mesh = new THREE.Mesh(plane, m);
    mesh.position.set(...pos); mesh.scale.set(size[0], size[1], 1);
    mesh.lookAt(0, 0, 0);
    env.add(mesh);
  };
  const P = PARAMS.power;
  add([0, 10, 0], [7, 7], 1.6 * P);            // big top softbox
  add([-8, 2, 3], [1.0, 9], 3.5 * P);          // left strip
  add([8, 2, -3], [1.0, 9], 3.5 * P);          // right strip
  add([3, 3, 8], [5, 1.0], 2.5 * P);           // front-right horizontal strip
  add([-4, 1, -8], [1.2, 7], 3.0 * P);         // back rim
  add([6, 6, 6], [2.5, 2.5], 2.0 * P);         // key softbox
  add([-6, 5, 6], [1.5, 1.5], 1.5 * P, 0xdfe8ff); // cool fill
  // big gradient "sheen" panels in the mirror directions of the three faces seen in the logo view
  // (top, front-left, right): each flat face picks up a soft graded reflection = reads as glass
  // instead of a black hole, while the strips above give the crisp rounded-edge highlights
  if (PARAMS.sheen > 0) {
    const gc = document.createElement('canvas'); gc.width = 4; gc.height = 256;
    const g2 = gc.getContext('2d'); const gr = g2.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g2.fillStyle = gr; g2.fillRect(0, 0, 4, 256);
    const gt = new THREE.CanvasTexture(gc); gt.colorSpace = THREE.SRGBColorSpace;
    const sheen = (pos, size, power, rot, tint=0xffffff) => {
      const m = new THREE.MeshBasicMaterial({ map: gt, side: THREE.DoubleSide, transparent: true, depthWrite: false });
      m.color.setHex(tint).multiplyScalar(power);
      const mesh = new THREE.Mesh(plane, m);
      mesh.position.set(...pos); mesh.scale.set(size[0], size[1], 1); mesh.lookAt(0, 0, 0); mesh.rotateZ(rot || 0);
      env.add(mesh);
    };
    const S = PARAMS.sheen;
    // A narrow violet studio light appears only in the reflected highlight.
    if(PARAMS.violetSheen>0){
      sheen([-6,3,7],[.55,3.4],P*PARAMS.violetSheen,-.48,0xa99ee9);
    }
    sheen([7, 7, -7], [12, 12], 0.9 * S, Math.PI);      // top face mirror (behind-right, above)
    sheen([-7, -7, -7], [12, 12], 0.85 * S, 0);         // front-left face mirror (below, left-behind)
    sheen([7, -7, 7], [12, 12], 0.85 * S, 0);           // right face mirror (below, right-front)
  }
  // subtle floor so lower bevels aren't totally black
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(PARAMS.floor, PARAMS.floor, PARAMS.floor) }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -6; env.add(floor);
  return env;
}
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(GLASS.color),
      metalness: GLASS.metalness,
      roughness: GLASS.roughness,
      transmission: GLASS.transmission,
      ior: GLASS.ior,
      thickness: GLASS.thickness,
      dispersion: GLASS.dispersion,
      attenuationColor: new THREE.Color(GLASS.attenuationColor),
      attenuationDistance: GLASS.attenuationDistance,
      clearcoat: GLASS.clearcoat,
      clearcoatRoughness: GLASS.clearcoatRoughness,
      specularIntensity: GLASS.specularIntensity,
      specularColor: new THREE.Color(GLASS.specularColor),
      envMapIntensity: GLASS.envMapIntensity,
      // soap-bubble thin film (KHR_materials_iridescence)
      iridescence: GLASS.iridescence || 0,
      iridescenceIOR: GLASS.iridescenceIOR || 1.3,
      iridescenceThicknessRange: (GLASS.iridescenceThicknessRange || [100, 400]).slice(),
      side: GLASS.side === 'front' ? THREE.FrontSide : THREE.DoubleSide,
    });

    // Edge glow: the Cycles reference gets bright bevels from total internal
    // reflection, which a realtime transmission pass can't do. Approximate it
    // with a soft emissive term on bevel faces (normals that aren't axis-aligned).
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uEdge = edgeUniform;
      sh.uniforms.uFar = farUniform;
      sh.uniforms.uIridNoise = { value: GLASS.iridescenceNoise || 0 };
      sh.uniforms.uIridEdge = { value: GLASS.iridescenceEdgeBias || 0 };
      sh.uniforms.uRainbow = rainbowUniform;
      sh.uniforms.uRbTime = rainbowTime;
      sh.uniforms.uAcrylic = acrylicUniform;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObjN;\nvarying vec3 vViewN;\nvarying vec3 vObjP;\nvarying vec3 vWorldN;\nvarying float vWorldH;')
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvObjN = normal;\nvViewN = normalMatrix * normal;\nvObjP = position;\nvWorldN = normalize(mat3(modelMatrix) * normal);\nvWorldH = (mat3(modelMatrix) * position).y / (length(modelMatrix[1].xyz) * ' + half.toFixed(4) + ');');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vObjN;
varying vec3 vViewN;
varying vec3 vObjP;
varying vec3 vWorldN;
varying float vWorldH;
uniform float uAcrylic;
uniform float uEdge;
uniform float uFar;
uniform float uIridNoise;
uniform float uIridEdge;
uniform float uRainbow;
uniform float uRbTime;
float irHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float irNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(irHash(i), irHash(i + vec3(1,0,0)), f.x), mix(irHash(i + vec3(0,1,0)), irHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(irHash(i + vec3(0,0,1)), irHash(i + vec3(1,0,1)), f.x), mix(irHash(i + vec3(0,1,1)), irHash(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
        // soap-bubble swirls: film thickness varies smoothly over the surface between the range
        // min..max (without a thickness texture three.js would use the maximum everywhere)
        .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
          #ifdef USE_IRIDESCENCE
          if (uIridNoise > 0.0) {
            float n = irNoise(vObjP * uIridNoise + 3.1) * 0.65 + irNoise(vObjP * uIridNoise * 2.1 + 7.7) * 0.35;
            material.iridescenceThickness = mix(iridescenceThicknessMinimum, iridescenceThicknessMaximum, smoothstep(0.2, 0.8, n));
          }
          // keep it light: full strength at grazing angles / rounded edges, weaker face-on
          material.iridescence *= mix(1.0 - uIridEdge, 1.0, pow(1.0 - saturate(abs(dot(normal, normalize(vViewPosition)))), 1.5));
          #endif`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          {
            vec3 on = normalize(vObjN);
            float mx = max(max(abs(on.x), abs(on.y)), abs(on.z));
            float edge = (1.0 - smoothstep(0.80, 0.995, mx));
            float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.5);
            // solid block: back faces are the far grooves (back G / bottom C) seen through the glass;
            // keep them dimmer so the near G and top C read first (mirrors the Cycles lighting balance)
            // (outward normal vs view vector; gl_FrontFacing is unreliable here because three renders the
            // back side with a flipped winding in the transmission pass)
            bool farSide = dot(normalize(vViewN), normalize(vViewPosition)) < 0.0;
            float nearFar = farSide ? uFar * 0.5 : 1.0;
            totalEmissiveRadiance += uEdge * nearFar * edge * (0.55 + 0.9 * fres) * vec3(0.96, 0.98, 1.0);
            // Clear acrylic block: a lit, slightly frosted top, the floor of the block
            // glowing through, and haze pooling low in the sides; faces only
            if (uAcrylic > 0.0) {
              vec3 wn = normalize(vWorldN);
              float topF = smoothstep(0.55, 0.92, wn.y);
              float botF = smoothstep(0.55, 0.92, -wn.y);
              float sideF = 1.0 - max(topF, botF);
              float hh = clamp(vWorldH * 0.5 + 0.5, 0.0, 1.0);
              float acr = topF * (0.85 + 0.2 * (1.0 - fres))
                + botF * (farSide ? 0.7 : 0.2)
                + sideF * mix(0.14, 0.015, smoothstep(0.0, 0.8, hh));
              totalEmissiveRadiance += uAcrylic * (1.0 - edge) * acr * vec3(0.965, 0.98, 1.0);
            }
            // Quartz-like light: a crisp white rim on the bevels, and spectral
            // dispersion (blue → violet → red → amber) gathered in the corners,
            // strongest at grazing angles, drifting very slowly
            if (uRainbow > 0.0) {
              vec3 a3 = abs(on);
              float hi = max(max(a3.x, a3.y), a3.z), lo = min(min(a3.x, a3.y), a3.z);
              float mid = a3.x + a3.y + a3.z - hi - lo;
              float edgeM = smoothstep(0.18, 0.5, mid) * (1.0 - smoothstep(0.88, 0.99, hi));
              float cornerM = smoothstep(0.22, 0.5, lo);
              float g = pow(fres, 1.6);
              float h = fract(0.58 + g * 0.55 + dot(vObjP, vec3(0.05, 0.035, 0.025)) + uRbTime * 0.02);
              vec3 rb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
              rb = mix(vec3(1.0), rb, 0.9);
              totalEmissiveRadiance += rb * uRainbow * nearFar * (edgeM * 0.5 + cornerM * 1.5) * (0.12 + 1.6 * g);
              totalEmissiveRadiance += vec3(1.0) * uRainbow * nearFar * edgeM * g * 0.7;
            }
          }`)
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n  if (uEdge > 0.0 && dot(normalize(vViewN), normalize(vViewPosition)) < 0.0) gl_FragColor.rgb *= uFar;');
    };

  // This exporter supplies one uncompressed, indexed mesh (no external buffers).
  // Validate that layout rather than silently misreading a different GLB.
  const data = modelBytes;
  const view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2)
    throw new Error('Invalid glass cube GLB');
  const jsonLength = view.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)));
  const binHeader = 20 + jsonLength;
  if (view.getUint32(binHeader + 4, true) !== 0x004e4942)
    throw new Error('Glass cube binary chunk missing');
  const binStart = binHeader + 8;
  function accessor(index, type, componentType, ArrayType, size) {
    const a = gltf.accessors[index];
    const b = gltf.bufferViews[a.bufferView];
    if (a.type !== type || a.componentType !== componentType || a.sparse || b.byteStride || b.buffer !== 0)
      throw new Error('Unsupported glass cube geometry layout');
    const offset = binStart + (b.byteOffset || 0) + (a.byteOffset || 0);
    return new THREE.BufferAttribute(new ArrayType(data.slice(offset, offset + a.count * size * ArrayType.BYTES_PER_ELEMENT)), size);
  }
  const primitive = gltf.meshes[0].primitives[0];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', accessor(primitive.attributes.POSITION, 'VEC3', 5126, Float32Array, 3));
  geometry.setAttribute('normal', accessor(primitive.attributes.NORMAL, 'VEC3', 5126, Float32Array, 3));
  geometry.setIndex(accessor(primitive.indices, 'SCALAR', 5123, Uint16Array, 1));
  geometry.scale(half, half, half);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  m.transparent = true;
  // A closed solid already gets a rear-face transmission pass in r170.
  // Use depth for the front surface and avoid two extra alpha-blended draws.
  m.forceSinglePass = true;
  m.depthWrite = true;
  m.customProgramCacheKey = () => 'cosgral-glass-swirl-v1';
  const mesh = new THREE.Mesh(geometry, m);
  mesh.name = 'CosgralGlassCube';
  mesh.userData.rainbowTime = rainbowTime;
  const envScene = buildEnvScene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  // fromScene in r170 fixes the studio at 256px. Capture a 512px cube map
  // first so glass highlights stay clean when the hero is enlarged.
  const envCapture = new THREE.WebGLCubeRenderTarget(512, {
    type: renderer.extensions.has('EXT_color_buffer_float') ? THREE.HalfFloatType : THREE.UnsignedByteType,
    colorSpace: THREE.LinearSRGBColorSpace,
    generateMipmaps: false
  });
  const captureCamera = new THREE.CubeCamera(0.1, 100, envCapture);
  const toneMapping = renderer.toneMapping;
  renderer.toneMapping = THREE.NoToneMapping;
  captureCamera.update(renderer, envScene);
  renderer.toneMapping = toneMapping;
  const target = pmrem.fromCubemap(envCapture.texture);
  envCapture.dispose();
  scene.environment = target.texture;
  envScene.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    if (o.material.map) o.material.map.dispose();
    o.material.dispose();
  });
  pmrem.dispose();

  // The DOM background is outside WebGL. Reproduce its shader only inside
  // Three r170's transmission buffer, leaving the visible DOM backdrop intact.
  // uText mirrors the real DOM in global screen coordinates. The physical
  // material then refracts this backdrop, including the letters, in its normal
  // transmission ray; the text is not drawn as an overlay on the cube.
  const emptyTextTexture = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  emptyTextTexture.needsUpdate = true;
  const backdropMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uRes: {value: new THREE.Vector2()}, uTime: {value: 0}, uMouse: {value: new THREE.Vector2()},
      uViewportOrigin: {value: new THREE.Vector2()},
      uCenter: {value: new THREE.Vector2()}, uSize: {value: new THREE.Vector2(1, 1)}, uEnabled: {value: 1},
      uText: {value: emptyTextTexture},uTextRect:{value:new THREE.Vector4(0,0,1,1)}
    },
    vertexShader: 'uniform vec2 uCenter,uSize; uniform float uEnabled; void main(){gl_Position=uEnabled>0.5?vec4(position.xy*uSize+uCenter,0.9999,1.0):vec4(2.0,2.0,2.0,1.0);}',
    fragmentShader: `
    precision highp float;
    uniform vec2 uRes;
    uniform vec2 uViewportOrigin;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform sampler2D uText;
    uniform vec4 uTextRect;
    vec4 cgTextSample(vec2 screenUv){
      vec2 textUv=(screenUv-uTextRect.xy)/uTextRect.zw;
      if(textUv.x<0.||textUv.x>1.||textUv.y<0.||textUv.y>1.)return vec4(0.);
      return texture2D(uText,textUv);
    }

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
      vec2 uv = (gl_FragCoord.xy + uViewportOrigin) / uRes.xy;
      vec2 m = uMouse * 0.5 + 0.5;
      vec2 toM = uv - m;
      float mDist = length(toM);
      float mForce = smoothstep(0.62, 0.0, mDist);

      vec2 p = uv * vec2(2.8, 2.0);
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

      // Keep the source text registered to the DOM. Distortion happens later
      // when the physical material samples this buffer along its refracted ray.
      vec4 textSample = cgTextSample(uv);
      col = mix(col, textSample.rgb, textSample.a);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
    depthTest: false, depthWrite: false, toneMapped: false
  });
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backdropMaterial);
  backdrop.frustumCulled = false;
  backdrop.renderOrder = -1000;
  const glassBounds = new THREE.Box3();
  const clipPoint = new THREE.Vector3();
  backdrop.onBeforeRender = (r, s, camera) => {
    const target = r.getRenderTarget();
    // r170 creates the internal transmission target with 4 samples;
    // the page's FXAA target has 0 samples, and the screen target is null.
    backdropMaterial.colorWrite = !!target && target.samples === 4;
    backdropMaterial.uniforms.uEnabled.value = backdropMaterial.colorWrite ? 1 : 0;
    if (!backdropMaterial.colorWrite) return;
    // Shade only the area that can be refracted by the glass, plus a margin.
    // The normal screen pass clips this mesh before rasterization entirely.
    glassBounds.copy(geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
    let minX = 1, minY = 1, maxX = -1, maxY = -1;
    for (let corner = 0; corner < 8; corner++) {
      clipPoint.set(corner & 1 ? glassBounds.max.x : glassBounds.min.x,
        corner & 2 ? glassBounds.max.y : glassBounds.min.y,
        corner & 4 ? glassBounds.max.z : glassBounds.min.z).project(camera);
      minX = Math.min(minX, clipPoint.x); maxX = Math.max(maxX, clipPoint.x);
      minY = Math.min(minY, clipPoint.y); maxY = Math.max(maxY, clipPoint.y);
    }
    minX = Math.max(-1, minX - 0.18); maxX = Math.min(1, maxX + 0.18);
    minY = Math.max(-1, minY - 0.18); maxY = Math.min(1, maxY + 0.18);
    backdropMaterial.uniforms.uCenter.value.set((minX + maxX) / 2, (minY + maxY) / 2);
    backdropMaterial.uniforms.uSize.value.set((maxX - minX) / 2, (maxY - minY) / 2);
    const view = camera.view;
    if (view?.enabled) {
      const dpr = r.getPixelRatio();
      backdropMaterial.uniforms.uRes.value.set(view.fullWidth * dpr, view.fullHeight * dpr);
      backdropMaterial.uniforms.uViewportOrigin.value.set(view.offsetX * dpr,
        (view.fullHeight - view.offsetY - view.height) * dpr);
    } else {
      r.getDrawingBufferSize(backdropMaterial.uniforms.uRes.value);
      backdropMaterial.uniforms.uViewportOrigin.value.set(0, 0);
    }
    const ambient = window.cosgralAmbientFrame;
    if (ambient) {
      // Let refracted light keep flowing while the full-page background is
      // paused behind navigation. Both clocks reconnect without a phase jump.
      backdropMaterial.uniforms.uTime.value = ambient.time + (performance.now() - (ambient.at || performance.now())) / 1000;
      backdropMaterial.uniforms.uMouse.value.set(ambient.mouse.x, ambient.mouse.y);
    }
  };
  scene.add(backdrop);
  mesh.userData.transmissionBackdrop = backdrop;
  mesh.userData.environmentTarget = target;

  group.add(mesh);
  return mesh;
}
