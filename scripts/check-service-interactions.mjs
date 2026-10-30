/** Start the static site, then run this desktop/motion smoke test. */
import puppeteer from '../designkopia/references/web-audits/_audit-tmp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--blink-settings=availablePointerTypes=4,primaryPointerType=4,availableHoverTypes=2,primaryHoverType=2']});
try{for(const reduced of [false,true]){
 const page=await browser.newPage();await page.setViewport({width:1440,height:1000});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:reduced?'reduce':'no-preference'}]);
 await page.evaluateOnNewDocument(()=>{localStorage.removeItem("cosgral-force-motion");const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:original.call(this,t,...a)}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.PREVIEW_URL||'http://127.0.0.1:8765/')+(reduced?'?reduceMotion':''),{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>document.querySelector('.art-tile').scrollIntoView({block:'center',behavior:'instant'}));
 await page.waitForFunction(()=>document.querySelector('.art-tile').getBoundingClientRect().top<900);
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.art-tile')).opacity==='1');
 await page.waitForFunction(()=>window.ScrollTrigger?.getById('shatter-beat') || document.documentElement.classList.contains('reduce-motion'));

 const card=await page.$('.art-tile');const box=await card.boundingBox();
 if(!reduced){await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5);await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('.art-tile')).getPropertyValue('--art-x'))>0);console.log('PASS pointer parallax');}
 await card.click();await page.waitForSelector('.services-art-grid.is-exploded');
 assert.equal(await card.evaluate(e=>e.getAttribute('aria-expanded')),'true');
 assert.ok(await page.$eval('.services-explode__title',e=>e.textContent.trim()));
 assert.ok(await page.$eval('.services-explode__lead',e=>parseFloat(getComputedStyle(e).fontSize)>=16));
 assert.equal(await page.$eval('.services-explode__list li',e=>getComputedStyle(e,'::before').content),'none');
 assert.equal(await page.$eval('.services-explode__lead',e=>getComputedStyle(e).color),'rgb(225, 228, 231)');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.services-art-grid').classList.contains('is-exploded'));
 if(reduced){assert.equal(await page.$eval('.service-illustration',e=>getComputedStyle(e).animationName),'none');console.log('PASS reduced-motion artwork is static');}
 assert.deepEqual(errors,[]);console.log(`PASS open/close, Escape and no page errors (${reduced?'reduced':'normal'})`);await page.close();
}}finally{await browser.close();}
