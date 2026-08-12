/**
 * Shared rounded cube geometry for homepage + subpages.
 */
import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

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

export function createIntactCubeParts(half) {
  var boxGeo = createRoundedBoxGeometry(half);
  var shellMat = new THREE.MeshBasicMaterial({
    color: 0x080808,
    transparent: true,
    opacity: 0.62,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  var shell = new THREE.Mesh(boxGeo, shellMat);
  shell.renderOrder = 0;

  var edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(boxGeo, EDGE_OUTLINE_ANGLE),
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    })
  );
  edges.renderOrder = 1;

  return { boxGeo, shell, wire: null, edges, setWireOpacity };
}

export function createShardGeometry() {
  return createRoundedBoxGeometry(0.5, 0.16, 3);
}
