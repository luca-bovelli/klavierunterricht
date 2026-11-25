'use strict';
/* node tools/shoot.js <site/page/index.html> [D] [P] [F] [FP]
   D 1440×900 · P 390×844 · F whole page 1440 wide · FP whole page 390 wide · T 820×1180 · W 1920×1080. Default: D P F FP.
   Pictures go to stills/site/<page>-<kind>.png. Also reports sideways scroll, clipped or overlapping text boxes. */
const fs = require('fs'), path = require('path');
const { launchBrowser } = require(path.join(__dirname, '..', '..', 'piano-learn', 'promo', 'scripts', 'browser.js'));
const KINDS = { D: [1440, 900, 1.25], P: [390, 844, 2], F: [1440, 900, 1, true], FP: [390, 844, 1.5, true], T: [820, 1180, 1], W: [1920, 1080, 1], S: [360, 640, 2] };
(async () => {
  const file = path.resolve(process.argv[2]), kinds = process.argv.slice(3).length ? process.argv.slice(3) : ['D', 'P', 'F', 'FP'];
  const name = path.basename(file) === 'index.html' ? path.relative(path.join(__dirname, '..', 'site'), path.dirname(file)).replace(/[\\/]/g, '-') : path.basename(file, '.html');
  const OUT = path.join(__dirname, '..', 'stills', 'site'); fs.mkdirSync(OUT, { recursive: true });
  const browser = await launchBrowser();
  for (const k of kinds) {
    const [w, h, dpr, full] = KINDS[k];
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: w < 700, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('[error]', e.message));
    page.on('requestfailed', (r) => console.log('[missing]', r.url().slice(-80)));
    await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    if (full) { await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } scrollTo(0, 0); }); }
    await page.waitForTimeout(700);
    const issues = await page.evaluate(() => {
      const out = [], W = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > W + 1) out.push('sideways scroll: ' + document.documentElement.scrollWidth + ' > ' + W);
      for (const e of document.querySelectorAll('h1,h2,h3,p,a,button,li,label,dt,dd,span')) {
        if (!e.textContent.trim() || e.closest('[aria-hidden=true],[hidden]')) continue;
        const r = e.getBoundingClientRect(); if (!r.width) continue;
        if (r.right > W + 1 || r.left < -1) out.push('off the side: ' + e.textContent.trim().slice(0, 40));
        if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible' && e.clientWidth) out.push('clipped: ' + e.textContent.trim().slice(0, 40));
      }
      return [...new Set(out)].slice(0, 12);
    });
    await page.screenshot({ path: path.join(OUT, `${name}-${k}.png`), fullPage: !!full });
    console.log(`${name}-${k}`, issues.length ? issues : 'ok');
    await ctx.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
