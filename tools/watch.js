'use strict';
/* node tools/watch.js (in the background): waits until Luca sends feedback (the review page's one-click channel, or a GitHub issue or comment),
   then until nothing more has come for 100 s, prints it all, notes it in review/received.json, exits */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const SEEN = path.join(__dirname, '..', '.feedback-seen.json'), REC = path.join(__dirname, '..', 'review', 'received.json');
const KEY = fs.readFileSync(path.join(__dirname, '..', '.feedback-key'), 'utf8').trim();
let seen = { since: new Date().toISOString(), ids: [], nt: [] };
try { seen = { ...seen, ...JSON.parse(fs.readFileSync(SEEN, 'utf8')) }; } catch (e) { /* first run */ }
const keep = () => fs.writeFileSync(SEEN, JSON.stringify(seen));
const cred = execFileSync('git', ['credential', 'fill'], { input: 'protocol=https\nhost=github.com\n\n', env: { ...process.env, GCM_INTERACTIVE: 'never', GIT_TERMINAL_PROMPT: '0' }, encoding: 'utf8' });
const token = (/^password=(.*)$/m.exec(cred) || [])[1];
const gh = async (p) => { try { const r = await fetch('https://api.github.com/repos/luca-bovelli/klavierunterricht' + p, { headers: { authorization: 'Bearer ' + token, accept: 'application/vnd.github+json', 'user-agent': 'klavierunterricht-watch' } }); return r.ok ? await r.json() : []; } catch (e) { return []; } };
const nt = async () => { try { const r = await fetch(`https://ntfy.sh/kl-${KEY}/json?poll=1&since=12h`); if (!r.ok) return []; return (await r.text()).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch (e) { return {}; } }).filter((m) => m.event === 'message' && !seen.nt.includes(m.id)); } catch (e) { return []; } };
const out = [];
async function round(withGh) {
  let n = 0;
  for (const m of await nt()) {
    seen.nt.push(m.id); n++;
    let j = null; try { j = JSON.parse(m.message); } catch (e) { /* not ours */ }
    if (!j || !Array.isArray(j.items)) continue;
    let rec = {}; try { rec = JSON.parse(fs.readFileSync(REC, 'utf8')); } catch (e) { /* none yet */ }
    for (const it of j.items) { out.push(`${new Date(m.time * 1000).toLocaleTimeString()}  ${it.id}: now ${it.n || '-'}/5, potential ${it.p || '-'}/5${it.t ? '\n    "' + it.t.replace(/\n/g, '\n     ') + '"' : ''}`); rec[it.id] = { n: it.n || 0, p: it.p || 0, at: it.at || m.time * 1000 }; }
    fs.writeFileSync(REC, JSON.stringify(rec, null, 1) + '\n');
  }
  if (withGh) {
    const a = [...(await gh('/issues?state=all&sort=created&direction=desc&per_page=20&since=' + seen.since)), ...(await gh('/issues/comments?per_page=30&since=' + seen.since))];
    for (const x of a.filter((y) => !seen.ids.includes(y.id) && !y.pull_request).reverse()) { seen.ids.push(x.id); n++; out.push(`GitHub ${x.title ? '#' + x.number + ' ' + x.title : 'comment'} by ${x.user && x.user.login}\n${x.body || ''}`); }
  }
  keep();
  return n;
}
(async () => {
  keep();
  let quiet = 0;
  for (let i = 0; ; i++) {
    const n = await round(i % 3 === 0);
    if (n && out.length) quiet = Date.now();
    if (out.length && Date.now() - quiet > 100e3) break;
    await new Promise((r) => setTimeout(r, 20000));
  }
  console.log(out.join('\n'));
})();
