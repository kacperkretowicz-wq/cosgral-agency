/** Codec failure, blocked autoplay and no-WebGL checks against the local preview. */
import puppeteer from '../designkopia/references/web-audits/_audit-tmp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const mode of ['webm','missing-mp4','blocked']){
 const context=await browser.createBrowserContext(),page=await context.newPage();
 await page.setViewport({width:1200,height:900});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.evaluateOnNewDocument(mode=>{
  localStorage.removeItem('cosgral-force-motion');
  const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:get.call(this,t,...a)};
  if(mode==='webm'){
   const supports=HTMLMediaElement.prototype.canPlayType;
   HTMLMediaElement.prototype.canPlayType=function(t){return t.includes('mp4')?'':supports.call(this,t)};
  }
  if(mode==='blocked'){
   window.holdAutoplay=true;
   Object.defineProperty(HTMLMediaElement.prototype,'autoplay',{configurable:true,get(){return false},set(){}});
   const play=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){return window.holdAutoplay?Promise.reject(new DOMException('Gesture required','NotAllowedError')):play.call(this)};
   document.addEventListener('pointerdown',()=>{window.holdAutoplay=false},{capture:true,once:true});
  }
 },mode);
 if(mode==='missing-mp4'){
  await page.setRequestInterception(true);page.on('request',r=>r.url().includes('.mp4')?r.respond({status:404,body:'Not found'}):r.continue());
 }
 await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 assert.equal(await page.evaluate(()=>window.cosgralMotion.force),true);
 await page.waitForSelector('.ambient-fallback');
 assert.equal(await page.$eval('.home-cube-portal',e=>getComputedStyle(e).backgroundImage),'none');
 assert.equal(await page.$$eval('video[src]',es=>es.length),0,'No initial offscreen video fetch');
 await page.evaluate(()=>{const e=document.querySelector('.home-work video'),y=e.getBoundingClientRect().top+scrollY-innerHeight*.2;window.cosgralSmoothScroll?.lenis?.scrollTo(y,{immediate:true});window.scrollTo(0,y)});
 if(mode==='blocked'){
  await page.waitForFunction(()=>document.querySelector('.home-work video').dataset.playbackState==='blocked');
  assert.equal(await page.$$eval('video',es=>es.some(e=>e.controls)),false);
  await page.mouse.click(10,450);
 }
 await page.waitForFunction(()=>{const v=document.querySelector('.home-work video');return !v.paused&&v.currentTime>.1},{timeout:30000});
 if(mode!=='blocked')assert.ok(await page.$eval('.home-work video',e=>e.currentSrc.includes('.webm')));
 assert.equal(await page.$$eval('video',es=>es.some(e=>e.controls)),false);
 assert.deepEqual(errors,[]);console.log(`PASS ${mode}: inline playback, no native controls, no-WebGL fallback`);
 await context.close();
}}finally{await browser.close()}
