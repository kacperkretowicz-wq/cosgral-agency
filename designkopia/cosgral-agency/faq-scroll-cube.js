/** Clear smoked COSGRAL glass, refracted live typography and individual curved fragments. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import {installGlassCube} from './cosgral-glass-cube.js?v=20261019editorial14';
export async function createFAQCube(portal,pose,isReduced){
  const canvas=portal.querySelector('canvas');
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.3));renderer.toneMapping=THREE.NeutralToneMapping;renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(35,1,.1,60);camera.position.z=9.5;
  const rig=new THREE.Group(),core=new THREE.Group(),shell=new THREE.Group();rig.add(core,shell);scene.add(rig);
  let mesh;
  try{mesh=await installGlassCube(THREE,renderer,scene,core,.94,{
    glass:{transmission:1,metalness:0,roughness:.008,ior:1.27,iridescence:.085,dispersion:.2,edgeGlow:.045,envMapIntensity:.85,farSideDim:.91,thickness:.24,rainbow:.08},
    env:{ambient:.025,floor:.04,power:1.5,sheen:.70,violetSheen:.3}
  });}catch(error){renderer.dispose();throw error;}
  mesh.material.color.setHex(0xffffff);mesh.material.attenuationColor.setHex(0xe4ecfa);mesh.material.attenuationDistance=12;mesh.material.clearcoat=.75;

  // Rasterize the actual display lines into the physical transmission pass.
  // Their unwarped DOM counterparts stay behind WebGL; the glass bends this texture.
  const textCanvas=document.createElement('canvas'),ctx=textCanvas.getContext('2d',{alpha:true});
  const textTexture=new THREE.CanvasTexture(textCanvas);textTexture.colorSpace=THREE.SRGBColorSpace;textTexture.minFilter=THREE.LinearFilter;textTexture.magFilter=THREE.LinearFilter;textTexture.generateMipmaps=false;
  const backdrop=mesh.userData.transmissionBackdrop,material=backdrop.material;
  material.uniforms.uCssRes={value:new THREE.Vector2(innerWidth,innerHeight)};
  material.uniforms.uText.value.dispose();material.uniforms.uText.value=textTexture;
  material.fragmentShader=`precision highp float;
    uniform vec2 uRes;uniform vec2 uCssRes;uniform sampler2D uText;
    void main(){
      vec2 uv=gl_FragCoord.xy/uRes;
      vec3 paper=mix(vec3(.70588,.79608,.96078),vec3(.96863,.98039,1.),uv.y);
      vec2 cell=mod(uv*uCssRes,6.)-3.;
      float dotMask=1.-smoothstep(.65,1.65,length(cell));paper=mix(paper,vec3(1.),dotMask*.22);
      vec4 type=texture2D(uText,uv);gl_FragColor=vec4(mix(paper,type.rgb,type.a),1.);
    }`;
  material.needsUpdate=true;
  backdrop.onBeforeRender=r=>{
    const target=r.getRenderTarget(),on=!!target&&target.samples===4;
    material.colorWrite=on;material.uniforms.uEnabled.value=on?1:0;
    material.uniforms.uCenter.value.set(0,0);material.uniforms.uSize.value.set(1,1);
    r.getDrawingBufferSize(material.uniforms.uRes.value);
  };
  const textElements=[...document.querySelectorAll('.faq-scroll__intro,[data-faq-line]')];
  let lastTextKey='',lastTextAt=0;
  function syncTypography(now){
    const snapshots=textElements.map(el=>({el,rect:el.getBoundingClientRect(),style:getComputedStyle(el)}));
    const key=snapshots.map(({el,rect,style})=>[el.textContent,rect.x.toFixed(1),rect.y.toFixed(1),rect.width.toFixed(1),style.opacity,style.fontSize].join(':')).join('|');
    if(key===lastTextKey||now-lastTextAt<28)return;
    lastTextKey=key;lastTextAt=now;
    const sx=textCanvas.width/innerWidth,sy=textCanvas.height/innerHeight;
    ctx.setTransform(sx,0,0,sy,0,0);ctx.clearRect(0,0,innerWidth,innerHeight);
    snapshots.forEach(({el,rect,style})=>{
      const opacity=Number(style.opacity);if(opacity<.005||rect.bottom<0||rect.top>innerHeight||!rect.width)return;
      const text=style.textTransform==='uppercase'?el.textContent.toLocaleUpperCase(document.documentElement.lang):el.textContent;
      ctx.save();ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;ctx.letterSpacing=style.letterSpacing;
      ctx.fillStyle=style.color;ctx.globalAlpha=opacity;ctx.textAlign='left';ctx.textBaseline='alphabetic';
      const metrics=ctx.measureText(text),ascent=metrics.fontBoundingBoxAscent||parseFloat(style.fontSize)*.9,descent=metrics.fontBoundingBoxDescent||parseFloat(style.fontSize)*.2;
      const scaleX=rect.width/Math.max(1,el.offsetWidth),scaleY=rect.height/Math.max(1,el.offsetHeight);
      ctx.translate(rect.left,rect.top);ctx.scale(scaleX,scaleY);
      const align=style.textAlign==='center'?(el.offsetWidth-metrics.width)/2:0;
      ctx.fillText(text,align,(el.offsetHeight-ascent-descent)/2+ascent);ctx.restore();
    });
    textTexture.needsUpdate=true;
  }
  const glass=new THREE.MeshPhysicalMaterial({color:0xf5f9ff,metalness:0,roughness:.009,transmission:1,thickness:.06,ior:1.34,clearcoat:.8,envMapIntensity:1.1,iridescence:.13,dispersion:.24,side:THREE.DoubleSide});
  const shards=[],geometries=[];
  const noise=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  const count=58;
  for(let i=0;i<count;i++){
    const n=i+1,sides=i%4===0?3:i%3===0?5:4;
    const wide=.105+noise(n)*.24,tall=.13+noise(n+31)*.32,shape=new THREE.Shape();
    for(let j=0;j<sides;j++){
      const angle=j/sides*Math.PI*2+.15,rad=.79+noise(n*11+j)*.28;
      const x=Math.cos(angle)*wide*rad,y=Math.sin(angle)*tall*rad;
      if(j===0)shape.moveTo(x,y);else shape.lineTo(x,y);
    }shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.012+noise(n+7)*.018,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.007,bevelThickness:.006,curveSegments:4});geometry.center();
    const position=geometry.attributes.position,bend=(noise(n+61)-.42)*.7;
    for(let j=0;j<position.count;j++){const x=position.getX(j),y=position.getY(j);position.setZ(j,position.getZ(j)+bend*(x*x+y*y*.6));}
    geometry.computeVertexNormals();geometries.push(geometry);
    const tile=new THREE.Mesh(geometry,glass),phi=Math.acos(1-2*(i+.5)/count),theta=i*2.399963+.25;
    const radius=1.64+(noise(n+18)-.5)*.42;
    const home=new THREE.Vector3(Math.sin(phi)*Math.cos(theta)*radius,Math.cos(phi)*radius,Math.sin(phi)*Math.sin(theta)*radius);
    tile.position.copy(home);tile.lookAt(0,0,0);tile.rotateZ((noise(n+43)-.5)*1.1);shell.add(tile);
    shards.push({tile,home,rotation:tile.rotation.clone(),sign:home.x>=0?1:-1,seed:i,edge:i%4});
  }
  let width=1,height=1,raf=0,visible=false,disposed=false,lost=false,last=0,flight=pose.flight,opening=0,px=0,py=0,departure=0,answerMotion=0,first=true;
  const blend=(a,b,t)=>a+(b-a)*t,smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*t*(t*(t*6-15)+10);};
  function resize(){
    width=innerWidth;height=innerHeight;material.uniforms.uCssRes.value.set(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
    const ratio=Math.min(1.25,1440/width);textCanvas.width=Math.round(width*ratio);textCanvas.height=Math.round(height*ratio);lastTextKey='';wake();
  }
  function wake(){if(visible&&!disposed&&!lost&&!raf&&!document.hidden)raf=requestAnimationFrame(render);}
  function render(now){
    raf=0;if(!visible||disposed||lost||document.hidden)return;
    const dt=Math.min(.05,last?(now-last)/1000:.016);last=now;const reduced=isReduced(),b=reduced?1:1-Math.exp(-dt*2.6),time=reduced?0:now/1000;
    departure=blend(departure,pose.exit||0,b);answerMotion=blend(answerMotion,pose.answerBlend||0,b);
    flight=blend(flight,pose.flight,b);opening=blend(opening,pose.reveal,b);px=blend(px,pose.x,b);py=blend(py,pose.y,b);
    const viewH=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.position.z,viewW=viewH*camera.aspect;
    const x=-.30+.80*flight+Math.sin(pose.progress*Math.PI*2)*.018*opening+departure*.91,y=.60-.12*flight+Math.sin(flight*Math.PI)*.035+departure*.36-answerMotion*.035;
    rig.position.set((x-.5)*viewW,(.5-y)*viewH,0);
    const targetSize=Math.min(width*(width<700?.93:.53),height*.76);rig.scale.setScalar(targetSize/height*viewH/4.1);
    rig.rotation.set(py*.045,-px*.085+(1-flight)*-.35,Math.sin(time*.11)*.012-departure*.21);
    core.rotation.set(.4+py*.055+Math.sin(time*.16)*.018+departure*.42,-.65+pose.progress*.5+px*.1+opening*.24+departure*1.15,-.04+Math.sin(time*.13)*.015-departure*.17);
    core.position.y=Math.sin(time*.29)*.045;core.scale.setScalar(.68*(1+pose.charge*.018+opening*.06-answerMotion*.07-departure*.08));
    const burst=smooth(.04,.98,opening)*smooth(.5,1,flight),slowSpin=time*.012;
    shell.rotation.set(py*.1,slowSpin+px*.14,-px*.035);
    const rigScale=Math.max(.25,rig.scale.x);
    const pointerX=(px*viewW*.5-rig.position.x)/rigScale,pointerY=(-py*viewH*.5-rig.position.y)/rigScale;
    shards.forEach(({tile,home,rotation,seed,edge})=>{
      const delay=noise(seed+93)*.12,release=smooth(delay,.85+delay,burst);
      const arrival=reduced?1:smooth(.26+noise(seed+41)*.28,.89+noise(seed+17)*.1,flight);
      const outside=Math.max(1-arrival,release),travel=noise(seed+57);
      const sx=edge===0?-.18:edge===1?1.18:travel;
      const sy=edge===2?-.22:edge===3?1.22:.08+travel*.84;
      // Edge destinations are in viewport space. Convert them to the moving
      // cube's space so each fragment really crosses a different screen edge.
      const edgeX=((sx-.5)*viewW-rig.position.x)/rigScale;
      const edgeY=((.5-sy)*viewH-rig.position.y)/rigScale;
      const dx=home.x-pointerX,dy=home.y-pointerY,distance=Math.max(.15,Math.hypot(dx,dy));
      const response=Math.exp(-distance*distance*.8)*(.06+noise(seed+91)*.12)*(1-outside);
      const breath=Math.sin(time*.22+seed*.7)*.018*(1-outside),arc=Math.sin(outside*Math.PI)*(noise(seed+72)-.5)*.6;
      tile.position.set(blend(home.x*(1+pose.charge*.04),edgeX,outside)+dx/distance*response+arc,
        blend(home.y,edgeY,outside)+dy/distance*response+breath,
        blend(home.z,-1.2-noise(seed+66)*2,outside));
      const spin=outside*(.6+noise(seed+25)*1.4);
      tile.rotation.set(rotation.x+spin+py*(.025+noise(seed+19)*.06),rotation.y+spin*(seed%2?1:-1)+px*.06,rotation.z+spin*(seed%3?1:-1)*.7);
      tile.scale.setScalar(1-outside*.15);
    });
    shell.visible=burst<.999;mesh.userData.rainbowTime.value=time;syncTypography(now);
    renderer.render(scene,camera);if(first){first=false;portal.classList.add('is-3d');}
    if(!reduced||Math.abs(flight-pose.flight)+Math.abs(opening-pose.reveal)>.0005)wake();
  }
  addEventListener('resize',resize,{passive:true});resize();
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;portal.classList.remove('is-3d');});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;first=true;last=0;wake();});
  return{wake,setVisible(next){if(next===visible)return;visible=next;if(next){last=0;wake();}else{cancelAnimationFrame(raf);raf=0;}},dispose(){disposed=true;cancelAnimationFrame(raf);removeEventListener('resize',resize);geometries.forEach(g=>g.dispose());glass.dispose();textTexture.dispose();mesh.geometry.dispose();mesh.material.dispose();backdrop.geometry.dispose();material.dispose();mesh.userData.environmentTarget?.dispose();renderer.dispose();}};
}
