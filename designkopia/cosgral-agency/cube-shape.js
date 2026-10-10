/**
 * Shared rounded cube geometry for homepage + subpages.
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js";

var EDGE_RADIUS_RATIO = 0.055;
var EDGE_SEGMENTS = 5;
var EDGE_OUTLINE_ANGLE = 72;

var _tempNormal = new THREE.Vector3();

function getUv(faceDirVector, normal, uvAxis, projectionAxis, radius, sideLength) {
  var totArcLength = (2 * Math.PI * radius) / 4;
  var centerLength = Math.max(sideLength - 2 * radius, 0);
  var halfArc = Math.PI / 4;

  _tempNormal.copy(normal);
  _tempNormal[projectionAxis] = 0;
  _tempNormal.normalize();

  var arcUvRatio = 0.5 * (totArcLength / (totArcLength + centerLength));
  var arcAngleRatio = 1.0 - _tempNormal.angleTo(faceDirVector) / halfArc;

  if (Math.sign(_tempNormal[uvAxis]) === 1) {
    return arcAngleRatio * arcUvRatio;
  }

  var lenUv = centerLength / (totArcLength + centerLength);
  return lenUv + arcUvRatio + arcUvRatio * (1.0 - arcAngleRatio);
}

class RoundedBoxGeometry extends THREE.BoxGeometry {
  constructor(width, height, depth, segments, radius) {
    width = width == null ? 1 : width;
    height = height == null ? 1 : height;
    depth = depth == null ? 1 : depth;
    segments = segments == null ? 2 : segments;
    radius = radius == null ? 0.1 : radius;

    segments = segments * 2 + 1;
    radius = Math.min(width / 2, height / 2, depth / 2, radius);

    super(1, 1, 1, segments, segments, segments);

    if (segments === 1) return;

    var geometry2 = this.toNonIndexed();
    this.index = null;
    this.attributes.position = geometry2.attributes.position;
    this.attributes.normal = geometry2.attributes.normal;
    this.attributes.uv = geometry2.attributes.uv;

    var position = new THREE.Vector3();
    var normal = new THREE.Vector3();
    var box = new THREE.Vector3(width, height, depth).divideScalar(2).subScalar(radius);
    var positions = this.attributes.position.array;
    var normals = this.attributes.normal.array;
    var uvs = this.attributes.uv.array;
    var faceTris = positions.length / 6;
    var faceDirVector = new THREE.Vector3();
    var halfSegmentSize = 0.5 / segments;

    for (var i = 0, j = 0; i < positions.length; i += 3, j += 2) {
      position.fromArray(positions, i);
      normal.copy(position);
      normal.x -= Math.sign(normal.x) * halfSegmentSize;
      normal.y -= Math.sign(normal.y) * halfSegmentSize;
      normal.z -= Math.sign(normal.z) * halfSegmentSize;
      normal.normalize();

      positions[i + 0] = box.x * Math.sign(position.x) + normal.x * radius;
      positions[i + 1] = box.y * Math.sign(position.y) + normal.y * radius;
      positions[i + 2] = box.z * Math.sign(position.z) + normal.z * radius;

      normals[i + 0] = normal.x;
      normals[i + 1] = normal.y;
      normals[i + 2] = normal.z;

      var side = Math.floor(i / faceTris);

      switch (side) {
        case 0:
          faceDirVector.set(1, 0, 0);
          uvs[j + 0] = getUv(faceDirVector, normal, "z", "y", radius, depth);
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, "y", "z", radius, height);
          break;
        case 1:
          faceDirVector.set(-1, 0, 0);
          uvs[j + 0] = 1.0 - getUv(faceDirVector, normal, "z", "y", radius, depth);
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, "y", "z", radius, height);
          break;
        case 2:
          faceDirVector.set(0, 1, 0);
          uvs[j + 0] = 1.0 - getUv(faceDirVector, normal, "x", "z", radius, width);
          uvs[j + 1] = getUv(faceDirVector, normal, "z", "x", radius, depth);
          break;
        case 3:
          faceDirVector.set(0, -1, 0);
          uvs[j + 0] = 1.0 - getUv(faceDirVector, normal, "x", "z", radius, width);
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, "z", "x", radius, depth);
          break;
        case 4:
          faceDirVector.set(0, 0, 1);
          uvs[j + 0] = 1.0 - getUv(faceDirVector, normal, "x", "y", radius, width);
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, "y", "x", radius, height);
          break;
        case 5:
          faceDirVector.set(0, 0, -1);
          uvs[j + 0] = getUv(faceDirVector, normal, "x", "y", radius, width);
          uvs[j + 1] = 1.0 - getUv(faceDirVector, normal, "y", "x", radius, height);
          break;
      }
    }
  }
}

export function createRoundedBoxGeometry(half, radiusRatio, segments) {
  var size = half * 2;
  var radius = half * (radiusRatio == null ? EDGE_RADIUS_RATIO : radiusRatio);
  var segs = segments == null ? EDGE_SEGMENTS : segments;
  return new RoundedBoxGeometry(size, size, size, segs, radius);
}

function setWireOpacity(wire, value) {
  if (wire) wire.material.opacity = value;
}

/** Glass recipe mirrored in assets/web_glass.json. Equal extents — a cube, not a slab. */
export function createGlassMaterial(mobile) {
  var low = !!mobile;
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.07,
    transmission: low ? 0.78 : 0.9,
    thickness: low ? 0.85 : 1.25,
    ior: 1.5,
    iridescence: low ? 0.7 : 1,
    iridescenceIOR: 1.28,
    iridescenceThicknessRange: new THREE.Vector2(120, 420),
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 1,
    envMapIntensity: 1.25,
    side: THREE.FrontSide,
  });
}

export function attachGlassEnv(renderer, scene) {
  if (!renderer || !scene || scene.environment) return;
  var env = new THREE.Scene();
  function strip(w, h, x, y, z, ry, rx, color) {
    var mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx || 0, ry || 0, 0);
    env.add(mesh);
  }
  strip(14, 2.2, 0, 6.2, 0, 0, Math.PI / 2, 0xffffff);
  strip(2.4, 11, -6.5, 0.4, 1.2, Math.PI / 2.5, 0, 0xff6a3c);
  strip(2.1, 9, 6.4, 0.2, -1.2, -Math.PI / 2.4, 0, 0x9eb0e8);
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.05).texture;
  pmrem.dispose();
}

export function createIntactCubeParts(half) {
  var boxGeo = createRoundedBoxGeometry(half);
  var mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
  var shellMat = createGlassMaterial(mobile);
  var shell = new THREE.Mesh(boxGeo, shellMat);
  shell.renderOrder = 0;

  var edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(boxGeo, EDGE_OUTLINE_ANGLE),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
  );
  edges.renderOrder = 1;

  return { boxGeo: boxGeo, shell: shell, wire: null, edges: edges, setWireOpacity: setWireOpacity };
}

/**
 * Shard = instancja ~3–6 px na ekranie (aSize0 ≈ 0.016–0.036 j. świata przy
 * ~170 px/j.). Zaokrąglenie 7×7 segmentów na ścianę dawało 1764 wierzchołków
 * na instancję → przy 1600 shardach ~2,8 mln wierzchołków na klatkę przez
 * ciężki vertex shader, dla detalu niewidocznego w tej skali. Zwykły box
 * (24 wierzchołki, indeksowany) wygląda identycznie, a kosztuje ~70× mniej.
 */
export function createShardGeometry() {
  return new THREE.BoxGeometry(1, 1, 1);
}
