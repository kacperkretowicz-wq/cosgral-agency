/**
 * Live site audit — scroll, fonts, tech hints (puppeteer).
 * Usage: node scripts/audit-site.mjs <url> [output.json]
 */
import { createRequire } from 'module';
import { writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const puppeteerPath = join(
  __dirname,
  '..',
  'references',
  'web-audits',
  '_audit-tmp',
  'node_modules',
  'puppeteer'
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = process.argv[2];
const outPath = process.argv[3];

if (!url) {
  console.error('Usage: node scripts/audit-site.mjs <url> [output.json]');
  process.exit(1);
}

let puppeteer;
try {
  puppeteer = require(puppeteerPath);
} catch {
  console.error('ERROR: puppeteer not found. Run: cd references/web-audits/_audit-tmp && npm install');
  process.exit(1);
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

let result;
try {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2500);

  const data = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const headings = [...document.querySelectorAll('h1,h2,h3')]
      .map((h) => (h.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 12);
    const links = [...document.querySelectorAll('a')]
      .map((a) => (a.textContent || '').trim())
      .filter((t) => t && t.length < 60)
      .slice(0, 20);
    const scripts = [...document.querySelectorAll('script[src]')].map((s) => s.src);
    const scrollH = document.documentElement.scrollHeight;
    const vh = window.innerHeight;
    const fixed = [...document.querySelectorAll('*')].filter(
      (el) => getComputedStyle(el).position === 'fixed'
    ).length;
    const sticky = [...document.querySelectorAll('*')].filter(
      (el) => getComputedStyle(el).position === 'sticky'
    ).length;
    const fonts = [...new Set([...document.fonts].map((f) => f.family))].slice(0, 14);
    const html = document.documentElement.innerHTML;
    let platform = 'custom';
    if (html.includes('readymag') || html.includes('Readymag')) platform = 'readymag';
    else if (html.includes('wp-content')) platform = 'wordpress';
    else if (html.includes('framer')) platform = 'framer';

    return {
      title: document.title,
      bodyFont: body.fontFamily,
      bodyColor: body.color,
      bodyBg: body.backgroundColor,
      scrollH,
      vh,
      scrollScreens: +(scrollH / vh).toFixed(2),
      headings,
      links,
      imgs: document.images.length,
      fixed,
      sticky,
      videos: document.querySelectorAll('video').length,
      canvas: document.querySelectorAll('canvas').length,
      fonts,
      text: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 900),
      scriptHints: scripts.filter((s) =>
        /lenis|gsap|framer|readymag|swiper|locomotive|barba|three|jquery|webflow|cargo|spline/i.test(s)
      ),
      platform,
    };
  });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await sleep(1000);
  const afterScroll = await page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    scrollY: window.scrollY,
  }));

  let scrollMode = 'vertical';
  if (data.scrollScreens <= 1.15 && afterScroll.scrollY < 50) {
    scrollMode = 'viewport-sections';
  } else if (data.scrollScreens > 6) {
    scrollMode = 'case-study-long';
  }

  result = {
    url,
    ok: true,
    audited_at: new Date().toISOString().slice(0, 10),
    ...data,
    afterScroll,
    inferred: {
      scroll_mode: scrollMode,
      lane:
        scrollMode === 'viewport-sections'
          ? 'editorial_readymag'
          : scrollMode === 'case-study-long'
            ? 'case_study'
            : 'commercial_vertical',
    },
  };
} catch (e) {
  result = { url, ok: false, error: String(e.message || e) };
} finally {
  await browser.close();
}

const output = outPath ? resolve(outPath) : null;
if (output) {
  writeFileSync(output, JSON.stringify(result, null, 2), 'utf-8');
  console.log('Wrote', output);
} else {
  console.log(JSON.stringify(result, null, 2));
}

process.exit(result.ok ? 0 : 1);
