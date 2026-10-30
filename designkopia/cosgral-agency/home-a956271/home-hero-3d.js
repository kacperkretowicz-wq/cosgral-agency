/** One model, behind the typography, following a reversible open orbit. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { installGlassCube } from './cosgral-glass-cube.js?v=20261019editorial14';
import { createFrameProfile } from './cosgral-frame-profile.js?v=20261019motion11';
import { sampleCubeOrbit } from './home-cube-orbit.js?v=20261019editorial16';
import { createCubeMaterialStudy } from './home-cube-materials.js?v=20261019perf17';

(async function () {
  const canvas = document.getElementById('hero-3d');
  if (!canvas || document.documentElement.classList.contains('reduce-motion')) return;
  const HALF = 1.35;
  const nativeScroll=window.matchMedia('(max-width:900px), (pointer:coarse)').matches;
  const capturePoster=new URLSearchParams(location.search).has('captureCube');
  const glassLook={glass:{transmission:1,metalness:0,roughness:.035,iridescence:.08,dispersion:.20,edgeGlow:.11,envMapIntensity:1.15,farSideDim:.4,thickness:.7},env:{power:1.5,sheen:.70,violetSheen:.55}};
  const clamp = THREE.MathUtils.clamp;
  const smooth = (a,b,x) => {const p=clamp((x-a)/(b-a),0,1);return p*p*(3-2*p);};
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
  let lastCropX=NaN,lastCropY=NaN,lastPortalVisible=null,lastRenderAt=0,lastPoseAt=0;
  let qualityTier=0,sectionDocumentTop=0,scrollSpan=1;
  let menuBlend=0,menuTarget=0,progress=0,lastTime=0;
  let heroExited=false;
  let lastHeroFocus=null;
  let menuChangedAt=0;
  let effectPauseUntil=0;
  let introStart=performance.now(),introDone=true,contextLost=false;
  let firstPaint=false,opaqueWarmMaterial=null,opaqueWarmReady=false;
  let frameRaf=0,ready=false;
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
  const orbitPose={x:.5,y:.3,scale:1,phase:0};
  const cubeBounds={left:0,top:0,right:0,bottom:0};
  const nextSection=document.getElementById('uslugi');
  const profile=createFrameProfile(canvas);
  function requestFrame(){
    if(ready&&!frameRaf&&!document.hidden&&!contextLost)frameRaf=requestAnimationFrame(frame);
  }
  function syncAmbient(active){
    if(window.cosgralChromeStudio.synchronized===active)return;
    window.cosgralChromeStudio.synchronized=active;
    window.cosgralAmbientFrame?.sync?.();
  }
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
    scrollSpan=Math.max(height*1.2,sectionDocumentTop-height*.12);
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
    requestFrame();
  }
  function queueResize(){if(!resizeQueued){resizeQueued=true;requestAnimationFrame(resize);}}
  function setTileSize(menu){
    tileMode=menu;
    // Fixed envelopes avoid GPU buffer reallocations during individual frames.
    const size=menu?menuSize()*1.45+40:heroSize()*1.5+56;
    const tw=Math.min(width,Math.ceil(size/16)*16),th=Math.min(height,Math.ceil(size/16)*16);
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
  window.addEventListener('scroll',requestFrame,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(frameRaf);frameRaf=0;return;}
    lastTime=lastPoseAt=lastRenderAt=0;requestFrame();
  });
  window.addEventListener('pageshow',()=>{lastTime=lastPoseAt=lastRenderAt=0;requestFrame();});
  window.visualViewport?.addEventListener('resize',queueResize,{passive:true});
  window.cosgralPerf?.subscribe(tier=>{if(tier!==qualityTier){qualityTier=tier;queueResize();}});
  window.ScrollTrigger?.addEventListener('refresh',measureHeroLayout);
  window.addEventListener('cosgral:langchange',()=>requestAnimationFrame(measureHeroLayout));
  document.fonts?.ready.then(measureHeroLayout);
  function scrollProgress(){
    // Lenis writes the native scroll position. Read that same position for
    // wheel, touch, scrollbar dragging, restored history and reverse scrolling.
    const scrollY=window.scrollY;
    return clamp(scrollY/scrollSpan,0,1);
  }
  function buildScrollPose(time){
    sampleCubeOrbit(progress,.24,-.4,orbitPose);
    const t=orbitPose.phase,bank=Math.sin(t*Math.PI*2);
    const drift=reduced?0:Math.sin(time*.34)*.006;
    euler.set(.48+drift-pointerY*.035+Math.sin(t*Math.PI)*.10,
      -.67+pointerX*.055+t*Math.PI*.90,-bank*.10);
    pose.quaternion.setFromEuler(euler);
    pose.scale=screenScale(heroSize(),.36)*orbitPose.scale;
    screenPosition(width*.5,height*orbitPose.y,.36,pose.position);
    // Fit the right-hand part to the real model. The final control point
    // is independent of that room, so narrow screens still exit fully left.
    let right=width*.5;
    if(glass){
      const box=glass.geometry.boundingBox;
      for(let i=0;i<8;i++){
        exitPoint.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z);
        exitPoint.multiplyScalar(pose.scale).applyQuaternion(pose.quaternion).add(pose.position).project(fullCamera);
        right=Math.max(right,(exitPoint.x*.5+.5)*width);
      }
    }
    const reach=Math.max(0,Math.min(.24,(width-right-Math.max(20,width*.055))*.80/width));
    const exitX=-(Math.max(heroSize()*1.1,width*.23)+48)/width;
    sampleCubeOrbit(progress,reach,exitX,orbitPose);
    screenPosition(width*orbitPose.x,height*(orbitPose.y+(mobile?.01:0)*(1-t)),.36,pose.position);
    const studioBlend=1-smooth(0,.25,menuBlend);
    scene.environmentRotation.set(.025*bank*studioBlend,.12*Math.sin(t*Math.PI)*studioBlend,0);
  }
  function captureMenuPose(){
    menuFrom.position.copy(group.position);menuFrom.quaternion.copy(group.quaternion);menuFrom.scale=group.scale.x;
    if(!group.visible){
      screenPosition(width*0.06,height*0.07,0.36,menuFrom.position);menuFrom.scale=screenScale(54,0.36);
    }
  }
  function updateCubeBounds(){
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
  }
  async function warmMaterialPrograms(){
    if(opaqueWarmMaterial)return;
    const material=glass.material;
    const opaque=material.clone();
    opaque.onBeforeCompile=material.onBeforeCompile;
    opaque.customProgramCacheKey=material.customProgramCacheKey;
    opaque.transmission=0;opaqueWarmMaterial=opaque;opaqueWarmReady=false;
    // Compile a separate material so live glass never changes during warmup.
    glass.material=opaque;
    let pending;
    try{pending=renderer.compileAsync(scene,camera);}finally{glass.material=material;}
    await pending;
    if(opaqueWarmMaterial===opaque)opaqueWarmReady=true;
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
        orbit:{...orbitPose},heroExited,bounds:{...cubeBounds}};}},
    introDone:()=>introDone,forceIntro:beginIntro,getMenuBlend:()=>menuBlend,
    getMenuFaceRect:faceRect,getMenuFaceAnchorRect:()=>null,
    getMenuOpenDuration:()=>1.25,getMenuCloseDuration:()=>0.8,getMenuLinksDelay:()=>0.35,
    getMenuLabelReveal:()=>smooth(0.25,0.78,menuBlend),getMenuCubeDimMul:()=>1,isSideEntry:()=>progress>0.1,
    openMenu(){if(!menuTarget)captureMenuPose();menuTarget=1;menuChangedAt=performance.now();effectPauseUntil=menuChangedAt+100;beginIntro();requestFrame();return this;},
    closeMenu(){
      closeFrom.position.copy(group.position);closeFrom.quaternion.copy(group.quaternion);closeFrom.scale=group.scale.x;
      closeStartBlend=Math.max(0.001,menuBlend);menuTarget=0;menuChangedAt=performance.now();effectPauseUntil=menuChangedAt+40;requestFrame();return this;
    }
  };
  window.dispatchEvent(new CustomEvent('cosgral:cube-ready'));
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;cancelAnimationFrame(frameRaf);frameRaf=0;firstPaint=false;document.documentElement.classList.remove('has-hero-cube-frame');opaqueWarmMaterial?.dispose();opaqueWarmMaterial=null;opaqueWarmReady=false;syncAmbient(false);});
  canvas.addEventListener('webglcontextrestored',async()=>{
    // Render-target environments have no CPU pixels to re-upload after a GPU
    // reset. Rebuild that studio together with the model before resuming.
    try {
      const previous=glass;
      glass=await installGlassCube(THREE,renderer,scene,group,HALF,glassLook);
      materialStudy?.dispose();materialStudy=await createCubeMaterialStudy(glass,scrollProgress());
      await renderer.compileAsync(scene,camera);
      await warmMaterialPrograms();
      if(previous){
        group.remove(previous);scene.remove(previous.userData.transmissionBackdrop);
        previous.geometry.dispose();previous.material.dispose();previous.userData.environmentTarget?.dispose();
      }
      tileWidth=0;resize.deviceRatio=0;queueResize();
      canvas.parentElement.classList.remove('has-cube-fallback');contextLost=false;syncAmbient(true);requestFrame();
    } catch(error) {
      canvas.parentElement.classList.add('has-cube-fallback');
      console.warn('COSGRAL: glass recovery failed',error);
    }
  });
  try{
    glass=await installGlassCube(THREE,renderer,scene,group,HALF,glassLook);
    materialStudy=await createCubeMaterialStudy(glass,scrollProgress());
    await renderer.compileAsync(scene,camera);
    canvas.parentElement.classList.add('has-glass-model');
    syncAmbient(true);ready=true;
    requestAnimationFrame(()=>window.ScrollTrigger?.refresh());
  }catch(error){
    canvas.parentElement.classList.add('has-cube-fallback');
    console.error('COSGRAL glass model could not load',error);introDone=true;
    window.dispatchEvent(new CustomEvent('cosgral:cube-intro-done'));return;
  }
  function frame(now){
    frameRaf=0;
    const firstFrame=lastTime===0;
    const dt=Math.min(0.05,Math.max(0.001,(now-(lastTime||now-16.7))/1000));lastTime=now;
    if(document.hidden||contextLost)return;
    profile?.frame(now);
    const blend=1-Math.exp(-dt*8),pointer=window.cosgralPointer;
    const pointerMoving=Math.abs((pointer?.nx||0)-pointerX)+Math.abs((pointer?.ny||0)-pointerY)>0.004;
    pointerX+=((pointer?.nx||0)-pointerX)*blend;pointerY+=((pointer?.ny||0)-pointerY)*blend;
    const nextProgress=scrollProgress();
    if(firstFrame)progress=nextProgress;
    if(heroExited&&Math.abs(nextProgress-progress)<.0001&&menuBlend===0&&menuTarget===0){syncAmbient(false);return;}
    requestFrame();
    const scrollMoving=Math.abs(nextProgress-progress)>0.0004;
    // Native touch scrolling already moves at the display rate; do not damp it twice.
    progress=nativeScroll?nextProgress:progress+(nextProgress-progress)*(1-Math.exp(-dt*8));
    if(Math.abs(nextProgress-progress)<.0001)progress=nextProgress;
    const inputActive=!introDone||pointerMoving||scrollMoving||materialStudy.moving||Math.abs(menuTarget-menuBlend)>.001;
    const renderInterval=inputActive?(1000/(qualityTier===2?30:60)):1000/24;
    const renderElapsed=now-lastRenderAt;
    if(renderElapsed<renderInterval-.65)return;
    const renderDt=Math.min(.05,Math.max(.001,(now-(lastPoseAt||now-16.7))/1000));lastPoseAt=now;
    menuBlend+=(menuTarget-menuBlend)*(1-Math.exp(-renderDt*(menuTarget?4.5:7)));
    if(Math.abs(menuTarget-menuBlend)<0.0001)menuBlend=menuTarget;
    if(capturePoster)pointerX=pointerY=0;
    const time=capturePoster?0:now/1000;buildScrollPose(time);
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
    // Scroll and pointer input have already been damped once.
    group.quaternion.copy(targetQ);group.updateMatrixWorld(true);
    updateCubeBounds();
    heroExited=cubeBounds.right<-20;
    materialStudy.update({progress,menuBlend,dt:renderDt});
    group.visible=(!heroExited||menuBlend>.001)&&introStart!==null;
    const heroFocus=group.visible&&menuBlend<.01;
    if(heroFocus!==lastHeroFocus){lastHeroFocus=heroFocus;document.documentElement.classList.toggle('is-hero-cube-focus',heroFocus);}
    glass.userData.transmissionBackdrop.visible=group.visible&&glass.material.transmission>0;
    const footer=document.documentElement.classList.contains('is-footer-covered');
    const portalVisible=!(footer&&menuBlend<0.01);
    if(portalVisible!==lastPortalVisible){canvas.parentElement.style.visibility=portalVisible?'visible':'hidden';lastPortalVisible=portalVisible;}
    syncAmbient(group.visible&&!(footer&&menuBlend<.01));
    if(footer&&menuBlend<0.01)return;
    if(!group.visible){
      canvas.style.visibility='hidden';
      profile?.activity(false);
      return;
    }
    if(now<effectPauseUntil)return;
    // UI and input still update at the display rate; expensive effect renders
    // are capped at 60Hz on 120/144/240Hz monitors.
    const activeMotion=!introDone||pointerMoving||scrollMoving||materialStudy.moving||Math.abs(menuTarget-menuBlend)>0.001;
    profile?.activity(activeMotion);
    // The resting cube moves only a few pixels over several seconds. Reuse
    // its image between updates; pointer and scroll input restore 60Hz work.
    // Carry fractional time forward so 144 Hz displays also average 60 FPS.
    lastRenderAt=renderElapsed>=renderInterval?now-renderElapsed%renderInterval:now;
    const renderStart=profile ? performance.now() : 0;
    updateCrop(now);canvas.style.visibility='visible';
    glass.userData.transmissionBackdrop.material.uniformsNeedUpdate=true;
    window.cosgralAmbientFrame?.render?.(now);
    renderer.render(scene,camera);
    if(!firstPaint){
      firstPaint=true;canvas.parentElement.classList.add('has-cube-frame');
      document.documentElement.classList.add('has-hero-cube-frame');
      canvas.dataset.firstCubeFrameMs=performance.now().toFixed(0);
      window.dispatchEvent(new CustomEvent('cosgral:cube-intro-done'));
      if(capturePoster){
        canvas.setAttribute('data-cube-poster',canvas.toDataURL('image/png'));
      }else{
        const prepare=()=>warmMaterialPrograms().catch(error=>console.warn('COSGRAL: deferred chrome warmup',error));
        if(window.requestIdleCallback)requestIdleCallback(prepare,{timeout:900});else setTimeout(prepare,80);
      }
    }
    if(opaqueWarmReady&&opaqueWarmMaterial&&glass.material.transmission===0){opaqueWarmMaterial.dispose();opaqueWarmMaterial=null;opaqueWarmReady=false;}
    if (profile) profile.render(performance.now()-renderStart,now,activeMotion,qualityTier);
  }
  requestFrame();
})();
