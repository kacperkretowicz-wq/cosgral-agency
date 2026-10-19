/** Test-branch surface studies. The existing hero owns every global transform. */
import * as THREE from './vendor/three-0.170.0.module.min.js';
import { makeOctants } from './home-cube-fragments.js';

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
@media(max-width:600px){.cube-material-preview{left:10px;bottom:10px;max-width:calc(100vw - 20px);gap:0}.cube-material-preview span{display:none}.cube-material-preview button{font-size:10px;padding:10px 8px}}
`;document.head.append(style);

export function createCubeMaterialStudy(glass,group){
  const base=glass.material;
  const initial={metalness:base.metalness,transmission:base.transmission,roughness:base.roughness,env:base.envMapIntensity,iridescence:base.iridescence,dispersion:base.dispersion};
  const pieces=makeOctants(glass.geometry,base);
  const meshes=[glass,...pieces];
  for(const piece of pieces){
    // Build inward, inside the existing silhouette, rather than moving the hero.
    const home=piece.userData.home;
    piece.userData.start=new THREE.Vector3(-home.z*.72,home.x*.72,-home.y*.72);
    piece.visible=false;group.add(piece);
  }
  const originalBounds=glass.geometry.boundingBox.clone();
  const bounds=new THREE.Box3(),partBounds=new THREE.Box3();
  const fit=new THREE.Vector3(1,1,1);
  return {
    update(progress,menuBlend,opacity){
      // The menu must retain its uninterrupted front face and readable links.
      const inMenu=smooth(0,.22,menuBlend);
      const chrome=selected==='chrome'?smooth(.15,.80,progress)*(1-inMenu):0;
      const assembly=selected==='magnetic'&&progress<.50&&inMenu<.999;
      for(const mesh of meshes){
        const mat=mesh.material;
        mat.metalness=mix(initial.metalness,1,chrome);
        // A nonzero floor retains one transmission shader throughout the scrub.
        mat.transmission=mix(initial.transmission,.0001,chrome);
        mat.roughness=mix(initial.roughness,.12,chrome);
        mat.envMapIntensity=mix(initial.env,1.6,chrome);
        mat.iridescence=initial.iridescence*(1-chrome);
        mat.dispersion=initial.dispersion*(1-chrome);
        mat.opacity=opacity;mat.depthWrite=opacity>.995;
      }
      glass.visible=!assembly&&opacity>.008;
      bounds.makeEmpty();
      pieces.forEach((piece,i)=>{
        piece.visible=assembly&&opacity>.008;
        if(!assembly)return;
        const t=mix(smooth(.02+i*.035,.25+i*.035,progress),1,inMenu);
        const free=1-t,a=i*2.399;
        piece.position.copy(piece.userData.start).lerp(piece.userData.home,t);
        piece.rotation.set(free*Math.sin(a)*.28,free*Math.cos(a)*.32,free*Math.sin(a*.7)*.18);
        piece.scale.setScalar(.48+.52*t);piece.updateMatrix();
        partBounds.copy(piece.geometry.boundingBox).applyMatrix4(piece.matrix);bounds.union(partBounds);
      });
      if(assembly){
        // Fit every vertex into the original local bounds; the hero's global
        // scale, camera crop, position and rotation are never changed here.
        fit.set(1,1,1);
        for(const axis of ['x','y','z']){
          if(bounds.max[axis]>originalBounds.max[axis])fit[axis]=Math.min(fit[axis],originalBounds.max[axis]/bounds.max[axis]);
          if(bounds.min[axis]<originalBounds.min[axis])fit[axis]=Math.min(fit[axis],originalBounds.min[axis]/bounds.min[axis]);
        }
        const factor=Math.min(fit.x,fit.y,fit.z);
        for(const piece of pieces){piece.position.multiplyScalar(factor);piece.scale.multiplyScalar(factor);}
      }
    },
    dispose(){for(const piece of pieces){group.remove(piece);piece.geometry.dispose();piece.material.dispose();}}
  };
}
