/** Original COSGRAL GLB inside a responsive shell of studio-lit glass tiles. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import {installGlassCube} from './cosgral-glass-cube.js?v=20261019editorial14';
export async function createFAQCube(portal,pose,isReduced){
  const canvas=portal.querySelector('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.3));renderer.toneMapping=THREE.NeutralToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,60);camera.position.z=9.5;
  const rig=new THREE.Group(),core=new THREE.Group(),shell=new THREE.Group();rig.add(core,shell);scene.add(rig);
  let mesh;
  try{mesh=await installGlassCube(THREE,renderer,scene,core,.94,{glass:{transmission:.86,metalness:.15,roughness:.025,iridescence:.15,dispersion:.23,edgeGlow:.09,envMapIntensity:1.8,farSideDim:.25,thickness:.55},env:{ambient:.04,floor:.06,power:1.7,sheen:.85,violetSheen:.7}});}
  catch(error){renderer.dispose();throw error;}
  // The refraction buffer shares the cool surface palette instead of the dark hero's ribbons.
  const backdrop=mesh.userData.transmissionBackdrop.material;
  backdrop.fragmentShader=backdrop.fragmentShader.replace('vec3(0.055, 0.055, 0.055)','vec3(0.72, 0.79, 0.92)').replace('vec3(0.24, 0.24, 0.24)','vec3(0.82, 0.87, 0.96)').replace('vec3(0.58, 0.58, 0.58)','vec3(0.95, 0.97, 1.0)');backdrop.needsUpdate=true;
  const glass=new THREE.MeshPhysicalMaterial({color:0xf5f8ff,metalness:.68,roughness:.025,transmission:.45,thickness:.22,ior:1.5,clearcoat:1,envMapIntensity:2.1,iridescence:.12,side:THREE.DoubleSide});
  const shape=new THREE.Shape(),w=.54,h=.62,r=.055;
  shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:5});geometry.center();
  const shards=[];
  for(let row=0;row<3;row++)for(let col=0;col<9;col++){
    const theta=(col/9)*Math.PI*2+row*.12,phi=(row-1)*.56;
    const tile=new THREE.Mesh(geometry,glass),radius=1.72;
    const home=new THREE.Vector3(Math.sin(theta)*Math.cos(phi)*radius,Math.sin(phi)*radius,Math.cos(theta)*Math.cos(phi)*radius);
    tile.position.copy(home);tile.lookAt(0,0,0);shell.add(tile);
    const sign=home.x>=0?1:-1;
    shards.push({tile,home,rotation:tile.rotation.clone(),sign,seed:row*9+col});
  }
  let width=1,height=1,raf=0,visible=false,disposed=false,lost=false,last=0,flight=pose.flight,opening=0,px=0,py=0,first=true;
  const blend=(a,b,t)=>a+(b-a)*t,smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
  function resize(){width=innerWidth;height=innerHeight;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);wake();}
  function wake(){if(visible&&!disposed&&!lost&&!raf&&!document.hidden)raf=requestAnimationFrame(render);}
  function render(now){
    raf=0;if(!visible||disposed||lost||document.hidden)return;
    const dt=Math.min(.05,last?(now-last)/1000:.016);last=now;const reduced=isReduced(),b=reduced?1:1-Math.exp(-dt*5.4),time=reduced?0:now/1000;
    flight=blend(flight,pose.flight,b);opening=blend(opening,pose.reveal,b);px=blend(px,pose.x,b);py=blend(py,pose.y,b);
    const viewH=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z,viewW=viewH*camera.aspect;
    const x=-.30+.80*flight,y=.60-.12*flight+Math.sin(flight*Math.PI)*.035;
    rig.position.set((x-.5)*viewW,(.5-y)*viewH,0);
    const targetSize=Math.min(width*(width<700?.93:.53),height*.76);rig.scale.setScalar(targetSize/height*viewH/4.1);
    rig.rotation.set(py*.055,-px*.11+(1-flight)*-.35,Math.sin(time*.2)*.012);
    core.rotation.set(.4+py*.07+Math.sin(time*.32)*.022,-.65+pose.progress*.65+px*.12+opening*.32,-.04);
    core.position.y=Math.sin(time*.58)*.06;core.scale.setScalar(.68*(1+pose.charge*.025+opening*.08));
    const burst=smooth(.02,.96,opening)*smooth(.5,1,flight),slowSpin=time*.025;
    shell.rotation.set(py*.14,slowSpin+px*.19,-px*.04);
    shards.forEach(({tile,home,rotation,sign,seed})=>{
      const delay=(seed%5)*.025,k=smooth(delay,.90+delay,burst),breath=Math.sin(time*.45+seed*.7)*.027;
      const drift=(seed%3-1)*.8;
      tile.position.set(home.x*(1+pose.charge*.09)+sign*k*(viewW/Math.max(.25,rig.scale.x)*.72+1.4),home.y+breath+k*(home.y*1.8+drift),home.z-k*(2.4+(seed%4)*.5));
      tile.rotation.set(rotation.x+k*(1.3+seed*.09)+py*.035,rotation.y+k*sign*(1.6+seed*.07),rotation.z+k*(seed%2?1:-1)*.95);
      tile.scale.setScalar(1-k*.16);
    });
    shell.visible=burst<.999;mesh.userData.rainbowTime.value=time;
    renderer.render(scene,camera);if(first){first=false;portal.classList.add('is-3d');}
    if(!reduced||Math.abs(flight-pose.flight)+Math.abs(opening-pose.reveal)>.0005)wake();
  }
  addEventListener('resize',resize,{passive:true});resize();
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;portal.classList.remove('is-3d');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;first=true;last=0;wake();});
  return{wake,setVisible(next){if(next===visible)return;visible=next;if(next){last=0;wake();}else{cancelAnimationFrame(raf);raf=0;}},dispose(){disposed=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);geometry.dispose();glass.dispose();scene.traverse(o=>{if(o!==shards[0]?.tile&&o.geometry!==geometry)o.geometry?.dispose();if(o.material&&o.material!==glass)[].concat(o.material).forEach(m=>m.dispose());});mesh.userData.environmentTarget?.dispose();renderer.dispose();}};
}
