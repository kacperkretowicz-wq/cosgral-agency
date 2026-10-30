/** Run the static server before testing actual muted playback and desktop hover. */
import puppeteer from '../designkopia/references/web-audits/_audit-tmp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--blink-settings=availablePointerTypes=4,primaryPointerType=4,availableHoverTypes=2,primaryHoverType=2']});
try {
 for(const explicitReduce of [false,true]){
  const page=await browser.newPage();await page.setViewport({width:1440,height:1000});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.evaluateOnNewDocument(()=>{localStorage.removeItem('cosgral-force-motion');const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:original.call(this,t,...a)}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:8765/')+(explicitReduce?'?reduceMotion&forceMotion':''),{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ScrollTrigger?.getById('shatter-beat'));
  assert.equal(await page.evaluate(()=>window.cosgralMotion.force),!explicitReduce);
  assert.equal(await page.evaluate(()=>window.cosgralMotion.reduced),explicitReduce);
  assert.equal(await page.$('.ambient-bridge'),null);
  const jump=async selector=>page.evaluate(selector=>{const e=document.querySelector(selector),y=e.getBoundingClientRect().top+scrollY-innerHeight*.2;window.cosgralSmoothScroll?.lenis?.scrollTo(y,{immediate:true});window.scrollTo(0,y);window.ScrollTrigger.update()},selector);
  await jump('.art-tile');await page.waitForFunction(()=>+getComputedStyle(document.querySelector('.art-tile')).opacity>.99);
  const card=await page.$('.art-tile');await card.hover();
  if(!explicitReduce){
   await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('.art-tile')).scale)>1.01);
   assert.notEqual(await page.$eval('.service-illustration',e=>getComputedStyle(e).animationName),'none');
   console.log('PASS desktop full effects and hover enlargement despite OS reduced-motion');
  }else{
   assert.equal(await page.$eval('.service-illustration',e=>getComputedStyle(e).animationName),'none');
   assert.ok(parseFloat(await card.evaluate(e=>getComputedStyle(e).scale))<=1||await card.evaluate(e=>getComputedStyle(e).scale)==='none');
   console.log('PASS explicit reduceMotion takes precedence over forceMotion');
  }
  const videos=await page.$$('.home-work video');assert.equal(videos.length,4);assert.equal(await page.$$eval('video',es=>es.some(e=>e.controls)),false);
  for(let index=0;index<videos.length;index++){
   await page.evaluate(index=>{const e=document.querySelectorAll('.home-work video')[index],y=e.getBoundingClientRect().top+scrollY-innerHeight*.2;window.cosgralSmoothScroll?.lenis?.scrollTo(y,{immediate:true});window.scrollTo(0,y);window.ScrollTrigger.update()},index);
   if(!explicitReduce){
    await page.waitForFunction(index=>{const v=document.querySelectorAll('.home-work video')[index];return v.readyState>=2&&!v.paused&&v.currentTime>.05},{timeout:20000},index);
    const start=await videos[index].evaluate(v=>v.currentTime);
    await page.waitForFunction(({index,start})=>document.querySelectorAll('.home-work video')[index].currentTime>start+.05,{}, {index,start});
    console.log(`PASS portfolio video ${index+1}: decodes and advances`);
   }else{assert.equal(await videos[index].evaluate(v=>v.paused),true)}
  }
  await jump('.art-tile');
  await page.waitForFunction(()=>[...document.querySelectorAll('.home-work video')].every(v=>v.paused));
  assert.deepEqual(errors,[]);
  console.log('PASS offscreen videos pause; no page errors');await page.close();
 }
}finally{await browser.close()}
