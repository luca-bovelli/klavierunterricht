'use strict';
/* Pictures drawn by Fallboard's own engine, for the site.
   node tools/assets.js <spec.json> [name …]      (run it from anywhere; on Windows from PowerShell)

   spec.json: { "out": "<folder, relative to the spec>", "dpr": 2, "assets": { "<name>": { … } } }
   Each asset has a "kind":

   light   a colour field with falling notes                                              → <name>.webp
           w, h            css px
           palette         orchid | lagoon | dusk | claret | electric | ember | sunrise | glacier | citrus | gilt | folio | moss,
                           or { base, fields:[{c,x,y,w,h,stop} ×4], hands:[right,left] }
           music           see below (leave out for the bare light)
           span            [first, last] white key shown at the left and right edge, counted from A0 = 0
                           (white(60) = 23 is middle C); leave out to fit the music
           scale           note size: the picture is drawn at w×scale and enlarged (end frame: 0.48; 1 = as in the app)
           fade            { cx, cy, rx, ry, a, b, blur }: the teaser's smooth fall to black, from a light at cx,cy
                           (0..1, y down; the end frame: cx .5 cy 1.12 rx 1.24 ry 1.06 a .65 b .45 blur 10); leave out for none
   roll    the player's roll on black: w, h, palette, span, music, pps (px a second), lanes, lines (grid colours)
   keys    the app's keyboard                                                             → <name>.webp
           w, h, span, lit: [[midi, hand] …] or "music" (keys sounding at music.from), palette for the lit colours
           shade           0..1, darkening toward the foot (0 = as in the app)
   cover   a piece's cover as Fallboard makes it                                          → <name>.png (transparent corners)
           size, id        "chopin/op-9-no-2" (the catalogue id), or own: { title, composer, sub, cat, num, seed }

   music:  { file, from, dur, only, melody, split, transpose, notes }
           file            "scores/rach-gm.musicxml" (built in) or "library/scores/mozart/k-265.mxl"
           from, dur       seconds of the piece
           only            "R" | "L"      one hand
           melody          true: hand 0 = the top voice, hand 1 = everything else;   all: 0 or 1, every note that hand
           split           midi: hand 0 = that note and above
           lead            seconds of empty air under the first note;   until: leave out what begins after this second
           notes           [[midi, start, end, hand] …] instead of a file
   hand 0 = right (the light colour), hand 1 = left (the deep one). */
const http = require('http'), fs = require('fs'), path = require('path');
const FALL = path.resolve(__dirname, '..', '..', 'piano-learn'), DIST = path.join(FALL, 'dist');
const { launchBrowser } = require(path.join(FALL, 'promo', 'scripts', 'browser.js'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.musicxml': 'application/xml', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.css': 'text/css', '.mxl': 'application/octet-stream' };
const BD = fs.readFileSync(path.join(FALL, 'promo', 'film', 'backdrop.js'), 'utf8').replace('window.Backdrop = { init, render, PALETTES };', 'window.Backdrop = { init, render, PALETTES, fade: oklchFade };');
/* the library keeps its covers to itself: let them out, and allow one for a piece it does not hold */
const PATCH = {
  '/js/library.js': (s) => s
    .replace('FB.library = { open, close, load, isOpen: () => L.open };', 'FB.library = { open, close, load, isOpen: () => L.open, cover: (e) => coverOf(e), byId: (id) => L.data.byId.get(id), entries: () => L.data.entries, palettes: PALETTES, meshOf };')
    .replace('    const album = albumOf(e);\n    const t = coverText(e);', "    const album = e.own ? { id: e.own.seed || e.own.title, own: true } : albumOf(e);\n    const t = e.own ? { main: e.own.title, sub: e.own.sub || '', num: e.own.num || '', who: e.own.composer || '', cat: e.own.cat || '' } : coverText(e);"),
};
const serve = () => new Promise((ok) => {
  const s = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    const f = path.normalize(path.join(DIST, u));
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    if (PATCH[u]) r.end(PATCH[u](fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n'))); else fs.createReadStream(f).pipe(r);
  });
  s.listen(0, '127.0.0.1', () => ok(s));
});

/* ---- in the page */
function inPage() {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const A = window.ASSET = {};
  let ENV = null, keysOf = null, rollFn = null;
  A.boot = async () => {
    for (let i = 0; i < 300 && !(window.FB && FB.debug && FB.rollGL && FB.pieceLook && FB.library && FB.debug.S.score); i++) await wait(100);
    await FB.library.load();
    if (FB.library.isOpen()) FB.library.close();
    keysOf = FB.rollGL.keys; rollFn = FB.rollGL.roll;
    FB.rollGL.keys = (env, held) => { ENV = env; return keysOf(env, held); };
    for (let i = 0; i < 60 && !ENV; i++) { dispatchEvent(new Event('resize')); FB.debug.seek(1); await wait(100); }
    await document.fonts.ready;
  };
  const NAMES = ['electric', 'ember', 'dusk', 'lagoon', 'orchid', 'sunrise', 'glacier', 'citrus', 'gilt', 'folio', 'claret', 'moss'];
  const AT = [[84, 18, 92, 86, 10], [18, 24, 88, 78, 8], [10, 8, 62, 52, 0], [58, 86, 96, 80, 14]];
  const pal = (p) => {
    if (p && p.base) return p;
    const n = p || 'orchid';
    if (Backdrop.PALETTES[n]) return Backdrop.PALETTES[n];
    const q = FB.library.palettes[NAMES.indexOf(n)];
    return { base: q[0], fields: q[1].map((c, i) => ({ c, x: AT[i][0], y: AT[i][1], w: AT[i][2], h: AT[i][3], stop: AT[i][4] })), hands: q[4] };
  };
  const whites = (m) => { let n = 0; for (let k = 21; k < m; k++) if (!FB.isBlack(k)) n++; return n; };
  const CACHE = {};
  async function load(file) {
    if (!CACHE[file]) CACHE[file] = (async () => FB.parseScore(await FB.readScoreFile(new File([await (await fetch('/' + file)).arrayBuffer()], file.split('/').pop()))))();
    return CACHE[file];
  }
  async function notesOf(m) {
    if (!m) return [];
    let ns;
    if (m.notes) ns = m.notes.map(([midi, t0, t1, hand]) => ({ midi, t0, t1, hand: hand || 0 }));
    else ns = (await load(m.file)).notes.map((n) => ({ midi: n.midi, t0: n.t0, t1: m.dry === false ? n.t1 : n.t0 + (n.b1 - n.b0) * ((n.t1 - n.t0) / Math.max(0.01, n.b1 - n.b0)), hand: n.hand, b0: n.b0, b1: n.b1 }));
    if (m.only) ns = ns.filter((n) => n.hand === (m.only === 'R' ? 0 : 1));
    /* the melody: what nothing higher sounds over as it begins (written lengths, without the pedal) */
    if (m.melody) { const top = ns.map((n) => n.hand === 0 && !ns.some((q) => q.midi > n.midi && q.b0 <= n.b0 + 0.01 && q.b1 > n.b0 + 0.02)); ns.forEach((n, i) => { n.hand = top[i] ? 0 : 1; }); }
    if (m.mine === 'R') ns.forEach((n) => { n.hand = n.hand === 0 ? 0 : 1; });
    if (m.all !== undefined) ns.forEach((n) => { n.hand = m.all; });
    if (m.split) for (const n of ns) n.hand = n.midi >= m.split ? 0 : 1;
    if (m.transpose) for (const n of ns) n.midi += m.transpose;
    if (m.until) ns = ns.filter((n) => n.t0 < m.until);
    return ns;
  }
  A.notes = notesOf;
  function rollOf(notes, t0, dur, lead) {
    const out = [];
    for (const n of notes) {
      const a = n.t0 - t0 + lead, b = n.t1 - t0 + lead;
      if (b <= 0.02 || a >= dur) continue;
      out.push(Math.max(0, Math.round(a * 100)), Math.max(5, Math.round((Math.min(b, dur) - Math.max(a, 0)) * 100)), n.midi, n.hand);
    }
    if (!out.length) out.push(Math.round(dur * 90), 5, 127, 0);
    return { end: Math.round(dur * 100), notes: out };
  }
  const url = (c) => new Promise((r) => c.toBlob((b) => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); }, 'image/webp', 0.94));
  A.light = async (s) => {
    const dpr = devicePixelRatio, p = pal(s.palette), m = s.music, k = s.scale || 0.8;
    const tmp = document.createElement('canvas');
    tmp.style.cssText = `position:fixed;left:-99999px;top:0;width:${Math.round(s.w * k)}px;height:${Math.round(s.h * k)}px`;
    document.body.append(tmp);
    FB.rollGL.thumb(tmp, { roll: rollOf(await notesOf(m), m ? m.from || 0 : 0, m ? m.dur || 8 : 8, m ? m.lead || 0 : 0), hands: p.hands, cover: { base: p.base, fields: p.fields }, span: s.span || (m ? undefined : [0, 52]), glass: false, dpr: (s.w * dpr) / Math.round(s.w * k) });
    const c = document.createElement('canvas'); c.width = Math.round(s.w * dpr); c.height = Math.round(s.h * dpr);
    const f = s.fade, src = f ? Backdrop.fade(tmp, f.cx ?? 0.5, f.cy ?? 1.12, f.rx ?? 1.24, f.ry ?? 1.06, f.a ?? 0.65, f.b ?? 0.45, (f.blur ?? 10) * dpr) : tmp;
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    tmp.remove();
    return url(c);
  };
  /* the app's player roll on black, as it looks while a piece plays: { w, h, palette, span, music, pps, lanes } */
  A.roll = async (s) => {
    const dpr = devicePixelRatio, p = pal(s.palette), c = document.createElement('canvas'), m = s.music, t = m.from || 0;
    c.width = Math.round(s.w * dpr); c.height = Math.round(s.h * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillText = () => {};
    const notes = (await notesOf(m)).sort((a, b) => a.t0 - b.t0 || a.midi - b.midi), [l, r] = s.span, ww = s.w / (r - l), bw = ww * ENV.BLACK_W, off = { classList: { toggle() {} } }, none = { left: -9, right: -9, top: -9, bottom: -9 };
    const sc = { notes, maxDur: Math.max(...notes.map((n) => n.t1 - n.t0)), measures: [], measureAt: () => 0, duration: 1e4, beatToSec: (x) => x };
    const lane = s.lanes || '#000000';
    rollFn({ ...ENV, S: { score: sc, pps: s.pps || 120, playing: false, viewT: null, meta: { hands: p.hands } }, R: { ...ENV.R, w: s.w, h: s.h }, G: { ...ENV.G, width: s.w, W: ww, left: l }, rc: g, el: { roll: c, barReadout: off, clock: off }, keyX: (x) => (FB.isBlack(x) ? (whites(x) - l) * ww - bw / 2 : (whites(x) - l) * ww), handOK: () => true, lowerT0: (x) => { let i = 0; while (i < notes.length && notes[i].t0 < x) i++; return i; }, theme: { ...ENV.theme, stage: '#000000', lane, grid: lane, 'grid-2': s.lines || lane }, progressBounds: { roll: [none, none] }, now: () => t }, t, t);
    return url(c);
  };
  A.keys = async (s) => {    const dpr = devicePixelRatio, p = pal(s.palette), c = document.createElement('canvas');
    c.width = Math.round(s.w * dpr); c.height = Math.round(s.h * dpr);
    const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillText = () => {};
    const [l, r] = s.span, ww = s.w / (r - l), bw = ww * ENV.BLACK_W;
    const keyX = (m) => (FB.isBlack(m) ? (whites(m) - l) * ww - bw / 2 : (whites(m) - l) * ww);
    let lit = new Map(Array.isArray(s.lit) ? s.lit : []);
    if (s.music && !Array.isArray(s.lit)) for (const n of await notesOf(s.music)) if (n.t0 <= (s.music.from || 0) + 0.01 && n.t1 > (s.music.from || 0) + 0.01) lit.set(n.midi, n.hand);
    keysOf({ ...ENV, S: { score: null, playing: false, meta: { hands: p.hands } }, G: { ...ENV.G, width: s.w, height: s.h, W: ww, left: l }, kc: g, keyX, pressed: new Set() }, lit);
    if (s.shade) { const sh = g.createLinearGradient(0, 0, 0, s.h); for (let i = 0; i <= 16; i++) { const t = i / 16, q = t <= 0 ? 0 : t >= 1 ? 1 : 1 / (1 + Math.exp(1 / t - 1 / (1 - t))); sh.addColorStop(t, `rgba(0,0,0,${(s.shade * q).toFixed(4)})`); } g.fillStyle = sh; g.fillRect(0, 0, s.w, s.h); }
    return url(c);
  };
  A.cover = async (s) => {
    document.querySelectorAll('.asset-cover').forEach((x) => x.remove());
    const e = s.own ? { id: 'own:' + JSON.stringify(s.own), own: s.own } : FB.library.byId(s.id);
    if (!e) throw new Error('no such piece: ' + s.id);
    const box = document.createElement('div'); box.className = 'asset-cover';
    box.style.cssText = `position:fixed;left:0;top:0;z-index:2147483647;width:${s.size}px;height:${s.size}px`;
    const mk = () => { const c = FB.library.cover(e); c.style.width = c.style.height = s.size + 'px'; c.style.display = 'block'; return c; };
    box.append(mk()); document.body.append(box);
    await wait(700); await document.fonts.ready; box.replaceChildren(mk()); await wait(300);
    return true;
  };
  A.find = (q) => FB.library.entries().filter((e) => (e.id + ' ' + e.title).toLowerCase().includes(q.toLowerCase())).slice(0, 40).map((e) => e.id + '  ' + e.title);
}

(async () => {
  const specFile = path.resolve(process.argv[2] || ''), want = process.argv.slice(3);
  const find = process.argv[2] === 'find';
  const spec = find ? { assets: {} } : JSON.parse(fs.readFileSync(specFile, 'utf8').replace(/^﻿/, ''));
  const OUT = find ? '' : path.resolve(path.dirname(specFile), spec.out || '.');
  if (!find) fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), browser = await launchBrowser(), base = `http://127.0.0.1:${srv.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: spec.dpr || 2 });
  await ctx.addInitScript(() => { try { localStorage.setItem('fallboard:v1', JSON.stringify({ last: 'chopin-op23', view: 'roll', hand: 'both', speed: 1, recent: [] })); } catch (e) { /* blocked */ } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('[error]', e.message));
  await page.goto(base, { waitUntil: 'load' });
  await page.addScriptTag({ content: BD }); await page.evaluate(inPage); await page.evaluate(() => ASSET.boot());
  if (find) console.log((await page.evaluate((q) => ASSET.find(q), want.join(' '))).join('\n'));
  for (const [name, s] of Object.entries(spec.assets)) {
    if (want.length && !want.includes(name)) continue;
    try {
      if (s.kind === 'cover') {
        await page.evaluate((x) => ASSET.cover(x), s);
        await page.addStyleTag({ content: 'html,body{background:transparent!important} body>*:not(.asset-cover){visibility:hidden!important} .asset-cover,.asset-cover *{visibility:visible!important}' });
        await page.screenshot({ path: path.join(OUT, name + '.png'), clip: { x: 0, y: 0, width: s.size, height: s.size }, omitBackground: true });
      } else {
        const d = await page.evaluate(([k, x]) => ASSET[k](x), [s.kind, s]);
        fs.writeFileSync(path.join(OUT, name + '.webp'), Buffer.from(d.split(',')[1], 'base64'));
      }
      console.log(name);
    } catch (e) { console.log('[fail]', name, e.message.slice(0, 300)); }
  }
  await browser.close(); srv.close();
})().catch((e) => { console.error(e); process.exit(1); });
