/** Geometry work stays off the scroll/render thread. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { MarchingCubes } from './vendor/MarchingCubes-0.170.0.js';
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b),mix=THREE.MathUtils.lerp;
const starts=[[-.71,.62,-.23],[.08,.79,.39],[.72,.42,-.29],[-.81,-.12,.37],
  [.01,.02,-.61],[.66,-.37,.43],[-.46,-.75,-.27],[.20,-.74,.18]];
let mesh,size,extent,target,weights,positionBuffer,normalBuffer;
const rows=new Float32Array(8);
function initialize(message){
  size=message.size;extent=message.extent;
  mesh=new MarchingCubes(size,new THREE.MeshBasicMaterial(),false,false,70000);mesh.isolation=0;
  target=new Float32Array(size**3);
  const source=new Int16Array(message.data),n=message.sourceSize;
  const read=(x,y,z)=>source[x+n*(y+n*z)]*extent/32767;
  for(let z=0;z<size;z++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const xx=x*n/size,yy=y*n/size,zz=z*n/size;
    const a=Math.floor(xx),b=Math.floor(yy),c=Math.floor(zz);
    const ax=Math.min(n-1,a+1),by=Math.min(n-1,b+1),cz=Math.min(n-1,c+1);
    const fx=xx-a,fy=yy-b,fz=zz-c;
    target[x+size*(y+size*z)]=mix(
      mix(mix(read(a,b,c),read(ax,b,c),fx),mix(read(a,by,c),read(ax,by,c),fx),fy),
      mix(mix(read(a,b,cz),read(ax,b,cz),fx),mix(read(a,by,cz),read(ax,by,cz),fx),fy),fz);
  }
  weights=starts.map(()=>[new Float32Array(size),new Float32Array(size),new Float32Array(size)]);
}
function rebuild(phase,time){
  const pull=smooth(.12,.64,phase),settle=smooth(.42,.90,phase),drift=1-smooth(.18,.62,phase);
  for(let j=0;j<8;j++){
    const a=j*2.399,start=starts[j];
    const center=[mix(start[0],Math.sign(start[0])*.37,pull)+Math.sin(time*.42+a)*.085*drift,
      mix(start[1],Math.sign(start[1])*.37,pull)+Math.sin(time*.34+a*1.6)*.080*drift,
      mix(start[2],Math.sign(start[2])*.37,pull)+Math.cos(time*.38+a)*.075*drift];
    const radius=mix(.28+(j%3)*.025,.52,pull);
    for(let axis=0;axis<3;axis++){
      const stretch=1+Math.sin(time*.38+a+axis*1.8)*.09*drift;
      const inverse=1/(radius*radius*stretch*stretch);
      for(let k=0;k<size;k++){
        const d=(k/size*2-1)*extent-center[axis];
        weights[j][axis][k]=Math.exp(-d*d*inverse);
      }
    }
  }
  let index=0;
  for(let z=0;z<size;z++)for(let y=0;y<size;y++){
    for(let j=0;j<8;j++)rows[j]=weights[j][1][y]*weights[j][2][z];
    for(let x=0;x<size;x++,index++){
      let density=0;
      for(let j=0;j<8;j++)density+=weights[j][0][x]*rows[j];
      mesh.field[index]=-mix((.48-density)*.48,target[index],settle);
    }
  }
  mesh.normal_cache.fill(0);mesh.update();
  const count=Math.min(mesh.count,70000*3),length=count*3;
  if(!positionBuffer||positionBuffer.byteLength<length*4){
    positionBuffer=new ArrayBuffer(70000*9*4);normalBuffer=new ArrayBuffer(70000*9*4);
  }
  new Float32Array(positionBuffer,0,length).set(mesh.positionArray.subarray(0,length));
  new Float32Array(normalBuffer,0,length).set(mesh.normalArray.subarray(0,length));
  postMessage({type:'surface',count,phase,position:positionBuffer,normal:normalBuffer},[positionBuffer,normalBuffer]);
  positionBuffer=normalBuffer=null;
}
self.onmessage=({data})=>{
  if(data.type==='recycle'){positionBuffer=data.position;normalBuffer=data.normal;return;}
  try{
    if(data.type==='init')initialize(data);
    rebuild(data.phase,data.time);
  }catch(error){postMessage({type:'error',message:String(error)});}
};
