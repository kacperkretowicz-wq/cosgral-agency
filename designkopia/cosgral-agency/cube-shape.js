/**
 * Shared cube geometry for homepage + subpages.
 * The visible cube is the Blender glass mesh (cube_web.glb, meshopt).
 */
import * as THREE from "./vendor/three-0.170.0.module.min.js?v=20261011scroll";
import { GLTFLoader, MeshoptDecoder } from "./vendor/cube-three-addons.js";
import { createGlassMaterial, whenGlassSpec } from "./cube-glass.js?v=20261011menu";

export { installGlassScene } from "./cube-glass.js?v=20261011menu";

var EDGE_RADIUS_RATIO = 0.2;
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

var sourceGeo = null;
var surface = null;
var readyPromise = null;

function hashUnit(i, salt) {
  var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildSurface(geo) {
  var pos = geo.attributes.position.array;
  var index = geo.index ? geo.index.array : null;
  var triCount = index ? index.length / 3 : pos.length / 9;
  var areas = new Float32Array(triCount);
  var total = 0;
  var ax;
  var ay;
  var az;
  var bx;
  var by;
  var bz;
  var cx;
  var cy;
  var cz;
  var abx;
  var aby;
  var abz;
  var acx;
  var acy;
  var acz;
  for (var t = 0; t < triCount; t++) {
    var i0 = index ? index[t * 3] : t * 3;
    var i1 = index ? index[t * 3 + 1] : t * 3 + 1;
    var i2 = index ? index[t * 3 + 2] : t * 3 + 2;
    ax = pos[i0 * 3];
    ay = pos[i0 * 3 + 1];
    az = pos[i0 * 3 + 2];
    bx = pos[i1 * 3];
    by = pos[i1 * 3 + 1];
    bz = pos[i1 * 3 + 2];
    cx = pos[i2 * 3];
    cy = pos[i2 * 3 + 1];
    cz = pos[i2 * 3 + 2];
    abx = bx - ax;
    aby = by - ay;
    abz = bz - az;
    acx = cx - ax;
    acy = cy - ay;
    acz = cz - az;
    var crx = aby * acz - abz * acy;
    var cry = abz * acx - abx * acz;
    var crz = abx * acy - aby * acx;
    total += 0.5 * Math.sqrt(crx * crx + cry * cry + crz * crz);
    areas[t] = total;
  }
  surface = { pos: pos, index: index, areas: areas, total: Math.max(total, 1e-8) };
}

function pointOnSurface(uArea, u, v, half) {
  if (!surface) {
    var face = Math.floor(uArea * 6);
    var a = (u - 0.5) * 2 * half;
    var b = (v - 0.5) * 2 * half;
    if (face === 0) return [half, a, b];
    if (face === 1) return [-half, a, b];
    if (face === 2) return [a, half, b];
    if (face === 3) return [a, -half, b];
    if (face === 4) return [a, b, half];
    return [a, b, -half];
  }
  var target = uArea * surface.total;
  var lo = 0;
  var hi = surface.areas.length - 1;
  while (lo < hi) {
    var mid = (lo + hi) >> 1;
    if (surface.areas[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  var t = lo;
  var i0 = surface.index ? surface.index[t * 3] : t * 3;
  var i1 = surface.index ? surface.index[t * 3 + 1] : t * 3 + 1;
  var i2 = surface.index ? surface.index[t * 3 + 2] : t * 3 + 2;
  var pos = surface.pos;
  if (u + v > 1) {
    u = 1 - u;
    v = 1 - v;
  }
  var w = 1 - u - v;
  return [
    (pos[i0 * 3] * w + pos[i1 * 3] * u + pos[i2 * 3] * v) * half,
    (pos[i0 * 3 + 1] * w + pos[i1 * 3 + 1] * u + pos[i2 * 3 + 1] * v) * half,
    (pos[i0 * 3 + 2] * w + pos[i1 * 3 + 2] * u + pos[i2 * 3 + 2] * v) * half,
  ];
}

/** Deterministic point on the glass mesh, in the same space as the cube shell. */
export function sampleCubeSurface(index, half) {
  return pointOnSurface(hashUnit(index, 21), hashUnit(index, 22), hashUnit(index, 23), half);
}

export function randomCubeSurface(half) {
  return pointOnSurface(Math.random(), Math.random(), Math.random(), half);
}

function fitUnitCube(geo) {
  geo.computeBoundingBox();
  var box = geo.boundingBox;
  var size = new THREE.Vector3();
  var center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  geo.translate(-center.x, -center.y, -center.z);
  var maxDim = Math.max(size.x, size.y, size.z) || 1;
  var fit = 2 / maxDim;
  geo.scale(fit, fit, fit);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

function fallbackUnitGeo() {
  return fitUnitCube(new RoundedBoxGeometry(2, 2, 2, EDGE_SEGMENTS, 0.4));
}

export function whenCubeReady() {
  if (!readyPromise) {
    readyPromise = whenGlassSpec()
      .then(function () {
        var loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        var url = new URL("./assets/cube/cube_web.glb", import.meta.url).href;
        return loader.loadAsync(url);
      })
      .then(function (gltf) {
        var mesh = null;
        gltf.scene.traverse(function (obj) {
          if (!mesh && obj.isMesh) mesh = obj;
        });
        if (!mesh) throw new Error("cube_web.glb has no mesh");
        sourceGeo = fitUnitCube(mesh.geometry.clone());
        buildSurface(sourceGeo);
      })
      .catch(function (err) {
        console.warn("[cube-shape] cube_web.glb", err);
        sourceGeo = fallbackUnitGeo();
        buildSurface(sourceGeo);
      });
  }
  return readyPromise;
}

export function createIntactCubeParts(half) {
  var unit = sourceGeo || fallbackUnitGeo();
  var boxGeo = unit.clone();
  boxGeo.scale(half, half, half);
  boxGeo.computeBoundingSphere();

  var shell = new THREE.Mesh(boxGeo, createGlassMaterial());
  shell.renderOrder = 0;
  shell.castShadow = false;
  shell.receiveShadow = false;

  var edgeGeo = new THREE.EdgesGeometry(boxGeo, EDGE_OUTLINE_ANGLE);
  if (!edgeGeo.attributes.position || edgeGeo.attributes.position.count > 1500) {
    edgeGeo.dispose();
    var cage = new THREE.BoxGeometry(half * 2, half * 2, half * 2);
    edgeGeo = new THREE.EdgesGeometry(cage);
    cage.dispose();
  }
  var edges = new THREE.LineSegments(
    edgeGeo,
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
  );
  edges.renderOrder = 1;
  /* White outline reads as a halo on clear glass. Callers still set opacity. */
  edges.visible = false;

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
