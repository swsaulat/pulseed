/* PulseED — persistence and multi-station sync.
 *
 * Adapters:
 *   LocalAdapter  — this browser only (all tabs on one PC). Training / demo / single-desk pilot.
 *                   Every change is applied to the freshest stored state inside a cross-tab lock.
 *   GoogleAdapter — the PatientFlow MS Google back-end (Apps Script + the "PulseED Register" Sheet
 *                   owned by swsaulat@gmail.com). The server runs the same rules (Core.gs) under a lock,
 *                   verifies the Google sign-in on every request and stations poll for changes.
 */
(function (PE) {
  'use strict';
  const U = PE.util, D = PE.domain;
  const ROOT = 'pulseed:v2';

  // ------------------------------------------------------------------ local adapter

  class LocalAdapter {
    constructor(mode) {
      this.kind = 'local';
      this.mode = mode;
      this.key = `${ROOT}:${mode}:state`;
      this.settingsKey = `${ROOT}:${mode}:settings`;
      this.listeners = [];
      try { this.bc = new BroadcastChannel(`${ROOT}:${mode}`); this.bc.onmessage = () => this._changed(); } catch (e) { this.bc = null; }
      window.addEventListener('storage', e => { if (e.key === this.key || e.key === this.settingsKey) this._changed(); });
    }
    status() { return { ok: true, label: 'This PC only', detail: 'Data is stored in this browser and shared between its tabs. Other workstations cannot see it.' }; }
    async load() { return U.ls.get(this.key) || D.emptyState(); }
    async loadSettings() { return U.ls.get(this.settingsKey); }
    async saveSettings(s) { U.ls.set(this.settingsKey, s); this._notify(); }
    async withLock(fn) {
      if (navigator.locks && navigator.locks.request) return navigator.locks.request(this.key, fn);
      return fn();
    }
    /** mutate(freshState) -> { state, ... } | null */
    async commit(mutate) {
      return this.withLock(async () => {
        const fresh = U.ls.get(this.key) || D.emptyState();
        const res = mutate(fresh);
        if (res && res.state && res.state !== fresh) {
          try { U.ls.set(this.key, res.state); }
          catch (e) { throw new D.RuleError('Browser storage is full — nothing was saved. Export a backup, then reduce retention in Settings.', 'STORAGE'); }
          this._notify();
        }
        return res;
      });
    }
    async dispatch(type, payload) {
      let out = null;
      await this.commit(fresh => { out = D.apply(fresh, { type, payload }, S.ctx()); return out; });
      return out;
    }
    async logExport(what, deid) {
      await this.commit(fresh => {
        const st = U.clone(fresh);
        D.appendEvents(st, [{ id: U.uuid(), ts: U.iso(Date.now()), patientId: null, urn: '', encounterId: '', workflow: 'System', eventType: 'Data Exported', prev: '', next: what, user: S.user.name, role: S.user.role, device: S.ctx().device, notes: deid ? 'De-identified' : 'Includes patient names' }]);
        st.rev++;
        return { state: st };
      });
    }
    async replace(state) { return this.commit(() => ({ state })); }
    _notify() { if (this.bc) try { this.bc.postMessage('changed'); } catch (e) { /* closed */ } }
    _changed() { this.listeners.forEach(fn => fn()); }
    subscribe(fn) { this.listeners.push(fn); }
  }

  // ------------------------------------------------------------------ Google adapter (patientflowms.com)

  const TOKEN_KEY = `${ROOT}:idt`;
  const decodeJwt = t => { try { return JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))); } catch (e) { return null; } };

  class GoogleAdapter {
    constructor(cfg) {
      this.kind = 'google';
      this.mode = 'live';
      this.url = cfg.apiUrl;
      this.listeners = [];
      this.online = false;
      this.err = '';
      this.state = D.emptyState();
      this.since = {};
      this.settings = null;
      this.config = null;
      this.token = null;
      this.lastSync = 0;
      try {
        const t = sessionStorage.getItem(TOKEN_KEY), p = t && decodeJwt(t);
        if (p && p.exp * 1000 > Date.now() + 120000) this.token = t;
      } catch (e) { /* storage blocked */ }
    }
    status() {
      if (!this.online) return { ok: false, label: 'OFFLINE', detail: this.err || 'Not connected to the PulseED register — changes cannot be saved.' };
      const age = Math.round((Date.now() - this.lastSync) / 1000);
      return { ok: true, label: 'Live · all stations', detail: `Connected to the PulseED register (Google). Last update ${age}s ago.` };
    }
    setToken(t) { this.token = t; try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } }
    tokenUser() { const p = this.token && decodeJwt(this.token); return p ? { email: p.email, name: p.name } : null; }

    async call(action, payload, timeout = 30000) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      let res;
      try {
        const r = await fetch(this.url, {
          method: 'POST', redirect: 'follow', signal: ctrl.signal,
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // simple request: no CORS pre-flight to Apps Script
          body: JSON.stringify(Object.assign({ action, idToken: this.token || undefined }, payload || {})),
        });
        try { res = JSON.parse(await r.text()); } catch (e) { res = { ok: false, code: 'BAD_RESPONSE', message: 'The server sent an unexpected response. Nothing was saved — try again.' }; }
      } catch (e) {
        res = { ok: false, code: 'NETWORK', message: e.name === 'AbortError' ? 'The PulseED server took too long to respond. Check the connection and try again.' : 'Cannot reach the PulseED server. Check the internet connection — the change was NOT saved.' };
      } finally { clearTimeout(timer); }
      if (res.ok) { this.online = true; this.err = ''; }
      else if (res.code === 'NETWORK' || res.code === 'BAD_RESPONSE') { this.online = false; this.err = res.message; }
      if (!res.ok) {
        if (/^AUTH_/.test(res.code)) { this.setToken(null); S.setUser(null); if (PE.ui) PE.ui.signInModal('expired'); }
        throw new D.RuleError(res.message || 'Request failed.', res.code);
      }
      return res;
    }

    async init() {
      const c = await this.call('config');
      this.config = c;
      if (this.token) {
        try { const r = await this.call('me'); S.setUser(Object.assign({ verified: true }, r.user)); }
        catch (e) { if (e.code === 'FORBIDDEN') S.error = e.message; }
      }
    }
    async signIn(credential) {
      this.setToken(credential);
      const r = await this.call('me');
      S.setUser(Object.assign({ verified: true }, r.user));
      this.since = {};
      return r.user;
    }

    _merge(r) {
      if (r.unchanged) return false;
      const st = this.state;
      if (r.full) st.patients = {};
      (r.patients || []).forEach(p => (st.patients[p.id] = p));
      if (r.ids) { const keep = new Set(r.ids); Object.keys(st.patients).forEach(id => { if (!keep.has(id)) delete st.patients[id]; }); }
      if (r.full) st.events = r.events || [];
      else { const have = new Set(st.events.map(e => e.id)); (r.events || []).forEach(e => { if (!have.has(e.id)) st.events.push(e); }); }
      st.events.sort((a, b) => (a.seq || 0) - (b.seq || 0));
      if (st.events.length > 3000) st.events = st.events.slice(-3000);
      st.chainAnchor = st.events.length ? st.events[0].prevHash : st.chainAnchor;
      if (r.settings) this.settings = r.settings;
      let upd = this.since.upd || '';
      Object.values(st.patients).forEach(p => { if (p.updatedAt > upd) upd = p.updatedAt; });
      this.since = { rev: r.rev, seq: r.seq, upd };
      st.rev = r.rev;
      return true;
    }
    async sync() {
      if (!S.user) return false;
      const r = await this.call('sync', { since: this.since });
      this.lastSync = Date.now();
      return this._merge(r);
    }
    async load() { if (S.user) await this.sync(); return this.state; }
    async loadSettings() { return this.settings; }
    async saveSettings(s) { const r = await this.call('settings.save', { settings: s, device: S.ctx().device }); this.settings = r.settings; this.since.rev = null; }
    async dispatch(type, payload) {
      const r = await this.call('commit', { type, payload, device: S.ctx().device });
      if (r.patient) this.state.patients[r.patient.id] = r.patient;
      (r.events || []).forEach(e => this.state.events.push(e));
      this.since.rev = null; // pull anything else that changed, on the next sync
      return { events: r.events || [], patient: r.patient };
    }
    async logExport(what, deid) { await this.call('logExport', { what, deid, device: S.ctx().device }); this.since.rev = null; }
    // Staff & Access (Admin only; the server checks). Saving also shares the register in Drive, which can take a while.
    staffList() { return this.call('staff.list'); }
    async staffSave(staff) { const r = await this.call('staff.save', { staff, device: S.ctx().device }, 330000); this.since.rev = null; return r; }
    async commit() { throw new D.RuleError('Not available with the shared register.'); }
    async replace() { throw new D.RuleError('Restoring a backup over the shared register is done by the owner in the Google Sheet.'); }
    subscribe(fn) {
      this.listeners.push(fn);
      if (this.poll) return;
      // Poll every 8 s while the page is visible (and immediately when it becomes visible again).
      const tick = async () => {
        if (document.hidden || !S.user) return;
        try { if (await this.sync()) this.listeners.forEach(f => f()); }
        catch (e) { this.listeners.forEach(f => f()); }
      };
      this.poll = setInterval(tick, 8000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    }
  }

  // ------------------------------------------------------------------ store facade

  const S = (PE.store = {
    state: D.emptyState(),
    settings: U.clone(PE.DEFAULT_SETTINGS),
    adapter: null,
    listeners: [],
    error: null,
  });

  S.device = Object.assign({ deviceId: U.uuid().slice(0, 8), deviceName: '', mode: null, privacy: false, sound: true, theme: 'light' }, U.ls.get(`${ROOT}:device`) || {});
  S.saveDevice = () => { try { U.ls.set(`${ROOT}:device`, S.device); } catch (e) { /* non-critical */ } };
  S.saveDevice();

  // Operator is per tab (sessionStorage) so closing a shared terminal signs the user out.
  S.user = (() => { try { return JSON.parse(sessionStorage.getItem(`${ROOT}:operator`)); } catch (e) { return null; } })();
  S.setUser = u => { S.user = u; try { u ? sessionStorage.setItem(`${ROOT}:operator`, JSON.stringify(u)) : sessionStorage.removeItem(`${ROOT}:operator`); } catch (e) { /* ignore */ } };

  S.mergeSettings = saved => {
    const d = U.clone(PE.DEFAULT_SETTINGS);
    if (!saved) return d;
    const out = Object.assign(d, saved);
    out.ctasIntervals = Object.assign({}, PE.DEFAULT_SETTINGS.ctasIntervals, saved.ctasIntervals || {});
    out.backend = Object.assign({}, PE.DEFAULT_SETTINGS.backend, saved.backend || {});
    return out;
  };

  S.site = () => window.PULSEED_SITE || {};
  S.isShared = () => !!(S.adapter && S.adapter.kind === 'google');

  S.init = async mode => {
    S.device.mode = mode; S.saveDevice();
    const be = S.site().backend || {};
    if (mode === 'live' && be.mode === 'google' && be.apiUrl) {
      const g = new GoogleAdapter(be);
      S.adapter = g;
      if (S.user && !S.user.verified) S.setUser(null); // a locally typed name is never accepted by the shared register
      try { await g.init(); } catch (e) { S.error = 'PulseED register not reachable: ' + e.message; }
    } else {
      const local = new LocalAdapter(mode);
      S.adapter = local;
      S.settings = S.mergeSettings(await local.loadSettings());
    }
    S.adapter.subscribe(S.reload);
    await S.reload();
  };

  S.reload = async () => {
    try {
      const st = await S.adapter.load();
      const saved = await S.adapter.loadSettings();
      if (saved) S.settings = S.mergeSettings(saved);
      S.state = st;
      if (S.isShared() && S.adapter.online) S.error = null;
    } catch (e) { S.error = e.message; }
    S.listeners.forEach(fn => fn());
  };
  S.on = fn => S.listeners.push(fn);

  S.ctx = (now = Date.now()) => ({ user: S.user, device: S.device.deviceName || `Station ${S.device.deviceId}`, now, settings: S.settings });

  /** Apply an action. Resolves to { events, patient }; rejects with RuleError (shown to the user). */
  S.dispatch = async (type, payload) => {
    if (!S.user) throw new D.RuleError('Sign in to the station before making changes.', 'AUTH');
    let out;
    try { out = await S.adapter.dispatch(type, payload); }
    catch (e) {
      // A refused change usually means someone else changed the record: show their version straight away.
      if (S.isShared() && e.code !== 'NETWORK') { S.adapter.since.rev = null; try { await S.reload(); } catch (x) { /* keep original error */ } }
      throw e;
    }
    await S.reload();
    return out;
  };

  S.logExport = async (what, deid) => { try { await S.adapter.logExport(what, deid); await S.reload(); } catch (e) { /* the export itself still proceeds */ } };

  S.saveSettings = async next => {
    if (!D.isSupervisor(S.user)) throw new D.RuleError('Only a Charge Nurse, ED Leader or Admin can change settings.', 'FORBIDDEN');
    await S.adapter.saveSettings(next);
    S.settings = S.mergeSettings(next);
    await S.reload();
  };

  S.purge = async () => {
    if (S.adapter.kind !== 'local') return; // the server archives on its own schedule
    await S.adapter.commit(fresh => { const st = D.purge(fresh, S.settings, Date.now()); return st ? { state: st } : null; });
  };

  S.replaceState = async st => {
    if (!st || typeof st !== 'object' || !st.patients || !Array.isArray(st.events)) throw new D.RuleError('That file is not a PulseED backup.');
    await S.adapter.replace(st);
    await S.reload();
  };

  S.wipe = async () => {
    if (S.adapter.kind !== 'local') throw new D.RuleError('The shared register cannot be erased from a station.');
    await S.adapter.replace(D.emptyState());
    await S.reload();
  };

  PE.LocalAdapter = LocalAdapter;
  PE.GoogleAdapter = GoogleAdapter;
})(window.PulseED);
