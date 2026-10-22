/** One model: glass, a long chrome hold, and a viscous spring handoff. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { installGlassCube } from './cosgral-glass-cube.js?v=20261022boot1';
import { createFrameProfile } from './cosgral-frame-profile.js?v=20261019motion11';
import { createHeroLensText } from './cosgral-hero-lens-text.js?v=20261019coupled9';
import { createCubeMaterialStudy } from './home-cube-materials.js?v=20261022boot1';

(async function () {
  const canvas = document.getElementById('hero-3d');
  if (!canvas || document.documentElement.classList.contains('reduce-motion')) return;
  const HALF = 1.35;
  const glassLook={glass:{transmission:1,metalness:0,roughness:.035,iridescence:.08,dispersion:.20,edgeGlow:.13,envMapIntensity:1.15,farSideDim:.4,thickness:.7},env:{power:1.5,sheen:.45}};
  const clamp = THREE.MathUtils.clamp;
  const smooth = (a,b,x) => {const p=clamp((x-a)/(b-a),0,1);return p*p*(3-2*p);};
  const smoother = (a,b,x) => {const p=clamp((x-a)/(b-a),0,1);return p*p*p*(p*(p*6-15)+10);};
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  } catch(error) {
    canvas.parentElement.classList.add('has-cube-fallback');
    console.warn('COSGRAL: WebGL unavailable',error);
    window.dispatchEvent(new CustomEvent('cosgral:cube-intro-done'));
    return;
  }
  renderer.setClearColor(0x000000,0);
  renderer.toneMapping=THREE.NeutralToneMapping;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMappingExposure=1;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(42,1,0.1,100);
  camera.position.set(0,0,5.4);
  const fullCamera=camera.clone();
  fullCamera.updateMatrixWorld(true);
  const group=new THREE.Group();scene.add(group);
  let width=1,height=1,mobile=false,glass=null,materialStudy=null;
  let tileWidth=0,tileHeight=0,tileMode=false,pixelRatio=1,resizeQueued=false;
  let lastCropX=NaN,lastCropY=NaN,lastPortalVisible=null,lastRenderAt=0;
  let qualityTier=0,sectionDocumentTop=0,contentDocumentTop=0,scrollSpan=1;
  let menuBlend=0,menuTarget=0,progress=0,lastTime=0;
  let tailProgress=0,heroExited=false;
  let menuChangedAt=0;
  let effectPauseUntil=0;
  let introStart=null,introDone=false,contextLost=false;
  let firstPaint=false;
  let pointerX=0,pointerY=0;
  const pose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
  const menuFrom={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
  const closeFrom={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
  let closeStartBlend=1;
  const targetQ=new THREE.Quaternion();
  const menuQ=new THREE.Quaternion();
  const euler=new THREE.Euler(),v=new THREE.Vector3();
  const corners=Array.from({length:4},()=>new THREE.Vector3());
  const exitPoint=new THREE.Vector3();
  const funnelFrame=new Float32Array([.5,.45,.18,0]);
  let supportGeometry=new Float32Array(0),supportPoints=new Float32Array(0);
  const cubeBounds={left:0,top:0,right:0,bottom:0};
  const nextSection=document.getElementById('uslugi');
  const profile=createFrameProfile(canvas);
  const heroText=createHeroLensText(THREE);
  function worldHeight(z){return 2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(camera.position.z-z);}
  function screenPosition(x,y,z,target){
    const h=worldHeight(z);
    return target.set((x/width-0.5)*h*camera.aspect,(0.5-y/height)*h,z);
  }
  function screenScale(px,z){return px/height*worldHeight(z)/(2*HALF);}
  function heroSize(){return 0.92*(mobile?Math.min(width*0.57,height*0.27):Math.min(width*0.31,height*0.34));}
  function menuSize(){return Math.min(width*(mobile?0.72:0.54),height*0.55);}
  function layoutTop(element){
    let top=0;
    for(let node=element;node;node=node.offsetParent)top+=node.offsetTop;
    return top;
  }
  function measureHeroLayout(){
    sectionDocumentTop=nextSection?layoutTop(nextSection):height*1.72;
    const content=nextSection?.querySelector('.section-index');
    contentDocumentTop=content?layoutTop(content):sectionDocumentTop+80;
    scrollSpan=Math.max(height*.86,sectionDocumentTop-height*.24);
  }
  function resize(){
    resizeQueued=false;
    const nextWidth=Math.max(1,canvas.parentElement.clientWidth||window.innerWidth);
    const nextHeight=Math.max(1,canvas.parentElement.clientHeight||window.innerHeight);
    const nextRatio=window.devicePixelRatio||1;
    if(nextWidth===width && nextHeight===height && nextRatio===resize.deviceRatio&&qualityTier===resize.qualityTier)return;
    width=nextWidth;height=nextHeight;resize.deviceRatio=nextRatio;mobile=width<=900;
    resize.qualityTier=qualityTier;
    fullCamera.aspect=width/height;fullCamera.updateProjectionMatrix();fullCamera.updateMatrixWorld(true);
    camera.aspect=width/height;camera.clearViewOffset();camera.updateProjectionMatrix();
    // Respect real device DPR. The old forced 2x rendered four pixels even
    // for each physical pixel on a normal 1x display.
    const cap=[1.5,1.15,1][qualityTier],limit=mobile?1800:2560;
    pixelRatio=Math.max(.75,Math.min(nextRatio,cap,limit/Math.max(width,height)));
    renderer.setPixelRatio(pixelRatio);
    tileWidth=0;tileHeight=0;setTileSize(menuTarget>0||menuBlend>0.001);measureHeroLayout();
    lastCropX=NaN;lastCropY=NaN;
  }
  function queueResize(){if(!resizeQueued){resizeQueued=true;requestAnimationFrame(resize);}}
  function setTileSize(menu){
    tileMode=menu;
    // Fixed envelopes avoid GPU buffer reallocations during individual frames.
    const size=menu?menuSize()*1.45+40:heroSize()*1.65+40;
    const tw=Math.min(width,Math.ceil(size/64)*64),th=Math.min(height,Math.ceil(size/64)*64);
    if(tw===tileWidth&&th===tileHeight)return;
    tileWidth=tw;tileHeight=th;renderer.setSize(tw,th,false);
    canvas.style.width=tw+'px';canvas.style.height=th+'px';
    lastCropX=NaN;lastCropY=NaN;
  }
  function updateCrop(now){
    const wantsMenu=menuTarget>0||menuBlend>0.001;
    // Paint the clicked control and overlay before allocating the larger
    // menu buffers. The initial pose still fits inside the hero envelope.
    if(tileMode!==wantsMenu && (!wantsMenu || now-menuChangedAt>120))setTileSize(wantsMenu);
    v.copy(group.position).project(fullCamera);
    const x=Math.round(((v.x*0.5+0.5)*width-tileWidth/2)*2)/2;
    const y=Math.round(((-v.y*0.5+0.5)*height-tileHeight/2)*2)/2;
    if(x===lastCropX&&y===lastCropY&&camera.view?.enabled)return;
    lastCropX=x;lastCropY=y;
    canvas.style.transform='translate3d('+x+'px,'+y+'px,0)';
    camera.setViewOffset(width,height,x,y,tileWidth,tileHeight);
  }
  resize();window.addEventListener('resize',queueResize,{passive:true});
  window.visualViewport?.addEventListener('resize',queueResize,{passive:true});
  window.cosgralPerf?.subscribe(tier=>{if(tier!==qualityTier){qualityTier=tier;queueResize();}});
  window.ScrollTrigger?.addEventListener('refresh',measureHeroLayout);
  window.addEventListener('cosgral:langchange',()=>requestAnimationFrame(measureHeroLayout));
  document.fonts?.ready.then(measureHeroLayout);
  function scrollProgress(){
    const scrollY=window.cosgralSmoothScroll?.lenis?.scroll??window.scrollY;
    return clamp(scrollY/scrollSpan,0,1);
  }
  function buildScrollPose(time){
    // A restrained 76-degree turn and an upward side arc. Quintic timing
    // starts and stops with zero velocity and acceleration, in both directions.
    const h=worldHeight(.36),turn=smoother(.04,.84,progress),arc=smoother(.08,.80,progress);
    const sway=Math.sin(Math.PI*arc),drift=reduced?0:Math.sin(time*.34)*.012;
    const contact=smoother(.43,.64,progress);
    const strain=smooth(0,.28,Math.max(0,materialStudy?.pull||0))*contact;
    const lift=materialStudy?.lift||0;
    // Settle into the lowered sheet, then float up with one damped response.
    // Further scrolling carries the intact cube out above the viewport.
    const leave=tailProgress*(1-Math.exp(-tailProgress/.07));
    const y=THREE.MathUtils.lerp(mobile?.31:.30,mobile?.275:.255,arc)-sway*.025
      +contact*.12+strain*.025;
    screenPosition(width*.5,height*y,.36,pose.position);
    euler.set(.48+drift-pointerY*.045+sway*.075+lift*.035,
      -.67+pointerX*.075+turn*Math.PI*.42,-sway*.045+strain*.018-lift*.025);
    pose.quaternion.setFromEuler(euler);
    pose.scale=screenScale(heroSize(),.36)*(1+sway*.05);
    // Leave room for the actual rotated model rather than cutting it off on
    // narrow screens. The safe travel is blended through the same side arc.
    let right=width*.5,top=height;
    if(glass){
      const box=glass.geometry.boundingBox;
      for(let i=0;i<8;i++){
        exitPoint.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z);
        exitPoint.multiplyScalar(pose.scale).applyQuaternion(pose.quaternion).add(pose.position).project(fullCamera);
        right=Math.max(right,(exitPoint.x*.5+.5)*width);
        top=Math.min(top,(.5-exitPoint.y*.5)*height);
      }
    }
    // Reserve real headroom for the complete rotating model. The buoyant
    // rise settles inside the viewport; only continued scroll takes it out.
    const rise=Math.max(0,Math.min(.19,(top/height-.065)*.94));
    pose.position.y+=(rise*lift+leave*1.3)*h;
    const available=Math.max(0,width-right-Math.max(20,width*.055));
    const travel=Math.min(width*(mobile?.19:.24),available*.85);
    pose.position.x+=travel/height*h*arc;
    pose.position.x-=(strain*.010+lift*width/height*.018)*h;
  }
  function captureMenuPose(){
    menuFrom.position.copy(group.position);menuFrom.quaternion.copy(group.quaternion);menuFrom.scale=group.scale.x;
    if(!group.visible){
      screenPosition(width*0.06,height*0.07,0.36,menuFrom.position);menuFrom.scale=screenScale(54,0.36);
    }
  }
  function cacheSupportGeometry(){
    // A small hull taken from the supplied mesh, including its round bevels.
    // Box corners are outside the real solid and used to leave a visible gap.
    const positions=glass.geometry.attributes.position,chosen=new Set();
    const golden=Math.PI*(3-Math.sqrt(5));
    for(let sample=0;sample<162;sample++){
      const y=1-2*(sample+.5)/162,r=Math.sqrt(1-y*y),angle=sample*golden;
      const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
      let best=-Infinity,index=0;
      for(let i=0;i<positions.count;i++){
        const score=x*positions.getX(i)+y*positions.getY(i)+z*positions.getZ(i);
        if(score>best){best=score;index=i;}
      }
      chosen.add(index);
    }
    supportGeometry=new Float32Array(chosen.size*3);
    let offset=0;
    for(const index of chosen){
      supportGeometry[offset++]=positions.getX(index);
      supportGeometry[offset++]=positions.getY(index);
      supportGeometry[offset++]=positions.getZ(index);
    }
    supportPoints=new Float32Array(chosen.size*2);
  }
  function updateFunnelFrame(){
    if(!glass)return;
    const box=glass.geometry.boundingBox;
    let bottom=-Infinity,top=Infinity,left=Infinity,right=-Infinity;
    for(let i=0;i<8;i++){
      exitPoint.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z);
      exitPoint.applyMatrix4(group.matrixWorld).project(fullCamera);
      const y=(.5-exitPoint.y*.5)*height,x=(exitPoint.x*.5+.5)*width;
      bottom=Math.max(bottom,y);top=Math.min(top,y);left=Math.min(left,x);right=Math.max(right,x);
    }
    Object.assign(cubeBounds,{left,top,right,bottom});
    let supportBottom=-Infinity;
    for(let i=0,j=0;i<supportGeometry.length;i+=3,j+=2){
      exitPoint.fromArray(supportGeometry,i).applyMatrix4(group.matrixWorld).project(fullCamera);
      const x=(exitPoint.x*.5+.5)*width,y=(.5-exitPoint.y*.5)*height;
      supportPoints[j]=x;supportPoints[j+1]=y;supportBottom=Math.max(supportBottom,y);
    }
    // Both coordinates come from the same support point. Soft weighting
    // travels continuously along the lower edge as the cube changes face.
    let weights=0,anchorX=0,anchorY=0;
    for(let i=0;i<supportPoints.length;i+=2){
      const weight=Math.exp((supportPoints[i+1]-supportBottom)/(height*.0075));
      weights+=weight;anchorX+=supportPoints[i]*weight;anchorY+=supportPoints[i+1]*weight;
    }
    funnelFrame[0]=anchorX/weights/width;
    funnelFrame[1]=anchorY/weights/height;
    funnelFrame[2]=(right-left)/height*.5;funnelFrame[3]=progress;
  }
  async function warmMaterialPrograms(){
    const material=glass.material,transmission=material.transmission;
    try {
      material.transmission=0;await renderer.compileAsync(scene,camera);
      material.transmission=transmission;await renderer.compileAsync(scene,camera);
    } finally {material.transmission=transmission;}
  }
  function faceRect(){
    if(!glass||menuBlend<0.035||!group.visible)return null;
    // The supplied mesh has its smooth faces on Z; X and Y carry the grooves.
    const inset=HALF*0.86;
    corners[0].set(inset,inset,HALF);corners[1].set(-inset,inset,HALF);
    corners[2].set(inset,-inset,HALF);corners[3].set(-inset,-inset,HALF);
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    group.updateMatrixWorld(true);
    for(const corner of corners){
      v.copy(corner);group.localToWorld(v);v.project(fullCamera);
      const x=(v.x*0.5+0.5)*width,y=(-v.y*0.5+0.5)*height;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    return{x:(left+right)/2,y:(top+bottom)/2,size:Math.min(right-left,bottom-top)};
  }
  function beginIntro(){if(introStart===null)introStart=performance.now();}
  window.cosgralCube={
    group,debug:{renderer,scene,camera,renderFrame:()=>renderer.render(scene,camera),fxaa:false,
      get chrome(){return {progress,metalness:glass?.material.metalness,roughness:glass?.material.roughness,
        transmission:glass?.material.transmission,opacity:glass?.material.opacity,paper:window.cosgralChromeStudio?.paper,
        lift:materialStudy?.lift,tailProgress,heroExited,contact:Array.from(funnelFrame),text:heroText.debug};}},
    introDone:()=>introDone,forceIntro:beginIntro,getMenuBlend:()=>menuBlend,
    getMenuFaceRect:faceRect,getMenuFaceAnchorRect:()=>null,
    getMenuOpenDuration:()=>1.25,getMenuCloseDuration:()=>0.8,getMenuLinksDelay:()=>0.35,
    getMenuLabelReveal:()=>smooth(0.25,0.78,menuBlend),getMenuCubeDimMul:()=>1,isSideEntry:()=>progress>0.1,
    openMenu(){if(!menuTarget)captureMenuPose();menuTarget=1;menuChangedAt=performance.now();effectPauseUntil=menuChangedAt+100;beginIntro();return this;},
    closeMenu(){
      closeFrom.position.copy(group.position);closeFrom.quaternion.copy(group.quaternion);closeFrom.scale=group.scale.x;
      closeStartBlend=Math.max(0.001,menuBlend);menuTarget=0;menuChangedAt=performance.now();effectPauseUntil=menuChangedAt+40;return this;
    }
  };
  window.dispatchEvent(new CustomEvent('cosgral:cube-ready'));
  function syncAmbient(active){
    if(window.cosgralChromeStudio.synchronized===active)return;
    window.cosgralChromeStudio.synchronized=active;
    window.cosgralAmbientFrame?.sync?.();
  }
  canvas.addEventListener('webglcontextlost',e=>{
    e.preventDefault();contextLost=true;firstPaint=false;
    document.documentElement.classList.remove('has-hero-cube-frame');
    syncAmbient(false);
  });
  canvas.addEventListener('webglcontextrestored',async()=>{
    // Render-target environments have no CPU pixels to re-upload after a GPU
    // reset. Rebuild that studio together with the model before resuming.
    try {
      const previous=glass;
      glass=await installGlassCube(THREE,renderer,scene,group,HALF,glassLook);
      cacheSupportGeometry();
      glass.userData.transmissionBackdrop.material.uniforms.uText.value=heroText.texture;
      glass.userData.transmissionBackdrop.material.uniforms.uTextRect.value=heroText.rect;
      materialStudy?.dispose();materialStudy=await createCubeMaterialStudy(glass,scrollProgress());
      if(previous){
        group.remove(previous);scene.remove(previous.userData.transmissionBackdrop);
        previous.geometry.dispose();previous.material.dispose();previous.userData.environmentTarget?.dispose();
      }
      tileWidth=0;resize.deviceRatio=0;queueResize();
      canvas.parentElement.classList.remove('has-cube-fallback');contextLost=false;
      // Keep ambient free-running until the recovered cube paints again.
      syncAmbient(false);
      warmMaterialPrograms().catch(error=>console.warn('COSGRAL: deferred chrome warmup',error));
    } catch(error) {
      canvas.parentElement.classList.add('has-cube-fallback');
      console.warn('COSGRAL: glass recovery failed',error);
    }
  });
  try{
    glass=await installGlassCube(THREE,renderer,scene,group,HALF,glassLook);
    cacheSupportGeometry();
    glass.userData.transmissionBackdrop.material.uniforms.uText.value=heroText.texture;
    glass.userData.transmissionBackdrop.material.uniforms.uTextRect.value=heroText.rect;
    materialStudy=await createCubeMaterialStudy(glass,scrollProgress());
    // First paint before shader warmup — poster stays until has-hero-cube-frame.
    // Ambient keeps its own loop until the first cube frame couples them.
    canvas.parentElement.classList.add('has-glass-model');
    syncAmbient(false);
    beginIntro();
    requestAnimationFrame(()=>window.ScrollTrigger?.refresh());
    const prepare=()=>warmMaterialPrograms().catch(error=>console.warn('COSGRAL: deferred chrome warmup',error));
    if(window.requestIdleCallback)requestIdleCallback(prepare,{timeout:900});else setTimeout(prepare,80);
  }catch(error){
    canvas.parentElement.classList.add('has-cube-fallback');
    console.error('COSGRAL glass model could not load',error);introDone=true;
    window.dispatchEvent(new CustomEvent('cosgral:cube-intro-done'));return;
  }
  function frame(now){
    requestAnimationFrame(frame);
    const firstFrame=lastTime===0;
    const dt=Math.min(0.05,Math.max(0.001,(now-(lastTime||now-16.7))/1000));lastTime=now;
    if(document.hidden||contextLost)return;
    profile?.frame(now);
    const blend=1-Math.exp(-dt*8),pointer=window.cosgralPointer;
    const pointerMoving=Math.abs((pointer?.nx||0)-pointerX)+Math.abs((pointer?.ny||0)-pointerY)>0.004;
    pointerX+=((pointer?.nx||0)-pointerX)*blend;pointerY+=((pointer?.ny||0)-pointerY)*blend;
    const nextProgress=scrollProgress();
    const scrollY=window.cosgralSmoothScroll?.lenis?.scroll??window.scrollY;
    const nextTail=Math.max(0,(scrollY-(scrollSpan-height*.22))/height);
    if(firstFrame){progress=nextProgress;tailProgress=nextTail;}
    if(progress===1&&nextProgress===1&&heroExited&&nextTail>=tailProgress&&menuBlend===0&&menuTarget===0&&window.cosgralChromeStudio?.covered)return;
    const scrollMoving=Math.abs(nextProgress-progress)>0.0004;
    progress+=(nextProgress-progress)*(1-Math.exp(-dt*8));
    tailProgress+=(nextTail-tailProgress)*blend;
    if(Math.abs(nextProgress-progress)<.0001)progress=nextProgress;
    menuBlend+=(menuTarget-menuBlend)*(1-Math.exp(-dt*(menuTarget?4.5:7)));
    if(Math.abs(menuTarget-menuBlend)<0.0001)menuBlend=menuTarget;
    const time=now/1000;buildScrollPose(time);
    const intro=introStart===null?0:reduced?1:smooth(0,1.05,(now-introStart)/1000);
    if(!introDone&&intro>=1){introDone=true;window.dispatchEvent(new CustomEvent('cosgral:cube-intro-done'));}
    if(!introDone&&progress<0.01&&menuBlend<0.01){
      pose.position.x+=(1-intro)*worldHeight(0.36)*camera.aspect*0.8;
      pose.position.y-=(1-intro)*worldHeight(0.36)*0.45;
      pose.quaternion.setFromEuler(euler.set(.48+(1-intro)*.25,-.67-(1-intro)*.55,(1-intro)*.15));
      pose.scale*=0.78+intro*0.22;
    }
    if(menuBlend>0){
      const mb=smooth(0,1,menuBlend);screenPosition(width*0.5,height*0.49,0.36,v);
      const breathing=reduced?0:Math.sin(time*0.65);
      v.y+=breathing*0.020;
      menuQ.setFromEuler(euler.set(reduced?0:Math.sin(time*0.41)*0.012,
        reduced?0:Math.sin(time*0.35)*0.024,reduced?0:Math.sin(time*0.30)*0.009));
      if(menuTarget){
        group.position.copy(menuFrom.position).lerp(v,mb);targetQ.copy(menuFrom.quaternion).slerp(menuQ,mb);
        group.scale.setScalar(THREE.MathUtils.lerp(menuFrom.scale,screenScale(menuSize(),0.36)*(1+breathing*0.008),mb));
      }else{
        const close=smooth(0,1,menuBlend/closeStartBlend);
        group.position.copy(pose.position).lerp(closeFrom.position,close);
        targetQ.copy(pose.quaternion).slerp(closeFrom.quaternion,close);
        group.scale.setScalar(THREE.MathUtils.lerp(pose.scale,closeFrom.scale,close));
      }
    }else{
      group.position.copy(pose.position);targetQ.copy(pose.quaternion);group.scale.setScalar(pose.scale);
    }
    group.quaternion.slerp(targetQ,1-Math.exp(-dt*14));group.updateMatrixWorld(true);
    const sectionTop=sectionDocumentTop-scrollY,guard=(contentDocumentTop-scrollY)/height-.012;
    updateFunnelFrame();
    heroExited=progress===1&&cubeBounds.bottom/height<-.025;
    const headlineClearance=progress<.62?heroText.headlineClearance(cubeBounds):1;
    materialStudy.update({progress,menuBlend,boundary:sectionTop/height,guard,frame:funnelFrame,dt,inputProgress:nextProgress,headlineClearance});
    group.visible=(!heroExited||menuBlend>.001)&&introStart!==null;
    glass.userData.transmissionBackdrop.visible=group.visible&&glass.material.transmission>0;
    heroText.setActive(group.visible&&glass.material.transmission>.01);
    const footer=document.documentElement.classList.contains('is-footer-covered');
    const portalVisible=!(footer&&menuBlend<0.01);
    if(portalVisible!==lastPortalVisible){canvas.parentElement.style.visibility=portalVisible?'visible':'hidden';lastPortalVisible=portalVisible;}
    if(footer&&menuBlend<0.01)return;
    if(!group.visible){
      canvas.style.visibility='hidden';
      window.cosgralAmbientFrame?.render?.(now);
      return;
    }
    if(now<effectPauseUntil)return;
    // UI and input still update at the display rate; expensive effect renders
    // are capped at 60Hz on 120/144/240Hz monitors.
    const activeMotion=!introDone||pointerMoving||scrollMoving||Math.abs(nextTail-tailProgress)>.0004||materialStudy.moving||Math.abs(menuTarget-menuBlend)>0.001;
    // The resting cube moves only a few pixels over several seconds. Reuse
    // its image between updates; pointer and scroll input restore 60Hz work.
    if(now-lastRenderAt<(activeMotion?(qualityTier===2?30:14):42))return;
    lastRenderAt=now;
    const renderStart=profile ? performance.now() : 0;
    updateCrop(now);canvas.style.visibility='visible';
    heroText.sync({x:lastCropX,y:lastCropY,width:tileWidth,height:tileHeight,viewportWidth:width,viewportHeight:height});
    glass.userData.transmissionBackdrop.material.uniformsNeedUpdate=true;
    window.cosgralAmbientFrame?.render?.(now);
    renderer.render(scene,camera);
    if(!firstPaint){
      firstPaint=true;
      canvas.parentElement.classList.add('has-cube-frame');
      document.documentElement.classList.add('has-hero-cube-frame');
      canvas.dataset.firstCubeFrameMs=performance.now().toFixed(0);
      syncAmbient(true);
    }
    if (profile) profile.render(performance.now()-renderStart);
  }
  requestAnimationFrame(frame);
})();
