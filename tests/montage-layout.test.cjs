const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('designkopia/cosgral-agency/portfolio-reelwall.js','utf8');
const random=src.slice(src.indexOf('  const rnd ='),src.indexOf('  const ease ='));
const layout=src.slice(src.indexOf('  window.__pfWallFrame'),src.indexOf('  function measure'));
const manifest=JSON.parse(fs.readFileSync('designkopia/cosgral-agency/portfolio-media/reels/manifest.json','utf8'));
const items=manifest.groups.flatMap(g=>g.items.map(i=>({aspect:Math.max(.5,Math.min(1.8,(i.w||720)/(i.h||1280)))})));
assert.equal(items.length,34);
const targets=src.slice(src.indexOf('  function targets()'),src.indexOf('  function startFlight()'));
for(const [W,H]of [[320,568],[390,844],[768,1024],[1126,827],[1920,1080],[3840,2160]]){
 test(`all 34 reels stay in view at ${W}x${H}, including focus and extreme pan`,()=>{
  const c=vm.createContext({window:{},innerWidth:W,innerHeight:H,items,base:[],active:-1,hover:-1,sx:0,sy:0});
  vm.runInContext(random+layout+targets,c);c.base=c.window.__pfWallLayout(W,H,34);
  for(const focus of [-1,...Array.from({length:34},(_,i)=>i)])for(const [sx,sy]of [[-.5,-.5],[-.5,.5],[.5,-.5],[.5,.5],[0,0]])for(const mode of ['hover','active']){
   c.sx=sx;c.sy=sy;c.active=mode==='active'?focus:-1;c.hover=mode==='hover'?focus:-1;
   const boxes=c.targets();assert.equal(boxes.length,34);
   if(mode==='active'&&focus>=0){
    const f=c.window.__pfWallFrame(W,H),aw=W-2*f.side-2*Math.min(22,W*.02),ah=H-f.top-f.bottom-2*Math.min(16,H*.02);
    const expected=Math.min(600,H*.7,ah*.92,aw*.64/(9/16));
    assert.ok(Math.abs(boxes[focus].h-expected)<.01,'every selected reel has the same large height');
   }
   for(const b of boxes){assert.ok(b.cx-b.w/2>=-0.01&&b.cy-b.h/2>=-0.01&&b.cx+b.w/2<=W+.01&&b.cy+b.h/2<=H+.01,JSON.stringify({focus,mode,b,W,H}));}
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j],ox=(a.w+b.w)/2-Math.abs(a.cx-b.cx),oy=(a.h+b.h)/2-Math.abs(a.cy-b.cy);
    assert.ok(ox<1||oy<1,JSON.stringify({focus,mode,i,j,ox,oy,W,H}));
   }
  }
 });
}
