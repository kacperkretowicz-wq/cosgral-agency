/** Lab 05 glass/chrome material, paired with lab 01 inertia on the real page. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b),mix=THREE.MathUtils.lerp;
const url=new URL(location.href);url.searchParams.set('cube','chrome');history.replaceState(null,'',url);
const studio=window.cosgralChromeStudio={paper:0,boundary:2};
const style=document.createElement('style');
style.textContent=`
html.editorial-document .editorial-page .home-cube-portal{z-index:6}
.chrome-studio-on .editorial-hero .home-hero__title{color:#181a1a}
.chrome-studio-on .editorial-hero .home-hero__tagline,
.chrome-studio-on .editorial-hero .hero-notes,
.chrome-studio-on .editorial-hero .hero-caption,
.chrome-studio-on .editorial-hero .hero-caption__right,
.chrome-studio-on .editorial-hero .hero-scroll{color:#414644}
`;
document.head.append(style);

export function createCubeMaterialStudy(glass){
  const mat=glass.material;
  const shade=document.querySelector('.home-ambient__shade');
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
  backdrop.fragmentShader=backdrop.fragmentShader.replace('uniform float uTime;',
    'uniform float uTime;\nuniform float uChromePaper;\nuniform float uChromeBoundary;');
  backdrop.fragmentShader=backdrop.fragmentShader.replace('vec4 textSample = texture2D(uText, uv);',`
    float chromeMask=1.-smoothstep(.36,.86,1.-uv.y);
    vec3 chromeLight=vec3(.91,.905,.88)-smoothstep(.05,1.25,uv.x+uv.y*.25)*.055;
    col=mix(col,chromeLight,uChromePaper*chromeMask);
    col*=.6+.4*uChromePaper;
    float chromeSeam=smoothstep(uChromeBoundary-.26,uChromeBoundary-.025,1.-uv.y);
    col=mix(col,vec3(.03137255,.03529412,.03529412),chromeSeam);
    vec4 textSample = texture2D(uText, uv);
  `);
  backdrop.needsUpdate=true;
  let light=false,lastPaper=-1;
  return {
    update(progress,menuBlend,opacity,boundary){
      const menu=smooth(0,.2,menuBlend);
      // Lab 05's complete material curve, fitted to the visible hero interval.
      const p=Math.min(1,progress/.80);
      const metal=smooth(.15,.80,p)*(1-menu);
      const paper=smooth(.12,.82,p)*(1-menu);
      grain.value=smooth(.80,1,p)*(1-menu);
      mat.color.setHex(0xffffff);mat.attenuationColor.setHex(0xf6f9ff);mat.attenuationDistance=12;
      mat.metalness=metal;mat.transmission=Math.max(.0001,1-metal);
      mat.roughness=mix(.035,.12,metal)+grain.value*.055;
      mat.envMapIntensity=mix(1.15+paper*.3,1.6,metal);
      mat.iridescence=.08;mat.dispersion=.20;mat.thickness=.7;
      mat.clearcoat=1;mat.clearcoatRoughness=0;
      mat.opacity=opacity;mat.depthWrite=opacity>.995;glass.visible=opacity>.008;
      studio.paper=paper*opacity;backdrop.uniforms.uChromePaper.value=studio.paper;
      studio.boundary=boundary;backdrop.uniforms.uChromeBoundary.value=boundary;
      if(shade)shade.style.opacity=String(1-studio.paper);
      const nextLight=studio.paper>.5;
      if(nextLight!==light){light=nextLight;document.documentElement.classList.toggle('chrome-studio-on',light);window.dispatchEvent(new CustomEvent('cosgral:chrome-tone'));}
      if(Math.abs(studio.paper-lastPaper)>.05){lastPaper=studio.paper;window.dispatchEvent(new CustomEvent('cosgral:chrome-tone'));}
    },
    dispose(){studio.paper=0;if(shade)shade.style.opacity='';document.documentElement.classList.remove('chrome-studio-on');}
  };
}
