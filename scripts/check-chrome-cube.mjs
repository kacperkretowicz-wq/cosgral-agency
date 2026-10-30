/** Verify rendered 3D motion, not only WebGL initialization or a cached poster. */
import puppeteer from '../designkopia/references/web-audits/_audit-tmp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
try{
 const page=await browser.newPage();await page.setViewport({width:1024,height:768});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.documentElement.classList.contains('has-hero-cube-frame'),{timeout:60000,polling:100});
 assert.equal(await page.evaluate(()=>window.cosgralPageMotionReady),true);
 assert.equal(await page.$$eval('[data-tone-wipe]',els=>els.length),2);
 const start=await page.evaluate(()=>({q:window.cosgralCube.group.quaternion.toArray(),time:document.getElementById('hero-3d').dataset.firstCubeFrameMs}));
 await page.waitForFunction(q=>{const actual=window.cosgralCube.group.quaternion.toArray();return actual.some((n,i)=>Math.abs(n-q[i])>.008)},{timeout:30000,polling:100},start.q);
 assert.equal(await page.$eval('.home-cube-poster',e=>+getComputedStyle(e).opacity),0);
 console.log('PASS live cube rotates at rest after first rendered frame',start.time+' ms (software renderer)');
 await page.evaluate(()=>{const y=180;window.cosgralSmoothScroll?.lenis?.scrollTo(y,{immediate:true});window.scrollTo(0,y)});
 await page.waitForFunction(()=>window.cosgralCube.debug.chrome.progress>.025,{timeout:30000,polling:100});
 assert.deepEqual(errors,[]);console.log('PASS cube responds to scroll, no browser exceptions');
}finally{await browser.close()}
