/** Regression: visible branding and startup motion even while the 3D module is delayed. */
import puppeteer from '../designkopia/references/web-audits/_audit-tmp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const failures=[];
try{
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
 await page.setRequestInterception(true);
 const held=[];
 page.on('request',request=>{
  if(request.url().includes('/home-hero-3d.js'))held.push(request);
  else if(/logo[^/]*\.png/.test(request.url()))request.abort();
  else request.continue();
 });
 const navigation=page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'}).catch(error=>{if(!page.isClosed())throw error});
 await page.waitForSelector('.home-cube-poster img');
 await page.waitForFunction(()=>document.querySelector('.home-cube-poster img').complete&&[...document.styleSheets].some(s=>s.href?.includes('editorial.css')));
 await page.screenshot({path:'/tmp/cosgral-delayed-start.png'});
 const initial=await page.evaluate(()=>{
  const logo=document.querySelector('.site-nav__logo-img'),poster=document.querySelector('.home-cube-poster img');
  const style=getComputedStyle(logo),box=logo.getBoundingClientRect(),animations=poster.getAnimations();
  return {logo:logo.tagName.toLowerCase()==='svg'&&!!logo.querySelector('image[href^="data:image/png"]')&&box.width>=36&&box.height>=36&&style.visibility!=='hidden',
    motion:animations.some(a=>a.playState==='running'),transitions:document.querySelectorAll('[data-tone-wipe]').length};
 });
 for(const [name,passed] of Object.entries({logo:initial.logo,startupMotion:initial.motion,transitions:initial.transitions===2})){
  console.log(`${passed?'PASS':'FAIL'} ${name}`);if(!passed)failures.push(name);
 }
 const startTime=await page.$eval('.home-cube-poster img',e=>e.getAnimations()[0].currentTime);
 await page.waitForFunction(start=>document.querySelector('.home-cube-poster img').getAnimations().some(a=>a.currentTime>start+100),{polling:50},startTime);
 console.log('PASS startup motion advances while 3D remains delayed');
 await page.close();await navigation;
 const full=await browser.newPage(),errors=[];full.on('pageerror',e=>errors.push(e.message));await full.setViewport({width:1440,height:1000});
 await full.evaluateOnNewDocument(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:get.call(this,t,...a)}});
 await full.bringToFront();
 await full.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await full.waitForFunction(()=>window.cosgralPageMotionReady&&window.ScrollTrigger?.getById('horizon-dark'));
 // These surfaces must follow scroll even if the tween clock has gone idle.
 await full.evaluate(()=>window.gsap.ticker.sleep());
 const effects=await full.$$('[data-tone-wipe]');
 assert.equal(effects.length,2);
 {
  for(let i=0;i<effects.length;i++){
   const sample=progress=>full.evaluate(({i,progress})=>{const trigger=window.ScrollTrigger.getById(i?'horizon-dark':'horizon-light'),y=trigger.start+(trigger.end-trigger.start)*progress;window.cosgralSmoothScroll?.lenis?.scrollTo(y,{immediate:true});window.scrollTo(0,y);window.ScrollTrigger.update()}, {i,progress});
   await sample(.2);await full.waitForFunction(i=>Number(document.querySelectorAll('[data-tone-wipe]')[i].dataset.horizonProgress)>.1,{timeout:3000,polling:50},i).catch(async error=>{console.log('STATE',await full.evaluate(()=>({hidden:document.hidden,y:scrollY,effects:[...document.querySelectorAll('[data-tone-wipe]')].map(e=>e.dataset.horizonProgress),triggers:window.ScrollTrigger.getAll().filter(t=>t.vars.id?.includes('horizon')).map(t=>({start:t.start,end:t.end,p:t.progress}))})));throw error});
   const before=await effects[i].$eval('.tone-wipe__field',e=>getComputedStyle(e).transform);
   await sample(.75);await full.waitForFunction(i=>Number(document.querySelectorAll('[data-tone-wipe]')[i].dataset.horizonProgress)>.65,{timeout:3000,polling:50},i).catch(async error=>{console.log('SCRUB STATE',await full.evaluate(()=>({hidden:document.hidden,scroll:scrollY,lenis:window.cosgralSmoothScroll?.lenis?.scroll,root:document.documentElement.className,effects:[...document.querySelectorAll('[data-tone-wipe]')].map(e=>e.dataset.horizonProgress),triggers:window.ScrollTrigger.getAll().filter(t=>t.vars.id?.includes('horizon')).map(t=>({id:t.vars.id,start:t.start,end:t.end,p:t.progress,animation:t.animation?.progress(),paused:t.animation?.paused(),target:t.animation?.targets()[0].progress}))})));throw error});
   const after=await effects[i].$eval('.tone-wipe__field',e=>getComputedStyle(e).transform);
   await sample(1);await full.waitForFunction(i=>Number(document.querySelectorAll('[data-tone-wipe]')[i].dataset.horizonProgress)>.98,{polling:50},i);
   const expected=i?'none':'invert(1)';
   await full.waitForFunction(expected=>getComputedStyle(document.querySelector('.site-nav__logo-img')).filter===expected,{polling:50},expected);
   assert.notEqual(before,after);console.log(`PASS transition ${i+1} moves without WebGL`);
  }
 }
 assert.deepEqual(errors,[]);await full.close();assert.deepEqual(failures,[],'Missing Chrome-visible effects');
}finally{await browser.close()}
