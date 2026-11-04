/* PulseED — user interface. Plain DOM + template strings; every user-entered value goes through esc(). */
(function (PE) {
  'use strict';
  const U = PE.util, D = PE.domain, S = PE.store;
  const esc = U.esc;
  const UI = (PE.ui = {});
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ------------------------------------------------------------------ icons (inline, offline-safe)
  const P = {
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10zM3 12h4l2-3 3 6 2-3h7',
    bed: 'M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5a1.5 1.5 0 1 0 0-.01',
    syringe: 'M18 2l4 4M17 3l4 4-11 11H6v-4zM14 6l4 4M6 18l-4 4M9 11l2 2',
    users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
    chart: 'M3 3v18h18M7 15l4-4 3 3 6-6',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    plus: 'M12 5v14M5 12h14',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    belloff: 'M13.7 21a2 2 0 0 1-3.4 0M18.6 13A17 17 0 0 1 18 8M6.3 6.3A6 6 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.3-5M1 1l22 22',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    eyeoff: 'M17.9 17.9A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 5-5.9M9.9 4.2A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22',
    moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
    sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
    clip: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9zM8 12h8M8 16h5',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    alert: 'M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01',
    check: 'M20 6L9 17l-5-5',
    door: 'M13 4h3a2 2 0 0 1 2 2v14M2 20h3M13 20h9M10 12v.01M13 4.6v16.8L5 20V5.5a1 1 0 0 1 .8-1z',
    edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.4-4.4',
    x: 'M18 6L6 18M6 6l12 12',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
    undo: 'M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13',
    logo: 'M3 12h4l3-8 4 16 3-8h4',
  };
  const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;
  UI.ic = ic;

  // ------------------------------------------------------------------ small helpers
  const st = () => S.settings;
  const now = () => Date.now();
  const nm = p => (S.device.privacy ? U.initials(p.name) : esc(p.name));
  const ctasCls = c => ({ 'CTAS 1': 'c1', 'CTAS 2': 'c2', 'CTAS 3': 'c3', 'CTAS 4': 'c4', 'CTAS 5': 'c5' }[c] || 'c0');
  const ctasB = c => `<span class="ctas ${ctasCls(c)}">${esc(c === 'Other' ? 'CTAS ?' : c)}</span>`;
  const TIMING_ICON = { overdue: 'alert', dueSoon: 'clock', ok: 'check', continuous: 'heart', noTarget: 'alert' };
  const timingB = t => `<span class="tb t-${t.state}">${ic(TIMING_ICON[t.state] || 'clock')}${esc(t.label || '')}</span>`;
  const waitB = w => `<span class="wait w-${w.level}">${w.level !== 'ok' ? ic('alert') : ''}${U.dur(w.mins)}</span>`;
  const pill = (txt, tone = '') => `<span class="pill ${tone}">${esc(txt)}</span>`;
  const urnLink = p => `<button class="urn" data-act="open" data-id="${esc(p.id)}" title="Open patient record">${esc(p.urn)}</button>`;
  const btn = (act, id, label, cls = '', icon = '') => `<button class="btn sm ${cls}" data-act="${act}" data-id="${esc(id)}">${icon ? ic(icon) : ''}<span>${label}</span></button>`;
  const procTone = s => ({ Ready: 'green', 'In Progress': 'blue', Deferred: 'grey', Done: 'green', Cancelled: 'grey' }[s] || 'amber');
  const empty = (msg, cols) => `<tr><td class="empty" colspan="${cols}">${esc(msg)}</td></tr>`;
  const searchBox = (key, ph) => `<label class="search">${ic('search')}<input type="search" data-filter="${key}" placeholder="${esc(ph)}" value="${esc(UI.vs[key] || '')}" aria-label="${esc(ph)}"></label>`;
  const selectF = (key, label, opts) => `<label class="fsel"><span class="sr">${esc(label)}</span><select data-filter="${key}" aria-label="${esc(label)}">${opts.map(o => `<option value="${esc(o[0])}"${(UI.vs[key] || '') === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select></label>`;
  const matches = (p, q) => !q || [p.urn, p.name, p.encounterId, p.diagnosis, p.physician, p.team].some(x => U.key(x).includes(U.key(q)));
  const active = () => D.activePatients(S.state);
  UI.lists = () => {
    const s = st(), t = now(), a = active();
    const vit = a.filter(p => p.workflows.vitals.active).sort(D.byVitalsUrgency(s, t));
    const bed = a.filter(p => p.workflows.bed.active).sort((x, y) => D.bedWait(y, s, t).mins - D.bedWait(x, s, t).mins);
    const proc = a.filter(p => p.workflows.procedure.active).sort((x, y) => D.procWait(y, s, t).mins - D.procWait(x, s, t).mins);
    const overdue = vit.filter(p => D.vitalsTiming(p, s, t).state === 'overdue');
    const dueSoon = vit.filter(p => D.vitalsTiming(p, s, t).state === 'dueSoon');
    const ctas1 = a.filter(p => p.ctas === 'CTAS 1');
    const noWf = a.filter(p => !D.activeWfs(p).length);
    return { a, vit, bed, proc, overdue, dueSoon, ctas1, noWf };
  };

  UI.vs = { };
  UI.view = 'dashboard';

  // ------------------------------------------------------------------ shell
  const NAV = [
    ['dashboard', 'Main Dashboard', 'grid'], ['vitals', 'Vitals Monitoring', 'heart'], ['bed', 'Awaiting ED Bed', 'bed'],
    ['procedure', 'Awaiting Procedure', 'syringe'], ['patients', 'All Patients', 'users'], ['analytics', 'Admin & SPC Analytics', 'chart'],
    ['audit', 'Event Audit Trail', 'clock'], ['settings', 'Settings', 'sliders'],
  ];
  // The detailed view (analytics, audit trail, exports) is for Charge Nurses, ED Leaders and Admins.
  const LEADER_VIEWS = ['analytics', 'audit'];
  const canSee = view => !LEADER_VIEWS.includes(view) || D.isSupervisor(S.user);
  UI.canSee = canSee;

  UI.mount = () => {
    document.getElementById('app').innerHTML = `
      <div id="modeBar"></div>
      <header class="top">
        <div class="brand">
          <div class="logo">${ic('logo')}</div>
          <div><h1>PulseED <span class="sub">ED Reassessment &amp; Flow Station</span></h1><p id="siteLine"></p></div>
        </div>
        <div class="tools">
          <span id="syncChip" class="chip"></span>
          <span id="clock" class="chip mono" aria-live="off"></span>
          <button class="ibtn" data-act="privacy" id="privBtn"></button>
          <button class="ibtn" data-act="sound" id="soundBtn"></button>
          <button class="ibtn" data-act="theme" id="themeBtn"></button>
          <button class="btn amber" data-act="handoff">${ic('clip')}<span>Shift Handoff (SBAR)</span></button>
          <button class="chip user" data-act="lock" id="userChip" title="Lock station / switch user"></button>
          <button class="btn primary" data-act="new">${ic('plus')}<span>New Patient Entry</span></button>
        </div>
      </header>
      <div id="alertBar" role="alert"></div>
      <div class="body">
        <aside id="side"></aside>
        <main id="main" tabindex="-1"><div id="viewHead"></div><div id="viewBody"></div></main>
      </div>
      <div id="modalRoot"></div>
      <div id="toasts" aria-live="polite"></div>
      <div id="datalists"></div>`;
    document.addEventListener('click', onClick);
    document.addEventListener('input', onFilter);
    document.addEventListener('change', onFilter);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') UI.closeTopModal(true); });
  };

  UI.applyTheme = () => { document.documentElement.dataset.theme = S.device.theme === 'dark' ? 'dark' : 'light'; };

  UI.renderChrome = () => {
    const L = UI.lists();
    const demo = S.device.mode === 'demo';
    $('#modeBar').innerHTML = demo
      ? `<div class="modebar demo">${ic('shield')}<b>TRAINING / DEMO MODE</b> — synthetic data only. Never enter real patients here. <a class="link" href="quick-guide.html" target="_blank" rel="noopener">Quick guide</a> · <button class="link" data-act="switchmode">Switch to live mode</button></div>`
      : '';
    $('#siteLine').textContent = `${st().siteName} · ${S.device.deviceName || st().stationName}`;
    const ss = S.adapter ? S.adapter.status() : { ok: false, label: '…' };
    const sync = $('#syncChip');
    sync.className = 'chip ' + (S.error ? 'bad' : ss.ok ? 'ok' : 'bad');
    sync.innerHTML = `<i class="dot"></i>${esc(S.error ? 'Sync problem' : ss.label)}`;
    sync.title = S.error || ss.detail || '';
    $('#privBtn').innerHTML = ic(S.device.privacy ? 'eyeoff' : 'eye');
    $('#privBtn').title = S.device.privacy ? 'Privacy screen ON — names shown as initials. Click to show names.' : 'Show initials only (privacy screen for public-facing displays)';
    $('#privBtn').classList.toggle('on', !!S.device.privacy);
    $('#soundBtn').innerHTML = ic(S.device.sound ? 'bell' : 'belloff');
    $('#soundBtn').title = S.device.sound ? 'Audio alerts ON (click to mute)' : 'Audio alerts MUTED — overdue patients will not chime';
    $('#soundBtn').classList.toggle('warn', !S.device.sound);
    $('#themeBtn').innerHTML = ic(S.device.theme === 'dark' ? 'sun' : 'moon');
    $('#themeBtn').title = S.device.theme === 'dark' ? 'Day mode' : 'Night mode';
    $('#userChip').innerHTML = S.user ? `${ic('lock')}<span>${esc(S.user.name)} · ${esc(S.user.title || S.user.role)}</span>` : `${ic('lock')}<span>Signed out</span>`;
    $('#userChip').title = S.user ? `Role: ${S.user.role}` : '';

    // alert bar
    const ab = $('#alertBar');
    const items = [];
    if (S.error) items.push(`<div class="alert red">${ic('alert')}<b>${esc(S.error)}</b></div>`);
    if (L.ctas1.length) items.push(`<div class="alert red pulse">${ic('alert')}<b>CTAS 1 in waiting area (${L.ctas1.length}):</b> ${L.ctas1.map(p => `<button class="link" data-act="open" data-id="${esc(p.id)}">${esc(p.urn)}</button>`).join(', ')} — move to resuscitation / continuous observation now.</div>`);
    if (L.overdue.length) items.push(`<div class="alert red">${ic('bell')}<b>${L.overdue.length} overdue reassessment${L.overdue.length > 1 ? 's' : ''}:</b> ${L.overdue.slice(0, 8).map(p => `<button class="link" data-act="reassess" data-id="${esc(p.id)}">${esc(p.urn)} (${esc(D.vitalsTiming(p, st(), now()).overdueMin < 1 ? '<1m' : U.dur(D.vitalsTiming(p, st(), now()).overdueMin))})</button>`).join(', ')}${L.overdue.length > 8 ? ' …' : ''}${!S.device.sound ? ' <span class="pill amber">sound muted</span>' : ''}</div>`);
    if (PE.audio && PE.audio.blocked && S.device.sound) items.push(`<div class="alert amber">${ic('belloff')}Audio alerts are blocked by the browser until you click anywhere on this page.</div>`);
    ab.innerHTML = items.join('');

    // sidebar
    const badges = { dashboard: L.a.length, vitals: L.vit.length, bed: L.bed.length, procedure: L.proc.length, patients: L.a.length, audit: S.state.events.length };
    const hot = { vitals: L.overdue.length > 0 };
    $('#side').innerHTML = `<nav aria-label="Views"><div class="navh">Workflows &amp; Views</div>${NAV.filter(([k]) => canSee(k)).map(([k, label, icon]) => `
      <button class="nav ${UI.view === k ? 'active' : ''}" data-act="nav" data-id="${k}" aria-current="${UI.view === k ? 'page' : 'false'}">
        ${ic(icon)}<span>${label}</span>${badges[k] != null ? `<b class="nb ${hot[k] ? 'hot' : ''}">${badges[k]}</b>` : ''}</button>`).join('')}</nav>
      <div class="sidefoot">
        <div><span>Active patients</span><b>${L.a.length}</b></div>
        <div><span>Overdue</span><b class="${L.overdue.length ? 'tred' : ''}">${L.overdue.length}</b></div>
        <div><span>Need disposition</span><b class="${L.noWf.length ? 'tamber' : ''}">${L.noWf.length}</b></div>
        <div><span>Global Exit Rule</span><b class="tgreen">Armed (any workflow)</b></div>
        <div class="learn">${(window.PULSEED_SITE || {}).training
          ? `<a class="link" href="${esc(location.pathname)}">${ic('shield')}Back to live PulseED</a>`
          : `<a class="link" href="${esc(location.pathname)}?training" target="_blank" rel="noopener" title="Opens in a new tab; this station stays signed in">${ic('shield')}Training version</a>`}
          <a class="link" href="quick-guide.html" target="_blank" rel="noopener">${ic('clock')}Quick guide</a></div>
        <div class="ver">PulseED v${PE.VERSION}</div>
      </div>`;
    document.title = (L.overdue.length || L.ctas1.length ? `(${L.overdue.length + L.ctas1.length}) ⚠ ` : '') + 'PulseED · ED Flow Station';
  };

  UI.renderDatalists = () => {
    const s = st();
    const phys = U.uniq(active().map(p => p.physician).filter(x => x && x !== 'Unassigned'));
    const dl = (id, arr) => `<datalist id="${id}">${arr.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
    $('#datalists').innerHTML = dl('dl-spec', s.specialties) + dl('dl-proc', s.procedures) + dl('dl-phys', phys) + dl('dl-names', U.ls.get('pulseed:v2:recentUsers') || []);
  };

  // ------------------------------------------------------------------ view rendering
  UI.go = view => {
    if (!VIEWS[view]) view = 'dashboard';
    if (!canSee(view)) { if (S.user) UI.toast('Analytics and the audit trail are for Charge Nurses, ED Leaders and Admins.', 'warn'); view = 'dashboard'; }
    UI.view = view;
    UI._forceSettings = true;
    try { history.replaceState(null, '', '#' + view); } catch (e) { /* file:// */ }
    $('#viewHead').innerHTML = VIEWS[view].head();
    UI.renderBody();
    UI.renderChrome();
    $('#main').scrollTop = 0;
  };
  UI.renderBody = () => {
    // Someone without the detailed view signed in (or the leader locked the station): back to the dashboard.
    if (!canSee(UI.view)) { UI.view = 'dashboard'; $('#viewHead').innerHTML = VIEWS.dashboard.head(); try { history.replaceState(null, '', '#dashboard'); } catch (e) { /* file:// */ } }
    const v = VIEWS[UI.view];
    const body = $('#viewBody');
    // Never rebuild the settings form underneath someone typing in it, except when the signed-in user changes
    // (sign-in, lock), because what the page shows depends on the role.
    const who = S.user ? `${S.user.name}|${S.user.role}` : '';
    if (UI.view === 'settings' && body.childElementCount && !UI._forceSettings && UI._settingsWho === who) return;
    UI._forceSettings = false;
    UI._settingsWho = who;
    const y = $('#main').scrollTop;
    body.innerHTML = v.body();
    if (v.after) v.after();
    $('#main').scrollTop = y;
  };
  UI.refresh = () => { UI.renderChrome(); UI.renderBody(); UI.renderDatalists(); };

  function onFilter(e) {
    const el = e.target.closest('[data-filter]');
    if (!el) return;
    UI.vs[el.dataset.filter] = el.value;
    UI.renderBody();
  }

  const head = (title, desc, tools = '') => `<div class="vhead"><div><h2>${title}</h2><p>${desc}</p></div><div class="vtools">${tools}</div></div>`;

  // Shifts follow this PC's clock, like every other time on the station. The doctor / nursing choice is saved per PC.
  const offsetAt = ms => -new Date(ms).getTimezoneOffset();
  const shiftPattern = () => PE.SHIFT_PATTERNS[S.device.shiftView === 'nursing' ? 'nursing' : 'doctor'];
  const shiftToggle = attr => `<div class="seg" role="group" aria-label="Shift view">${Object.keys(PE.SHIFT_PATTERNS).map(k => { const p = PE.SHIFT_PATTERNS[k], on = p === shiftPattern(); return `<button type="button" class="${on ? 'on' : ''}" aria-pressed="${on}" ${attr(k)}>${esc(p.label)} · ${p.hours} h</button>`; }).join('')}</div>`;
  function shiftPanel(t) {
    const pat = shiftPattern();
    const cur = D.shiftAt(pat.shifts, t, offsetAt(t));
    const prevRef = cur.from - 1, prev = D.shiftAt(pat.shifts, prevRef, offsetAt(prevRef));
    const a = D.shiftStats(S.state, st(), cur.from, cur.to, t), b = D.shiftStats(S.state, st(), prev.from, prev.to, t);
    const mins = k => (k.median == null ? '—' : `${k.median} min <span class="hint">(n=${k.n})</span>`);
    const pct = c => (c.pct == null ? '—' : `${c.pct}% <span class="hint">(n=${c.n})</span>`);
    const row = (label, f) => `<tr><td>${label}</td><td class="b">${f(a)}</td><td>${f(b)}</td></tr>`;
    return `<section class="panel shiftp">
      <div class="ph"><h3>${ic('clock', 'tsky')}${esc(D.shiftTitle(cur))} <small class="hint">${U.dur(Math.max(0, Math.ceil((cur.to - t) / 60000)))} left</small></h3>${shiftToggle(k => `data-act="shiftview" data-id="${k}"`)}</div>
      <div class="tw"><table><thead><tr><th>Measure</th><th>This shift so far</th><th>Previous shift (${esc(prev.label)})</th></tr></thead><tbody>
        ${row('Registered on the board', x => x.registered)}
        ${row('Left the waiting area', x => x.exited)}
        ${row('LWBS / left against advice', x => `${x.lwbs} (${x.lwbsPct}%)`)}
        ${row(`Reassessments on time (target ≥ ${st().complianceTargetPct}%)`, x => pct(x.compliance))}
        ${row('Median time to bed allocation', x => mins(x.bedAlloc))}
        ${row('Median time to bed placement', x => mins(x.bedPlace))}
        ${row('Median procedure turnaround', x => mins(x.procTat))}
      </tbody></table></div></section>`;
  }

  const VIEWS = {
    dashboard: {
      head: () => '',
      body() {
        const s = st(), t = now(), L = UI.lists();
        const unalloc = L.bed.filter(p => !p.workflows.bed.bedAllocated).length;
        const longest = L.bed.length ? D.bedWait(L.bed[0], s, t) : null;
        const notReady = L.proc.filter(p => !D.procReadiness(p.workflows.procedure).ready);
        const since = t - 12 * 3600000;
        const exited = Object.values(S.state.patients).filter(p => p.status === 'exited' && U.toMs(p.exit.time) >= since).sort((a, b) => U.toMs(b.exit.time) - U.toMs(a.exit.time));
        const card = (title, count, sub, icon, tone, view, extra = '') => `
          <button class="metric ${tone} ${extra}" data-act="nav" data-id="${view}">
            <div><p>${title}</p><h4>${count}</h4><small>${sub}</small></div><span class="mi">${ic(icon)}</span></button>`;
        const vitRows = L.vit.slice(0, 6).map(p => {
          const tm = D.vitalsTiming(p, s, t), v = p.workflows.vitals;
          return `<tr class="${tm.state === 'overdue' || tm.state === 'continuous' ? 'row-red' : ''}"><td>${urnLink(p)}</td><td>${ctasB(p.ctas)}</td><td class="mono">${v.lastReassessment ? U.when(v.lastReassessment) : 'Initial'}</td><td class="r">${timingB(tm)}</td><td class="r">${btn('reassess', p.id, 'Record', 'ghost', 'check')}</td></tr>`;
        }).join('') || empty('No active vitals episodes.', 5);
        const bedRows = L.bed.slice(0, 6).map(p => {
          const b = p.workflows.bed;
          return `<tr><td>${urnLink(p)}</td><td>${waitB(D.bedWait(p, s, t))}</td><td>${b.bedAllocated ? pill(b.allocatedBed, 'green') : pill('Unallocated', 'amber')}</td><td class="r nowrap">${btn('bed', p.id, 'Allocate', 'ghost')} ${btn('exit', p.id, 'Place', 'green')}</td></tr>`;
        }).join('') || empty('No active bed episodes.', 4);
        const procRows = L.proc.slice(0, 6).map(p => {
          const r = p.workflows.procedure, rd = D.procReadiness(r);
          return `<tr><td>${urnLink(p)}</td><td class="trunc" title="${esc(r.plannedProcedure)}">${esc(r.plannedProcedure)}</td><td>${waitB(D.procWait(p, s, t))}</td><td class="r">${pill(r.status, procTone(r.status))}${rd.ready ? '' : ` <span class="pill red" title="${esc(rd.issues.join(', '))}">!</span>`}</td><td class="r">${btn('proc', p.id, 'Update', 'ghost')}</td></tr>`;
        }).join('') || empty('No active procedure episodes.', 5);

        return `
          <section class="hero">
            <div><h2>Emergency Department Reassessment &amp; Flow Station</h2>
              <p>Simultaneous multi-workflow waiting-area tracking. Patients can be enrolled in 1, 2 or all 3 workflows independently. Any disposition — including physical ED bed placement — triggers the Global Exit Rule and closes every open workflow.</p></div>
            <div class="row">
              <button class="btn sky" data-act="nav" data-id="vitals">${ic('heart')}Vitals (${L.vit.length})</button>
              <button class="btn amber" data-act="nav" data-id="bed">${ic('bed')}Beds (${L.bed.length})</button>
              <button class="btn blue" data-act="nav" data-id="procedure">${ic('syringe')}Procedures (${L.proc.length})</button>
            </div>
          </section>
          <section class="metrics">
            ${card('Active Vitals Monitoring', L.vit.length, 'Waiting-area reassessment schedule', 'heart', 'sky', 'vitals')}
            ${card('Patients Awaiting ED Bed', L.bed.length, `<span class="tamber">${unalloc} waiting to be allocated</span>`, 'bed', 'amber', 'bed')}
            ${card('Active Awaiting Procedure', L.proc.length, notReady.length ? `<span class="tred">${notReady.length} not ready (consent / arrangement)</span>` : 'Preparation &amp; readiness', 'syringe', 'blue', 'procedure')}
            ${card('Overdue Reassessments', L.overdue.length, `${L.dueSoon.length} due soon`, 'alert', L.overdue.length ? 'red' : 'grey', 'vitals', L.overdue.length ? 'pulse-card-alert' : '')}
          </section>
          <section class="metrics small">
            ${card('CTAS 1 in Waiting Area', L.ctas1.length, L.ctas1.length ? '<span class="tred">Requires resuscitation area</span>' : 'None', 'heart', L.ctas1.length ? 'red' : 'grey', 'patients', L.ctas1.length ? 'pulse-card-alert' : '')}
            ${card('Longest Bed Wait', longest ? U.dur(longest.mins) : '—', longest ? `${esc(L.bed[0].urn)} · target &lt; ${s.bedWaitAmberMin}m` : 'No one waiting', 'clock', longest && longest.level !== 'ok' ? (longest.level === 'red' ? 'red' : 'amber') : 'grey', 'bed')}
            ${card('Due Soon', L.dueSoon.length, 'Within the due-soon window', 'clock', L.dueSoon.length ? 'amber' : 'grey', 'vitals')}
            ${card('Needs Disposition', L.noWf.length, L.noWf.length ? '<span class="tamber">No active workflow — record exit</span>' : 'All patients have a workflow', 'door', L.noWf.length ? 'amber' : 'grey', 'patients')}
          </section>
          ${shiftPanel(t)}
          <section class="tri">
            <div class="panel"><div class="ph"><h3>${ic('heart', 'tsky')}Vitals Monitoring (${L.vit.length})</h3><button class="link" data-act="nav" data-id="vitals">View all →</button></div>
              <div class="tw"><table><thead><tr><th>URN</th><th>CTAS</th><th>Last reass.</th><th class="r">Next due</th><th></th></tr></thead><tbody>${vitRows}</tbody></table></div>
              <button class="btn block ghost" data-act="nav" data-id="vitals">Open Vitals Dashboard</button></div>
            <div class="panel"><div class="ph"><h3>${ic('bed', 'tamber')}Awaiting ED Bed (${L.bed.length})</h3><button class="link" data-act="nav" data-id="bed">View all →</button></div>
              <div class="tw"><table><thead><tr><th>URN</th><th>Wait</th><th>Status</th><th class="r">Actions</th></tr></thead><tbody>${bedRows}</tbody></table></div>
              <button class="btn block ghost" data-act="nav" data-id="bed">Open Bed Placement Dashboard</button></div>
            <div class="panel"><div class="ph"><h3>${ic('syringe', 'tblue')}Awaiting Procedure (${L.proc.length})</h3><button class="link" data-act="nav" data-id="procedure">View all →</button></div>
              <div class="tw"><table><thead><tr><th>URN</th><th>Procedure</th><th>Wait</th><th class="r">Status</th><th></th></tr></thead><tbody>${procRows}</tbody></table></div>
              <button class="btn block ghost" data-act="nav" data-id="procedure">Open Procedure Dashboard</button></div>
          </section>
          <section class="duo">
            <div class="panel"><div class="ph"><h3>${ic('door', 'tamber')}Needs disposition (${L.noWf.length})</h3></div>
              <div class="tw"><table><thead><tr><th>URN</th><th>Name</th><th>Last workflow ended</th><th class="r"></th></tr></thead><tbody>
              ${L.noWf.map(p => { const ends = D.WF_KEYS.map(k => p.workflows[k].endTime).filter(Boolean).sort(); return `<tr><td>${urnLink(p)}</td><td>${nm(p)}</td><td class="mono">${U.when(ends[ends.length - 1])}</td><td class="r nowrap">${btn('open', p.id, 'Add workflow', 'ghost')} ${btn('exit', p.id, 'Record exit', 'green')}</td></tr>`; }).join('') || empty('Every active patient has at least one open workflow.', 4)}
              </tbody></table></div></div>
            <div class="panel"><div class="ph"><h3>${ic('undo', 'tsky')}Recently exited — last 12 h (${exited.length})</h3></div>
              <div class="tw scroll"><table><thead><tr><th>URN</th><th>Exit</th><th>Time</th><th>By</th><th class="r"></th></tr></thead><tbody>
              ${exited.slice(0, 30).map(p => `<tr><td>${urnLink(p)}</td><td>${esc(p.exit.label)}${p.exit.bed ? ` · ${esc(p.exit.bed)}` : ''}</td><td class="mono">${U.when(p.exit.time)}</td><td>${esc(p.exit.by)}</td><td class="r">${btn('reopen', p.id, 'Reopen', 'ghost', 'undo')}</td></tr>`).join('') || empty('No exits in the last 12 hours.', 5)}
              </tbody></table></div></div>
          </section>`;
      },
    },

    vitals: {
      head: () => head('Workflow One: Vitals Monitoring (Frequency Timer)', 'Scheduled reassessment frequency per CTAS level. Physiological values are recorded in the hospital EHR; PulseED tracks that each reassessment happens on time. Sorted most urgent first.',
        searchBox('vq', 'Search URN, name, team…') + selectF('vctas', 'CTAS filter', [['', 'All CTAS'], ...D.CTAS.map(c => [c, c])]) + selectF('vteam', 'Team filter', [['', 'All teams'], ...st().teams.map(x => [x, x])])),
      body() {
        const s = st(), t = now();
        const rows = UI.lists().vit.filter(p => matches(p, UI.vs.vq) && (!UI.vs.vctas || p.ctas === UI.vs.vctas) && (!UI.vs.vteam || p.team === UI.vs.vteam));
        return `<div class="panel flush"><div class="tw"><table class="big"><thead><tr><th>Patient URN</th><th>Name</th><th>CTAS Level</th><th>Interval</th><th>Treating Physician</th><th>ED Team</th><th>Start Time</th><th>Last Reassessment</th><th>#</th><th>Next Due Time</th><th class="r">Action</th></tr></thead><tbody>
          ${rows.map(p => { const v = p.workflows.vitals, tm = D.vitalsTiming(p, s, t); return `<tr class="${tm.state === 'overdue' || tm.state === 'continuous' ? 'row-red' : tm.state === 'dueSoon' ? 'row-amber' : ''}">
            <td>${urnLink(p)}</td><td class="b">${nm(p)}</td><td>${ctasB(p.ctas)}</td><td class="mono">${tm.intervalMin ? tm.intervalMin + ' min' : esc(tm.label)}</td><td>${esc(p.physician)}</td><td>${esc(p.team)}</td>
            <td class="mono">${U.when(v.startTime)}</td><td class="mono">${v.lastReassessment ? U.when(v.lastReassessment) : 'Initial'}</td><td class="mono">${v.reassessments.length}</td><td>${timingB(tm)}</td>
            <td class="r nowrap">${btn('reassess', p.id, 'Record Reassessment', 'ghost', 'check')} ${btn('open', p.id, '⋯', 'ghost')}</td></tr>`; }).join('') || empty(UI.vs.vq || UI.vs.vctas || UI.vs.vteam ? 'No patients match the filters.' : 'No patients on vitals monitoring.', 11)}
          </tbody></table></div></div>`;
      },
    },

    bed: {
      head: () => head('Workflow Two: Awaiting ED Bed', 'Bed allocation, intended specialty, elapsed wait and physical placement. Longest wait first. Beds cannot be double-allocated without an explicit override.',
        searchBox('bq', 'Search URN, name, specialty…') + selectF('balloc', 'Allocation filter', [['', 'All'], ['no', 'Unallocated'], ['yes', 'Allocated']])),
      body() {
        const s = st(), t = now();
        const rows = UI.lists().bed.filter(p => (matches(p, UI.vs.bq) || U.key(p.workflows.bed.intendedSpecialty).includes(U.key(UI.vs.bq))) && (!UI.vs.balloc || (UI.vs.balloc === 'yes') === p.workflows.bed.bedAllocated));
        return `<div class="panel flush"><div class="tw"><table class="big"><thead><tr><th>Patient URN</th><th>Name</th><th>Diagnosis</th><th>Intended Specialty</th><th>Added Time</th><th>Wait Time</th><th>Allocation Time</th><th>Bed Allocation Status</th><th class="r">Update / Allocate</th><th class="r">Global Exit</th></tr></thead><tbody>
          ${rows.map(p => { const b = p.workflows.bed, w = D.bedWait(p, s, t); return `<tr class="${w.level === 'red' ? 'row-red' : ''}">
            <td>${urnLink(p)}</td><td class="b">${nm(p)}</td><td>${esc(p.diagnosis)}</td><td>${pill(b.intendedSpecialty, 'sky')}</td><td class="mono">${U.when(b.addedTime)}</td><td>${waitB(w)}</td>
            <td class="mono">${b.allocationTime ? U.when(b.allocationTime) : 'Waiting'}</td><td>${b.bedAllocated ? pill(`Allocated (${b.allocatedBed})`, 'green') : pill('Unallocated', 'amber')}</td>
            <td class="r">${btn('bed', p.id, b.bedAllocated ? 'Change Bed' : 'Allocate Bed', 'ghost', 'edit')}</td><td class="r">${btn('exit', p.id, 'Place &amp; Exit', 'green', 'door')}</td></tr>`; }).join('') || empty(UI.vs.bq || UI.vs.balloc ? 'No patients match the filters.' : 'No patients awaiting an ED bed.', 10)}
          </tbody></table></div></div>`;
      },
    },

    procedure: {
      head: () => head('Workflow Three: Awaiting Procedure', 'Readiness checklist (consent + arrangement), elapsed wait from request, and execution progress. "Ready" is blocked until consent and arrangement are confirmed.',
        searchBox('pq', 'Search URN, name, procedure…') + selectF('pstat', 'Status filter', [['', 'All statuses'], ['notready', 'Not ready'], ...D.PROC_STATUS.filter(x => !D.PROC_TERMINAL.includes(x)).map(x => [x, x])])),
      body() {
        const s = st(), t = now();
        const rows = UI.lists().proc.filter(p => (matches(p, UI.vs.pq) || U.key(p.workflows.procedure.plannedProcedure).includes(U.key(UI.vs.pq)))
          && (!UI.vs.pstat || (UI.vs.pstat === 'notready' ? !D.procReadiness(p.workflows.procedure).ready : p.workflows.procedure.status === UI.vs.pstat)));
        return `<div class="panel flush"><div class="tw"><table class="big"><thead><tr><th>Patient URN</th><th>Name</th><th>Diagnosis</th><th>Planned Procedure</th><th>Treating Physician</th><th>ED Team</th><th>Request Time</th><th>Wait Time</th><th>Consent</th><th>Arranged</th><th>Status</th><th class="r">Action</th></tr></thead><tbody>
          ${rows.map(p => { const r = p.workflows.procedure, rd = D.procReadiness(r); return `<tr>
            <td>${urnLink(p)}</td><td class="b">${nm(p)}</td><td>${esc(p.diagnosis)}</td><td class="b">${esc(r.plannedProcedure)}</td><td>${esc(p.physician)}</td><td>${esc(p.team)}</td>
            <td class="mono">${U.when(r.requestTime)}</td><td>${waitB(D.procWait(p, s, t))}</td>
            <td>${pill(r.consent, r.consent === 'Obtained' || r.consent === 'Not required' ? 'green' : 'red')}</td><td>${pill(r.arranged, r.arranged === 'No' ? 'red' : 'green')}</td>
            <td>${pill(r.status, procTone(r.status))}${rd.ready ? '' : `<div class="hint tred">${esc(rd.issues.join(' · '))}</div>`}</td>
            <td class="r">${btn('proc', p.id, 'Update', 'ghost', 'edit')}</td></tr>`; }).join('') || empty(UI.vs.pq || UI.vs.pstat ? 'No patients match the filters.' : 'No active procedures.', 12)}
          </tbody></table></div></div>`;
      },
    },

    patients: {
      head: () => head('All Active Patients', 'One row per patient across all three workflows — the place to edit details, re-triage, add or end a workflow, and record any disposition.',
        searchBox('aq', 'Search URN, name, encounter, diagnosis…')),
      body() {
        const s = st(), t = now();
        const rows = UI.lists().a.filter(p => matches(p, UI.vs.aq)).sort((a, b) => (a.ctas > b.ctas ? 1 : a.ctas < b.ctas ? -1 : U.toMs(a.createdAt) - U.toMs(b.createdAt)));
        const chip = (p, k) => {
          const w = p.workflows[k];
          if (!w.active) return `<span class="wf off">${D.WF[k].split(' ').pop()}</span>`;
          if (k === 'vitals') { const tm = D.vitalsTiming(p, s, t); return `<span class="wf on t-${tm.state}" title="${esc(tm.label)}">${ic('heart')}${tm.state === 'overdue' ? 'Overdue' : 'Vitals'}</span>`; }
          if (k === 'bed') return `<span class="wf on w-${D.bedWait(p, s, t).level}">${ic('bed')}${w.bedAllocated ? esc(w.allocatedBed) : 'Bed?'}</span>`;
          return `<span class="wf on ${D.procReadiness(w).ready ? '' : 'w-red'}">${ic('syringe')}${esc(w.status)}</span>`;
        };
        return `<div class="panel flush"><div class="tw"><table class="big"><thead><tr><th>URN</th><th>Encounter</th><th>Name</th><th>CTAS</th><th>Diagnosis</th><th>Physician / Team</th><th>Registered</th><th>Time in WA</th><th>Workflows</th><th class="r">Actions</th></tr></thead><tbody>
          ${rows.map(p => `<tr class="${p.ctas === 'CTAS 1' ? 'row-red' : !D.activeWfs(p).length ? 'row-amber' : ''}"><td>${urnLink(p)}</td><td class="mono small">${esc(p.encounterId)}</td><td class="b">${nm(p)}</td><td>${ctasB(p.ctas)}</td><td>${esc(p.diagnosis)}</td>
            <td>${esc(p.physician)}<div class="hint">${esc(p.team)}</div></td><td class="mono">${U.when(p.createdAt)}</td><td class="mono">${U.dur(U.minsBetween(p.createdAt, t))}</td>
            <td class="nowrap">${D.WF_KEYS.map(k => chip(p, k)).join(' ')}</td><td class="r nowrap">${btn('open', p.id, 'Open', 'ghost', 'edit')} ${btn('exit', p.id, 'Exit', 'green', 'door')}</td></tr>`).join('') || empty('No active patients.', 10)}
          </tbody></table></div></div>`;
      },
    },

    analytics: {
      head: () => head('Admin &amp; Statistical Process Control (SPC) Analytics', 'All figures are calculated from this department\'s recorded events over the last 24 hours. Charts are XmR (individuals) control charts: centre line = mean, dashed lines = UCL / LCL (mean ± 2.66 × average moving range).'),
      body() {
        const s = st(), m = D.metrics(S.state, s, now());
        const kc = (title, k, unit, desc) => `<div class="panel kpi"><p>${title}</p><h3>${k.mean != null ? k.mean + ' ' + unit : '—'}</h3><p class="mono">Median: ${k.median != null ? k.median + ' ' + unit : '—'} · n=${k.n}</p><small>${desc}</small></div>`;
        const comp = m.compliance;
        const c1 = PE.charts.xmr(m.labels, [{ name: 'Reassessment compliance (%)', values: m.hourly.compliance, cls: 's1' }], { yMin: 0, yMax: 100, unit: '%', target: s.complianceTargetPct, title: 'Vitals compliance' });
        const c2 = PE.charts.xmr(m.labels, [{ name: 'Time to allocation (min)', values: m.hourly.alloc, cls: 's2' }, { name: 'Time to physical placement (min)', values: m.hourly.place, cls: 's3' }], { yMin: 0, unit: 'm', title: 'Allocation vs placement' });
        const c3 = PE.charts.xmr(m.labels, [{ name: 'Procedure turnaround (min)', values: m.hourly.tat, cls: 's4' }], { yMin: 0, unit: 'm', title: 'Procedure turnaround' });
        const chart = (title, icon, tone, desc, c) => `<div class="panel"><div class="ph"><h3>${ic(icon, tone)}${title}</h3>${pill(c.status.label, c.status.tone)}</div><p class="hint">${desc}</p>${c.svg}<div class="legend">${c.legend}</div></div>`;
        const ex = (act, label, tone = 'tsky') => `<button class="export" data-act="${act}">${ic('download', tone)}<span>${label}</span><small>.CSV</small></button>`;
        return `
          <section class="metrics">
            ${kc('Avg Bed Allocation Time', m.bedAlloc, 'min', 'Added to bed list → first bed allocated')}
            ${kc('Avg Bed Placement Time', m.bedPlace, 'min', 'Added to bed list → physically placed')}
            ${kc('Procedure Turnaround Time', m.procTat, 'min', 'Request → marked Done')}
            <div class="panel kpi"><p>Vitals Reassessment Compliance</p><h3 class="${comp.pct != null && comp.pct < s.complianceTargetPct ? 'tred' : ''}">${comp.pct != null ? comp.pct + '%' : '—'}</h3><p class="mono">Hourly median: ${comp.median != null ? comp.median + '%' : '—'} · n=${comp.n} intervals</p><small class="${comp.pct != null && comp.pct >= s.complianceTargetPct ? 'tgreen' : ''}">Target ≥ ${s.complianceTargetPct}% · on time = within ${s.complianceGraceMin} min of due</small></div>
          </section>
          <section class="tri">
            ${chart('Vitals Compliance SPC (Hourly)', 'heart', 'tsky', 'Share of reassessments completed on time, by hour they fell due.', c1)}
            ${chart('Allocation vs Placement SPC', 'bed', 'tamber', 'Hourly mean time to allocation and to physical placement.', c2)}
            ${chart('Procedure Turnaround SPC (Hourly)', 'syringe', 'tblue', 'Hourly mean request-to-done time.', c3)}
          </section>
          ${!D.isLeader(S.user) ? `<p class="note">${ic('lock')} Spreadsheet exports are for ED Leaders and Admins.</p>` : `<section class="panel">
            <div class="ph"><h3>${ic('download', 'tsky')}Spreadsheet &amp; Data Stream Exports</h3>
              <label class="check"><input type="checkbox" id="deid" ${UI.vs.deid !== false ? 'checked' : ''}> De-identify (initials instead of names)</label></div>
            <p class="hint">Exports contain patient information. Store them only in approved locations. Every export is recorded in the audit trail.</p>
            <div class="exports">
              ${ex('x-master', 'Patient Master Table')}${ex('x-vitals', 'Vitals Episodes')}${ex('x-bed', 'Bed Episodes')}${ex('x-proc', 'Procedure Episodes')}${ex('x-audit', 'Event Audit Trail Log', 'tgreen')}
              <button class="export" data-act="x-backup">${ic('shield', 'tamber')}<span>Full backup (all data)</span><small>.JSON</small></button>
            </div>
          </section>`}`;
      },
      after() { const d = $('#deid'); if (d) d.onchange = () => (UI.vs.deid = d.checked); },
    },

    audit: {
      head: () => head('Event Audit Trail Log', 'Append-only record of every workflow event, status change and exit — with full date, time, user, role and station. Each row is chained to the previous one by a checksum, so any edit or deletion is detectable.',
        searchBox('eq', 'Search URN, user, event, notes…') + selectF('ewf', 'Workflow filter', [['', 'All workflows'], ['Vitals', 'Vitals Monitoring'], ['Bed', 'Awaiting ED Bed'], ['Procedure', 'Awaiting Procedure'], ['Exit', 'Global Exit'], ['Patient', 'Patient details'], ['System', 'System / exports']])
        + `<button class="btn ghost" data-act="verify">${ic('shield')}<span>Verify integrity</span></button>`),
      body() {
        const q = U.key(UI.vs.eq), wf = UI.vs.ewf;
        const evs = S.state.events.filter(e => (!q || [e.urn, e.user, e.eventType, e.notes, e.workflow, e.encounterId].some(x => U.key(x).includes(q))) && (!wf || (e.workflow || '').includes(wf) || (wf === 'System' && e.user === 'System')));
        const shown = evs.slice(-500).reverse();
        return `<div class="panel flush"><div class="tw"><table class="big"><thead><tr><th>Date / time</th><th>Patient URN</th><th>Encounter ID</th><th>Workflow</th><th>Event Type</th><th>Status Transition</th><th>User</th><th>Station</th><th>Notes</th></tr></thead><tbody>
          ${shown.map(e => `<tr><td class="mono nowrap" title="${esc(e.ts)}">${esc(U.full(e.ts))}</td><td class="mono b">${esc(e.urn)}</td><td class="mono small">${esc(e.encounterId)}</td><td>${esc(e.workflow)}</td><td class="b">${esc(e.eventType)}</td>
            <td class="mono small">${esc(e.prev || '—')} → <span class="tgreen b">${esc(e.next || '—')}</span></td><td>${esc(e.user)}<div class="hint">${esc(e.role)}</div></td><td class="small">${esc(e.device)}</td><td class="notes">${esc(e.notes)}</td></tr>`).join('') || empty('No events match.', 9)}
          </tbody></table></div>${evs.length > 500 ? `<p class="hint pad">Showing the latest 500 of ${evs.length} matching events. Export the CSV for the full log.</p>` : ''}</div>`;
      },
    },

    settings: {
      head: () => head('Settings', 'Clinical timing rules, thresholds and lists for this department. Saving requires a Charge Nurse, ED Leader or Admin. Station preferences apply to this PC only.'),
      body() { return UI.settingsForm(); },
      after() { UI.bindSettings(); },
    },
  };
  UI.VIEWS = VIEWS;

  // ------------------------------------------------------------------ toasts
  UI.toast = (msg, type = 'success', action) => {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="dot"></i><span>${esc(msg)}</span>${action ? `<button class="btn sm ghost">${esc(action.label)}</button>` : ''}<button class="x" aria-label="Dismiss">${ic('x')}</button>`;
    const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 250); };
    el.querySelector('.x').onclick = kill;
    if (action) el.querySelector('.btn').onclick = () => { kill(); action.fn(); };
    $('#toasts').appendChild(el);
    setTimeout(kill, type === 'error' ? 9000 : action ? 12000 : 4500);
  };

  // ------------------------------------------------------------------ modal framework
  const stack = [];
  UI.closeTopModal = viaEsc => {
    const m = stack[stack.length - 1];
    if (!m || (viaEsc && m.locked)) return;
    m.el.remove(); stack.pop();
    if (m.prevFocus && m.prevFocus.focus) m.prevFocus.focus();
  };
  UI.closeAll = () => { while (stack.length) { const m = stack.pop(); m.el.remove(); } };

  /**
   * opts: { title, icon, tone, wide, locked, body, submit:'Save', danger, onSubmit(form, data) -> Promise, onMount(el), noFooter, extraButtons }
   */
  UI.modal = opts => {
    const el = document.createElement('div');
    el.className = 'overlay' + (opts.locked ? ' lock' : ''); // lock screens fully hide patient data behind them
    el.innerHTML = `<div class="modal ${opts.wide ? 'wide' : ''} ${opts.tone || ''}" role="dialog" aria-modal="true" aria-labelledby="mt">
      <div class="mh"><h3 id="mt">${opts.icon ? ic(opts.icon) : ''}<span>${opts.title}</span></h3>${opts.locked ? '' : `<button type="button" class="x" data-close aria-label="Close">${ic('x')}</button>`}</div>
      <form class="mb" novalidate>${opts.body}<div class="merr" role="alert" hidden></div>
        ${opts.noFooter ? '' : `<div class="mf">${opts.extraButtons || ''}<span class="grow"></span>${opts.locked ? '' : '<button type="button" class="btn ghost" data-close>Cancel</button>'}<button type="submit" class="btn ${opts.danger ? 'red' : 'primary'}">${opts.submit || 'Save'}</button></div>`}
      </form></div>`;
    const m = { el, locked: !!opts.locked, prevFocus: document.activeElement };
    stack.push(m);
    $('#modalRoot').appendChild(el);
    const form = el.querySelector('form');
    el.querySelectorAll('[data-close]').forEach(b => (b.onclick = () => close()));
    const close = () => { const i = stack.indexOf(m); if (i >= 0) { stack.splice(i, 1); el.remove(); } };
    const err = el.querySelector('.merr');
    m.close = close;
    m.showError = (msg, code) => { err.hidden = false; err.innerHTML = `${ic('alert')}<span>${esc(msg)}</span>`; err.dataset.code = code || ''; err.scrollIntoView({ block: 'nearest' }); };
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!opts.onSubmit) return close();
      const sub = form.querySelector('[type=submit]');
      err.hidden = true;
      sub.disabled = true;
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        $$('input[type=checkbox]', form).forEach(c => (data[c.name] = c.checked));
        const keep = await opts.onSubmit(form, data, m);
        if (keep !== true) close();
      } catch (ex) {
        m.showError(ex.message || String(ex), ex.code);
        if (opts.onError) opts.onError(ex, form, m);
      } finally { sub.disabled = false; }
    });
    if (opts.onMount) opts.onMount(el, form, m);
    const f = el.querySelector('[autofocus]') || el.querySelector('input:not([type=hidden]):not([readonly]),select,textarea,button[type=submit]');
    if (f) setTimeout(() => f.focus(), 30);
    return m;
  };

  const field = (label, inner, hint = '', cls = '') => `<label class="f ${cls}"><span>${label}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const opt = (v, cur, label) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(label || v)}</option>`;
  const sel = (name, options, cur, attrs = '') => `<select name="${name}" ${attrs}>${options.map(o => (Array.isArray(o) ? opt(o[0], cur, o[1]) : opt(o, cur))).join('')}</select>`;
  const inp = (name, val = '', attrs = '') => `<input name="${name}" value="${esc(val)}" ${attrs}>`;
  const patientCard = p => `<div class="pcard"><div><b>${nm(p)}</b> <span class="mono tsky">${esc(p.urn)}</span> ${ctasB(p.ctas)}</div><div class="hint">${esc(p.diagnosis)} · ${esc(p.physician)} · ${esc(p.team)} · Enc ${esc(p.encounterId)}</div></div>`;
  const fresh = id => S.state.patients[id];

  /** Run a store action and report the result. */
  async function run(type, payload, okMsg, undo) {
    const res = await S.dispatch(type, payload);
    UI.toast(okMsg, 'success', undo);
    return res;
  }
  UI.run = run;

  // ------------------------------------------------------------------ modals: sign-in / mode
  UI.modeModal = onDone => UI.modal({
    title: 'Welcome to PulseED', icon: 'logo', locked: true, submit: 'Continue',
    body: `<p>Choose how this station will be used. The two modes keep completely separate data so training records can never mix with real patients.</p>
      <div class="choice">
        <label><input type="radio" name="mode" value="demo" checked><div><b>Training / Demo</b><small>Loads synthetic patients (including the original prototype's 7) and 24 h of history so every screen can be explored.</small></div></label>
        <label><input type="radio" name="mode" value="live"><div><b>Live department use</b><small>Starts empty. For a single PC, data stays in this browser; for all workstations, connect the PatientFlow MS database in Settings.</small></div></label>
      </div>`,
    onSubmit: async (f, d) => onDone(d.mode),
  });

  UI.signInModal = (reason) => {
    if (S.isShared()) return UI.googleSignIn(reason);
    const recent = U.ls.get('pulseed:v2:recentUsers') || [];
    UI.modal({
      title: reason === 'locked' ? 'Station locked' : 'Sign in to this station', icon: 'lock', locked: true, submit: 'Sign in',
      body: `${reason === 'locked' ? '<p class="note">The station locked after inactivity to protect patient information.</p>' : ''}
        ${(window.PULSEED_SITE || {}).training ? `<p class="note">${ic('shield')} <b>Training version</b>: open to anyone, no account needed. Type any name and pick a role to see what that person sees: <b>Nurse</b> for the station workflows, <b>ED Leader</b> or <b>Admin</b> to also see analytics, the audit trail and exports. Patients here are synthetic and stay in this browser. <a class="link" href="quick-guide.html" target="_blank" rel="noopener">Quick guide</a></p>`
          : `<p class="hint">Every action is recorded in the audit trail under this name and role.${S.adapter && S.adapter.kind === 'local' ? ' In local mode this is self-declared, not a verified login — connect PatientFlow MS for real authentication.' : ''}</p>`}
        ${field('Your name (as on your badge)', inp('name', S.user ? S.user.name : recent[0] || '', 'required autocomplete="off" list="dl-names" autofocus maxlength="60"'))}
        ${field('Role', sel('role', PE.ROLES, S.user ? S.user.role : 'Nurse'))}
        ${field('Station name', inp('device', S.device.deviceName || '', 'placeholder="e.g. Triage Desk 1" maxlength="40"'), 'Shown in the audit trail. Saved on this PC.')}`,
      onSubmit: async (f, d) => {
        const name = U.norm(d.name);
        if (name.length < 3 || !/\s|\./.test(name)) throw new D.RuleError('Enter your full name or initial + surname (e.g. "J. Doe") so the audit trail identifies you.');
        S.setUser({ name, role: d.role });
        S.device.deviceName = U.norm(d.device); S.saveDevice();
        try { U.ls.set('pulseed:v2:recentUsers', U.uniq([name, ...recent]).slice(0, 12)); } catch (e) { /* ignore */ }
        UI.refresh();
        UI.toast(`Signed in as ${name} (${d.role}).`);
      },
    });
  };

  /** Shared register: Google account sign-in; name and role come from the Recipients tab on the server. */
  UI.googleSignIn = reason => {
    if (stack.some(m => m.googleSignIn)) return;
    const g = S.adapter;
    const clientId = g.config && g.config.googleClientId;
    const m = UI.modal({
      title: reason === 'locked' ? 'Station locked' : reason === 'expired' ? 'Sign in again' : 'Sign in to PulseED', icon: 'lock', locked: true, noFooter: true,
      body: `${reason === 'locked' ? '<p class="note">The station locked to protect patient information.</p>' : reason === 'expired' ? '<p class="note">Your Google sign-in expired (they last about an hour). Sign in again to continue — nothing was lost.</p>' : ''}
        <p>Sign in with the Google account the system owner added to the PulseED staff list. Your name and role come from that list and are recorded on every action.</p>
        <div id="gbtn" style="min-height:48px;display:grid;place-items:center"></div>
        <div class="merr" data-gerr ${S.error ? '' : 'hidden'}>${ic('alert')}<span>${esc(S.error || '')}</span></div>
        <p class="hint">Just want to learn or try it? <a class="link" href="${esc(location.pathname)}?training">Open the training version</a> (no account needed, synthetic patients only) · <a class="link" href="quick-guide.html" target="_blank" rel="noopener">Quick guide</a></p>`,
    });
    m.googleSignIn = true;
    const box = $('#gbtn', m.el), errBox = $('[data-gerr]', m.el);
    const showErr = msg => { errBox.hidden = false; errBox.innerHTML = `${ic('alert')}<span>${esc(msg)}</span>`; };
    if (!clientId) return showErr(S.error || 'Google Sign-In is not configured on the server yet (Settings → GOOGLE_CLIENT_ID).');
    const start = () => {
      google.accounts.id.initialize({
        client_id: clientId, auto_select: false, cancel_on_tap_outside: false, itp_support: true,
        callback: async r => {
          box.innerHTML = '<p class="hint">Checking your account…</p>';
          try { const u = await g.signIn(r.credential); S.error = null; m.close(); UI.refresh(); await S.reload(); UI.toast(`Signed in as ${u.name} (${u.role}).`); }
          catch (e) { showErr(e.message); google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with' }); }
        },
      });
      // Button only: running One Tap (prompt) alongside it lets a click abort both flows, so sign-in silently fails.
      google.accounts.id.renderButton(box, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: 300 });
    };
    if (window.google && google.accounts && google.accounts.id) return start();
    const s = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true, onload: start, onerror: () => showErr('Google Sign-In could not load. Check the internet connection, then reload the page.') });
    document.head.appendChild(s);
  };

  // ------------------------------------------------------------------ modals: new patient
  UI.newPatientModal = () => {
    const s = st();
    UI.modal({
      title: 'Patient Entry Form (Independent Workflow Enrollment)', icon: 'plus', wide: true, submit: 'Submit Patient',
      body: `
        <div class="g2">
          ${field('Patient URN / MRN *', inp('urn', '', 'required maxlength="24" autocomplete="off" placeholder="Copy from EHR, e.g. P-40921" autofocus'), 'Must match the hospital record. Duplicates are blocked.')}
          ${field('Encounter ID', inp('encounterId', '', 'maxlength="24" autocomplete="off" placeholder="From EHR (auto-generated if blank)"'))}
          ${field('Patient Full Name *', inp('name', '', 'required maxlength="80" autocomplete="off" placeholder="e.g. Jane Doe"'))}
          ${field('Presenting Complaint / Diagnosis *', inp('diagnosis', '', 'required maxlength="120" autocomplete="off" placeholder="e.g. Acute chest pain"'))}
          ${field('CTAS Triage Level *', sel('ctas', [['', '— select —'], ...D.CTAS.map(c => [c, c === 'Other' ? 'Other / not triaged (no timer target)' : c])], '', 'required'), 'Applies to the patient, not only to vitals.')}
          ${field('Treating Physician', inp('physician', '', 'maxlength="60" list="dl-phys" placeholder="Leave blank if not yet assigned"'))}
          ${field('ED Team *', sel('team', [...s.teams, ['__other', 'Other…']], s.teams[0]))}
          ${field('Custom team name', inp('customTeam', '', 'maxlength="40"'), '', 'hide-unless-other')}
        </div>
        <fieldset class="wfset"><legend>Active Workflows Enrollment * <small>(one, two or all three — independently)</small></legend>
          <div class="g3">
            <label class="wfopt"><input type="checkbox" name="wfVitals">${ic('heart', 'tsky')}<span>Vitals Monitoring</span></label>
            <label class="wfopt"><input type="checkbox" name="wfBed">${ic('bed', 'tamber')}<span>Awaiting ED Bed</span></label>
            <label class="wfopt"><input type="checkbox" name="wfProc">${ic('syringe', 'tblue')}<span>Awaiting Procedure</span></label>
          </div>
        </fieldset>
        <div class="sec" data-sec="wfVitals" hidden><b>Vitals monitoring</b><p class="hint">Reassessment interval comes from the CTAS level: ${D.CTAS.slice(0, 5).map(c => `${c} ${s.ctasIntervals[c] === 0 ? 'continuous' : s.ctasIntervals[c] + ' min'}`).join(' · ')}. Physiological values are recorded in the EHR.</p></div>
        <div class="sec" data-sec="wfBed" hidden>${field('Intended Specialty for Referral *', inp('intendedSpecialty', '', 'list="dl-spec" maxlength="60" placeholder="e.g. Cardiology"'))}</div>
        <div class="sec" data-sec="wfProc" hidden><div class="g3">
          ${field('Planned Procedure / Imaging *', inp('plannedProcedure', '', 'list="dl-proc" maxlength="80" placeholder="e.g. CT Head"'), '', 'span2')}
          ${field('Consent', sel('consent', D.CONSENT, 'Pending'))}
          ${field('Arranged', sel('arranged', D.ARRANGED, 'No'))}</div></div>`,
      onMount: (el, form) => {
        const sync = () => {
          $$('[data-sec]', form).forEach(sx => (sx.hidden = !form.elements[sx.dataset.sec].checked));
          $('.hide-unless-other', form).hidden = form.elements.team.value !== '__other';
        };
        form.addEventListener('change', sync); sync();
      },
      onSubmit: async (f, d) => {
        const team = d.team === '__other' ? U.norm(d.customTeam) : d.team;
        if (d.team === '__other' && !team) throw new D.RuleError('Enter the custom team name.');
        const res = await run('ADMIT', {
          urn: d.urn, encounterId: d.encounterId, name: d.name, diagnosis: d.diagnosis, ctas: d.ctas, physician: d.physician, team,
          workflows: { vitals: d.wfVitals, bed: d.wfBed, procedure: d.wfProc }, intendedSpecialty: d.intendedSpecialty, plannedProcedure: d.plannedProcedure, consent: d.consent, arranged: d.arranged,
        }, `Patient ${U.norm(d.urn).toUpperCase()} submitted into workflows.`);
        if (res.patient && res.patient.ctas === 'CTAS 1') UI.toast('CTAS 1 — this patient needs the resuscitation area now, not the waiting room.', 'error');
      },
    });
  };

  // ------------------------------------------------------------------ modals: vitals
  UI.reassessModal = id => {
    const p = fresh(id); if (!p) return;
    const s = st(), tm = D.vitalsTiming(p, s, now()), v = p.workflows.vitals;
    if (!v.active) { UI.toast(`${p.urn} is not on vitals monitoring.`, 'warn'); return UI.patientModal(id); }
    const minT = Math.max(U.toMs(v.lastReassessment || v.startTime), now() - s.backdateMaxMin * 60000);
    UI.modal({
      title: `Record Vitals Reassessment (${esc(p.urn)})`, icon: 'heart', submit: 'Confirm Reassessment Completed',
      body: `${patientCard(p)}
        <div class="kv"><span>Interval</span><b>${tm.intervalMin ? `every ${tm.intervalMin} min` : esc(tm.label)}</b><span>Last</span><b>${v.lastReassessment ? U.when(v.lastReassessment) : 'Initial (started ' + U.when(v.startTime) + ')'}</b><span>Status</span><b>${timingB(tm)}</b></div>
        <p>Confirming records that physiological vitals have been taken and documented in the hospital EHR, and resets the reassessment timer.</p>
        <div class="g2">${field('Time observations were taken', `<input type="datetime-local" name="time" value="${U.localInput(now())}" min="${U.localInput(minT)}" max="${U.localInput(now())}" required>`, `Back-dating allowed up to ${s.backdateMaxMin} min.`)}
        ${field('Note (optional)', inp('note', '', 'maxlength="200" placeholder="e.g. pain reassessed, analgesia given"'))}</div>`,
      onSubmit: async (f, d) => {
        // Left at the current minute = "now" (with seconds), so it is never earlier than a start a few seconds ago.
        const t = d.time && d.time !== U.localInput(now()) ? new Date(d.time).toISOString() : null;
        await run('RECORD_REASSESSMENT', { id, time: t, note: d.note }, `Reassessment recorded for ${p.urn}; timer reset.`);
      },
    });
  };

  // ------------------------------------------------------------------ modals: bed
  const bedOptions = selfId => {
    const taken = {};
    active().forEach(x => { const b = x.workflows.bed; if (x.id !== selfId && b.active && b.bedAllocated) taken[U.key(b.allocatedBed)] = x.urn; });
    return { taken, html: `<datalist id="dl-bedsel">${st().beds.map(b => `<option value="${esc(b)}">${taken[U.key(b)] ? 'allocated to ' + esc(taken[U.key(b)]) : 'free'}</option>`).join('')}</datalist>` };
  };
  const overrideRow = `<label class="check override" hidden><input type="checkbox" name="override"> I confirm this bed should be given to this patient (override the existing allocation)</label>`;
  const revealOverride = (ex, form) => { if (ex.code === 'BED_TAKEN') $('.override', form).hidden = false; };

  UI.bedModal = id => {
    const p = fresh(id); if (!p) return;
    const b = p.workflows.bed;
    if (!b.active) { UI.toast(`${p.urn} is not on the Awaiting ED Bed list.`, 'warn'); return UI.patientModal(id); }
    const bo = bedOptions(id);
    const free = st().beds.filter(x => !bo.taken[U.key(x)]).length;
    UI.modal({
      title: `Allocate Bed Pending Placement (${esc(p.urn)})`, icon: 'bed', submit: 'Save Bed Allocation',
      extraButtons: b.bedAllocated ? `<button type="button" class="btn ghost" data-release>Release bed</button>` : '',
      body: `${patientCard(p)}${bo.html}
        <div class="kv"><span>Waiting</span><b>${waitB(D.bedWait(p, st(), now()))}</b><span>Current</span><b>${b.bedAllocated ? esc(b.allocatedBed) + ' since ' + U.when(b.allocationTime) : 'Unallocated'}</b><span>Free beds</span><b>${free} of ${st().beds.length}</b></div>
        <div class="g2">${field('Assigned Bed Location *', inp('bed', b.bedAllocated ? b.allocatedBed : '', 'required list="dl-bedsel" maxlength="40" autocomplete="off" placeholder="Start typing to pick a bed" autofocus'), 'Suggestions show which beds are already allocated.')}
        ${field('Intended Specialty Referral *', inp('specialty', b.intendedSpecialty || '', 'required list="dl-spec" maxlength="60"'))}</div>
        ${field('Note (optional)', inp('note', '', 'maxlength="200"'))}${overrideRow}`,
      onMount: (el, form, m) => { const r = $('[data-release]', el); if (r) r.onclick = () => { m.close(); UI.reasonModal(`Release bed ${esc(b.allocatedBed)} (${esc(p.urn)})`, 'Reason for releasing the bed', reason => run('UNALLOCATE_BED', { id, reason, expectedVersion: p.version }, `Bed released for ${p.urn}.`)); }; },
      onError: revealOverride,
      onSubmit: async (f, d) => { await run('ALLOCATE_BED', { id, bed: d.bed, specialty: d.specialty, note: d.note, override: d.override, expectedVersion: p.version }, `Bed allocated for ${p.urn} → ${U.norm(d.bed)}`); },
    });
  };

  // ------------------------------------------------------------------ modals: procedure
  UI.procModal = id => {
    const p = fresh(id); if (!p) return;
    const r = p.workflows.procedure;
    if (!r.active) { UI.toast(`${p.urn} has no active procedure.`, 'warn'); return UI.patientModal(id); }
    UI.modal({
      title: `Update Procedure &amp; Readiness (${esc(p.urn)})`, icon: 'syringe', submit: 'Save Updates',
      body: `${patientCard(p)}
        <div class="kv"><span>Requested</span><b>${U.when(r.requestTime)}</b><span>Waiting</span><b>${waitB(D.procWait(p, st(), now()))}</b><span>Readiness</span><b>${D.procReadiness(r).ready ? pill('Ready to proceed', 'green') : pill(D.procReadiness(r).issues.join(' · '), 'red')}</b></div>
        ${field('Planned Procedure / Imaging', inp('plannedProcedure', r.plannedProcedure, 'list="dl-proc" maxlength="80" required'))}
        <div class="g3">${field('Procedure Status', sel('status', D.PROC_STATUS, r.status))}${field('Consent', sel('consent', D.CONSENT, r.consent))}${field('Arranged', sel('arranged', D.ARRANGED, r.arranged))}</div>
        ${field('Note / reason', inp('note', '', 'maxlength="200"'), 'Required for Deferred or Cancelled. "Done" and "Cancelled" close the procedure workflow.')}`,
      onSubmit: async (f, d) => { await run('UPDATE_PROCEDURE', Object.assign({ id, expectedVersion: p.version }, d), `Procedure updated for ${p.urn} → ${d.status}`); },
    });
  };

  // ------------------------------------------------------------------ modals: exit / global exit
  UI.exitModal = (id, type) => {
    const p = fresh(id); if (!p) return;
    if (p.status !== 'active') return UI.toast(`${p.urn} has already exited.`, 'warn');
    const b = p.workflows.bed;
    const def = type || (b.active || D.activeWfs(p).length ? 'placed' : 'discharged');
    const wfs = D.activeWfs(p);
    const bo = bedOptions(id);
    UI.modal({
      title: 'Confirm Disposition &amp; Global Exit Rule', icon: 'alert', tone: 'danger', danger: true, submit: 'Confirm &amp; Exit All Workflows',
      body: `${patientCard(p)}${bo.html}
        <p class="hint">Active workflows to close: <b>${wfs.map(k => D.WF[k]).join(', ') || 'none'}</b></p>
        ${field('How did the patient leave the waiting area?', sel('type', Object.entries(D.EXIT_TYPES), def))}
        <div data-placed>${field('Assigned ED Bed Location *', inp('bed', b.bedAllocated ? b.allocatedBed : '', 'list="dl-bedsel" maxlength="40" autocomplete="off" placeholder="Bed the patient is physically in"'))}</div>
        ${field('Note / reason', `<textarea name="reason" rows="2" maxlength="300" placeholder="Required for AMA, transfer, deceased and entered-in-error"></textarea>`)}
        <div class="warnbox">${ic('shield')}<div><b>Mandatory Scope Exit Confirmation</b><p>Confirming will <b>immediately close all active episodes</b> for this patient across every workflow and remove them from the waiting-area lists. Unfinished procedures are closed <b>without being marked Done</b>. This can be reversed from “Recently exited” if done in error.</p></div></div>
        ${overrideRow}`,
      onMount: (el, form) => { const sync = () => ($('[data-placed]', form).hidden = form.elements.type.value !== 'placed'); form.elements.type.onchange = sync; sync(); },
      onError: revealOverride,
      onSubmit: async (f, d) => {
        await run('EXIT', { id, type: d.type, bed: d.bed, reason: d.reason, override: d.override, expectedVersion: p.version },
          d.type === 'placed' ? `Global Exit for ${p.urn}: placed in ${U.norm(d.bed) || b.allocatedBed}; all workflows closed.` : `${p.urn} exited: ${D.EXIT_TYPES[d.type]}.`,
          { label: 'Undo', fn: () => run('REOPEN', { id, reason: 'Undo immediately after exit' }, `${p.urn} restored to the waiting area.`).catch(e => UI.toast(e.message, 'error')) });
      },
    });
  };

  UI.reopenModal = id => {
    const p = fresh(id); if (!p || !p.exit) return;
    UI.reasonModal(`Reopen ${esc(p.urn)} (${esc(p.exit.label)})`, 'Why is this exit being reversed?',
      reason => run('REOPEN', { id, reason }, `${p.urn} restored to the waiting area with its previous workflows.`));
  };

  UI.reasonModal = (title, label, fn, submit = 'Confirm') => UI.modal({
    title, icon: 'edit', submit,
    body: field(label + ' *', `<textarea name="reason" rows="3" maxlength="300" required autofocus></textarea>`),
    onSubmit: async (f, d) => { if (!U.norm(d.reason)) throw new D.RuleError('A reason is required.'); await fn(d.reason); },
  });

  // ------------------------------------------------------------------ modals: patient record
  UI.patientModal = id => {
    const p = fresh(id); if (!p) return UI.toast('Patient record no longer exists.', 'warn');
    const s = st(), t = now(), act = p.status === 'active';
    const evs = S.state.events.filter(e => e.patientId === id).slice().reverse();
    const wfCard = k => {
      const w = p.workflows[k];
      let info = '';
      if (k === 'vitals' && w.startTime) info = w.active ? `${timingB(D.vitalsTiming(p, s, t))}<div class="hint">${w.reassessments.length} reassessment(s) since ${U.when(w.startTime)}</div>` : `<div class="hint">Ended ${U.when(w.endTime)} — ${esc(w.endReason)}</div>`;
      if (k === 'bed' && w.addedTime) info = w.active ? `${waitB(D.bedWait(p, s, t))} ${w.bedAllocated ? pill(w.allocatedBed, 'green') : pill('Unallocated', 'amber')}<div class="hint">${esc(w.intendedSpecialty)}</div>` : `<div class="hint">${w.physicallyPlaced ? 'Placed in ' + esc(w.allocatedBed) + ' at ' + U.when(w.placementTime) : 'Ended ' + U.when(w.endTime) + ' — ' + esc(w.endReason)}</div>`;
      if (k === 'procedure' && w.requestTime) info = w.active ? `${pill(w.status, procTone(w.status))}<div class="hint">${esc(w.plannedProcedure)} · consent ${esc(w.consent)} · arranged ${esc(w.arranged)}</div>` : `<div class="hint">${esc(w.plannedProcedure)}: ${esc(w.status)} — ${esc(w.endReason || '')}</div>`;
      const acts = !act ? '' : w.active
        ? `${k === 'vitals' ? `<button type="button" class="btn sm ghost" data-do="reassess">Record</button>` : k === 'bed' ? `<button type="button" class="btn sm ghost" data-do="bed">Allocate</button>` : `<button type="button" class="btn sm ghost" data-do="proc">Update</button>`} <button type="button" class="btn sm ghost" data-stop="${k}">End</button>`
        : `<button type="button" class="btn sm primary" data-start="${k}">${ic('plus')}Start</button>`;
      return `<div class="wfcard ${w.active ? 'on' : ''}"><div class="wfh">${ic(k === 'vitals' ? 'heart' : k === 'bed' ? 'bed' : 'syringe')}<b>${D.WF[k]}</b><span class="grow"></span>${acts}</div>${info || '<div class="hint">Not enrolled</div>'}</div>`;
    };
    UI.modal({
      title: `Patient Record — ${esc(p.urn)}${act ? '' : ' (exited)'}`, icon: 'users', wide: true, submit: 'Save Details',
      extraButtons: act ? `<button type="button" class="btn green" data-do="exit">${ic('door')}Record exit / Global Exit</button>` : `<button type="button" class="btn ghost" data-do="reopen">${ic('undo')}Reopen</button>`,
      body: `${act ? '' : `<div class="note">${ic('door')} Exited ${U.full(p.exit.time)} — ${esc(p.exit.label)}${p.exit.bed ? ' · ' + esc(p.exit.bed) : ''} by ${esc(p.exit.by)}${p.exit.reason ? ' · ' + esc(p.exit.reason) : ''}</div>`}
        <fieldset ${act ? '' : 'disabled'}><div class="g3">
          ${field('Name', inp('name', p.name, 'maxlength="80" required'))}
          ${field('CTAS (re-triage)', sel('ctas', D.CTAS, p.ctas))}
          ${field('Encounter ID', inp('encounterId', p.encounterId, 'maxlength="24"'))}
          ${field('Diagnosis', inp('diagnosis', p.diagnosis, 'maxlength="120" required'), '', 'span2')}
          ${field('Treating Physician', inp('physician', p.physician === 'Unassigned' ? '' : p.physician, 'list="dl-phys" maxlength="60" placeholder="Unassigned"'))}
          ${field('ED Team', inp('team', p.team, 'maxlength="40" required'))}
          ${field('Change note', inp('note', '', 'maxlength="200" placeholder="Optional, e.g. re-triaged after deterioration"'), '', 'span2')}
        </div></fieldset>
        <h4 class="sh">Workflows</h4><div class="g3">${D.WF_KEYS.map(wfCard).join('')}</div>
        <h4 class="sh">Timeline (${evs.length})</h4>
        <div class="timeline">${evs.map(e => `<div class="tl"><span class="mono">${esc(U.full(e.ts))}</span><b>${esc(e.eventType)}</b><span>${esc(e.prev)}${e.prev || e.next ? ' → ' : ''}${esc(e.next)}</span><small>${esc(e.user)} · ${esc(e.notes)}</small></div>`).join('') || '<p class="hint">No events.</p>'}</div>`,
      onMount: (el, form, m) => {
        if (!act) { const sb = form.querySelector('[type=submit]'); sb.hidden = true; }
        el.addEventListener('click', e => {
          const go = e.target.closest('[data-do]'), start = e.target.closest('[data-start]'), stop = e.target.closest('[data-stop]');
          if (go) { m.close(); ({ reassess: UI.reassessModal, bed: UI.bedModal, proc: UI.procModal, exit: UI.exitModal, reopen: UI.reopenModal })[go.dataset.do](id); }
          if (start) { m.close(); UI.startWfModal(id, start.dataset.start); }
          if (stop) { m.close(); UI.reasonModal(`End ${D.WF[stop.dataset.stop]} (${esc(p.urn)})`, 'Reason for ending this workflow', reason => run('STOP_WORKFLOW', { id, wf: stop.dataset.stop, reason, expectedVersion: p.version }, `${D.WF[stop.dataset.stop]} ended for ${p.urn}.`)); }
        });
      },
      onSubmit: async (f, d) => {
        await run('UPDATE_DETAILS', { id, expectedVersion: p.version, note: d.note, changes: { name: d.name, ctas: d.ctas, encounterId: d.encounterId, diagnosis: d.diagnosis, physician: d.physician, team: d.team } }, `Details updated for ${p.urn}.`);
      },
    });
  };

  UI.startWfModal = (id, wf) => {
    const p = fresh(id); if (!p) return;
    const body = wf === 'vitals'
      ? `${patientCard(p)}<p>Start reassessment monitoring at ${esc(p.ctas)} interval (${st().ctasIntervals[p.ctas] === 0 || p.ctas === 'CTAS 1' ? 'continuous' : st().ctasIntervals[p.ctas] ? 'every ' + st().ctasIntervals[p.ctas] + ' min' : 'no target'}). The first reassessment is due one interval from now.</p>`
      : wf === 'bed'
        ? `${patientCard(p)}${field('Intended Specialty for Referral *', inp('intendedSpecialty', '', 'list="dl-spec" required maxlength="60" autofocus'))}`
        : `${patientCard(p)}${field('Planned Procedure / Imaging *', inp('plannedProcedure', '', 'list="dl-proc" required maxlength="80" autofocus'))}<div class="g2">${field('Consent', sel('consent', D.CONSENT, 'Pending'))}${field('Arranged', sel('arranged', D.ARRANGED, 'No'))}</div>`;
    UI.modal({ title: `Start ${D.WF[wf]} (${esc(p.urn)})`, icon: 'plus', submit: 'Start workflow', body,
      onSubmit: async (f, d) => { await run('START_WORKFLOW', Object.assign({ id, wf, expectedVersion: p.version }, d), `${D.WF[wf]} started for ${p.urn}.`); } });
  };

  // ------------------------------------------------------------------ modal: SBAR handoff
  UI.handoffModal = () => {
    const make = notes => { const t = now(); return D.sbar(S.state, st(), t, { privacy: S.device.privacy, user: S.user && S.user.name, demo: S.device.mode === 'demo', notes, window: D.handoffWindow(shiftPattern().shifts, t, offsetAt(t)) }); };
    UI.modal({
      title: 'One-Click Shift Handoff Generator (SBAR Format)', icon: 'clip', wide: true, submit: 'Copy SBAR Report',
      extraButtons: `<button type="button" class="btn ghost" data-print>Print</button><button type="button" class="btn ghost" data-dl>Download .txt</button>`,
      body: `<p class="hint">Built from the live board — every count and patient listed is real. ${S.device.privacy ? 'Names are shown as initials (privacy screen is on).' : 'Turn on the privacy screen to replace names with initials.'}</p>
        ${shiftToggle(k => `data-sv="${k}"`)}
        <textarea class="sbar" readonly rows="18">${esc(make(''))}</textarea>
        ${field('Outgoing nurse notes (added to the report)', `<textarea name="notes" rows="3" maxlength="1000"></textarea>`)}`,
      onMount: (el, form) => {
        const ta = $('.sbar', el);
        form.elements.notes.oninput = () => (ta.value = make(form.elements.notes.value));
        $$('[data-sv]', el).forEach(b => (b.onclick = () => {
          S.device.shiftView = b.dataset.sv; S.saveDevice();
          $$('[data-sv]', el).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
          ta.value = make(form.elements.notes.value);
          UI.renderBody();
        }));
        $('[data-print]', el).onclick = () => { const w = window.open('', '_blank'); if (!w) return UI.toast('Pop-up blocked — allow pop-ups to print.', 'warn'); w.document.write(`<pre style="font:12px/1.45 ui-monospace,Consolas,monospace;white-space:pre-wrap">${esc(ta.value)}</pre>`); w.document.close(); w.print(); };
        $('[data-dl]', el).onclick = () => U.download(`SBAR_${U.stamp()}.txt`, ta.value, 'text/plain;charset=utf-8');
      },
      onSubmit: async f => { const ok = await U.copyText($('.sbar', f).value); UI.toast(ok ? 'Shift Handoff SBAR copied to clipboard.' : 'Copy failed — select the text and press Ctrl+C.', ok ? 'success' : 'error'); return true; },
    });
  };

  // ------------------------------------------------------------------ settings
  // Job titles offered on the Staff & Access page: [title, role, shift report, Sheet access] it starts with (the Admin can change each).
  const JOB_TITLES = [
    ['ED Director', 'ED Leader', true, 'Viewer'], ['Adult ED Unit Head', 'ED Leader', true, 'Viewer'], ['Pediatric ED Unit Head', 'ED Leader', true, 'Viewer'],
    ['ED Head Nurse', 'ED Leader', true, 'Viewer'], ['Assistant Head Nurse', 'ED Leader', true, 'Viewer'], ['Nurse Educator', 'ED Leader', false, 'None'],
    ['Quality / Patient Flow Coordinator', 'ED Leader', false, 'Viewer'], ['Charge Nurse', 'Charge Nurse', false, 'None'], ['Staff Nurse', 'Nurse', false, 'None'],
    ['ED Physician', 'Physician', false, 'None'], ['Bed Coordinator', 'Bed Coordinator', false, 'None'],
  ];
  const ROLE_HELP = `<b>Nurse · Physician · Bed Coordinator:</b> the station workflows (admit, reassess, beds, procedures, exits).
    <b>Charge Nurse:</b> the same, plus analytics, audit trail, settings and reopening exits.
    <b>ED Leader:</b> the detailed view for directors, unit heads and head nurses: all of that, plus Excel exports and the Google Sheet.
    <b>Admin:</b> everything, plus this Staff &amp; Access page. Give it to the leaders who should manage staff with you.`;

  const isTraining = () => !!(window.PULSEED_SITE || {}).training;

  // Training copy of Staff & Access: the same page and checks as the live one, kept in this browser.
  // Nobody is shared, emailed or given access, so leaders can practise before any real staff are added.
  const practiceStaff = {
    key: 'pulseed:v2:practiceStaff', owner: 'owner@example.org', limits: { staff: 500, sheet: 100, report: 30 },
    seed: () => [
      { name: 'You (system owner)', email: 'owner@example.org', title: 'System owner', role: 'Admin', report: true, access: 'Owner', app: true, owner: true },
      { name: 'Dr. A. Director', email: 'ed.director@example.org', title: 'ED Director', role: 'ED Leader', report: true, access: 'Viewer', app: true },
      { name: 'Dr. B. Adult Head', email: 'adult.head@example.org', title: 'Adult ED Unit Head', role: 'ED Leader', report: true, access: 'Viewer', app: true },
      { name: 'Dr. C. Peds Head', email: 'peds.head@example.org', title: 'Pediatric ED Unit Head', role: 'ED Leader', report: true, access: 'Viewer', app: true },
      { name: 'D. Head Nurse', email: 'head.nurse@example.org', title: 'ED Head Nurse', role: 'Admin', report: true, access: 'Viewer', app: true },
      { name: 'E. Charge Nurse', email: 'charge.nurse@example.org', title: 'Charge Nurse', role: 'Charge Nurse', report: false, access: 'None', app: true },
      { name: 'F. Staff Nurse', email: 'staff.nurse@example.org', title: 'Staff Nurse', role: 'Nurse', report: false, access: 'None', app: true },
    ],
    async staffList() { return { owner: this.owner, roles: PE.ROLES, staff: U.ls.get(this.key) || this.seed(), limits: this.limits, practice: true }; },
    async staffSave(list) {
      const seen = {}, L = this.limits;
      list.forEach(p => {
        if (seen[p.email]) throw new D.RuleError(`${p.email} is listed twice.`);
        seen[p.email] = true;
        if (p.email === this.owner) Object.assign(p, { owner: true, role: 'Admin', access: 'Owner', app: true });
        else if (!PE.ROLES.includes(p.role)) throw new D.RuleError(`Choose a role for ${p.email}.`);
        else if (!PE.LEADER_ROLES.includes(p.role)) p.access = 'None';
      });
      if (!seen[this.owner]) list.unshift(this.seed()[0]);
      if (list.length > L.staff) throw new D.RuleError(`The staff list is limited to ${L.staff} people.`);
      const sheet = list.filter(p => p.access !== 'None').length, rep = list.filter(p => p.report).length;
      if (sheet > L.sheet) throw new D.RuleError(`${sheet} people have Sheet access; the limit is ${L.sheet}. Set nurses to None.`);
      if (rep > L.report) throw new D.RuleError(`${rep} people get the shift report; the limit is ${L.report}. Use a Google Group address for a bigger list.`);
      U.ls.set(this.key, list);
      return Object.assign(await this.staffList(), { shared: [], revoked: [] });
    },
  };

  /** Staff & Access (Admin, live register): edits the Recipients tab and shares the register in Drive to match. */
  UI.staffModal = async () => {
    const practice = isTraining();
    if (!(S.isShared() || practice) || !S.user || S.user.role !== 'Admin') return UI.toast(practice ? 'Sign in with the Admin role to practise Staff & Access.' : 'Only an Admin signed in to the live register can manage staff.', 'warn');
    const src = practice ? practiceStaff : S.adapter;
    let data;
    try { data = await src.staffList(); } catch (e) { return UI.toast(e.message, 'error'); }
    const lim = data.limits || { staff: 500, sheet: 100, report: 30 };
    const orig = {}; data.staff.forEach(p => (orig[p.email] = p));
    const opts = (list, cur) => list.map(v => `<option${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join('');
    const row = (p = { role: 'Nurse', access: 'None', app: true, report: false }) => `<tr data-row ${p.owner ? 'data-owner' : ''} data-notes="${esc(p.notes || '')}">
      <td><input data-k="name" value="${esc(p.name || '')}" maxlength="80" placeholder="e.g. A. Khan" aria-label="Name"></td>
      <td><input data-k="email" type="email" value="${esc(p.email || '')}" maxlength="120" placeholder="name@gmail.com" aria-label="Google email" ${p.owner ? 'readonly' : ''}></td>
      <td><input data-k="title" list="dl-titles" value="${esc(p.title || '')}" maxlength="60" placeholder="e.g. ED Head Nurse" aria-label="Job title"></td>
      <td>${p.owner ? '<b>Admin</b> (owner)' : `<select data-k="role" aria-label="Role">${opts(data.roles, p.role)}</select>`}</td>
      <td class="c"><input type="checkbox" data-k="report" ${p.report ? 'checked' : ''} aria-label="Gets the shift report"></td>
      <td>${p.owner ? 'Owner' : `<select data-k="access" aria-label="Sheet access" ${PE.LEADER_ROLES.includes(p.role) ? '' : 'disabled'}>${opts(['Editor', 'Viewer', 'None'], PE.LEADER_ROLES.includes(p.role) ? p.access : 'None')}</select>`}</td>
      <td class="c">${p.owner ? '✓' : `<input type="checkbox" data-k="app" ${p.app !== false ? 'checked' : ''} aria-label="Can sign in to PulseED">`}</td>
      <td class="r">${p.owner ? '' : `<button type="button" class="btn sm ghost" data-del title="Remove">${ic('x')}</button>`}</td></tr>`;
    let confirmed = false;
    UI.modal({
      title: 'Staff &amp; Access', icon: 'users', wide: true, submit: 'Save &amp; share',
      body: `${practice ? `<p class="note">${ic('shield')} <b>Practice copy (training)</b>: works exactly like the real page, but nothing is shared, emailed or given access. The emails below are examples.</p>` : ''}<p class="hint">Who can sign in to PulseED, what they can do, who gets the shift report by email, and who can open the PulseED Register in Google Drive. Each person signs in with the Google email entered here. Saving shares the register to match and removes Drive access from anyone taken off the list or set to None.</p>
        <details class="rolehelp"><summary>What each role can do</summary><p class="hint">${ROLE_HELP}</p>
          <p class="hint"><b>Sheet access</b> is for ED Leaders and Admins only; everyone else works in PulseED. <b>Shift report</b> is limited to ${lim.report} people (Gmail's daily limit); for a bigger list, enter a Google Group address as one person.</p></details>
        <datalist id="dl-titles">${JOB_TITLES.map(t => `<option value="${esc(t[0])}">`).join('')}</datalist>
        <div class="row wrap"><input type="search" data-q placeholder="Search name, email, title or role…" aria-label="Search staff" class="grow">
          <button type="button" class="btn ghost" data-add>${ic('plus')}Add person</button>
          <button type="button" class="btn ghost" data-bulk>${ic('users')}Add many (paste a list)</button></div>
        <div class="bulk" data-bulkbox hidden>
          ${field('Paste one person per line: name and Google email, separated by a comma or tab (copy two columns straight from Excel)', '<textarea data-paste rows="6" placeholder="Aisha Khan, aisha.khan@gmail.com&#10;Omar Ali&#9;omar.ali@hospital.org"></textarea>')}
          <div class="row wrap">${field('Job title for all of them', `<input data-btitle list="dl-titles" value="Staff Nurse" maxlength="60">`)}
            <button type="button" class="btn primary" data-badd>${ic('plus')}Add to the list</button><small class="hint" data-bmsg></small></div></div>
        <div class="tw staffwrap"><table class="staff"><thead><tr><th>Name (as on badge)</th><th>Google email</th><th>Job title</th><th>Role</th><th class="c">Shift report</th><th>Sheet access</th><th class="c">Can sign in</th><th></th></tr></thead>
        <tbody>${data.staff.map(row).join('')}</tbody></table></div>
        <p class="hint" data-count></p>`,
      onMount: el => {
        const body = $('tbody', el);
        const count = () => {
          const rows = $$('[data-row]', el), n = sel => rows.filter(sel).length;
          const rep = n(tr => $('[data-k="report"]', tr).checked), sh = n(tr => tr.hasAttribute('data-owner') || /Editor|Viewer/.test($('[data-k="access"]', tr).value));
          const lead = n(tr => tr.hasAttribute('data-owner') || /ED Leader|Admin/.test($('[data-k="role"]', tr).value));
          const over = (v, max) => (v > max ? ` <b class="tred">(limit ${max})</b>` : ` <span>of ${max}</span>`);
          $('[data-count]', el).innerHTML = `<b>${rows.length}</b> people${over(rows.length, lim.staff)} · ${lead} leaders / admins · ${rep} get the shift report${over(rep, lim.report)} · ${sh} with Sheet access${over(sh, lim.sheet)}`;
        };
        const touched = () => { count(); confirmed = false; };
        $('[data-add]', el).onclick = () => { body.insertAdjacentHTML('afterbegin', row()); touched(); $('tr:first-child input', body).focus(); };
        $('[data-bulk]', el).onclick = () => { const b = $('[data-bulkbox]', el); b.hidden = !b.hidden; if (!b.hidden) $('[data-paste]', el).focus(); };
        $('[data-badd]', el).onclick = () => {
          const title = U.norm($('[data-btitle]', el).value), preset = JOB_TITLES.find(t => t[0] === title) || [title, 'Nurse', false, 'None'];
          const have = new Set($$('[data-k="email"]', el).map(x => x.value.trim().toLowerCase()));
          let added = 0, skipped = 0, bad = [];
          U.lines($('[data-paste]', el).value).forEach(line => {
            const m = line.match(/[^\s,;<>"]+@[^\s,;<>"]+\.[^\s,;<>"]+/);
            if (!m) { bad.push(line); return; }
            const email = m[0].toLowerCase(), name = U.norm(line.replace(m[0], ' ').replace(/[<>"]/g, ' ').replace(/[\t,;]+/g, ' '));
            if (have.has(email)) { skipped++; return; }
            have.add(email); added++;
            body.insertAdjacentHTML('afterbegin', row({ name, email, title, role: preset[1], report: preset[2], access: preset[3], app: true }));
          });
          $('[data-paste]', el).value = bad.join('\n');
          $('[data-bmsg]', el).textContent = `Added ${added}.${skipped ? ` ${skipped} already on the list.` : ''}${bad.length ? ` ${bad.length} line(s) without an email are left in the box.` : ''} Click "Save & share" to finish.`;
          touched();
        };
        // Enter in the search or title box must not submit (and share) the whole list.
        el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) e.preventDefault(); });
        $('[data-q]', el).oninput = e => {
          const q = U.key(e.target.value);
          $$('[data-row]', el).forEach(tr => { tr.hidden = !!q && !$$('input,select', tr).some(x => U.key(x.value).includes(q)); });
        };
        body.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { b.closest('tr').remove(); touched(); } });
        body.addEventListener('change', e => {
          // Picking a known job title fills in its usual role, report and Sheet access.
          const t = e.target.closest('[data-k="title"]'), tr = e.target.closest('tr');
          const preset = t && JOB_TITLES.find(x => x[0] === U.norm(t.value));
          if (preset && !tr.hasAttribute('data-owner')) { $('[data-k="role"]', tr).value = preset[1]; $('[data-k="report"]', tr).checked = preset[2]; $('[data-k="access"]', tr).value = preset[3]; }
          // The Google Sheet is for ED Leaders and Admins only.
          const role = $('[data-k="role"]', tr), access = $('[data-k="access"]', tr);
          if (role && access) { const lead = PE.LEADER_ROLES.includes(role.value); access.disabled = !lead; if (!lead) access.value = 'None'; }
          touched();
        });
        count();
      },
      onSubmit: async (form, d, m) => {
        const val = (tr, k) => { const x = $(`[data-k="${k}"]`, tr); return !x ? null : x.type === 'checkbox' ? x.checked : U.norm(x.value); };
        const staff = $$('[data-row]', form).map(tr => ({ name: val(tr, 'name'), email: (val(tr, 'email') || '').toLowerCase(), title: val(tr, 'title') || '', role: val(tr, 'role') || 'Admin', report: val(tr, 'report'), access: val(tr, 'access') || 'Owner', app: tr.hasAttribute('data-owner') ? true : val(tr, 'app'), notes: tr.dataset.notes || '' }))
          .filter(p => p.name || p.email);
        staff.forEach((p, i) => {
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) throw new D.RuleError(`${p.name || 'Row ' + (i + 1)}: enter the person's Google email.`);
          if (p.name.length < 2) throw new D.RuleError(`Enter a name for ${p.email}. It is recorded on every action.`);
        });
        const keep = new Set(staff.map(p => p.email));
        const removed = Object.keys(orig).filter(e => !keep.has(e));
        const cut = staff.filter(p => orig[p.email] && orig[p.email].access !== 'None' && p.access === 'None').map(p => p.email);
        if ((removed.length || cut.length) && !confirmed) {
          confirmed = true;
          m.showError(`This takes away access for ${[...removed, ...cut].join(', ')}. Click "Save & share" again to confirm.`);
          return true;
        }
        const r = await src.staffSave(staff);
        if (practice) return UI.toast(`Practice list saved: ${r.staff.length} people. This is training, so nobody was shared, emailed or given access.`, 'success');
        await S.reload();
        const notes = [...(r.shared || []), ...(r.revoked || [])];
        UI.toast(`Staff list saved: ${r.staff.length} people.${notes.length ? ' ' + notes.join(' · ') : ''}`, 'success');
      },
    });
  };

  UI.settingsForm = () => {
    const s = st(), sup = D.isSupervisor(S.user);
    const num = (name, val, min, max, label, hint) => field(label, `<input type="number" name="${name}" value="${esc(val)}" min="${min}" max="${max}" step="1" required>`, hint);
    const admin = (S.isShared() || isTraining()) && S.user && S.user.role === 'Admin';
    return `${admin ? `<section class="panel"><h3>Staff &amp; Access${isTraining() ? ' <span class="pill amber">practice</span>' : ''}</h3>
        ${isTraining() ? '<p class="note">Training copy: try adding people, roles and job titles here. Nothing is shared, emailed or given access; the real page is in the live system.</p>' : ''}
        <p class="hint">Add nurses, physicians and ED leaders (ED Director, unit heads, head nurse), set their job title and role, choose who gets the shift report, and share the PulseED Register with leaders. Paste a whole list at once for large teams. Only Admins see this; make other leaders Admin to share the work.</p>
        <div class="row"><button type="button" class="btn primary" data-act="staff">${ic('users')}Manage staff &amp; access</button></div></section>` : ''}
    <form id="setForm" class="settings" novalidate>
      ${sup ? '' : `<div class="note">${ic('lock')} Read-only — sign in as a Charge Nurse, ED Leader or Admin to change department settings.</div>`}
      <fieldset ${sup ? '' : 'disabled'}>
      <section class="panel"><h3>Department</h3><div class="g3">
        ${field('Department / site name', inp('siteName', s.siteName, 'maxlength="60" required'))}
        ${field('Default station name', inp('stationName', s.stationName, 'maxlength="40"'))}
      </div></section>
      <section class="panel"><h3>Reassessment timing (CTAS)</h3><p class="hint">CTAS 1 is always continuous observation and raises a safety alert if it is on the waiting-area board.</p><div class="g4">
        ${['CTAS 2', 'CTAS 3', 'CTAS 4', 'CTAS 5'].map(c => num('iv_' + c.slice(-1), s.ctasIntervals[c], 1, 480, `${c} interval (min)`)).join('')}
        ${num('dueSoonMaxMin', s.dueSoonMaxMin, 1, 60, '"Due soon" max window (min)')}
        ${num('dueSoonPct', Math.round(s.dueSoonFraction * 100), 5, 90, '"Due soon" as % of interval', 'Window = smaller of the two.')}
        ${num('backdateMaxMin', s.backdateMaxMin, 0, 720, 'Max back-dating (min)')}
        ${num('complianceTargetPct', s.complianceTargetPct, 1, 100, 'Compliance target (%)')}
      </div></section>
      <section class="panel"><h3>Wait-time thresholds &amp; alerts</h3><div class="g4">
        ${num('bedWaitAmberMin', s.bedWaitAmberMin, 1, 1440, 'Bed wait amber (min)')}${num('bedWaitRedMin', s.bedWaitRedMin, 1, 1440, 'Bed wait red (min)')}
        ${num('procWaitAmberMin', s.procWaitAmberMin, 1, 1440, 'Procedure wait amber (min)')}${num('procWaitRedMin', s.procWaitRedMin, 1, 1440, 'Procedure wait red (min)')}
        ${num('chimeRepeatMin', s.chimeRepeatMin, 1, 30, 'Repeat overdue chime every (min)')}${num('autoLockMin', s.autoLockMin, 0, 240, 'Auto-lock after inactivity (min)', '0 = never (not recommended)')}
        ${num('exitedRetentionHours', s.exitedRetentionHours, 24, 2160, 'Keep exited patients (h)')}${num('eventRetentionHours', s.eventRetentionHours, 24, 8760, 'Keep audit events on this PC (h)')}
      </div></section>
      <section class="panel"><h3>Lists</h3><p class="hint">One entry per line.</p><div class="g4">
        ${field('ED teams', `<textarea name="teams" rows="6">${esc(s.teams.join('\n'))}</textarea>`)}
        ${field('Specialties', `<textarea name="specialties" rows="6">${esc(s.specialties.join('\n'))}</textarea>`)}
        ${field('Procedures / imaging', `<textarea name="procedures" rows="6">${esc(s.procedures.join('\n'))}</textarea>`)}
        ${field('ED beds', `<textarea name="beds" rows="6">${esc(s.beds.join('\n'))}</textarea>`)}
      </div></section>
      <section class="panel"><h3>PatientFlow MS register (all workstations)</h3>
        <p class="hint">${S.isShared()
          ? `Connected to the shared PulseED register (Google Sheet owned by the system owner). Admins manage staff above under Staff &amp; Access; report times are in that Sheet’s Settings tab. Status: <b>${esc(S.adapter.status().label)}</b>.`
          : 'This station keeps data in this browser only. The shared, multi-workstation register is used automatically at pulseed.patientflowms.com (configured in <code>js/site-config.js</code>).'}</p>
      </section>
      <div class="row end"><button type="submit" class="btn primary">${ic('check')}Save department settings</button></div>
      </fieldset>
    </form>
    <section class="panel"><h3>This station</h3><div class="row wrap">
      <button class="btn ghost" data-act="rename">${ic('edit')}Rename station</button>
      <button class="btn ghost" data-act="privacy">${ic('eyeoff')}Toggle privacy screen</button>
      <button class="btn ghost" data-act="theme">${ic('moon')}Toggle night mode</button>
      <button class="btn ghost" data-act="testchime">${ic('bell')}Test alert sound</button>
    </div></section>
    <section class="panel"><h3>Data</h3><p class="hint">Mode: <b>${S.device.mode === 'demo' ? 'Training / Demo' : 'Live'}</b> · ${Object.keys(S.state.patients).length} patient records · ${S.state.events.length} audit events · storage: ${esc(S.adapter.status().label)}</p><div class="row wrap">
      ${D.isLeader(S.user) ? `<button class="btn ghost" data-act="x-backup">${ic('download')}Export full backup</button>` : ''}
      <button class="btn ghost" data-act="import">${ic('upload')}Restore backup…</button>
      <button class="btn ghost" data-act="switchmode">${ic('shield')}Switch to ${S.device.mode === 'demo' ? 'live' : 'training / demo'} mode</button>
      ${S.device.mode === 'demo' ? `<button class="btn ghost" data-act="reseed">${ic('undo')}Reset demo data</button>` : ''}
      <button class="btn red" data-act="wipe">${ic('x')}Erase all ${S.device.mode === 'demo' ? 'demo' : 'live'} data on this PC</button>
    </div></section>`;
  };

  UI.bindSettings = () => {
    const f = $('#setForm'); if (!f) return;
    f.onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f).entries());
      try {
        const n = k => { const v = Number(d[k]); if (!Number.isFinite(v)) throw new D.RuleError(`Invalid number: ${k}`); return Math.round(v); };
        const next = U.clone(st());
        next.siteName = U.norm(d.siteName) || 'Emergency Department';
        next.stationName = U.norm(d.stationName) || 'Waiting Area Station';
        ['2', '3', '4', '5'].forEach(c => { const v = n('iv_' + c); if (v < 1 || v > 480) throw new D.RuleError(`CTAS ${c} interval must be 1–480 min.`); next.ctasIntervals['CTAS ' + c] = v; });
        ['dueSoonMaxMin', 'backdateMaxMin', 'complianceTargetPct', 'bedWaitAmberMin', 'bedWaitRedMin', 'procWaitAmberMin', 'procWaitRedMin', 'chimeRepeatMin', 'autoLockMin', 'exitedRetentionHours', 'eventRetentionHours'].forEach(k => (next[k] = n(k)));
        next.dueSoonFraction = n('dueSoonPct') / 100;
        if (next.bedWaitAmberMin >= next.bedWaitRedMin || next.procWaitAmberMin >= next.procWaitRedMin) throw new D.RuleError('Amber thresholds must be lower than red thresholds.');
        ['teams', 'specialties', 'procedures', 'beds'].forEach(k => { const l = U.uniq(U.lines(d[k])); if (!l.length) throw new D.RuleError(`The ${k} list cannot be empty.`); next[k] = l; });
        await S.saveSettings(next);
        UI._forceSettings = true; UI.refresh();
        UI.toast(S.isShared() ? 'Department settings saved for every station.' : 'Department settings saved.');
      } catch (ex) { UI.toast(ex.message, 'error'); }
    };
  };

  // ------------------------------------------------------------------ exports
  const dn = (p, deid) => (deid ? U.initials(p.name) : p.name);
  // Exports are part of the audit trail (who took patient data off the system, and when).
  const logExport = what => S.logExport(what, UI.vs.deid !== false);
  UI.exportCsv = kind => {
    const deid = UI.vs.deid !== false;
    const all = Object.values(S.state.patients);
    const f = U.full;
    const eps = key => { const out = []; all.forEach(p => { (p.pastEpisodes || []).filter(e => e.wf === key).forEach(e => out.push([p, e])); const w = p.workflows[key]; if (w && (w.startTime || w.addedTime || w.requestTime)) out.push([p, w]); }); return out; };
    let name, csv;
    if (kind === 'x-master') { name = 'Patient_Master'; csv = U.csv(['URN', 'EncounterID', 'Name', 'CTAS', 'Diagnosis', 'Physician', 'Team', 'Status', 'RegisteredAt', 'RegisteredBy', 'ExitType', 'ExitTime', 'ExitBed', 'ExitBy', 'ExitNote'], all.map(p => [p.urn, p.encounterId, dn(p, deid), p.ctas, p.diagnosis, p.physician, p.team, p.status, f(p.createdAt), p.createdBy, p.exit ? p.exit.label : '', p.exit ? f(p.exit.time) : '', p.exit ? p.exit.bed : '', p.exit ? p.exit.by : '', p.exit ? p.exit.reason : ''])); }
    if (kind === 'x-vitals') { name = 'Vitals_Episodes'; csv = U.csv(['URN', 'EncounterID', 'Name', 'CTAS', 'StartTime', 'LastReassessment', 'ReassessmentCount', 'ReassessmentTimes', 'Active', 'EndTime', 'EndReason'], eps('vitals').map(([p, v]) => [p.urn, p.encounterId, dn(p, deid), v.ctas || p.ctas, f(v.startTime), f(v.lastReassessment), (v.reassessments || []).length, (v.reassessments || []).map(U.t24).join(' '), v.active, f(v.endTime), v.endReason])); }
    if (kind === 'x-bed') { name = 'Bed_Episodes'; csv = U.csv(['URN', 'EncounterID', 'Name', 'Diagnosis', 'IntendedSpecialty', 'BedAllocated', 'AllocatedBed', 'AddedTime', 'FirstAllocationTime', 'AllocationTime', 'PlacementTime', 'PhysicallyPlaced', 'MinsToAllocation', 'MinsToPlacement', 'Active', 'EndReason'], eps('bed').map(([p, b]) => [p.urn, p.encounterId, dn(p, deid), p.diagnosis, b.intendedSpecialty, b.bedAllocated, b.allocatedBed, f(b.addedTime), f(b.firstAllocationTime), f(b.allocationTime), f(b.placementTime), b.physicallyPlaced, b.firstAllocationTime ? U.minsBetween(b.addedTime, b.firstAllocationTime) : '', b.placementTime ? U.minsBetween(b.addedTime, b.placementTime) : '', b.active, b.endReason])); }
    if (kind === 'x-proc') { name = 'Procedure_Episodes'; csv = U.csv(['URN', 'EncounterID', 'Name', 'PlannedProcedure', 'Consent', 'Arranged', 'Status', 'RequestTime', 'CompletionTime', 'TurnaroundMins', 'Active', 'EndReason'], eps('procedure').map(([p, r]) => [p.urn, p.encounterId, dn(p, deid), r.plannedProcedure, r.consent, r.arranged, r.status, f(r.requestTime), f(r.completionTime), r.completionTime ? U.minsBetween(r.requestTime, r.completionTime) : '', r.active, r.endReason])); }
    if (kind === 'x-audit') { name = 'Event_Audit_Trail'; const pm = S.state.patients; csv = U.csv(['EventID', 'Timestamp', 'TimestampUTC', 'URN', 'EncounterID', 'Workflow', 'EventType', 'PreviousStatus', 'NewStatus', 'User', 'Role', 'Station', 'Notes', 'Checksum'], S.state.events.map(e => [e.id, f(e.ts), e.ts, e.urn, e.encounterId, e.workflow, e.eventType, e.prev, e.next, e.user, e.role, e.device, deid && pm[e.patientId] ? e.notes.split(pm[e.patientId].name).join(U.initials(pm[e.patientId].name)) : e.notes, e.hash])); }
    U.download(`PulseED_${name}_${S.device.mode === 'demo' ? 'DEMO_' : ''}${U.stamp()}.csv`, csv);
    logExport(name + '.csv');
    UI.toast(`${name.replace(/_/g, ' ')} spreadsheet downloaded.`);
  };
  UI.exportBackup = () => {
    U.download(`PulseED_Backup_${S.device.mode === 'demo' ? 'DEMO_' : ''}${U.stamp()}.json`, JSON.stringify({ app: 'PulseED', version: PE.VERSION, mode: S.device.mode, exportedAt: U.iso(Date.now()), settings: S.settings, state: S.state }, null, 1), 'application/json');
    logExport('Full backup .json');
    UI.toast('Full backup downloaded. It contains identifiable patient data — store it securely.', 'warn');
  };

  // ------------------------------------------------------------------ click dispatcher
  const needUser = fn => (...a) => { if (!S.user) { UI.signInModal(); return; } fn(...a); };
  const needLeader = fn => needUser((...a) => { if (!D.isLeader(S.user)) return UI.toast('Spreadsheet exports are for ED Leaders and Admins.', 'warn'); fn(...a); });
  const ACT = {
    nav: id => UI.go(id),
    open: needUser(UI.patientModal),
    reassess: needUser(UI.reassessModal),
    bed: needUser(UI.bedModal),
    proc: needUser(UI.procModal),
    exit: needUser(id => UI.exitModal(id)),
    reopen: needUser(UI.reopenModal),
    new: needUser(UI.newPatientModal),
    handoff: needUser(UI.handoffModal),
    shiftview: id => { S.device.shiftView = id === 'nursing' ? 'nursing' : 'doctor'; S.saveDevice(); UI.refresh(); },
    staff: needUser(UI.staffModal),
    privacy: () => { S.device.privacy = !S.device.privacy; S.saveDevice(); UI.refresh(); },
    sound: () => { S.device.sound = !S.device.sound; S.saveDevice(); if (S.device.sound && PE.audio) PE.audio.chime('test'); UI.renderChrome(); UI.toast(S.device.sound ? 'Audio alerts on.' : 'Audio alerts muted on this station. Visual alerts continue.', S.device.sound ? 'success' : 'warn'); },
    theme: () => { S.device.theme = S.device.theme === 'dark' ? 'light' : 'dark'; S.saveDevice(); UI.applyTheme(); UI.renderChrome(); },
    lock: () => {
      S.setUser(null);
      if (S.isShared()) { S.adapter.setToken(null); try { google.accounts.id.disableAutoSelect(); } catch (e) { /* not loaded */ } }
      UI.closeAll(); UI.refresh(); UI.signInModal('locked');
    },
    testchime: () => PE.audio && PE.audio.chime('overdue'),
    rename: () => UI.modal({ title: 'Rename station', icon: 'edit', body: field('Station name', inp('n', S.device.deviceName, 'maxlength="40" autofocus')), onSubmit: async (f, d) => { S.device.deviceName = U.norm(d.n); S.saveDevice(); UI.renderChrome(); } }),
    verify: () => {
      const r = D.verifyChain(S.state);
      r.ok ? UI.toast(`Audit trail intact — ${r.checked} events verified.`) : UI.toast(`AUDIT TRAIL ALTERED at event ${r.checked + 1} (${U.full(r.brokenAt.ts)} · ${r.brokenAt.eventType}). Inform the department lead.`, 'error');
    },
    'x-master': needLeader(UI.exportCsv), 'x-vitals': needLeader(UI.exportCsv), 'x-bed': needLeader(UI.exportCsv), 'x-proc': needLeader(UI.exportCsv), 'x-audit': needLeader(UI.exportCsv),
    'x-backup': needLeader(UI.exportBackup),
    import: needUser(() => {
      if (!D.isSupervisor(S.user)) return UI.toast('Only a Charge Nurse or Admin can restore a backup.', 'error');
      const i = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
      i.onchange = () => {
        const file = i.files[0]; if (!file) return;
        file.text().then(txt => {
          let b; try { b = JSON.parse(txt); } catch (e) { return UI.toast('That file is not valid JSON.', 'error'); }
          if (!b || b.app !== 'PulseED') return UI.toast('That file is not a PulseED backup.', 'error');
          if (b.mode !== S.device.mode) return UI.toast(`That backup is from ${b.mode} mode; switch to ${b.mode} mode to restore it.`, 'error');
          UI.modal({ title: 'Restore backup?', icon: 'upload', danger: true, submit: 'Replace current data',
            body: `<p>Backup from <b>${esc(U.full(b.exportedAt))}</b> with ${Object.keys(b.state.patients || {}).length} patients and ${(b.state.events || []).length} events will <b>replace</b> all current ${esc(S.device.mode)} data on this PC.</p>`,
            onSubmit: async () => { await S.replaceState(b.state); UI.refresh(); UI.toast('Backup restored.'); } });
        });
      };
      i.click();
    }),
    switchmode: () => {
      const site = window.PULSEED_SITE || {};
      // On patientflowms.com the mode is chosen by the address: the plain URL is live, ?training is the training copy.
      if (site.training || site.forceLive) return UI.modal({ title: site.training ? 'Leave training' : 'Open training', icon: 'shield', submit: site.training ? 'Open live PulseED' : 'Open training',
        body: site.training ? '<p>Open the live PulseED station? Training patients stay on this PC only and never reach the live register.</p>'
          : '<p>Open the training copy of PulseED in this tab? It uses synthetic patients only and never touches the live register. You will sign in again when you come back.</p>',
        onSubmit: async () => { location.href = location.pathname + (site.training ? '' : '?training'); } });
      return UI.modal({ title: 'Switch mode', icon: 'shield', submit: 'Switch',
      body: `<p>Switch this station to <b>${S.device.mode === 'demo' ? 'Live' : 'Training / Demo'}</b> mode? The two modes have separate data; nothing is deleted.</p>`,
      onSubmit: async () => { S.device.mode = S.device.mode === 'demo' ? 'live' : 'demo'; S.saveDevice(); location.reload(); } });
    },
    reseed: () => UI.modal({ title: 'Reset demo data', icon: 'undo', submit: 'Reset', body: '<p>Replace all demo data with a fresh synthetic data set?</p>',
      onSubmit: async () => { await S.adapter.replace(PE.demo.build(S.settings).state); await S.reload(); UI.toast('Demo data reset.'); } }),
    wipe: needUser(() => {
      if (!D.isSupervisor(S.user)) return UI.toast('Only a Charge Nurse or Admin can erase data.', 'error');
      UI.modal({ title: 'Erase all data on this PC', icon: 'alert', tone: 'danger', danger: true, submit: 'Erase permanently',
        body: `<p>This permanently deletes every ${esc(S.device.mode)} patient and audit event stored in this browser. Export a backup first.</p>${field('Type ERASE to confirm', inp('c', '', 'autocomplete="off" autofocus'))}`,
        onSubmit: async (f, d) => { if (d.c !== 'ERASE') throw new D.RuleError('Type ERASE in capitals to confirm.'); await S.wipe(); UI.refresh(); UI.toast('All data on this PC erased.', 'warn'); } });
    }),
  };
  function onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = ACT[el.dataset.act];
    if (!fn) return;
    e.preventDefault();
    try { el.dataset.act.startsWith('x-') ? fn(el.dataset.act) : fn(el.dataset.id, el); } catch (ex) { UI.toast(ex.message, 'error'); }
  }
})(window.PulseED);
