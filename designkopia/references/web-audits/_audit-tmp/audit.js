const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const urls = [
  ['mashachern','https://mashachern.com/'],
  ['willvint','https://willvint.com/'],
  ['mariano','https://marianorrisesparza.com/projects'],
  ['travelagency','https://travelagency.agency/'],
  ['bicemucci','https://bicemucci.com/'],
  ['trovearchive','https://trovearchive.com/'],
  ['readymag-joser','https://readymag.website/u46566036/3033186/'],
  ['dave-green','https://dave-green.com/'],
  ['thomjohn','https://thomjohn.studio/'],
  ['readymag-sistrs','https://readymag.website/u1736040839/4184355/'],
  ['danilamel-samokat','https://danilamel.com/samokat/'],
  ['n9cra','https://n9cra.com/'],
  ['from-cm','https://from.cm/']
];
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const out = [];
  for (const [key, url] of urls) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      await sleep(3000);
      const data = await page.evaluate(() => {
        const body = getComputedStyle(document.body);
        const headings = [...document.querySelectorAll('h1,h2,h3')].map(h => (h.textContent||'').trim()).filter(Boolean).slice(0,8);
        const links = [...document.querySelectorAll('a')].map(a => (a.textContent||'').trim()).filter(t => t && t.length < 50).slice(0,15);
        const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src);
        const imgs = document.images.length;
        const scrollH = document.documentElement.scrollHeight;
        const vh = window.innerHeight;
        const fixed = [...document.querySelectorAll('*')].filter(el => getComputedStyle(el).position === 'fixed').length;
        const sticky = [...document.querySelectorAll('*')].filter(el => getComputedStyle(el).position === 'sticky').length;
        const videos = document.querySelectorAll('video').length;
        const canvas = document.querySelectorAll('canvas').length;
        const text = (document.body.innerText || '').replace(/\s+/g,' ').trim().slice(0, 700);
        const fonts = [...new Set([...document.fonts].map(f => f.family))].slice(0,12);
        return {
          title: document.title,
          bodyFont: body.fontFamily,
          bodyColor: body.color,
          bodyBg: body.backgroundColor,
          scrollH, vh, scrollScreens: +(scrollH/vh).toFixed(1),
          headings, links, imgs, fixed, sticky, videos, canvas, fonts, text,
          scriptHints: scripts.filter(s => /lenis|gsap|framer|readymag|swiper|locomotive|barba|three|jquery|webflow|cargo|spline/i.test(s)),
          platform: document.documentElement.innerHTML.includes('readymag') ? 'readymag' : (document.documentElement.innerHTML.includes('wp-content') ? 'wordpress' : 'custom')
        };
      });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await sleep(1200);
      const afterScroll = await page.evaluate(() => ({ scrollH: document.documentElement.scrollHeight, scrollY: window.scrollY }));
      data.afterScroll = afterScroll;
      out.push({ key, url, ok: true, ...data });
    } catch (e) {
      out.push({ key, url, ok: false, error: e.message });
    }
    await page.close();
  }
  await browser.close();
  require('fs').writeFileSync('C:/Users/kretowicz_k/Desktop/design/references/web-audits/_raw/puppeteer-audit.json', JSON.stringify(out, null, 2));
  console.log('ok', out.filter(x=>x.ok).length, 'fail', out.filter(x=>!x.ok).length);
})();
