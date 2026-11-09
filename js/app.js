/* PulseED — bootstrap, alert engine, audio, auto-lock. */
(function (PE) {
  'use strict';
  const U = PE.util, D = PE.domain, S = PE.store, UI = PE.ui;

  // ------------------------------------------------------------------ audio (one shared context; unlocked on first interaction)
  PE.audio = {
    ctx: null, blocked: false,
    unlock() {
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.blocked = false;
      } catch (e) { this.ctx = null; }
    },
    chime(kind) {
      if (!this.ctx) this.unlock();
      const c = this.ctx;
      if (!c || c.state !== 'running') { this.blocked = true; return false; }
      const tones = kind === 'critical' ? [880, 660, 880, 660] : kind === 'test' ? [660] : [587.33, 880];
      tones.forEach((f, i) => {
        const t = c.currentTime + i * 0.28, o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.27);
      });
      return true;
    },
  };
  // Redraw only after the click has finished, so the first tap on a button (which also unlocks sound) is not lost.
  ['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, e => {
    const was = PE.audio.blocked; PE.audio.unlock(); if (!was) return;
    if (e.type === 'pointerdown') window.addEventListener('pointerup', () => setTimeout(UI.renderChrome, 0), { once: true }); else setTimeout(UI.renderChrome, 0);
  }, { passive: true }));

  // ------------------------------------------------------------------ leader election: one tab per PC logs system events and purges
  let leader = !(navigator.locks && navigator.locks.request);
  if (!leader) navigator.locks.request('pulseed-leader', () => { leader = true; return new Promise(() => {}); });

  // ------------------------------------------------------------------ alert engine
  let known = new Set(), lastChime = 0;
  function alerts() {
    if (!S.user && S.device.mode) { /* keep evaluating so the chime still sounds on a locked screen */ }
    const L = UI.lists();
    // A new boarding overstay chimes once; overdue reassessments and CTAS 1 keep repeating until handled.
    const repeat = L.overdue.map(p => p.id).concat(L.ctas1.map(p => 'c1' + p.id));
    const ids = new Set(repeat.concat(L.overstay.map(p => 'bo' + p.id)));
    const fresh = [...ids].some(id => !known.has(id));
    known = ids;
    const t = Date.now();
    if (S.device.sound && ids.size) {
      const shared = U.ls.get('pulseed:v2:lastChime', 0); // de-duplicate between tabs on this PC
      const due = repeat.length && t - Math.max(lastChime, shared) >= S.settings.chimeRepeatMin * 60000;
      if ((fresh && t - shared > 5000) || due) {
        if (PE.audio.chime(L.ctas1.length ? 'critical' : 'overdue')) { lastChime = t; try { U.ls.set('pulseed:v2:lastChime', t); } catch (e) { /* ignore */ } }
      }
    }
    if (leader && L.overdue.length && !S.isShared()) { // the shared register logs overdue events itself (server watchdog)
      L.overdue.forEach(p => {
        const tm = D.vitalsTiming(p, S.settings, t);
        if (!S.state.events.some(e => e.id === `ovd-${p.id}-${tm.due}`)) S.dispatchSystem('SYSTEM_OVERDUE', { id: p.id });
      });
    }
    if (leader && L.overstay.length && !S.isShared()) {
      L.overstay.forEach(p => { if (!S.state.events.some(e => e.id === `brd-${p.id}-${U.toMs(p.ed.decision.time)}`)) S.dispatchSystem('SYSTEM_BOARDING', { id: p.id }); });
    }
  }
  S.dispatchSystem = async (type, payload) => {
    try {
      await S.adapter.commit(fresh => {
        const r = D.apply(fresh, { type, payload }, Object.assign(S.ctx(), { user: { name: 'System', role: 'System' } }));
        return r.events.length ? r : null;
      });
    } catch (e) { /* system logging must never interrupt clinical use */ }
  };

  // ------------------------------------------------------------------ auto-lock
  let lastInput = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, () => (lastInput = Date.now()), { passive: true }));
  function autoLock() {
    const m = S.settings.autoLockMin;
    if (!m || !S.user) return;
    if (Date.now() - lastInput > m * 60000) {
      S.setUser(null);
      if (S.isShared()) S.adapter.setToken(null);
      UI.closeAll(); UI.refresh(); UI.signInModal('locked');
    }
  }

  // ------------------------------------------------------------------ boot
  async function start(mode) {
    await S.init(mode);
    // Training data is built around "now". If nobody has used it for 6 hours its clocks are stale (patients "29 h overdue"),
    // so it is rebuilt fresh; anyone actively practising keeps their own entries.
    const lastUse = mode === 'demo' ? Math.max(0, ...S.state.events.map(e => Date.parse(e.ts) || 0)) : 0;
    const stale = mode === 'demo' && Object.keys(S.state.patients).length && Date.now() - lastUse > 6 * 3600000;
    if (mode === 'demo' && (!Object.keys(S.state.patients).length || stale)) {
      await S.adapter.replace(PE.demo.build(S.settings).state);
      await S.reload();
      if (stale) setTimeout(() => UI.toast('Training data refreshed to the current time.', 'success'), 800);
    }
    UI.applyTheme();
    const h = (location.hash || '').slice(1);
    UI.go(UI.VIEWS[h] ? h : 'dashboard');
    UI.renderDatalists();
    S.on(() => { UI.renderChrome(); UI.renderBody(); });
    if (!S.user) UI.signInModal();

    const clock = document.getElementById('clock');
    const tickClock = () => { const n = Date.now(); clock.textContent = `${U.dateLabel(n)} ${U.t24(n)}:${String(new Date(n).getSeconds()).padStart(2, '0')}`; };
    tickClock(); setInterval(tickClock, 1000);
    setInterval(() => { UI.renderChrome(); UI.renderBody(); }, 15000);
    setInterval(() => { alerts(); autoLock(); }, 5000);
    setTimeout(alerts, 1500);
    setInterval(() => leader && S.purge(), 30 * 60000);
    if (leader) S.purge();
  }

  window.addEventListener('DOMContentLoaded', () => {
    UI.mount();
    UI.applyTheme();
    const site = window.PULSEED_SITE || {};
    if (site.training) start('demo');
    else if (site.forceLive) start('live');
    else if (S.device.mode) start(S.device.mode);
    else UI.modeModal(mode => start(mode));
  });

  window.addEventListener('error', e => { try { UI.toast('Unexpected error: ' + e.message + ' — please report it. Your data is unaffected.', 'error'); } catch (x) { /* ignore */ } });
  window.addEventListener('unhandledrejection', e => { try { UI.toast((e.reason && e.reason.message) || 'Action failed.', 'error'); } catch (x) { /* ignore */ } });
})(window.PulseED);
