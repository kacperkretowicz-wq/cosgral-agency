/** Lab 05 glass/chrome material, paired with lab 01 inertia on the real page. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b),mix=THREE.MathUtils.lerp;
const url=new URL(location.href);url.searchParams.set('cube','chrome');url.searchParams.set('rev','9');history.replaceState(null,'',url);
const studio=window.cosgralChromeStudio={paper:0,boundary:2,funnel:new Float32Array([.5,.45,.18,0]),elastic:new Float32Array(2),shape:new Float32Array([2,0,.4,0]),covered:false,moving:false,synchronized:false};
const style=document.createElement('style');
style.textContent=`
html.editorial-document .editorial-page .home-cube-portal{z-index:6}
html:not(.reduce-motion) .editorial-page .editorial-runway{height:72svh}
html:not(.reduce-motion) .editorial-page .editorial-services{background:transparent}
.chrome-studio-on .editorial-hero .home-hero__title{color:#181a1a}
.chrome-studio-on .editorial-hero .home-hero__tagline,
.chrome-studio-on .editorial-hero .hero-notes,
.chrome-studio-on .editorial-hero .hero-caption,
.chrome-studio-on .editorial-hero .hero-caption__right,
.chrome-studio-on .editorial-hero .hero-scroll{color:#414644}
`;
document.head.append(style);

export function createCubeMaterialStudy(glass,initialProgress=0){
  const mat=glass.material;
  const funnel=window.cosgralChromeFunnel;
  const spring=funnel.createSpring(window.matchMedia('(prefers-reduced-motion: reduce)').matches,initialProgress);
  const shade=document.querySelector('.home-ambient__shade');
  const toneTargets=[document.querySelector('.home-hero__title'),document.querySelector('.hero-caption')].filter(Boolean);
  const grain={value:0};
  const previous=mat.onBeforeCompile;
  mat.onBeforeCompile=shader=>{
    previous(shader);
    shader.uniforms.uChromeGrain=grain;
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform float uChromeGrain;
      float cgChromeHash(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
    `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
      float cgChromeNoise=cgChromeHash(floor(vObjP*145.));
      float cgChromeFootprint=max(length(dFdx(vObjP)),length(dFdy(vObjP)))*145.;
      float cgChromeDetail=1./max(1.,cgChromeFootprint*.6);
      float cgChromeRelief=(cgChromeNoise-.5)*.00024*uChromeGrain*cgChromeDetail;
      roughnessFactor=clamp(roughnessFactor+(cgChromeNoise-.5)*.075*uChromeGrain*cgChromeDetail,0.,.95);
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      if(uChromeGrain>.001){
        vec3 cgDx=dFdx(-vViewPosition),cgDy=dFdy(-vViewPosition);
        vec3 cgR1=cross(cgDy,normal),cgR2=cross(normal,cgDx);
        float cgDet=dot(cgDx,cgR1);
        normal=normalize(abs(cgDet)*normal-sign(cgDet)*(dFdx(cgChromeRelief)*cgR1+dFdy(cgChromeRelief)*cgR2));
      }
    `);
  };
  mat.customProgramCacheKey=()=> 'cosgral-lab05-chrome-grain-v3';mat.needsUpdate=true;
  // Use the same lighting field inside the real transmission pass as outside.
  const backdrop=glass.userData.transmissionBackdrop.material;
  backdrop.uniforms.uChromePaper={value:0};
  backdrop.uniforms.uChromeBoundary={value:2};
  backdrop.uniforms.uChromeFunnelFrame={value:new THREE.Vector4(.5,.45,.18,0)};
  backdrop.uniforms.uChromeFunnelElastic={value:new THREE.Vector2()};
  backdrop.uniforms.uChromeFunnelShape={value:new THREE.Vector4(2,0,.4,0)};
  backdrop.fragmentShader=backdrop.fragmentShader.replace('uniform float uTime;',
    'uniform float uTime;\nuniform float uChromePaper;\nuniform float uChromeBoundary;\nuniform vec4 uChromeFunnelFrame;\n'+funnel.glsl);
  backdrop.fragmentShader=backdrop.fragmentShader.replace('vec2 p = uv * vec2(2.8, 2.0);',`
    vec4 funnelOptics=cgFunnelOptics(uv,uRes,uChromeFunnelFrame,uChromeBoundary);
    vec2 funnelUv=cgFunnelWarp(uv,funnelOptics,uRes,uChromeFunnelFrame);
    vec2 p=funnelUv*vec2(2.8,2.0);
  `);
  backdrop.fragmentShader=backdrop.fragmentShader.replace('vec4 textSample = cgTextSample(uv);',`
    col=cgFunnelPaint(col,uv,uRes,uChromeFunnelFrame,uChromeBoundary,uChromePaper,funnelOptics);
    col*=.6+.4*uChromePaper;
    vec4 textSample = cgTextSample(uv);
  `);
  backdrop.needsUpdate=true;
  let light=false,lastShade=-1,nextToneAt=0,lastProgress=-1;
  let metalState=smooth(.34,.62,initialProgress),materialMoving=false;
  return {
    get moving(){return spring.moving||materialMoving;},
    get pull(){return studio.elastic[0];},
    get lift(){return spring.lift;},
    update({progress,menuBlend,boundary,guard,frame,dt,inputProgress,headlineClearance=1}){
      const menu=smooth(0,.2,menuBlend);
      funnel.profile(frame,boundary,studio.shape,guard,spring.finish);
      studio.elastic.set(spring.update(frame,studio.shape,guard,dt,menu,inputProgress));
      // Let the real headline pass through pure glass before metal takes over.
      const targetMetal=smooth(.34,.62,progress)*headlineClearance*(1-menu);
      metalState=Math.min(metalState,headlineClearance);
      metalState+=(targetMetal-metalState)*(1-Math.exp(-dt*14));
      if(Math.abs(metalState-targetMetal)<.0001)metalState=targetMetal;
      materialMoving=Math.abs(metalState-targetMetal)>.0002;
      studio.moving=spring.moving||materialMoving||Math.abs(lastProgress-progress)>.0001;
      lastProgress=progress;
      const metal=metalState;
      const paper=smooth(.32,.62,progress)*(1-menu);
      grain.value=smooth(.59,.76,progress)*metal*(1-menu);
      mat.color.setHex(0xffffff);mat.attenuationColor.setHex(0xf6f9ff);mat.attenuationDistance=12;
      mat.metalness=metal;mat.transmission=metal>.995?0:1-metal;
      mat.roughness=mix(.035,.12,metal)+grain.value*.055;
      const tension=smooth(.02,.25,Math.abs(studio.elastic[0]));
      mat.envMapIntensity=mix(1.15+paper*.3,1.6,metal)+tension*.07*(1-menu);
      mat.iridescence=.08;mat.dispersion=.20;mat.thickness=.7;
      mat.clearcoat=1;mat.clearcoatRoughness=0;
      mat.opacity=1;mat.depthWrite=true;
      glass.userData.transmissionBackdrop.visible=mat.transmission>0;
      // Both passes read the same elastic state, including the final recoil.
      studio.paper=paper;backdrop.uniforms.uChromePaper.value=studio.paper;
      studio.boundary=guard;backdrop.uniforms.uChromeBoundary.value=guard;
      studio.funnel.set(frame);studio.funnel[3]*=1-menu;
      backdrop.uniforms.uChromeFunnelFrame.value.fromArray(studio.funnel);
      backdrop.uniforms.uChromeFunnelElastic.value.fromArray(studio.elastic);
      backdrop.uniforms.uChromeFunnelShape.value.fromArray(studio.shape);
      studio.covered=progress>.98&&studio.shape[0]+Math.abs(studio.elastic[0]-studio.elastic[1])+Math.abs(studio.elastic[1])+studio.shape[1]+Math.abs(studio.shape[3])<-.02;
      if(shade&&(Math.abs(lastShade-studio.paper)>.003||studio.paper===1&&lastShade!==1||studio.paper===0&&lastShade!==0)){lastShade=studio.paper;shade.style.opacity=String(1-studio.paper);}
      const now=performance.now();
      if(now<nextToneAt)return;
      nextToneAt=now+65;
      let surfaceLight=0;
      for(const target of toneTargets){
        const rect=target.getBoundingClientRect();
        if(rect.bottom>0&&rect.top<innerHeight){
          const x=(rect.left+rect.width/2)/innerWidth,y=(rect.top+rect.height/2)/innerHeight;
          const d=y-funnel.surface(x,innerWidth/innerHeight,studio.funnel,studio.shape,studio.elastic);
          surfaceLight=1-smooth(-.008,.008,d);break;
        }
      }
      const nextLight=studio.paper*surfaceLight>(light ? .44 : .56);
      if(nextLight!==light){light=nextLight;document.documentElement.classList.toggle('chrome-studio-on',light);window.dispatchEvent(new CustomEvent('cosgral:chrome-tone'));}
    },
    dispose(){spring.reset();studio.elastic.fill(0);studio.paper=0;studio.covered=false;studio.synchronized=false;if(shade)shade.style.opacity='';document.documentElement.classList.remove('chrome-studio-on');}
  };
}
