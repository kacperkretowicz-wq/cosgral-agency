/** Start the site, then: PREVIEW_URL=http://127.0.0.1:8765/ node scripts/check-service-cards.mjs */
import puppeteer from '../designkopia/references/web-audits/_audit-tmp/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import assert from 'node:assert/strict';
const luminance=color=>{
  const [r,g,b]=color.match(/[\d.]+/g).slice(0,3).map(Number).map(c=>{
    c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
  });
  return .2126*r+.7152*g+.0722*b;
};
const browser=await puppeteer.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
  for(const width of [320,360,390,768,1440]){
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height:1000,isMobile:width<900,hasTouch:width<900});
    // Exercise the ordinary HTML/SVG interface independently of GPU availability.
    await page.evaluateOnNewDocument(()=>{
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args)};
    });
    await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.cosgralI18n?.t('services.tile3'));
    const images=await page.$$('img.service-illustration');
    assert.equal(images.length,6);
    for(const image of images){await image.evaluate(e=>e.scrollIntoView());await image.evaluate(e=>e.decode())}
    for(const lang of ['pl','en']){
      await page.evaluate(lang=>window.cosgralI18n.applyLang(lang),lang);
      const cards=await page.evaluate(()=>[...document.querySelectorAll('.art-tile')].map(card=>{
        const label=card.querySelector('.art-tile__label'),title=label.querySelector('span');
        const text=title.getBoundingClientRect(),slot=label.getBoundingClientRect(),art=card.querySelector('.art-tile__art').getBoundingClientRect();
        return {title:title.textContent,font:getComputedStyle(title).fontSize,height:Math.round(slot.height),overflow:title.scrollWidth-title.clientWidth,overlap:art.bottom-slot.top,clipped:text.bottom>slot.bottom+1,icon:!!card.querySelector('.service-card-arrow svg'),color:getComputedStyle(title).color,background:getComputedStyle(card).backgroundColor};
      }));
      assert.equal(new Set(cards.map(c=>c.font)).size,1,'Same title size');
      assert.equal(new Set(cards.map(c=>c.height)).size,1,'Aligned title areas');
      for(const card of cards){
        assert.ok(parseFloat(card.font)>=17,card.title+' is too small');
        assert.ok(card.overflow<=1,card.title+' overflows');
        assert.ok(card.overlap<=0,card.title+' overlaps its illustration');
        assert.ok(!card.clipped,card.title+' is clipped');
        assert.ok(card.icon,card.title+' has no SVG arrow');
        const a=luminance(card.color),b=luminance(card.background);
        assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,card.title+' has insufficient contrast');
      }
      assert.deepEqual(errors,[]);
      console.log(`PASS ${width}px ${lang}: six readable cards, aligned labels, contrast >= 4.5:1`);
    }
    await page.close();
  }
} finally {await browser.close()}
