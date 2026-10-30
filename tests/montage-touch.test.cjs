const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('designkopia/cosgral-agency/portfolio-montage-reveal.js','utf8');
function setup(){
 const events={},frames=new Map();let id=0,time=1000,revealed=0;
 function classes(){const s=new Set();return {contains:k=>s.has(k),toggle(k,v){v?s.add(k):s.delete(k);},add:k=>s.add(k),remove:k=>s.delete(k)};}
 function element(tag){return {tagName:tag,style:{},dataset:{},classList:classes(),children:[],setAttribute(){},append(...c){this.children.push(...c)},remove(){},addEventListener(){},querySelector(){return this.children.find(c=>c.tagName==='canvas')},getContext(type){if(type==='webgl')return null;return {fillText(){},fillRect(){if(this.globalCompositeOperation==='destination-out')revealed++;}}}};}
 const chapter=element('section'),horizon={dataset:{settledChapter:'2'}},scroller={scrollLeft:780,clientWidth:390,querySelectorAll:()=>[{}, {},chapter,{}],addEventListener(){}};
 const body=element('body'),root={lang:'pl',classList:classes()};
 const doc={body,documentElement:root,hidden:false,getElementById:()=>chapter,querySelector:s=>s.includes('scroller')?scroller:horizon,createElement:element,addEventListener(){}};
 const win={addEventListener(k,fn){(events[k]??=[]).push(fn)}};
 const context={window:win,document:doc,innerWidth:390,innerHeight:844,matchMedia:()=>({matches:false}),performance:{now:()=>time},requestAnimationFrame:fn=>{frames.set(++id,fn);return id},cancelAnimationFrame:i=>frames.delete(i),MutationObserver:class{observe(){}}};
 vm.runInNewContext(src,context);
 const target={closest:q=>q==='#montaz'?chapter:null};
 function fire(type,touches=[],t=target){const e={touches,target:t,cancelable:true,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true}};for(const fn of events[type]||[]){fn(e);if(e.stopped)break;}return e;}
 function frame(){const f=[...frames.values()];frames.clear();time+=17;f.forEach(fn=>fn(time));}
 const finger=(x,y)=>({identifier:1,clientX:x,clientY:y});
 return {fire,frame,finger,body,horizon,get revealed(){return revealed}};
}
test('a finger paints the actual reveal, owns the drag and does not open the cube on release',()=>{
 const p=setup();assert.ok(p.body.classList.contains('pf-montage-water-active'));
 assert.equal(p.fire('touchstart',[p.finger(140,300)]).prevented,false);p.frame();assert.ok(p.revealed>0);
 const move=p.fire('touchmove',[p.finger(250,420)]);assert.ok(move.prevented&&move.stopped);p.frame();assert.ok(p.revealed>1);
 assert.ok(p.fire('touchend').prevented);assert.ok(p.fire('click').prevented);
 // A deliberate new tap must remain usable immediately after a drag.
 p.fire('touchstart',[p.finger(150,300)]);assert.equal(p.fire('touchend').prevented,false);assert.equal(p.fire('click').prevented,false);
});
test('navigation controls and transitions are not captured by the reveal',()=>{
 const p=setup(),control={closest:q=>q==='#montaz'?null:{}};
 assert.equal(p.fire('touchstart',[p.finger(20,800)],control).stopped,false);
 p.horizon.dataset.settledChapter='';p.fire('pf-horizon-state');
 assert.equal(p.body.classList.contains('pf-montage-water-active'),false);
 assert.equal(p.fire('touchstart',[p.finger(150,300)]).stopped,false);
});
test('cancelled and multi-finger gestures release the input without a ghost click block',()=>{
 const p=setup();p.fire('touchstart',[p.finger(140,300)]);p.fire('touchmove',[p.finger(250,420)]);
 p.fire('touchcancel');assert.equal(p.fire('click').prevented,false);
 p.fire('touchstart',[p.finger(140,300)]);p.fire('touchmove',[p.finger(250,420),{identifier:2,clientX:10,clientY:10}]);
 assert.equal(p.fire('touchend').prevented,false);
});
