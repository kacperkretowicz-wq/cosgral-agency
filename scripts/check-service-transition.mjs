/** Start the static site, then verify scroll-driven branches and title typography. */
import puppeteer from '../designkopia/references/web-audits/_audit-tmp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--blink-settings=availablePointerTypes=4,primaryPointerType=4,availableHoverTypes=2,primaryHoverType=2']});
try{for(const width of [1440,390]){for(const reduced of [false,true]){
 const page=await browser.newPage();await page.setViewport({width,height:1000});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]);
 await page.evaluateOnNewDocument(()=>{localStorage.removeItem('cosgral-force-motion');const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:original.call(this,t,...a)}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:8765/')+(reduced?'':'?forceMotion'),{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.ScrollTrigger?.getById('shatter-beat'));
 const move=async offset=>page.evaluate(offset=>{const y=document.querySelector('.ambient-bridge').getBoundingClientRect().top+scrollY-offset;window.cosgralSmoothScroll?.lenis?.scrollTo(y,{immediate:true});window.scrollTo(0,y);window.ScrollTrigger.update()},offset);
 const sample=()=>page.$eval('.ambient-bridge__flow',e=>({transform:getComputedStyle(e).transform,opacity:+getComputedStyle(e).opacity,dash:parseFloat(getComputedStyle(e.querySelector('.ambient-bridge__lines use')).strokeDashoffset)}));
 await move(950);
 if(!reduced){await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.ambient-bridge__flow')).opacity)<.2);const before=await sample();await move(160);await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.ambient-bridge__flow')).opacity)>.8);const after=await sample();assert.ok(after.dash<before.dash);assert.notEqual(before.transform,after.transform);console.log('PASS branches draw and travel upward with scroll');}
 else{await move(400);const state=await sample();assert.equal(state.transform,'none');assert.equal(state.dash,0);console.log('PASS reduced-motion branches stay static');}
 const titles=await page.$$eval('.art-tile__label>span',els=>els.map(e=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontWeight,s.fontSize].join('|')}));assert.equal(new Set(titles).size,1);assert.deepEqual(errors,[]);console.log('PASS identical service title font metrics, no runtime errors');
 if(!reduced){await move(330);await page.evaluate(()=>document.querySelectorAll('body *').forEach(e=>{if(getComputedStyle(e).position==='fixed')e.style.visibility='hidden'}));await page.screenshot({path:`/tmp/cosgral-branches-${width}.png`});}
 await page.close();
}}}finally{await browser.close()}
