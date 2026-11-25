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
      input.type = 'radio'; input.name = key; input.value = i; input.setAttribute('aria-label', `${name}: ${i} of 5`);
      input.addEventListener('click', () => { const v = val(id); state.now[id] = { ...v, [key]: v[key] === i ? 0 : i }; save(); paint(); change(); });
      l.append(input); l.insertAdjacentHTML('beforeend', STAR);
      l.addEventListener('pointerenter', () => labels.forEach((x, j) => x.classList.toggle('hover', j < i)));
      labels.push(l); set.append(l);
    }
    paint();
    return f;
  }
  const word = (id) => (done(id) ? 'Sent' : open(id) ? 'Not sent' : '');
  function card(o) {
    const a = el('a', 'card'), pic = el('div', 'pic'), img = el('img'), cap = el('div', 'cap');
    a.href = '#' + o.id;
    img.src = 'review/img/' + o.rows[0][0].src; img.alt = ''; img.loading = 'lazy';
    pic.append(img); cap.append(el('h2', '', o.title), el('span', 'state', word(o.id)));
    a.append(pic, cap, el('p', 'by', o.by));
    return a;
  }

  /* ---- all designs */
  let homeY = 0, earlierOpen = false;
  function home() {
    document.title = 'Designs';
    const h = el('div', 'home fade'), grid = el('div', 'grid');
    h.append(el('h1', '', 'Designs'));
    ROUNDS[0].options.forEach((o) => grid.append(card(o)));
    h.append(grid);
    const rest = ROUNDS.slice(1);
    if (rest.length) {
      const d = el('details', 'earlier'); d.open = earlierOpen;
      d.append(el('summary', '', 'Earlier designs'));
      for (const r of rest) { const g = el('div', 'grid'); r.options.forEach((o) => g.append(card(o))); d.append(el('h3', '', r.title), g); }
      d.addEventListener('toggle', () => { earlierOpen = d.open; });
      h.append(d);
    }
    const tray = el('div', 'tray'), n = pending();
    tray.hidden = n.length < 1;
    const text = el('span', '', `${n.length} not sent`), b = el('button', 'main', n.length > 1 ? 'Send all' : 'Send');
    b.type = 'button';
    b.addEventListener('click', async () => { b.disabled = true; b.textContent = 'Sending'; try { await send(pending()); home(); } catch (e) { text.textContent = 'Could not send'; b.disabled = false; b.textContent = 'Try again'; } });
    tray.append(text, b); h.append(tray);
    app.replaceChildren(h);
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

    const rate = el('div', 'rate'), say = el('textarea', 'say'), main = el('button', 'main'), status = el('p', 'status');
    main.type = 'button'; status.setAttribute('aria-live', 'polite');
    const next = () => ALL.find((x, j) => j > i && !any(val(x.id))) || ALL.find((x) => x !== o && !any(val(x.id)));
    const refresh = () => {
      const sent = done(o.id);
      main.disabled = !any(val(o.id)) || (sent && !next());
      main.textContent = sent && next() ? 'Next design' : 'Send';
      status.textContent = sent ? 'Sent' : '';
    };
    rate.append(stars(o.id, 'n', 'Now', refresh), stars(o.id, 'p', 'Potential', refresh));
    say.placeholder = 'Feedback (optional)'; say.setAttribute('aria-label', 'Feedback'); say.value = val(o.id).t || '';
    const grow = () => { say.style.height = 'auto'; say.style.height = Math.max(96, say.scrollHeight) + 'px'; };
    say.addEventListener('input', () => { state.now[o.id] = { ...val(o.id), t: say.value }; save(); grow(); refresh(); });
    main.addEventListener('click', async () => {
      if (done(o.id)) { location.hash = next().id; return; }
      main.disabled = true; main.textContent = 'Sending';
      try { await send([o.id]); refresh(); if (!state.key) status.textContent = 'Press Create on GitHub to finish'; } catch (e) { main.disabled = false; main.textContent = 'Try again'; status.textContent = 'Could not send. Your rating is kept.'; }
    });
    p.append(rate, say, main, status);

    const body = el('div', 'one'); body.append(pics, p);
    root.append(bar, body);
    show(); refresh();
    app.replaceChildren(root);
    grow(); scrollTo(0, 0);
  }

  let last = null;
  function route() {
    const id = decodeURIComponent(location.hash.slice(1)), o = ALL.find((x) => x.id === id);
    if (last === null || last === '') homeY = last === null ? 0 : scrollY;
    last = o ? o.id : '';
    if (o) one(o); else home();
  }
  addEventListener('hashchange', route);
  document.addEventListener('click', (e) => { if (e.target.closest('.card')) homeY = scrollY; }, true);
  addEventListener('keydown', (e) => {
    if (e.target.closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
    const i = ALL.findIndex((x) => x.id === last); if (i < 0) return;
    if (e.key === 'ArrowRight' && ALL[i + 1]) location.hash = ALL[i + 1].id;
    else if (e.key === 'ArrowLeft' && ALL[i - 1]) location.hash = ALL[i - 1].id;
    else if (e.key === 'Escape') location.hash = '';
  });
  route();
})();
