(function () {
  'use strict';
  const REPO = 'luca-bovelli/klavierunterricht', KEY = 'klavier-review:v1';
  const app = document.getElementById('app');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  let state = { now: {}, sent: {}, key: '' };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { /* private window */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private window */ } };

  /* the private link (#key=…) lets this browser send with one click; without it, GitHub's form opens */
  const k = /key=(\w{12,})/.exec(location.hash);
  if (k) { state.key = k[1]; save(); history.replaceState(null, '', location.pathname); }

  const ROUNDS = window.DESIGNS.filter((r) => r.options.length), ALL = ROUNDS.flatMap((r) => r.options);
  const val = (id) => state.now[id] || {};
  const same = (a, b) => (a.n || 0) === (b.n || 0) && (a.p || 0) === (b.p || 0) && (a.t || '').trim() === (b.t || '').trim();
  const any = (v) => !!(v.n || v.p || (v.t || '').trim());
  const open = (id) => any(val(id)) && !same(val(id), state.sent[id] || {});
  const done = (id) => any(val(id)) && same(val(id), state.sent[id] || {});
  const pending = () => ALL.filter((o) => open(o.id)).map((o) => o.id);

  /* ---- sending */
  async function post(items) {
    const parts = [[]];
    for (const it of items) {
      if (JSON.stringify([...parts[parts.length - 1], it]).length > 3400) parts.push([]);
      parts[parts.length - 1].push({ ...it, t: (it.t || '').slice(0, 3000) });
    }
    for (const p of parts.filter((x) => x.length)) {
      const r = await fetch('https://ntfy.sh/kl-' + state.key, { method: 'POST', body: JSON.stringify({ v: 1, items: p }) });
      if (!r.ok) throw new Error(r.status);
    }
  }
  function github(ids) {
    const body = ids.map((id) => { const v = val(id), t = (v.t || '').trim(); return `**${id}** now ${v.n || '-'}/5, potential ${v.p || '-'}/5` + (t ? '\n' + t.split('\n').map((x) => '> ' + x).join('\n') : ''); }).join('\n\n');
    window.open(`https://github.com/${REPO}/issues/new?labels=feedback&title=${encodeURIComponent('Feedback')}&body=${encodeURIComponent(body)}`, '_blank', 'noopener');
  }
  async function send(ids) {
    const at = Date.now();
    if (state.key) await post(ids.map((id) => ({ id, ...val(id), at }))); else github(ids);
    for (const id of ids) state.sent[id] = { ...val(id), at };
    save();
  }
  /* what was sent and never arrived goes out again (the channel forgets after half a day) */
  fetch('review/received.json?' + Date.now()).then((r) => (r.ok ? r.json() : {})).then((got) => {
    if (!state.key) return;
    const lost = Object.entries(state.sent).filter(([id, v]) => v.at && Date.now() - v.at > 3600e3 && !((got[id] || {}).at >= v.at)).map(([id, v]) => ({ id, ...v }));
    if (lost.length) post(lost).catch(() => {});
  }).catch(() => {});

  /* ---- parts */
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.75 5.86 6.42.83-4.72 4.43 1.2 6.36L12 17.17l-5.65 3.11 1.2-6.36-4.72-4.43 6.42-.83z"/></svg>';
  const ARROW = { back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' };
  function stars(id, key, name, change) {
    const f = el('fieldset', 'stars'), set = el('div'), labels = [];
    f.append(el('legend', '', name), set);
    const paint = () => { const v = val(id)[key] || 0; labels.forEach((l, i) => { l.classList.toggle('on', i < v); l.firstChild.checked = i + 1 === v; }); };
    for (let i = 1; i <= 5; i++) {
      const l = el('label'), input = el('input');
      input.type = 'radio'; input.name = id + key; input.value = i; input.setAttribute('aria-label', `${name}: ${i} of 5`);
      input.addEventListener('click', () => { const v = val(id); state.now[id] = { ...v, [key]: v[key] === i ? 0 : i }; save(); paint(); change(); });
      l.append(input); l.insertAdjacentHTML('beforeend', STAR);
      l.addEventListener('pointerenter', () => labels.forEach((x, j) => x.classList.toggle('hover', j < i)));
      labels.push(l); set.append(l);
    }
    paint();
    return f;
  }
  /* both ratings, the text and the button, the same on a card and beside a design */
  function review(o, changed) {
    const rate = el('div', 'rate'), say = el('textarea', 'say'), b = el('button', 'main');
    b.type = 'button'; say.rows = 1;
    const refresh = () => { b.disabled = !open(o.id); b.textContent = done(o.id) ? 'Sent' : 'Send'; if (changed) changed(); };
    rate.append(stars(o.id, 'n', 'Now', refresh), stars(o.id, 'p', 'Potential', refresh));
    say.placeholder = 'Feedback'; say.setAttribute('aria-label', 'Feedback on ' + o.title); say.value = val(o.id).t || '';
    const grow = () => { say.style.height = 'auto'; say.style.height = say.scrollHeight + 'px'; };
    say.addEventListener('input', () => { state.now[o.id] = { ...val(o.id), t: say.value }; save(); grow(); refresh(); });
    b.addEventListener('click', async () => {
      b.disabled = true; b.textContent = 'Sending';
      try { await send([o.id]); refresh(); } catch (e) { b.disabled = false; b.textContent = 'Try again'; }
    });
    refresh();
    return { parts: [rate, say, b], grow, refresh };
  }

  /* ---- all designs */
  let homeY = 0;
  function home() {
    document.title = 'Designs';
    const h = el('div', 'home fade'), grid = el('div', 'grid'), tray = el('div', 'tray'), text = el('span'), all = el('button', 'main', 'Send all'), cards = [];
    const count = () => { const n = pending().length; tray.hidden = n < 2; text.textContent = `${n} not sent`; };
    for (const o of ALL) {
      const c = el('article', 'card'), pic = el('a', 'pic'), img = el('img'), body = el('div', 'body'), r = review(o, count);
      pic.href = '#' + o.id; pic.setAttribute('aria-label', `${o.title} by ${o.by}, open`);
      img.src = 'review/img/' + (o.thumb || o.rows[0][0].src); img.alt = ''; img.loading = 'lazy';
      pic.append(img); body.append(...r.parts); c.append(pic, body); grid.append(c); cards.push(r);
    }
    all.type = 'button';
    all.addEventListener('click', async () => { all.disabled = true; all.textContent = 'Sending'; try { await send(pending()); all.textContent = 'Send all'; cards.forEach((r) => r.refresh()); } catch (e) { all.textContent = 'Try again'; } all.disabled = false; });
    tray.append(text, all); h.append(el('h1', '', 'Designs'), grid, tray);
    app.replaceChildren(h);
    cards.forEach((r) => r.grow()); count();
    scrollTo(0, homeY);
  }

  /* ---- one design */
  let view = innerWidth < 640 ? 'Phone' : 'Desktop';
  function one(o) {
    document.title = o.title;
    const i = ALL.indexOf(o), shots = o.rows.flat(), by = { Desktop: shots.filter((s) => s.w >= 500), Phone: shots.filter((s) => s.w < 500) };
    const kinds = Object.keys(by).filter((x) => by[x].length), root = el('div', 'fade');
    if (!kinds.includes(view)) view = kinds[0];

    const bar = el('div', 'bar'), back = el('a'), nav = el('nav');
    back.href = '#'; back.innerHTML = ARROW.back; back.append('All designs');
    for (const [icon, to, name] of [['back', ALL[i - 1], 'Previous design'], ['next', ALL[i + 1], 'Next design']]) { const a = el(to ? 'a' : 'span', to ? '' : 'off'); if (to) a.href = '#' + to.id; a.innerHTML = ARROW[icon]; a.setAttribute('aria-label', name); nav.append(a); }
    const mid = el('div', 'mid');
    if (kinds.length > 1) {
      const seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Pictures');
      const bs = kinds.map((x) => { const b = el('button', '', x); b.type = 'button'; b.addEventListener('click', () => { view = x; bs.forEach((q) => q.setAttribute('aria-pressed', q === b)); show(); }); b.setAttribute('aria-pressed', x === view); return b; });
      seg.append(...bs); mid.append(seg);
    }
    if (o.live) { const a = el('a', 'open', 'Open live page'); a.href = o.live; a.target = '_blank'; a.rel = 'noopener'; mid.append(a); }
    bar.append(back, mid, nav);

    const pics = el('div', 'pics');
    const show = () => {
      pics.className = 'pics' + (view === 'Phone' ? ' phone' : '');
      pics.replaceChildren(...by[view].map((s) => { const m = el('img'); m.src = 'review/img/' + s.src; m.width = s.w; m.height = s.h; m.alt = `${o.title}, ${view.toLowerCase()}`; return m; }));
    };

    const p = el('aside', 'panel');
    p.append(el('h1', '', o.title), el('p', 'by', [o.by, o.version].filter(Boolean).join(', ')));
    if (o.idea) p.append(el('p', 'idea', o.idea));

    const r = review(o);
    p.append(...r.parts);

    const body = el('div', 'one'); body.append(pics, p);
    root.append(bar, body);
    show();
    app.replaceChildren(root);
    r.grow(); scrollTo(0, 0);
  }

  let last = null;
  function route() {
    const id = decodeURIComponent(location.hash.slice(1)), o = ALL.find((x) => x.id === id);
    if (last === null || last === '') homeY = last === null ? 0 : scrollY;
    last = o ? o.id : '';
    if (o) one(o); else home();
  }
  addEventListener('hashchange', route);
  document.addEventListener('click', (e) => { if (e.target.closest('.pic')) homeY = scrollY; }, true);
  addEventListener('keydown', (e) => {
    if (e.target.closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
    const i = ALL.findIndex((x) => x.id === last); if (i < 0) return;
    if (e.key === 'ArrowRight' && ALL[i + 1]) location.hash = ALL[i + 1].id;
    else if (e.key === 'ArrowLeft' && ALL[i - 1]) location.hash = ALL[i - 1].id;
    else if (e.key === 'Escape') location.hash = '';
  });
  route();
})();
