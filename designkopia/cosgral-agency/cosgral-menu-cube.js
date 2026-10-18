/**
 * Mega menu cube for every page except the homepage.
 * The homepage drives its menu with the hero glass cube (home-hero-3d.js).
 * Here the same glass model, glass look and menu choreography are mounted on
 * their own: closed, the cube rests invisibly in the logo; MENU flies it from
 * the logo to the centre and home-nav-menu.js projects the links onto its face,
 * exactly as on the homepage once its hero cube has scrolled away.
 * Any other cube on the page (subpage drift cube) keeps working: every method
 * this module does not own is forwarded to it.
 */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { installGlassCube } from './cosgral-glass-cube.js?v=20261015text2';

(function () {
  const root = document.documentElement;
  if (document.getElementById('hero-3d')) return; /* homepage has its own */
  const HALF = 1.35;
  const glassLook = {glass:{iridescence:0.12,dispersion:0.25,edgeGlow:0.12,envMapIntensity:1.15,farSideDim:0.38,thickness:0.7},env:{power:1.5,sheen:0.4}};
  const clamp = THREE.MathUtils.clamp;
  const smooth = (a,b,x) => {const p=clamp((x-a)/(b-a),0,1);return p*p*(3-2*p);};
  const reduced = root.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let menuBlend=0,menuTarget=0,menuChangedAt=0,effectPauseUntil=0,closeStartBlend=1;
  let glass=null,renderer=null,started=false,failed=false;
  const fromPose={position:null,quaternion:null,scale:1};

  /* ——— Public API (same shape as the homepage cube's) ——— */
  let legacy = null;
  const own = {
    introDone:()=>true,forceIntro:()=>{},getMenuBlend:()=>menuBlend,
    getMenuFaceRect:()=>faceRect(),getMenuFaceAnchorRect:()=>null,
    getMenuOpenDuration:()=>1.25,getMenuCloseDuration:()=>0.8,getMenuLinksDelay:()=>0.35,
    getMenuLabelReveal:()=>smooth(0.25,0.78,menuBlend),getMenuLabelReadability:()=>smooth(0.25,0.78,menuBlend),
    getMenuCubeDimMul:()=>1,isSideEntry:()=>true,
    openMenu(){if(!menuTarget)captureMenuPose();menuTarget=1;menuChangedAt=performance.now();effectPauseUntil=menuChangedAt+100;start();return api;},
    closeMenu(){captureClosePose();closeStartBlend=Math.max(0.001,menuBlend);menuTarget=0;menuChangedAt=performance.now();effectPauseUntil=menuChangedAt+40;return api;}
  };
  const api = new Proxy(own, {
    get(t,k){
      if (k in t) return t[k];
      const v = legacy ? legacy[k] : undefined;
      return typeof v === 'function' ? v.bind(legacy) : v;
    },
    has(t,k){return k in t || !!(legacy && k in legacy);}
  });
  const previous = window.cosgralCube;
  if (previous && previous !== api) legacy = previous;
  Object.defineProperty(window, 'cosgralCube', {
    configurable: true,
    get(){return api;},
    set(v){if (v && v !== api) legacy = v;}
  });

  /* Pages without lenis still must not scroll under the open menu. */
  window.addEventListener('cosgral:menu-state', function (e) {
    const open = !!(e.detail && e.detail.open);
    root.classList.toggle('is-scroll-locked', open);
    document.body.classList.toggle('is-scroll-locked', open);
  });
  window.addEventListener('wheel', function (e) {
    if (root.classList.contains('is-nav-menu-open')) e.stopImmediatePropagation();
  }, {capture:true,passive:true});

  /* ——— Scene, built on first use or when the browser is idle ——— */
  const portal = document.createElement('div');
  portal.className = 'cosgral-menu-cube';
  portal.setAttribute('aria-hidden','true');
  const canvas = document.createElement('canvas');
  canvas.className = 'cosgral-menu-cube__canvas';
  portal.appendChild(canvas);
  (document.body || root).appendChild(portal);

  let camera,fullCamera,scene,group,width=1,height=1,mobile=false;
  let tileWidth=0,tileHeight=0,tileMode=false,pixelRatio=1,resizeQueued=false;
  let lastCropX=NaN,lastCropY=NaN,lastTime=0,lastRenderAt=0,contextLost=false;
  let pose,menuFrom,closeFrom,targetQ,menuQ,euler,v,corners;

  function worldHeight(z){return 2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(camera.position.z-z);}
  function screenPosition(x,y,z,target){const h=worldHeight(z);return target.set((x/width-0.5)*h*camera.aspect,(0.5-y/height)*h,z);}
  function screenScale(px,z){return px/height*worldHeight(z)/(2*HALF);}
  function menuSize(){return Math.min(width*(mobile?0.72:0.54),height*0.55);}
  /* Resting place: the cube logo in the navigation (homepage: 6% / 7%, 54px). */
  function logoPose(out){
    const logo=document.querySelector('.site-nav__logo-img');
    const r=logo&&logo.getBoundingClientRect();
    if(r&&r.width>4&&r.bottom>0){screenPosition(r.left+r.width/2,r.top+r.height/2,0.36,out.position);out.scale=screenScale(Math.max(36,r.width*1.12),0.36);}
    else{screenPosition(width*0.06,height*0.07,0.36,out.position);out.scale=screenScale(54,0.36);}
    out.quaternion.setFromEuler(euler.set(0.15+Math.PI*0.12,-0.18+Math.PI*0.34,0));
    return out;
  }
  function captureMenuPose(){
    if(!group)return;
    if(!group.visible||!glass?.visible){logoPose(menuFrom);group.quaternion.copy(menuFrom.quaternion);}
    else{menuFrom.position.copy(group.position);menuFrom.quaternion.copy(group.quaternion);menuFrom.scale=group.scale.x;}
  }
  function captureClosePose(){
    if(!group)return;
    closeFrom.position.copy(group.position);closeFrom.quaternion.copy(group.quaternion);closeFrom.scale=group.scale.x;
  }
  function faceRect(){
    if(!glass||menuBlend<0.035||!group.visible)return null;
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
  function resize(){
    resizeQueued=false;
    const nextWidth=Math.max(1,window.innerWidth),nextHeight=Math.max(1,window.innerHeight);
    const nextRatio=window.devicePixelRatio||1;
    if(nextWidth===width&&nextHeight===height&&nextRatio===resize.deviceRatio)return;
    width=nextWidth;height=nextHeight;resize.deviceRatio=nextRatio;mobile=width<=900;
    fullCamera.aspect=width/height;fullCamera.updateProjectionMatrix();fullCamera.updateMatrixWorld(true);
    camera.aspect=width/height;camera.clearViewOffset();camera.updateProjectionMatrix();
    const limit=mobile?2560:4096;
    pixelRatio=Math.max(1,Math.min(Math.max(2,nextRatio),limit/Math.max(width,height)));
    renderer.setPixelRatio(pixelRatio);
    tileWidth=0;tileHeight=0;setTileSize(menuTarget>0||menuBlend>0.001);
    lastCropX=NaN;lastCropY=NaN;
  }
  function queueResize(){if(!resizeQueued&&renderer){resizeQueued=true;requestAnimationFrame(resize);}}
  function setTileSize(menu){
    tileMode=menu;
    const size=menu?menuSize()*1.45+40:120;
    const tw=Math.min(width,Math.ceil(size/64)*64),th=Math.min(height,Math.ceil(size/64)*64);
    if(tw===tileWidth&&th===tileHeight)return;
    tileWidth=tw;tileHeight=th;renderer.setSize(tw,th,false);
    canvas.style.width=tw+'px';canvas.style.height=th+'px';
    lastCropX=NaN;lastCropY=NaN;
  }
  function updateCrop(now){
    const wantsMenu=menuTarget>0||menuBlend>0.001;
    if(tileMode!==wantsMenu&&(!wantsMenu||now-menuChangedAt>120))setTileSize(wantsMenu);
    v.copy(group.position).project(fullCamera);
    const x=Math.round(((v.x*0.5+0.5)*width-tileWidth/2)*2)/2;
    const y=Math.round(((-v.y*0.5+0.5)*height-tileHeight/2)*2)/2;
    if(x===lastCropX&&y===lastCropY&&camera.view?.enabled)return;
    lastCropX=x;lastCropY=y;
    canvas.style.transform='translate3d('+x+'px,'+y+'px,0)';
    camera.setViewOffset(width,height,x,y,tileWidth,tileHeight);
  }

  async function start(){
    if(started||failed||reduced)return;
    started=true;
    try{
      renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
    }catch(error){failed=true;portal.classList.add('has-cube-fallback');console.warn('COSGRAL: WebGL unavailable',error);return;}
    renderer.setClearColor(0x000000,0);
    renderer.toneMapping=THREE.NeutralToneMapping;
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMappingExposure=1;
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(42,1,0.1,100);camera.position.set(0,0,5.4);
    fullCamera=camera.clone();fullCamera.updateMatrixWorld(true);
    group=new THREE.Group();scene.add(group);group.visible=false;
    pose={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
    menuFrom={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
    closeFrom={position:new THREE.Vector3(),quaternion:new THREE.Quaternion(),scale:1};
    targetQ=new THREE.Quaternion();menuQ=new THREE.Quaternion();euler=new THREE.Euler();v=new THREE.Vector3();
    corners=Array.from({length:4},()=>new THREE.Vector3());
    resize();window.addEventListener('resize',queueResize,{passive:true});
    window.visualViewport?.addEventListener('resize',queueResize,{passive:true});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;});
    canvas.addEventListener('webglcontextrestored',async()=>{
      try{
        const prev=glass;glass=await installGlassCube(THREE,renderer,scene,group,HALF,glassLook);
        if(prev){group.remove(prev);scene.remove(prev.userData.transmissionBackdrop);prev.geometry.dispose();prev.material.dispose();prev.userData.environmentTarget?.dispose();}
        tileWidth=0;resize.deviceRatio=0;queueResize();contextLost=false;
      }catch(error){portal.classList.add('has-cube-fallback');console.warn('COSGRAL: glass recovery failed',error);}
    });
    logoPose(pose);
    group.position.copy(pose.position);group.quaternion.copy(pose.quaternion);group.scale.setScalar(pose.scale);
    if(menuTarget)captureMenuPose();
    try{
      glass=await installGlassCube(THREE,renderer,scene,group,HALF,glassLook);
      portal.classList.add('has-glass-model');
    }catch(error){
      failed=true;portal.classList.add('has-cube-fallback');console.error('COSGRAL glass model could not load',error);return;
    }
    if(menuTarget&&menuBlend<0.02){logoPose(menuFrom);group.quaternion.copy(menuFrom.quaternion);}
    requestAnimationFrame(frame);
  }

  function frame(now){
    requestAnimationFrame(frame);
    const dt=Math.min(0.05,Math.max(0.001,(now-(lastTime||now-16.7))/1000));lastTime=now;
    if(document.hidden||contextLost)return;
    menuBlend+=(menuTarget-menuBlend)*(1-Math.exp(-dt*(menuTarget?4.5:7)));
    if(Math.abs(menuTarget-menuBlend)<0.0001)menuBlend=menuTarget;
    const idle=menuTarget===0&&menuBlend===0;
    portal.classList.toggle('is-active',!idle);
    if(idle&&!group.visible)return;
    const time=now/1000;logoPose(pose);
    if(menuBlend>0){
      const mb=smooth(0,1,menuBlend);screenPosition(width*0.5,height*0.49,0.36,v);
      const breathing=reduced?0:Math.sin(time*0.65);
      v.y+=breathing*0.020;
      menuQ.setFromEuler(euler.set(Math.sin(time*0.41)*0.012,Math.sin(time*0.35)*0.024,Math.sin(time*0.30)*0.009));
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
    glass.material.opacity=smooth(0,0.2,menuBlend);
    glass.material.depthWrite=glass.material.opacity>0.995;
    glass.visible=glass.material.opacity>0.008;group.visible=glass.visible;
    glass.userData.transmissionBackdrop.visible=group.visible;
    if(!group.visible){canvas.style.visibility='hidden';return;}
    if(now<effectPauseUntil)return;
    const activeMotion=Math.abs(menuTarget-menuBlend)>0.001;
    if(now-lastRenderAt<(activeMotion?14:42))return;
    lastRenderAt=now;
    updateCrop(now);canvas.style.visibility='visible';renderer.render(scene,camera);
  }

  /* Warm the model up after load so the first MENU press is instant. */
  const warm=()=>{const idle=window.requestIdleCallback||((f)=>setTimeout(f,600));idle(()=>start(),{timeout:2500});};
  if(document.readyState==='complete')warm();else window.addEventListener('load',warm,{once:true});
  window.dispatchEvent(new CustomEvent('cosgral:cube-ready'));
})();
