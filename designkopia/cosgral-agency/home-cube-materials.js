/** Test-branch surface studies. The existing hero owns every global transform. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { createCubeFluid } from './home-cube-fluid.js?v=20261019fluid2';

const smooth = (a,b,x) => THREE.MathUtils.smoothstep(x,a,b);
const mix = THREE.MathUtils.lerp;
const modes = {chrome:'Szkło → chrom',magnetic:'Magnetyczny montaż',original:'Oryginał'};
let selected = new URL(location.href).searchParams.get('cube');
if (!Object.hasOwn(modes,selected)) selected='chrome';

// A small branch-only comparison control; selection preserves scroll and pose.
const panel=document.createElement('div');
panel.className='cube-material-preview';
panel.setAttribute('role','group');panel.setAttribute('aria-label','Wariant kostki — gałąź testowa');
const label=document.createElement('span');label.textContent='KOSTKA / TEST';panel.append(label);
for(const [mode,name] of Object.entries(modes)){
  const button=document.createElement('button');button.type='button';button.textContent=name;
  button.dataset.mode=mode;button.setAttribute('aria-pressed',String(mode===selected));
  button.addEventListener('click',()=>{
    selected=mode;
    const url=new URL(location.href);url.searchParams.set('cube',mode);history.replaceState(null,'',url);
    for(const b of panel.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.mode===selected));
  });panel.append(button);
}
document.body.append(panel);
const style=document.createElement('style');style.textContent=`
.cube-material-preview{position:fixed;bottom:18px;left:18px;z-index:10000;display:flex;align-items:center;gap:4px;max-width:calc(100vw - 36px);padding:6px;background:rgba(12,14,14,.88);border:1px solid #ffffff29;border-radius:7px;backdrop-filter:blur(16px);color:#eee;font:11px/1.2 Arial,sans-serif;pointer-events:auto}
.cube-material-preview span{padding:0 8px;font-size:9px;letter-spacing:.08em;color:#aaa}
.cube-material-preview button{appearance:none;border:1px solid transparent;border-radius:3px;padding:9px 10px;background:transparent;color:#bbb;font:inherit;cursor:pointer}
.cube-material-preview button[aria-pressed="true"]{background:#e5e5df;color:#111}
.cube-material-preview button:focus-visible{outline:2px solid #fff;outline-offset:2px}
html.editorial-document .editorial-page .home-cube-portal{z-index:6}
@media(max-width:600px){.cube-material-preview{left:10px;bottom:10px;max-width:calc(100vw - 20px);gap:0}.cube-material-preview span{display:none}.cube-material-preview button{font-size:10px;padding:10px 8px}}
`;document.head.append(style);

export async function createCubeMaterialStudy(glass,group){
  const base=glass.material;
  const initial={metalness:base.metalness,transmission:base.transmission,roughness:base.roughness,env:base.envMapIntensity,iridescence:base.iridescence,dispersion:base.dispersion,clearcoat:base.clearcoat};
  const fluid=await createCubeFluid(glass,group);
  const matte={value:0},clock={value:0},resolve={value:1};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  for(const [mat,isFluid] of [[base,false],[fluid.mesh.material,true]]){
    const previous=mat.onBeforeCompile;
    mat.onBeforeCompile=shader=>{
      previous(shader);
      shader.uniforms.uCgMatte=matte;shader.uniforms.uCgStaticTime=clock;
      shader.uniforms.uCgResolve=resolve;
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
        uniform float uCgMatte,uCgStaticTime,uCgResolve;
        float cgSurfaceHash(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
      `).replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
        float cgScreenDither=cgSurfaceHash(vec3(floor(gl_FragCoord.xy),17.));
        ${isFluid?'if(cgScreenDither<uCgResolve)discard;':'if(cgScreenDither>=uCgResolve)discard;'}
      `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
        float cgGrain=cgSurfaceHash(floor(vObjP*165.));
        float cgFootprint=max(length(dFdx(vObjP)),length(dFdy(vObjP)))*165.;
        float cgDetail=1./max(1.,cgFootprint*.55);
        roughnessFactor=clamp(roughnessFactor+(cgGrain-.5)*.34*uCgMatte*cgDetail,.015,.9);
        float cgMicroHeight=(cgGrain-.5)*.0007*uCgMatte*cgDetail;
      `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 cgDx=dFdx(-vViewPosition),cgDy=dFdy(-vViewPosition);
        vec3 cgR1=cross(cgDy,normal),cgR2=cross(normal,cgDx);
        float cgDet=dot(cgDx,cgR1);
        normal=normalize(abs(cgDet)*normal-sign(cgDet)*(dFdx(cgMicroHeight)*cgR1+dFdy(cgMicroHeight)*cgR2));
      `).replace('#include <dithering_fragment>',`#include <dithering_fragment>
        // Neutral fine static stays on the object; studio lighting still reads.
        float cgStatic=cgSurfaceHash(vec3(floor(gl_FragCoord.xy),uCgStaticTime));
        gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(cgStatic*.52+.055),uCgMatte*.16);
      `);
    };
    mat.customProgramCacheKey=()=>`cosgral-surface-static-fluid-v2-${isFluid}`;mat.needsUpdate=true;
  }
  return {
    update(progress,menuBlend,opacity,time){
      // The menu must retain its uninterrupted front face and readable links.
      const inMenu=smooth(0,.22,menuBlend);
      // Finish the material story while the cube is still clear of section 2.
      const phase=Math.min(1,progress/.29);
      const chrome=selected==='chrome'?smooth(.06,.60,phase)*(1-inMenu):0;
      matte.value=selected==='chrome'?smooth(.48,.90,phase)*(1-inMenu):0;
      clock.value=reduced?0:Math.floor(time*5);
      base.metalness=mix(initial.metalness,1,chrome);
      base.transmission=mix(initial.transmission,.0001,chrome);
      base.roughness=mix(mix(initial.roughness,.11,chrome),.43,matte.value);
      base.envMapIntensity=mix(initial.env,1.8,chrome);
      base.iridescence=initial.iridescence*(1-chrome);
      base.dispersion=initial.dispersion*(1-chrome);
      base.clearcoat=mix(initial.clearcoat,.10,matte.value);
      base.clearcoatRoughness=mix(0,.38,matte.value);
      for(const mat of [base,fluid.mesh.material]){mat.opacity=opacity;mat.depthWrite=opacity>.995;}
      const fluidActive=selected==='magnetic'&&inMenu<.999&&opacity>.008;
      fluid.update(mix(phase,1,inMenu),reduced?0:time,fluidActive&&(phase<.995||fluid.phase<.995));
      // Resolve against the surface actually returned by the worker, so a
      // fast scroll cannot reveal the GLB before the liquid has reached it.
      resolve.value=selected==='magnetic'?mix(smooth(.90,.995,Math.min(phase,fluid.phase)),1,inMenu):1;
      fluid.mesh.visible=fluidActive&&resolve.value<.9999;
      glass.visible=resolve.value>.0001&&opacity>.008;
    },
    dispose(){fluid.dispose();}
  };
}
