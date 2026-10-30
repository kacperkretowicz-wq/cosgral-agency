const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('designkopia/cosgral-agency/portfolio-horizon.js','utf8');
function setup(){
 const events={},scrollEvents={},frames=new Map(),draws=[];let id=0,time=1000;
 const state={};const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_,n)=>n,uniform1f:(n,a)=>state[n]=a,uniform2f:(n,...a)=>state[n]=a,uniform4f:(n,...a)=>state[n]=a,drawArrays:()=>draws.push(structuredClone(state))},{get:(o,k)=>k in o?o[k]:()=>({})});
 const c=new Set(),classList={contains:k=>c.has(k),toggle:(k,v)=>v?c.add(k):c.delete(k)};
 const chapters=[0,1,0,1].map((tone,i)=>({getAttribute:n=>({'data-ground':tone?'light':'dark','data-ground-style':i===2?'abyss':'','data-enter':i===2?'shock':'','data-cube-at':'0.5 0.5','data-cube-at-m':'0.5 0.5'})[n]}));
 const scroller={scrollLeft:390,clientWidth:390,querySelectorAll:()=>chapters,addEventListener:(k,f)=>scrollEvents[k]=f};
 const canvas={dataset:{},style:{},getContext:()=>gl,addEventListener(){}};
 const window={innerWidth:390,innerHeight:844,devicePixelRatio:1,addEventListener:(k,f)=>(events[k]??=[]).push(f),dispatchEvent:e=>(events[e.type]||[]).forEach(f=>f(e))};
 const context={window,document:{body:{classList},documentElement:{classList:{contains:()=>false}},querySelector:s=>s.includes('scroller')?scroller:canvas,addEventListener(){}},matchMedia:()=>({matches:false}),performance:{now:()=>time},requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),MutationObserver:class{observe(){}},ResizeObserver:class{observe(){}},CustomEvent:class{constructor(type){this.type=type}}};
 vm.runInNewContext(src,context);
 function frame(){time+=16.667;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(f=>f(time));}
 function settle(){for(let i=0;i<1000&&frames.size;i++)frame();assert.equal(frames.size,0);}
 return {events,frames,canvas,draws,settle,move(i){scroller.scrollLeft=i*390;scrollEvents.scroll();settle();}};
}
test('the cube ground wave stays reversible and hands over only after settling',()=>{
 const p=setup();p.settle();assert.equal(p.canvas.dataset.settledChapter,'1');
 p.draws.length=0;p.move(2);assert.equal(p.canvas.dataset.settledChapter,'2');
 const forward=p.draws.filter(d=>d.mode===1).map(d=>d.shock);assert.ok(forward.length>20);assert.ok(forward[0][2]<forward.at(-1)[2]);assert.deepEqual(forward[0].slice(0,2),[195,422]);
 p.draws.length=0;p.move(1);assert.equal(p.canvas.dataset.settledChapter,'1');
 const reverse=p.draws.filter(d=>d.mode===1).map(d=>d.shock);assert.ok(reverse.length>20);assert.ok(reverse[0][2]>reverse.at(-1)[2]);assert.deepEqual(reverse[0].slice(0,2),[195,422]);
});
test('the ground renderer has no competing pointer or touch reveal',()=>{
 const p=setup();p.settle();p.move(2);
 assert.equal(p.events.pointermove,undefined);assert.equal(p.events.touchmove,undefined);assert.equal(p.frames.size,0);
});
