/** Clear glass to polished chrome, against one continuous dark backdrop. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b),mix=THREE.MathUtils.lerp;
const studio=window.cosgralChromeStudio={paper:0,covered:false,moving:false,synchronized:false};

export function createCubeMaterialStudy(glass,initialProgress=0){
  const mat=glass.material;
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
      float cgChromeRelief=(cgChromeNoise-.5)*.00002*uChromeGrain*cgChromeDetail;
      roughnessFactor=clamp(roughnessFactor+(cgChromeNoise-.5)*.015*uChromeGrain*cgChromeDetail,0.,.95);
    `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
      if(uChromeGrain>.001){
        vec3 cgDx=dFdx(-vViewPosition),cgDy=dFdy(-vViewPosition);
        vec3 cgR1=cross(cgDy,normal),cgR2=cross(normal,cgDx);
        float cgDet=dot(cgDx,cgR1);
        normal=normalize(abs(cgDet)*normal-sign(cgDet)*(dFdx(cgChromeRelief)*cgR1+dFdy(cgChromeRelief)*cgR2));
      }
    `);
  };
  mat.customProgramCacheKey=()=> 'cosgral-studio-reflection-v6';mat.needsUpdate=true;
  mat.color.setHex(0xffffff);mat.attenuationColor.setHex(0xf6f9ff);mat.attenuationDistance=12;
  mat.dispersion=.20;mat.thickness=.7;mat.clearcoat=1;mat.opacity=1;mat.depthWrite=true;
  let metalState=smooth(.34,.62,initialProgress),materialMoving=false;
  return {
    get moving(){return materialMoving;},
    update({progress,menuBlend,dt}){
      const menu=smooth(0,.2,menuBlend);
      const targetMetal=smooth(.34,.62,progress)*(1-menu);
      metalState+=(targetMetal-metalState)*(1-Math.exp(-dt*14));
      if(Math.abs(metalState-targetMetal)<.0001)metalState=targetMetal;
      materialMoving=Math.abs(metalState-targetMetal)>.0002;
      studio.moving=materialMoving;
      const metal=metalState;
      grain.value=smooth(.59,.76,progress)*metal*(1-menu)*.38;
      mat.metalness=metal;mat.transmission=metal>.995?0:1-metal;
      mat.roughness=mix(.035,.105,metal)+grain.value*.018;
      mat.envMapIntensity=mix(1.15,1.6,metal);
      mat.iridescence=mix(.08,.016,metal);
      mat.clearcoatRoughness=mix(.015,.055,metal);
      glass.userData.transmissionBackdrop.visible=mat.transmission>0;
    },
    dispose(){studio.moving=false;studio.synchronized=false;document.documentElement.classList.remove('chrome-studio-on','is-hero-cube-focus');}
  };
}
