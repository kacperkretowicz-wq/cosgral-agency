const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('designkopia/cosgral-agency/portfolio-horizon.js','utf8');
test('cube transition retains the horizon until the spring settles, in both directions',()=>{
 const listeners={},frames=[],events=[],noop=()=>{};
 const classes={contains:()=>false,toggle:noop};
 const chapters=[0,1,2,3].map(i=>({getAttribute:k=>({'data-ground':i===1?'light':'dark','data-ground-style':i===2?'abyss':'','data-enter':i===2?'shock':'','data-cube-at':'.33 .42'})[k]}));
 const scroller={scrollLeft:1000,clientWidth:1000,querySelectorAll:()=>chapters,addEventListener:(k,fn)=>listeners[k]=fn};
 const canvas={dataset:{},style:{},addEventListener:noop,getContext:()=>null};
 const context2d={fillRect:noop};
 const body={classList:classes};let time=0;
 const sandbox={document:{body,hidden:false,documentElement:{classList:classes},querySelector:s=>s.includes('scroller')?scroller:canvas,createElement:()=>({getContext:()=>context2d}),addEventListener:noop},window:{innerWidth:1000,innerHeight:800,devicePixelRatio:1,addEventListener:noop,dispatchEvent:e=>events.push(e.type)},matchMedia:()=>({matches:false}),performance:{now:()=>time},requestAnimationFrame:f=>{frames.push(f);return frames.length;},cancelAnimationFrame:noop,ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}},CustomEvent:class{constructor(type){this.type=type;}}};
 vm.runInNewContext(src.replace('  resize();\n})();','  resize();window.probe={scrollState,shock};\n})();'),sandbox);
 function settle(){for(let n=0;frames.length&&n<1000;n++){time+=16.666;frames.shift()(time);}assert.equal(frames.length,0);}
 settle();assert.equal(canvas.dataset.settledChapter,'1');
 for(const destination of [2,1]){
  scroller.scrollLeft=destination*1000;listeners.scroll();assert.equal(canvas.dataset.settledChapter,'','water releases the transition on the first scroll event');
  time+=16.666;frames.shift()(time);assert.equal(canvas.dataset.settledChapter,'');
  const state=sandbox.window.probe.scrollState();assert.equal(state.shock,true);assert.equal(state.i,1);assert.ok(sandbox.window.probe.shock(state).r>=0);
  settle();assert.equal(canvas.dataset.settledChapter,String(destination));
 }
 assert.ok(events.includes('pf-horizon-state'));
});
