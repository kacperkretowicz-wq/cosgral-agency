/** Reuses the site's original GLB and physical glass shader; one small, lazy canvas. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import {installGlassCube} from './cosgral-glass-cube.js?v=20261019editorial14';

export async function createFAQCube(button,pose,isReduced) {
  const canvas=button.querySelector('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35));
  renderer.setClearColor(0x000000,0);renderer.toneMapping=THREE.NeutralToneMapping;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,50);
  camera.position.set(0,0,7.2);
  const group=new THREE.Group();scene.add(group);
  let mesh;
  try {
    mesh=await installGlassCube(THREE,renderer,scene,group,1.1,{
      glass:{transmission:.92,metalness:.08,roughness:.035,iridescence:.08,dispersion:.20,edgeGlow:.11,envMapIntensity:1.15,farSideDim:.4,thickness:.7},
      env:{power:1.5,sheen:.70,violetSheen:.55}
    });
  } catch(error){renderer.dispose();throw error;}
  let raf=0,visible=false,disposed=false,lost=false,last=0,turn=pose.progress*Math.PI*1.35,open=0;
  let first=true;
  function wake(){if(visible&&!disposed&&!lost&&!raf)raf=requestAnimationFrame(render);}
  function render(now) {
    raf=0;if(!visible||disposed||lost)return;
    if(now-last<32&&!isReduced()){wake();return;}
    const dt=Math.min(.08,(now-last)/1000||.016);last=now;
    const reduced=isReduced(),blend=reduced?1:1-Math.exp(-dt*7);
    turn+=(pose.progress*Math.PI*1.35-turn)*blend;
    open+=((pose.opened?1:0)-open)*blend;
    const time=reduced?0:now/1000;
    group.rotation.set(.43+pose.y*.12+Math.sin(time*.5)*.035,-.68+turn+open*.7+pose.x*.18,-.06+Math.sin(time*.3)*.025);
    group.position.y=reduced?0:Math.sin(time*.85)*.065;
    group.scale.setScalar(1+open*.04);
    mesh.userData.rainbowTime.value=time;
    renderer.render(scene,camera);
    if(first){first=false;button.classList.add('is-3d');}
    if(!reduced||Math.abs(open-(pose.opened?1:0))>.001)wake();
  }
  function resize(){const w=Math.max(1,button.clientWidth);renderer.setSize(w,w,false);wake();}
  const observer=new ResizeObserver(resize);observer.observe(button);resize();
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;button.classList.remove('is-3d');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;first=true;last=0;wake();});
  return {
    wake,
    setVisible(next){visible=next;if(next){last=0;wake();}else{cancelAnimationFrame(raf);raf=0;}},
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();scene.traverse(object=>{object.geometry?.dispose();if(object.material){for(const material of [].concat(object.material))material.dispose();}});mesh.userData.environmentTarget?.dispose();renderer.dispose();button.classList.remove('is-3d');}
  };
}
