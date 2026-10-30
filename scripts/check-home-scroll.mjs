/** Browser regression for empty transitions, mobile browser chrome and cube scroll lag.
 * Start the static site, then run: PREVIEW_URL=http://127.0.0.1:8765/ node scripts/check-home-scroll.mjs
 * Uses the repository's existing Puppeteer installation and system Chromium.
 */
import puppeteer from '../designkopia/references/web-audits/_audit-tmp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({
  executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',
  headless:true,pipe:true,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader']
});
try {
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.home-cube-portal').classList.contains('has-cube-frame'),{timeout:60000});
  const sample=()=>page.evaluate(()=>({
    transitions:document.querySelectorAll('[data-tone-wipe]').length,
    portalHeight:document.querySelector('.home-cube-portal').clientHeight,
    backgroundHeight:document.getElementById('home-ambient').height,
    aspect:window.cosgralCube.debug.camera.aspect,
    height:document.body.scrollHeight
  }));
  const before=await sample();
  await page.setViewport({width:390,height:760,isMobile:true,hasTouch:true});
  await new Promise(resolve=>setTimeout(resolve,400));
  const after=await sample();
  assert.equal(after.transitions,0,'No empty transition sections');
  assert.equal(after.portalHeight,before.portalHeight,'Stable cube projection height');
  assert.equal(after.backgroundHeight,before.backgroundHeight,'Stable background render size');
  assert.equal(after.aspect,before.aspect,'Stable cube camera aspect');
  assert.equal(after.height,before.height,'Stable document height');
  const motion=await page.evaluate(()=>{
    scrollTo(0,180);
    return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const top=document.getElementById('uslugi').getBoundingClientRect().top+scrollY;
      const height=document.querySelector('.home-cube-portal').clientHeight;
      resolve({actual:window.cosgralCube.debug.chrome.progress,target:scrollY/Math.max(height*1.2,top-height*.12)});
    })));
  });
  // offsetTop is integer-rounded; allow half a pixel against subpixel DOM geometry.
  assert.ok(Math.abs(motion.actual/motion.target-1)*180<.5,'Cube follows native scroll without added damping');
  assert.deepEqual(errors,[],'No browser exceptions');
  console.log('PASS mobile scroll regression',JSON.stringify({before,after,motion}));
} finally {
  await browser.close();
}
