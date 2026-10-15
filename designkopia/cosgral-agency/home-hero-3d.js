/** One glass model, a reversible scroll choreography, and a soft optical wake. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { installGlassCube } from './cosgral-glass-cube.js?v=20261015text2';
import { createOpticalWake } from './cosgral-optical-wake.js?v=20261012editorial4';
import { createFrameProfile } from './cosgral-frame-profile.js';
import { createHeroLensText } from './cosgral-hero-lens-text.js?v=20261015text2';

(async function () {
  const canvas = document.getElementById('hero-3d');
  if (!canvas || document.documentElement.classList.contains('reduce-motion')) return;
  const HALF = 1.35;
  const glassLook={glass:{iridescence:0.12,dispersion:0.25,edgeGlow:0.12,envMapIntensity:1.15,farSideDim:0.38,thickness:0.7},env:{power:1.5,sheen:0.4}};
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
  const wakeScene=new THREE.Scene();
  const wakeCanvas=document.createElement('canvas');
  wakeCanvas.className='home-optical-dust';
  wakeCanvas.setAttribute('aria-hidden','true');
  canvas.parentElement.insertBefore(wakeCanvas,canvas);
  const wakeRenderer=new THREE.WebGLRenderer({canvas:wakeCanvas,alpha:true,antialias:false,depth:false,stencil:false,powerPreference:'high-performance'});
  wakeRenderer.setClearColor(0x000000,0);
  wakeRenderer.outputColorSpace=THREE.SRGBColorSpace;
  const camera=new THREE.PerspectiveCamera(42,1,0.1,100);
  camera.position.set(0,0,5.4);
  const fullCamera=camera.clone();
  fullCamera.updateMatrixWorld(true);
  const group=new THREE.Group();scene.add(group);
  let width=1,height=1,mobile=false,glass=null;
  let tileWidth=0,tileHeight=0,tileMode=false,pixelRatio=1,resizeQueued=false;
  let lastCropX=NaN,lastCropY=NaN,lastPortalVisible=null,wakeWasVisible=false,lastRenderAt=0;
  let menuBlend=0,menuTarget=0,progress=0,lastTime=0;
  let menuChangedAt=0;
  let effectPauseUntil=0;
  let introStart=null,introDone=false,contextLost=false,wakeContextLost=false;
  let pointerX=0,pointerY=0;
  const pose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
  const menuFrom={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
  const closeFrom={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
  let closeStartBlend=1;
  const targetQ=new THREE.Quaternion();
  const menuQ=new THREE.Quaternion();
  const euler=new THREE.Euler(),v=new THREE.Vector3();
  const corners=Array.from({length:4},()=>new THREE.Vector3());
  const path=Array.from({length:4},()=>new THREE.Vector3());
  const wake=createOpticalWake(THREE,wakeScene,1800);
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
  function updatePath(){
    screenPosition(width*0.5,height*(mobile?0.31:0.30),0.36,path[0]);
    screenPosition(width*0.80,height*0.27,0.80,path[1]);
    screenPosition(width*0.36,height*0.85,-0.05,path[2]);
    screenPosition(-width*0.18,-height*0.12,-0.8,path[3]);
    wake.setPath(path);
  }
  function resize(){
    resizeQueued=false;
    const nextWidth=Math.max(1,canvas.parentElement.clientWidth||window.innerWidth);
    const nextHeight=Math.max(1,canvas.parentElement.clientHeight||window.innerHeight);
    const nextRatio=window.devicePixelRatio||1;
    if(nextWidth===width && nextHeight===height && nextRatio===resize.deviceRatio)return;
    width=nextWidth;height=nextHeight;resize.deviceRatio=nextRatio;mobile=width<=900;
    fullCamera.aspect=width/height;fullCamera.updateProjectionMatrix();fullCamera.updateMatrixWorld(true);
    camera.aspect=width/height;camera.clearViewOffset();camera.updateProjectionMatrix();
    // Supersample smaller screens; a 3840-wide display renders at its native 4K.
    // Preserve sharpness instead of changing resolution mid-scroll.
    const limit=mobile?2560:4096;
    pixelRatio=Math.max(1,Math.min(Math.max(2,nextRatio),limit/Math.max(width,height)));
    renderer.setPixelRatio(pixelRatio);
    wakeRenderer.setPixelRatio(pixelRatio);wakeRenderer.setSize(width,height,false);
    tileWidth=0;tileHeight=0;setTileSize(menuTarget>0||menuBlend>0.001);updatePath();
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
  function pointOnPath(t,out){
    const u=1-t;out.copy(path[0]).multiplyScalar(u*u*u);
    out.addScaledVector(path[1],3*u*u*t);out.addScaledVector(path[2],3*u*t*t);
    return out.addScaledVector(path[3],t*t*t);
  }
  function scrollProgress(){
    // One authoritative timeline. Section jump flags cannot reset the model.
    const st=window.ScrollTrigger?.getById('shatter-beat');
    if(st&&st.end>st.start){
      const scrollY=window.cosgralSmoothScroll?.lenis?.scroll??window.scrollY;
      return clamp((scrollY-st.start)/(st.end-st.start),0,1);
    }
    return clamp(window.cosgralSand?.cinema||0,0,1);
  }
  function buildScrollPose(time){
    pointOnPath(progress,pose.position);
    const idle=1-smooth(0,0.10,progress);
    if(!reduced)pose.position.y+=Math.sin(time*0.60)*0.045*idle;
    const turn=smooth(0.015,0.95,progress),bank=Math.sin(progress*Math.PI)*0.12;
    const drift=reduced?0:idle;
    euler.set(0.15+turn*Math.PI*0.12-pointerY*0.10*idle+Math.sin(time*0.37)*0.065*drift,
      -0.18+turn*Math.PI*0.34+pointerX*0.16*idle+Math.sin(time*0.29)*0.10*drift,
      -bank+pointerX*0.020*idle+Math.sin(time*0.41)*0.024*drift);
    pose.quaternion.setFromEuler(euler);
    const grow=1+Math.sin(progress*Math.PI)*(mobile?0.14:0.22);
    pose.scale=screenScale(heroSize(),0.36)*grow*(1-smooth(0.75,1,progress)*0.22)*(1+Math.sin(time*0.60)*0.009*drift);
  }
  function captureMenuPose(){
    menuFrom.position.copy(group.position);menuFrom.quaternion.copy(group.quaternion);menuFrom.scale=group.scale.x;
    if(!group.visible||!glass?.visible){
      screenPosition(width*0.06,height*0.07,0.36,menuFrom.position);menuFrom.scale=screenScale(54,0.36);
    }
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
    group,debug:{renderer,scene,camera,renderFrame:()=>renderer.render(scene,camera),fxaa:false},
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
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;});
  canvas.addEventListener('webglcontextrestored',async()=>{
    // Render-target environments have no CPU pixels to re-upload after a GPU
    // reset. Rebuild that studio together with the model before resuming.
    try {
      const previous=glass;
      glass=await installGlassCube(THREE,renderer,scene,group,HALF,glassLook);
      glass.userData.transmissionBackdrop.material.uniforms.uText.value=heroText.texture;
      if(previous){
        group.remove(previous);scene.remove(previous.userData.transmissionBackdrop);
        previous.geometry.dispose();previous.material.dispose();previous.userData.environmentTarget?.dispose();
      }
      tileWidth=0;resize.deviceRatio=0;queueResize();
      canvas.parentElement.classList.remove('has-cube-fallback');contextLost=false;
    } catch(error) {
      canvas.parentElement.classList.add('has-cube-fallback');
      console.warn('COSGRAL: glass recovery failed',error);
    }
  });
  wakeCanvas.addEventListener('webglcontextlost',e=>{e.preventDefault();wakeContextLost=true;});
  wakeCanvas.addEventListener('webglcontextrestored',()=>{
    wakeContextLost=false;wakeRenderer.setPixelRatio(pixelRatio);wakeRenderer.setSize(width,height,false);
  });
  try{
    glass=await installGlassCube(THREE,renderer,scene,group,HALF,glassLook);
    glass.userData.transmissionBackdrop.material.uniforms.uText.value=heroText.texture;
    canvas.parentElement.classList.add('has-glass-model');
  }catch(error){
    canvas.parentElement.classList.add('has-cube-fallback');
    console.error('COSGRAL glass model could not load',error);introDone=true;
    window.dispatchEvent(new CustomEvent('cosgral:cube-intro-done'));return;
  }
  let readyObserver;
  function introWhenReady(){if(document.body.classList.contains('is-ready')){beginIntro();readyObserver?.disconnect();}}
  readyObserver=new MutationObserver(introWhenReady);
  readyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});introWhenReady();
  window.setTimeout(beginIntro,2200);
  function frame(now){
    requestAnimationFrame(frame);
    const dt=Math.min(0.05,Math.max(0.001,(now-(lastTime||now-16.7))/1000));lastTime=now;
    if(document.hidden||contextLost)return;
    profile?.frame(now);
    const blend=1-Math.exp(-dt*14),pointer=window.cosgralPointer;
    const pointerMoving=Math.abs((pointer?.nx||0)-pointerX)+Math.abs((pointer?.ny||0)-pointerY)>0.004;
    pointerX+=((pointer?.nx||0)-pointerX)*blend;pointerY+=((pointer?.ny||0)-pointerY)*blend;
    const nextProgress=scrollProgress();
    const scrollMoving=Math.abs(nextProgress-progress)>0.0004;
    progress+=(nextProgress-progress)*(1-Math.exp(-dt*24));
    menuBlend+=(menuTarget-menuBlend)*(1-Math.exp(-dt*(menuTarget?4.5:7)));
    if(Math.abs(menuTarget-menuBlend)<0.0001)menuBlend=menuTarget;
    const time=now/1000;buildScrollPose(time);
    const intro=introStart===null?0:reduced?1:smooth(0,1.05,(now-introStart)/1000);
    if(!introDone&&intro>=1){introDone=true;window.dispatchEvent(new CustomEvent('cosgral:cube-intro-done'));}
    if(!introDone&&progress<0.01&&menuBlend<0.01){
      pose.position.x+=(1-intro)*worldHeight(0.36)*camera.aspect*0.8;
      pose.position.y-=(1-intro)*worldHeight(0.36)*0.45;
      pose.quaternion.setFromEuler(euler.set(0.15+(1-intro)*0.25,-0.18-(1-intro)*0.55,(1-intro)*0.15));
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
    group.quaternion.slerp(targetQ,1-Math.exp(-dt*24));group.updateMatrixWorld(true);
    const dissolve=1-smooth(0.76,0.98,progress);
    glass.material.opacity=THREE.MathUtils.lerp(dissolve,1,smooth(0,0.2,menuBlend));
    glass.material.depthWrite=glass.material.opacity>0.995;
    glass.visible=glass.material.opacity>0.008;group.visible=glass.visible&&introStart!==null;
    glass.userData.transmissionBackdrop.visible=group.visible;
    const footer=document.documentElement.classList.contains('is-footer-covered');
    const servicesVisible=window.cosgralSand?.servicesVisible;
    const covered=document.documentElement.classList.contains('is-ambient-covered');
    wake.update({time,progress,menuBlend,scale:pose.scale,pointerX,pointerY,fade:footer||covered?0:0.65});
    const portalVisible=!(footer&&menuBlend<0.01);
    if(portalVisible!==lastPortalVisible){canvas.parentElement.style.visibility=portalVisible?'visible':'hidden';lastPortalVisible=portalVisible;}
    if(footer&&menuBlend<0.01)return;
    if(!group.visible&&!wake.visible){
      canvas.style.visibility='hidden';
      if(wakeWasVisible&&!wakeContextLost)wakeRenderer.clear();
      wakeWasVisible=false;
      return;
    }
    if(now<effectPauseUntil)return;
    // UI and input still update at the display rate; expensive effect renders
    // are capped at 60Hz on 120/144/240Hz monitors.
    const activeMotion=!introDone||pointerMoving||scrollMoving||Math.abs(menuTarget-menuBlend)>0.001;
    // The resting cube moves only a few pixels over several seconds. Reuse
    // its image between updates; pointer and scroll input restore 60Hz work.
    if(now-lastRenderAt<(activeMotion?14:42))return;
    lastRenderAt=now;
    const renderStart=profile ? performance.now() : 0;
    if(group.visible){updateCrop(now);canvas.style.visibility='visible';renderer.render(scene,camera);}
    else if(canvas.style.visibility!=='hidden')canvas.style.visibility='hidden';
    if(!wakeContextLost){
      if(wake.visible)wakeRenderer.render(wakeScene,fullCamera);
      else if(wakeWasVisible)wakeRenderer.clear();
    }
    wakeWasVisible=wake.visible;
    if (profile) profile.render(performance.now()-renderStart);
  }
  requestAnimationFrame(frame);
})();
