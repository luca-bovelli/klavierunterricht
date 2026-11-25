(function () {
  'use strict';
  const REPO = 'luca-bovelli/klavierunterricht', KEY = 'klavier-review:v1';
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  let state = { now: {}, sent: {} };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* private window */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private window */ } };
  const ROUNDS = window.DESIGNS, ALL = ROUNDS.flatMap((r) => r.options);
  const val = (id) => state.now[id] || {};
  const same = (a, b) => (a.n || 0) === (b.n || 0) && (a.p || 0) === (b.p || 0) && (a.t || '').trim() === (b.t || '').trim();
  const any = (v) => v.n || v.p || (v.t || '').trim();
  const changed = () => ALL.filter((o) => any(val(o.id)) && !same(val(o.id), state.sent[o.id] || {}));

  /* ---- stars */
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.75 5.86 6.42.83-4.72 4.43 1.2 6.36L12 17.17l-5.65 3.11 1.2-6.36-4.72-4.43 6.42-.83z" stroke-linejoin="round"/></svg>';
  function stars(id, key, name) {
    const f = el('fieldset', 'stars'), set = el('div', 'set');
    f.append(el('legend', '', name), set);
    const labels = [];
    const paint = () => { const v = val(id)[key] || 0; labels.forEach((l, i) => { l.classList.toggle('on', i < v); l.firstChild.checked = i + 1 === v; }); };
    for (let i = 1; i <= 5; i++) {
      const l = el('label'), input = el('input');
      input.type = 'radio'; input.name = id + '-' + key; input.value = i; input.setAttribute('aria-label', `${name}: ${i} of 5`);
      input.addEventListener('click', () => { const v = val(id); state.now[id] = { ...v, [key]: v[key] === i ? 0 : i }; save(); paint(); update(); });
      input.addEventListener('keydown', (e) => { if (e.key === 'Backspace' || e.key === 'Delete') { state.now[id] = { ...val(id), [key]: 0 }; save(); paint(); update(); } });
      l.append(input); l.insertAdjacentHTML('beforeend', STAR);
      l.addEventListener('pointerenter', () => labels.forEach((x, k) => x.classList.toggle('hover', k < i)));
      labels.push(l); set.append(l);
    }
    paint();
    return f;
  }

  /* ---- an option */
  function shotRow(shots, title) {
    const row = el('div', 'shots'); let sum = 0;
    for (const s of shots) {
      const b = el('button', 'shot'), img = el('img'), r = s.w / s.h;
      b.type = 'button'; b.style.setProperty('--r', r); sum += r;
      img.src = 'review/img/' + s.src; img.alt = `${title}, ${s.w < 500 ? 'phone' : 'desktop'}`; img.loading = 'lazy'; img.decoding = 'async';
      b.append(img); b.addEventListener('click', () => zoom(s, img.alt)); row.append(b);
    }
    /* the widest row (a desktop and a phone) sets the scale for every row */
    const room = 1.6 + 390 / 844 - sum;
    if (room > 0.2) { const x = el('span', 'room'); x.style.setProperty('--r', room); row.append(x); }
    return row;
  }
  function option(o) {
    const a = el('article', 'option'); a.id = o.id;
    for (const row of o.rows) a.append(shotRow(row, o.title));
    const about = el('div', 'about'), left = el('div'), right = el('div');
    left.append(el('h3', '', o.title), el('p', 'by', [o.by, o.version, o.date].filter(Boolean).join(', ')));
    if (o.idea) left.append(el('p', 'idea', o.idea));
    if (o.live) { const l = el('a', 'live', 'Open the page'); l.href = o.live; l.target = '_blank'; l.rel = 'noopener'; left.append(l); }
    const say = el('textarea', 'say'); say.rows = 1; say.placeholder = 'Feedback (optional)'; say.value = val(o.id).t || ''; say.setAttribute('aria-label', 'Feedback on ' + o.title);
    const grow = () => { say.style.height = 'auto'; say.style.height = say.scrollHeight + 'px'; };
    say.addEventListener('input', () => { state.now[o.id] = { ...val(o.id), t: say.value }; save(); grow(); update(); });
    const sent = el('p', 'sent'); sent.dataset.for = o.id;
    right.append(stars(o.id, 'n', 'Now'), stars(o.id, 'p', 'Potential'), say, sent);
    about.append(left, right); a.append(about);
    requestAnimationFrame(grow);
    return a;
  }

  /* ---- the page */
  const list = $('#list'), nav = $('#rounds');
  function render() {
    list.replaceChildren(); nav.replaceChildren();
    for (const r of ROUNDS) {
      if (!r.options.length) continue;
      const s = el('section', 'round'); s.id = r.id;
      s.append(el('h2', '', r.title)); if (r.note) s.append(el('p', '', r.note));
      r.options.forEach((o) => s.append(option(o)));
      list.append(s);
      const a = el('a', '', r.short || r.title); a.href = '#' + r.id; nav.append(a);
    }
    update();
  }
  function update() {
    const rated = ALL.filter((o) => any(val(o.id))).length, n = changed().length;
    const b = el('b', '', String(rated)); $('#count').replaceChildren(b, ` of ${ALL.length} rated` + (n ? `, ${n} not sent yet` : rated ? ', all sent' : ''));
    $('#send').disabled = $('#copy').disabled = !n;
    for (const p of document.querySelectorAll('.sent')) {
      const id = p.dataset.for, s = state.sent[id], v = val(id);
      p.textContent = s && same(s, v) && any(v) ? 'Sent' : '';
    }
  }

  /* ---- sending: a GitHub issue, already filled in */
  function text() {
    return changed().map((o) => {
      const v = val(o.id), t = (v.t || '').trim();
      return `**${o.id}** now ${v.n || '-'}/5, potential ${v.p || '-'}/5` + (t ? '\n' + t.split('\n').map((x) => '> ' + x).join('\n') : '');
    }).join('\n\n');
  }
  const day = () => new Date().toISOString().slice(0, 16).replace('T', ' ');
  function markSent() { for (const o of changed()) state.sent[o.id] = { ...val(o.id) }; save(); update(); }
  $('#send').addEventListener('click', async () => {
    const body = text(), base = `https://github.com/${REPO}/issues/new?labels=feedback&title=${encodeURIComponent('Feedback ' + day())}&body=`;
    let url = base + encodeURIComponent(body);
    if (url.length > 7500) { try { await navigator.clipboard.writeText(body); } catch (e) { /* not allowed */ } url = base + encodeURIComponent('Paste here (Ctrl+V): the ratings are in your clipboard.'); }
    window.open(url, '_blank', 'noopener');
    markSent();
    $('#count').textContent = 'GitHub opens with your ratings filled in. Press Create there.';
  });
  $('#copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(text()); $('#count').textContent = 'Copied. Paste it into the chat.'; markSent(); } catch (e) { $('#count').textContent = 'Copying is not allowed in this browser.'; } });

  /* ---- large pictures */
  const dlg = $('#zoom');
  function zoom(s, alt) { const i = $('img', dlg); i.src = 'review/img/' + s.src; i.alt = alt; i.className = s.w < 500 ? 'tall' : ''; dlg.showModal(); $('.zoom-scroll').scrollTo(0, 0); }
  dlg.addEventListener('click', (e) => { if (e.target.tagName !== 'IMG') dlg.close(); });

  render();
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }

  /* on a device with nothing kept, start from what was sent before (the issues are public) */
  if (!Object.keys(state.now).length) {
    fetch(`https://api.github.com/repos/${REPO}/issues?labels=feedback&state=all&per_page=50`).then((r) => (r.ok ? r.json() : [])).then((issues) => {
      for (const i of issues.reverse()) {
        for (const m of (i.body || '').matchAll(/\*\*([\w-]+)\*\* now (\d|-)\/5, potential (\d|-)\/5((?:\r?\n> .*)*)/g)) {
          const v = { n: +m[2] || 0, p: +m[3] || 0, t: (m[4] || '').replace(/\r?\n> /g, '\n').trim() };
          state.now[m[1]] = v; state.sent[m[1]] = { ...v };
        }
      }
      if (issues.length) { save(); render(); }
    }).catch(() => {});
  }
})();
