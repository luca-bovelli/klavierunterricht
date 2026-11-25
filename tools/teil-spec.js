'use strict';
/* node tools/teil-spec.js: the pictures for site/teil. The music is a placeholder for Luca's own:
   "Freude, schöner Götterfunken", the tune (the student's) over running sixteenths (the teacher's). */
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, '..', 'site', 'teil', 'assets'); fs.mkdirSync(OUT, { recursive: true });
const BEAT = 60 / 80, S = BEAT / 4;
const tune = [[76, 1], [76, 1], [77, 1], [79, 1], [79, 1], [77, 1], [76, 1], [74, 1], [72, 1], [72, 1], [74, 1], [76, 1], [76, 1.5], [74, 0.5], [74, 2], [76, 1], [76, 1], [77, 1], [79, 1]];
/* the teacher's two hands: arpeggios in contrary motion, one rising while the other falls */
const CH = { C: [36, 43, 48, 52, 55, 60, 64, 67, 69], G: [31, 38, 43, 47, 50, 55, 59, 62, 65], A: [33, 40, 45, 48, 52, 57, 60, 64, 67], Q: [31, 43, 48, 52, 55, 60, 64, 67, 69] };
const halves = ['C', 'C', 'C', 'G', 'A', 'A', 'Q', 'G', 'C', 'C'];
const tri = (i) => { i %= 16; return i <= 8 ? i : 16 - i; };
function piece(stage) {
  const out = []; let t = 0;
  for (const [m, d] of tune) { out.push([m, t * BEAT, (t + d) * BEAT - 0.03, 0]); t += d; }
  for (let i = 0; i < halves.length * 8; i++) {
    const ch = CH[halves[Math.floor(i / 8)]], a = tri(i), b = tri(i + 8);
    for (const n of new Set([a, b])) { const bass = n === 0; out.push([ch[n], i * S, (i + (bass ? 4 : 1)) * S - 0.015, stage === 3 || (stage === 2 && bass) ? 0 : 1]); }
  }
  return out;
}const HANDS = { base: '#1d1450', fields: [{ c: '#5b3fe0', x: 18, y: 30, w: 88, h: 84, stop: 10 }, { c: '#ef6aa6', x: 82, y: 22, w: 84, h: 74, stop: 8 }, { c: '#ff9ad0', x: 90, y: 82, w: 66, h: 58, stop: 4 }, { c: '#2a1a6e', x: 46, y: 78, w: 94, h: 82, stop: 14 }], hands: ['#ff8fc7', '#5b6cff'] };
const assets = {};
for (const st of [1, 2, 3]) {
  const music = { notes: piece(st), from: 0.04 };
  assets['roll-' + st] = { kind: 'roll', w: 1440, h: 600, palette: HANDS, span: [4, 38], pps: 92, music, lanes: '#08080b' };
  assets['keys-' + st] = { kind: 'keys', w: 1440, h: 150, palette: HANDS, span: [4, 38], music };
  assets['roll-p-' + st] = { kind: 'roll', w: 390, h: 420, palette: HANDS, span: [16, 36.5], pps: 74, music, lanes: '#08080b' };
  assets['keys-p-' + st] = { kind: 'keys', w: 390, h: 96, palette: HANDS, span: [16, 36.5], music };
}
assets.cover = { kind: 'cover', size: 560, id: 'rachmaninoff/op-23/5' };
assets.rach = { kind: 'roll', w: 640, h: 640, palette: HANDS, span: [9, 42], pps: 120, music: { file: 'scores/rach-gm.musicxml', from: 92 }, lanes: '#08080b' };
assets.dome = { kind: 'light', w: 1440, h: 900, palette: 'orchid', music: { file: 'scores/rach-gm.musicxml', from: 92, dur: 8 }, span: [-30, 82], scale: 0.48, fade: {} };
fs.writeFileSync(path.join(OUT, 'spec.json'), JSON.stringify({ out: '.', dpr: 2, assets }));
console.log(Object.keys(assets).join(' '));
