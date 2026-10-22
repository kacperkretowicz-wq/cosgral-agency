"""Bake a signed distance field of the actual logo GLB. Requires numpy/scipy."""
from pathlib import Path
import json
import struct
import numpy as np
from scipy import ndimage

root = Path(__file__).resolve().parents[1]
data = (root / 'assets/glass-cube/cube_web_raw.glb').read_bytes()
length = struct.unpack_from('<I', data, 12)[0]
doc = json.loads(data[20:20+length])
start = 28+length

def accessor(index, dtype, width):
    a = doc['accessors'][index]
    b = doc['bufferViews'][a['bufferView']]
    offset = start+b.get('byteOffset', 0)+a.get('byteOffset', 0)
    return np.frombuffer(data, dtype=dtype, count=a['count']*width, offset=offset).reshape(-1, width)

primitive = doc['meshes'][0]['primitives'][0]
vertices = accessor(primitive['attributes']['POSITION'], '<f4', 3)*1.35
triangles = accessor(primitive['indices'], '<u2', 1).reshape(-1, 3)
resolution, extent = 96, 1.5
step = 2*extent/resolution
grid = (vertices+extent)/step
shell = np.zeros((resolution,)*3, dtype=bool)  # z, y, x
for face in triangles:
    tri = grid[face]
    normal = np.cross(tri[1]-tri[0], tri[2]-tri[0])
    axis = int(np.argmax(np.abs(normal)))
    if abs(normal[axis]) < 1e-10:
        continue
    u, v = [i for i in range(3) if i != axis]
    lo = np.maximum(0, np.floor(tri[:, [u, v]].min(axis=0)).astype(int)-1)
    hi = np.minimum(resolution-1, np.ceil(tri[:, [u, v]].max(axis=0)).astype(int)+1)
    uu, vv = np.meshgrid(np.arange(lo[0], hi[0]+1), np.arange(lo[1], hi[1]+1))
    a, b, c = tri[:, [u, v]]
    denom = (b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if abs(denom) < 1e-10:
        continue
    wa = ((b[1]-c[1])*(uu-c[0])+(c[0]-b[0])*(vv-c[1]))/denom
    wb = ((c[1]-a[1])*(uu-c[0])+(a[0]-c[0])*(vv-c[1]))/denom
    wc = 1-wa-wb
    # Conservative coverage closes subvoxel bevels without filling logo grooves.
    inside = (wa >= -.035) & (wb >= -.035) & (wc >= -.035)
    depth = (tri[0, axis]-(normal[u]*(uu-tri[0, u])+normal[v]*(vv-tri[0, v]))/normal[axis])
    for rounding in (np.floor, np.ceil):
        coords = [None]*3
        coords[u], coords[v] = uu[inside], vv[inside]
        coords[axis] = np.clip(rounding(depth[inside]).astype(int), 0, resolution-1)
        shell[coords[2], coords[1], coords[0]] = True

solid = ndimage.binary_fill_holes(shell)
distance = (ndimage.distance_transform_edt(~solid)-ndimage.distance_transform_edt(solid))*step
distance = ndimage.gaussian_filter(distance, .55)
# Remove half of the conservative surface voxel added by rasterization.
distance += step*.45
quantized = np.clip(np.rint(distance/extent*32767), -32767, 32767).astype('<i2')
output = root / 'assets/glass-cube/logo-field-96.bin'
output.write_bytes(struct.pack('<4sIf', b'CGSD', resolution, extent)+quantized.tobytes())
print(f'Baked actual GLB: {resolution}^3, {output.stat().st_size} bytes; interior voxels {solid.sum()}')
