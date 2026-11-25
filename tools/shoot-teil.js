'use strict';
/* node tools/shoot-teil.js: site/teil at its three steps and the rest of the page */
const path = require('path');
const { launchBrowser } = require(path.join(__dirname, '..', '..', 'piano-learn', 'promo', 'scripts', 'browser.js'));
const OUT = path.join(__dirname, '..', 'stills', 'site');
(async () => {
  const b = await launchBrowser(), url = 'file:///' + path.join(__dirname, '..', 'site', 'teil', 'index.html').replace(/\\/g, '/');
  for (const [k, w, h, d] of [['D', 1440, 900, 1.25], ['P', 390, 844, 2]]) {
    const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: d, reducedMotion: 'reduce', hasTouch: w < 700 }), p = await c.newPage();
    p.on('requestfailed', (r) => console.log('[missing]', r.url().slice(-60)));
    await p.goto(url, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(OUT, `teil-${k}.png`) });
    for (const s of [2, 3]) { await p.evaluate((x) => { const e = document.getElementById('play'); scrollTo(0, (e.offsetHeight - innerHeight) * (x === 2 ? 0.48 : 0.9)); }, s); await p.waitForTimeout(500); await p.screenshot({ path: path.join(OUT, `teil-${k}${s}.png`) }); }
    await p.evaluate(() => { document.getElementById('play').style.display = 'none'; scrollTo(0, 0); }); await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(OUT, `teil-${k}L.png`), fullPage: true });
    console.log(k, await p.evaluate(() => document.documentElement.scrollWidth), w);
    await c.close();
  }
  await b.close();
})();