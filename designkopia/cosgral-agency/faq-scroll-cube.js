/** A single optical scene: original portfolio cube, orbiting typography and edge-to-edge prisms. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import {installGlassCube} from './cosgral-glass-cube.js?v=20261019editorial14';
import {prismPath,smooth,storyOrbit} from './faq-story-motion.js';
export async function createFAQCube(portal,pose,isReduced){
 const canvas=portal.querySelector('canvas');
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.toneMapping=THREE.NeutralToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,80);camera.position.z=10;
 const core=new THREE.Group();scene.add(core);
 // Identical geometry, material overrides and studio light family to portfolio-cube.js.
 const mesh=await installGlassCube(THREE,renderer,scene,core,.94,{
  glass:{iridescence:.32,dispersion:.45,edgeGlow:.2,envMapIntensity:1.3,farSideDim:.38,thickness:.7,rainbow:.3,acrylic:.95},
  env:{power:1.5,sheen:.4}
 });
 const backdrop=mesh.userData.transmissionBackdrop,mat=backdrop.material;
 mat.fragmentShader=`precision highp float;uniform vec2 uRes;void main(){vec2 uv=gl_FragCoord.xy/uRes;vec3 c=vec3(0.);gl_FragColor=vec4(c,1.);}`;
 mat.needsUpdate=true;
 const originalCompile=mesh.material.onBeforeCompile;
 mesh.material.onBeforeCompile=(shader,r)=>{originalCompile?.(shader,r);shader.fragmentShader=shader.fragmentShader.replace(/}\s*$/,'float pfLum=max(max(gl_FragColor.r,gl_FragColor.g),gl_FragColor.b); gl_FragColor.a*=clamp(pow(pfLum,1.7)*1.9,0.,1.); }');};
 mesh.material.customProgramCacheKey=()=> 'faq-portfolio-clear-glass';mesh.material.needsUpdate=true;
 backdrop.onBeforeRender=r=>{const target=r.getRenderTarget(),on=!!target&&target.samples===4;mat.colorWrite=on;mat.uniforms.uEnabled.value=on?1:0;mat.uniforms.uCenter.value.set(0,0);mat.uniforms.uSize.value.set(1,1);r.getDrawingBufferSize(mat.uniforms.uRes.value);};
 // The glyphs live in WebGL. They enter the same depth and transmission passes
 // as the cube, so their rotation and refraction are no longer a DOM imitation.
 const typeRig=new THREE.Group();scene.add(typeRig);
 const lineNodes=[];let textKey='',introTexture;
 for(let i=0;i<2;i++){
  const sheet=document.createElement('canvas');sheet.width=2048;sheet.height=320;
  const texture=new THREE.CanvasTexture(sheet);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:false,alphaTest:.02,depthWrite:true,color:0xffffff,side:THREE.DoubleSide,toneMapped:false});
  const plane=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);typeRig.add(plane);lineNodes.push({sheet,texture,plane});
 }
 const introCanvas=document.createElement('canvas');introCanvas.width=2048;introCanvas.height=480;
 introTexture=new THREE.CanvasTexture(introCanvas);introTexture.colorSpace=THREE.SRGBColorSpace;introTexture.minFilter=THREE.LinearFilter;
 const intro=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:introTexture,transparent:false,alphaTest:.02,depthWrite:true,side:THREE.DoubleSide,toneMapped:false}));scene.add(intro);
 function typeset(){
  const words=[...document.querySelectorAll('[data-faq-line]')].map(x=>x.textContent.toLocaleUpperCase(document.documentElement.lang));
  const title=document.querySelector('.faq-scroll__intro')?.textContent||'ZAPYTAJ.';
  const key=words.join('|')+title;if(key===textKey)return;textKey=key;
  lineNodes.forEach(({sheet,texture},i)=>{const c=sheet.getContext('2d');c.clearRect(0,0,sheet.width,sheet.height);c.fillStyle='#07090d';c.textAlign='center';c.textBaseline='middle';c.font='400 220px Anton, Impact, sans-serif';c.letterSpacing='-5px';const measured=c.measureText(words[i]).width;c.save();c.translate(1024,160);c.scale(Math.min(1,1990/measured),1);c.fillText(words[i],0,10);c.restore();texture.needsUpdate=true;});
  const c=introCanvas.getContext('2d');c.clearRect(0,0,2048,480);c.fillStyle='#07090d';c.textAlign='center';c.textBaseline='middle';c.font='400 410px Anton, Impact, sans-serif';c.fillText(title,1024,255,2000);introTexture.needsUpdate=true;
 }
 const shardMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,transmission:1,metalness:0,roughness:.025,thickness:.065,ior:1.46,clearcoat:1,clearcoatRoughness:.015,envMapIntensity:1.15,iridescence:.12,dispersion:.32,side:THREE.DoubleSide});
 const asset=await fetch(new URL('./faq-prisms.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Prism geometry missing');return r.json();});
 const shards=await Promise.all(asset.shards.map(async(spec,i)=>{
  const packed=Uint8Array.from(atob(spec.mesh),c=>c.charCodeAt(0));
  const raw=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const values=new Float32Array(raw,0,spec.vertexCount*6),positions=new Float32Array(spec.vertexCount*3),normals=new Float32Array(spec.vertexCount*3);
  for(let j=0;j<spec.vertexCount;j++){positions.set(values.subarray(j*6,j*6+3),j*3);normals.set(values.subarray(j*6+3,j*6+6),j*3);}

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(raw,spec.vertexCount*24,spec.indexCount),1));geometry.computeBoundingSphere();
  const object=new THREE.Mesh(geometry,shardMaterial);scene.add(object);return {object,spec,i};
 }));
 let width=1,height=1,raf=0,visible=false,disposed=false,lost=false,last=0,first=true,clock=0;
 let flight=isReduced()?1:0,release=0,px=0,py=0,exit=0,answer=0;
 const damp=(a,b,t)=>a+(b-a)*t;
 function resize(){width=innerWidth;height=innerHeight;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);textKey='';wake();}
 function wake(){if(visible&&!disposed&&!lost&&!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
 function frame(now){
  raf=0;if(!visible||disposed||lost||document.hidden)return;
  const dt=Math.min(.04,last?(now-last)/1000:.016);last=now;const reduced=isReduced(),b=reduced?1:1-Math.exp(-dt*3.1);clock+=reduced?0:dt;
  flight=damp(flight,pose.flight,b);release=damp(release,pose.reveal,b);px=damp(px,pose.x,b*.7);py=damp(py,pose.y,b*.7);exit=damp(exit,pose.exit||0,b);answer=damp(answer,pose.answerBlend||0,b);
  const viewH=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z,viewW=viewH*camera.aspect;
  const cubeUnit=Math.min(viewW*(width<700?.39:.225),viewH*.34)/2;
  const x=-.46+.96*flight+exit*1.12,y=.57-.09*flight+exit*.43;
  const cx=(x-.5)*viewW,cy=(.5-y)*viewH;
  core.position.set(cx+px*.035,cy+Math.sin(clock*.24)*.025-answer*.06,0);
  core.scale.setScalar(cubeUnit*(1-answer*.04));
  // Portfolio three-quarter pose, with one continuous slow face turn per chapter.
  core.rotation.set(.39+py*.055+Math.sin(clock*.11)*.018+exit*.48,-.63+(pose.progress||0)*.30+px*.08+exit*1.55,-.04+Math.sin(clock*.12)*.012-exit*.23);
  const entry=pose.typeEntry||0,leave=pose.typeLeave||0,alpha=pose.typeAlpha||0;
  const orbit=storyOrbit(entry,leave,answer,viewH);
  typeRig.position.set(orbit.x,orbit.y,orbit.z);typeRig.rotation.set(orbit.rx,orbit.ry,orbit.rz);typeRig.scale.setScalar(orbit.scale);
  lineNodes.forEach(({plane},i)=>{
   const natural=width<700?viewW*.94:viewW*.94;
   plane.scale.set(natural,natural*320/2048,1);plane.position.set(0,(i?-.94:.94)*(1-answer*.62),i?-.08:0);
   plane.rotation.x=(i?1:-1)*(1-entry)*.09;plane.material.opacity=alpha;plane.visible=alpha>.001;
  });
  intro.position.set(0,-.10+Math.sin(clock*.15)*.035,-1.7);intro.scale.set(viewW*.94,viewW*.94*480/2048,1);intro.material.opacity=(1-smooth(.02,.45,release))*.94*flight;intro.visible=intro.material.opacity>.001;
  const charge=pose.charge||0;
  shards.forEach(({object,spec,i})=>{
   const p=prismPath(spec,i,flight,release,viewW,viewH,cx,cy,cubeUnit,clock,px,py,charge);
   object.position.set(p.x,p.y,p.z);object.rotation.set(p.rx,p.ry,p.rz);object.scale.setScalar(cubeUnit*.9);object.visible=p.visible&&exit<.999;
  });
  // A restrained camera breathing through depth, never a sudden zoom or cut.
  camera.position.x=px*.035;camera.position.y=-py*.025;camera.position.z=10+Math.sin((pose.progress||0)*Math.PI*6)*.035;
  mesh.userData.rainbowTime.value=clock;typeset();renderer.render(scene,camera);
  if(first){first=false;portal.classList.add('is-3d');document.querySelector('[data-faq-scroll]')?.classList.add('is-webgl-type');}
  if(!reduced)wake();
 }
 addEventListener('resize',resize,{passive:true});resize();document.fonts?.ready.then(()=>{textKey='';wake();});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;portal.classList.remove('is-3d');document.querySelector('[data-faq-scroll]')?.classList.remove('is-webgl-type');});
 canvas.addEventListener('webglcontextrestored',()=>{lost=false;first=true;last=0;wake();});
 return {wake,setVisible(next){if(next===visible)return;visible=next;if(next){last=0;wake();}else{cancelAnimationFrame(raf);raf=0;}},dispose(){disposed=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);shards.forEach(s=>s.object.geometry.dispose());shardMaterial.dispose();lineNodes.forEach(({plane,texture})=>{plane.geometry.dispose();plane.material.dispose();texture.dispose();});intro.geometry.dispose();intro.material.dispose();introTexture.dispose();mesh.geometry.dispose();mesh.material.dispose();backdrop.geometry.dispose();mat.uniforms.uText.value.dispose();mat.dispose();mesh.userData.environmentTarget?.dispose();renderer.dispose();}};
}
