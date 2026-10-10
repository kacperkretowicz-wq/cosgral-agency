/**
 * Shared Cosgral cube look — homepage hero is the source of truth.
 * Geometry stays in cube-shape.js; materials + surface shimmer live here.
 */
export var CUBE_HALF = 1.35;
export var HERO_CUBE_SCALE = 0.5;
export var MOBILE_HERO_CUBE = 1.6;

export function heroCubeLook(mobile) {
  return {
    half: CUBE_HALF,
    cubeScale: HERO_CUBE_SCALE,
    heroScaleMul: mobile ? 0.39 * MOBILE_HERO_CUBE : 0.78,
    peakScaleMul: mobile ? 0.58 * MOBILE_HERO_CUBE : 1.16,
    edgeOp: mobile ? 0.18 : 0.24,
    shellOp: mobile ? 0.5 : 0.45,
    surfaceCount: mobile ? 1200 : 2800,
    surfaceSizeMul: mobile ? 0.48 : 1,
    surfaceAlphaMul: mobile ? 0.42 : 1,
    restRot: { x: 0.22, y: -0.35, z: 0 },
  };
}

export var CUBE_SHIMMER_VERTEX = [
  "attribute float size;",
  "uniform float uTime;",
  "uniform vec2 uMouse;",
  "uniform float uFade;",
  "uniform float uAlphaMul;",
  "varying float vAlpha;",
  "void main() {",
  "  vec3 pos = position;",
  "  float pulse = sin(uTime * 0.55 + pos.y * 4.0 + pos.x * 3.0) * 0.012;",
  "  pos += normalize(pos + 0.0001) * pulse;",
  "  float dist = length(pos.xy - uMouse * 1.4);",
  "  float ripple = sin(dist * 9.0 - uTime * 2.8) * smoothstep(2.6, 0.0, dist) * 0.07;",
  "  pos.xy += normalize(pos.xy + 0.0001) * ripple;",
  "  vec4 mv = modelViewMatrix * vec4(pos, 1.0);",
  "  gl_PointSize = size * (190.0 / -mv.z) * (1.0 + smoothstep(2.2, 0.0, dist) * 0.75);",
  "  gl_Position = projectionMatrix * mv;",
  "  vAlpha = (0.16 + smoothstep(2.8, 0.0, dist) * 0.25) * uFade * uAlphaMul;",
  "}",
].join("\n");

export var CUBE_SHIMMER_FRAGMENT = [
  "varying float vAlpha;",
  "void main() {",
  "  float d = length(gl_PointCoord - 0.5);",
  "  if (d > 0.5) discard;",
  "  float glow = 1.0 - smoothstep(0.0, 0.5, d);",
  "  gl_FragColor = vec4(0.7, 0.7, 0.72, vAlpha * glow * 0.5);",
  "}",
].join("\n");

export function createCubeShimmerMaterial(THREE, opts) {
  opts = opts || {};
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uFade: { value: opts.fade != null ? opts.fade : 1 },
      uAlphaMul: { value: opts.alphaMul != null ? opts.alphaMul : 1 },
    },
    vertexShader: CUBE_SHIMMER_VERTEX,
    fragmentShader: CUBE_SHIMMER_FRAGMENT,
  });
}

export function applyHeroCubeMaterials(shell, edges, fade, look) {
  var dim = fade == null ? 1 : fade;
  if (shell && shell.material) {
    if (shell.material.color) shell.material.color.setHex(0x080808);
    shell.material.opacity = look.shellOp * dim;
  }
  if (edges && edges.material) {
    edges.material.opacity = look.edgeOp * dim;
  }
}
