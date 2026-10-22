/** A continuous liquid surface with the original glass studio and refraction. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
let fieldPromise;
function loadField(){
  return fieldPromise||=fetch(new URL('./assets/glass-cube/logo-field-96.bin',import.meta.url)).then(async r=>{
    if(!r.ok)throw new Error('COSGRAL liquid: logo field unavailable');
    const bytes=await r.arrayBuffer(),header=new DataView(bytes);
    if(header.getUint32(0,true)!==0x44534743)throw new Error('COSGRAL liquid: invalid field');
    return {size:header.getUint32(4,true),extent:header.getFloat32(8,true),data:new Int16Array(bytes,12)};
  });
}
export async function createCubeFluid(glass,group){
  const baked=await loadField();
  const material=glass.material.clone();
  material.onBeforeCompile=glass.material.onBeforeCompile;
  material.customProgramCacheKey=glass.material.customProgramCacheKey;
  material.roughness=.055;material.iridescence=.025;material.dispersion=.08;
  material.clearcoat=1;material.clearcoatRoughness=.025;
  const geometry=new THREE.BufferGeometry();
  const position=new THREE.BufferAttribute(new Float32Array(70000*9),3).setUsage(THREE.DynamicDrawUsage);
  const normal=new THREE.BufferAttribute(new Float32Array(70000*9),3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position',position);geometry.setAttribute('normal',normal);geometry.setDrawRange(0,0);
  const liquid=new THREE.Mesh(geometry,material);
  liquid.scale.setScalar(baked.extent);liquid.frustumCulled=false;
  liquid.name='CosgralZeroGravityLiquid';liquid.visible=false;group.add(liquid);
  const worker=new Worker(new URL('./home-cube-fluid-worker.js?v=20261019fluid2',import.meta.url),{type:'module'});
  let busy=true,lastAt=-Infinity,lastPhase=-1,disposed=false,renderedPhase=0;
  await new Promise((resolve,reject)=>{
    let ready=false;
    worker.onerror=event=>{
      if(!ready)reject(new Error(event.message||'COSGRAL liquid worker failed'));
      else console.error('COSGRAL liquid worker failed',event.message);
      busy=false;
    };
    worker.onmessage=({data})=>{
      if(disposed)return;
      if(data.type==='error'){
        if(!ready)reject(new Error(data.message));else console.error(data.message);
        busy=false;return;
      }
      const length=data.count*3;
      position.array.set(new Float32Array(data.position,0,length));
      normal.array.set(new Float32Array(data.normal,0,length));
      position.clearUpdateRanges();normal.clearUpdateRanges();
      position.addUpdateRange(0,length);normal.addUpdateRange(0,length);
      position.needsUpdate=true;normal.needsUpdate=true;geometry.setDrawRange(0,data.count);
      renderedPhase=data.phase;busy=false;
      worker.postMessage({type:'recycle',position:data.position,normal:data.normal},[data.position,data.normal]);
      if(!ready){ready=true;resolve();}
    };
    const copy=baked.data.slice().buffer;
    worker.postMessage({type:'init',size:innerWidth<=900?64:80,extent:baked.extent,sourceSize:baked.size,
      data:copy,phase:0,time:performance.now()/1000},[copy]);
  }).catch(error=>{disposed=true;worker.terminate();group.remove(liquid);geometry.dispose();material.dispose();throw error;});
  return {
    mesh:liquid,
    get phase(){return renderedPhase;},
    update(phase,time,visible){
      liquid.visible=visible;
      if(!visible||busy||disposed)return;
      if(time-lastAt<1/30&&Math.abs(phase-lastPhase)<.004)return;
      lastAt=time;lastPhase=phase;busy=true;
      worker.postMessage({type:'frame',phase,time});
    },
    dispose(){disposed=true;worker.terminate();group.remove(liquid);geometry.dispose();material.dispose();}
  };
}
