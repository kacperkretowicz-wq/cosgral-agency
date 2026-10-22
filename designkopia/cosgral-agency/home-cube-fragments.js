// Bisect the supplied logo geometry, retaining its original surface and closing
// each cut. Contour nesting preserves holes in the COSGRAL letterforms.
import * as THREE from './vendor/three-0.170.0.module.min.js';
const EPS=1e-5;
const key=p=>p.map(v=>Math.round(v/EPS)).join(',');
function contains(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!=(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes}return yes}
function bisect(tris,axis,offset,side){
  const out=[],segments=[];
  for(const tri of tris){let poly=[],cross=[];for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3],da=(a.p[axis]-offset)*side,db=(b.p[axis]-offset)*side;if(da>=-EPS)poly.push(a);if((da>EPS&&db<-EPS)||(da<-EPS&&db>EPS)){const t=da/(da-db),v={p:a.p.map((x,k)=>x+(b.p[k]-x)*t),n:a.n.map((x,k)=>x+(b.n[k]-x)*t)};poly.push(v);cross.push(v.p)}}
    if(cross.length===2&&key(cross[0])!==key(cross[1]))segments.push(cross);
    for(let i=1;i+1<poly.length;i++)out.push([poly[0],poly[i],poly[i+1]]);
  }
  const graph=new Map(),points=new Map();
  for(const [a,b]of segments){let ka=key(a),kb=key(b);points.set(ka,a);points.set(kb,b);if(!graph.has(ka))graph.set(ka,new Set());if(!graph.has(kb))graph.set(kb,new Set());graph.get(ka).add(kb);graph.get(kb).add(ka)}
  const dims=[0,1,2].filter(x=>x!==axis),loops=[];
  while(graph.size){const start=graph.keys().next().value;let at=start,loop=[],closed=false;for(let guard=0;guard<segments.length+2;guard++){loop.push(points.get(at));const next=graph.get(at)?.values().next().value;if(!next)break;graph.get(at).delete(next);graph.get(next)?.delete(at);if(!graph.get(at)?.size)graph.delete(at);if(!graph.get(next)?.size)graph.delete(next);at=next;if(at===start){closed=true;break}}
    if(!closed){graph.delete(at);graph.delete(start)}
    if(closed&&loop.length>=3){const flat=loop.map(p=>new THREE.Vector2(p[dims[0]],p[dims[1]]));loops.push({p:loop,flat,area:Math.abs(THREE.ShapeUtils.area(flat))})}
  }
  loops.sort((a,b)=>b.area-a.area);
  for(let i=0;i<loops.length;i++){const l=loops[i];l.parent=-1;l.depth=0;for(let j=i-1;j>=0;j--)if(contains(l.flat[0],loops[j].flat)){l.parent=j;l.depth=loops[j].depth+1;break}}
  for(let i=0;i<loops.length;i++){const l=loops[i];if(l.depth%2)continue;const holes=loops.filter(x=>x.parent===i&&x.depth%2),verts=l.p.concat(...holes.map(x=>x.p));const faces=THREE.ShapeUtils.triangulateShape(l.flat,holes.map(x=>x.flat));const normal=[0,0,0];normal[axis]=-side;for(const f of faces){let t=f.map(j=>({p:verts[j],n:normal}));const a=new THREE.Vector3(...t[0].p),b=new THREE.Vector3(...t[1].p),c=new THREE.Vector3(...t[2].p);if(b.sub(a).cross(c.sub(a)).getComponent(axis)*normal[axis]<0)t=[t[0],t[2],t[1]];out.push(t)}}
  return out;
}
function toTriangles(geo){const p=geo.attributes.position,n=geo.attributes.normal,idx=geo.index;const tris=[];for(let i=0;i<(idx?idx.count:p.count);i+=3){const tri=[];for(let j=0;j<3;j++){let k=idx?idx.getX(i+j):i+j;tri.push({p:[p.getX(k),p.getY(k),p.getZ(k)],n:[n.getX(k),n.getY(k),n.getZ(k)]})}tris.push(tri)}return tris}
function mesh(tris,base){const p=[],n=[];for(const t of tris)for(const v of t){p.push(...v.p);n.push(...v.n)}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));geo.computeBoundingBox();const center=geo.boundingBox.getCenter(new THREE.Vector3());geo.translate(-center.x,-center.y,-center.z);geo.computeBoundingSphere();const mat=base.clone();mat.onBeforeCompile=base.onBeforeCompile;mat.customProgramCacheKey=base.customProgramCacheKey;const m=new THREE.Mesh(geo,mat);m.position.copy(center);m.userData.home=center.clone();return m}
export function makeOctants(geo,mat){let pieces=[toTriangles(geo)];for(let axis=0;axis<3;axis++)pieces=pieces.flatMap(t=>[-1,1].map(s=>bisect(t,axis,0,s)));return pieces.filter(t=>t.length).map(t=>mesh(t,mat))}
export function makeLayers(geo,mat){const all=toTriangles(geo),min=geo.boundingBox.min.y,max=geo.boundingBox.max.y;return Array.from({length:4},(_,i)=>{const low=min+(max-min)*i/4,high=min+(max-min)*(i+1)/4;return mesh(bisect(bisect(all,1,low,1),1,high,-1),mat)})}
