const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('designkopia/cosgral-agency/portfolio-hero-sand.js','utf8').replace(/^import .*;\n/gm,'');
function unavailableContext(failAt){
  const canvases=[{style:{},hidden:false},{style:{},hidden:false}],disposed={renderer:0,geometry:0,material:0};
  let attempts=0,subscriptions=0;
  const classSet=new Set(['portfolio-page']);
  const geometry={setAttribute(){},dispose(){disposed.geometry++}};
  class Renderer{constructor(){if(++attempts===failAt)throw new Error('WebGL unavailable')}setPixelRatio(){}setClearColor(){}dispose(){disposed.renderer++}}
  class Scene{constructor(){this.objects=[]}add(o){this.objects.push(o)}traverse(fn){this.objects.forEach(fn)}}
  class Material{dispose(){disposed.material++}}
  class Mesh{constructor(geo,mat){this.geometry=geo;this.material=mat;this.instanceMatrix={}}setMatrixAt(){}}
  const THREE={WebGLRenderer:Renderer,Scene,PerspectiveCamera:class{constructor(){this.position={set(){}}}},InstancedBufferAttribute:class{},ShaderMaterial:Material,Vector2:class{},Matrix4:class{},InstancedMesh:Mesh};
  const context={THREE,createShardGeometry:()=>geometry,document:{body:{classList:{contains:k=>classSet.has(k),add:k=>classSet.add(k),remove:(...keys)=>keys.forEach(k=>classSet.delete(k))}},documentElement:{classList:{contains:()=>false}},getElementById:k=>k==='portfolio-sand-back'?canvases[0]:canvases[1]},window:{matchMedia:()=>({matches:true}),devicePixelRatio:1,addEventListener(){subscriptions++}},console:{warn(){}},Math,Float32Array};
  return {run:()=>vm.runInNewContext(source,context),canvases,disposed,get subscriptions(){return subscriptions},classSet};
}
for(const failAt of [1,2])test(`WebGL failure on sand layer ${failAt} leaves the page usable and releases completed layers`,()=>{
 const p=unavailableContext(failAt);
 assert.doesNotThrow(p.run);
 assert.ok(p.canvases.every(c=>c.hidden||c.style.display==='none'));
 assert.equal(p.subscriptions,0);
 assert.equal(p.classSet.has('is-portfolio-sand-active'),false);
 assert.deepEqual(p.disposed,{renderer:failAt-1,geometry:failAt-1,material:failAt-1});
});
