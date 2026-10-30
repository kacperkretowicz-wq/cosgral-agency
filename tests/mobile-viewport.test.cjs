const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('designkopia/cosgral-agency/home-a956271/mobile-viewport.js','utf8');
function setup(){
  const values=new Map(),events={};let mobile=true;
  const root={clientWidth:390,style:{setProperty:(k,v)=>values.set(k,v),removeProperty:k=>values.delete(k)}};
  const window={innerHeight:844,addEventListener:(k,f)=>events[k]=f};
  vm.runInNewContext(source,{document:{documentElement:root},window,matchMedia:()=>({matches:mobile})});
  return {values,resize(w,h,isMobile=true){root.clientWidth=w;window.innerHeight=h;mobile=isMobile;events.resize();}};
}
test('toolbar and keyboard changes preserve the mobile layout height',()=>{
  const p=setup();assert.equal(p.values.get('--stable-vh'),'8.44px');
  p.resize(390,760);assert.equal(p.values.get('--stable-vh'),'8.44px');
  p.resize(390,420);assert.equal(p.values.get('--stable-vh'),'8.44px');
});
test('rotation updates height and desktop returns to CSS viewport units',()=>{
  const p=setup();p.resize(844,390);assert.equal(p.values.get('--stable-vh'),'3.9px');
  p.resize(1200,800,false);assert.equal(p.values.has('--stable-vh'),false);
});
