/* PulseED — shared utilities (no dependencies). */
window.PulseED = window.PulseED || {};
(function (PE) {
  'use strict';
  const U = (PE.util = {});

  U.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => (b[i] = Math.random() * 256));
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  };

  /** HTML-escape every piece of user-entered text before it reaches innerHTML. */
  U.esc = s => String(s == null ? '' : s).replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c]));

  const pad = n => String(n).padStart(2, '0');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  U.toMs = v => (v == null || v === '' ? NaN : typeof v === 'number' ? v : new Date(v).getTime());
  U.iso = ms => new Date(ms).toISOString();

  /** HH:mm (24h). */
  U.t24 = v => { const ms = U.toMs(v); if (isNaN(ms)) return '—'; const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  /** HH:mm when today, otherwise "02 Nov 14:05" so times are never ambiguous across midnight. */
  U.when = (v, now = Date.now()) => {
    const ms = U.toMs(v); if (isNaN(ms)) return '—';
    const d = new Date(ms), n = new Date(now);
    if (d.toDateString() === n.toDateString()) return U.t24(ms);
    return `${pad(d.getDate())} ${MON[d.getMonth()]} ${U.t24(ms)}`;
  };
  /** Unambiguous full local date-time: 2026-11-02 14:05:09 */
  U.full = v => { const ms = U.toMs(v); if (isNaN(ms)) return ''; const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  U.dateLabel = v => { const d = new Date(U.toMs(v)); return `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]} ${pad(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  /** Value for <input type="datetime-local">. */
  U.localInput = ms => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  U.minsBetween = (a, b) => Math.floor((U.toMs(b) - U.toMs(a)) / 60000);
  U.dur = mins => { if (mins == null || isNaN(mins)) return '—'; mins = Math.max(0, Math.floor(mins)); return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`; };

  U.mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
  U.median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  U.round = (x, d = 0) => (x == null || isNaN(x) ? null : Math.round(x * 10 ** d) / 10 ** d);

  U.initials = name => String(name || '').trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + '.').join(' ') || '—';
  U.clone = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
  U.norm = s => String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  U.key = s => U.norm(s).toLowerCase();
  U.lines = s => String(s || '').split(/\r?\n/).map(U.norm).filter(Boolean);
  U.uniq = a => [...new Set(a)];

  /** CSV cell: always quoted, quotes doubled, and spreadsheet-formula injection neutralised. */
  U.csvCell = v => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  U.csv = (header, rows) => [header.map(U.csvCell).join(','), ...rows.map(r => r.map(U.csvCell).join(','))].join('\r\n');

  U.download = (filename, text, mime = 'text/csv;charset=utf-8') => {
    const bom = mime.startsWith('text/csv') ? '﻿' : ''; // Excel needs the BOM to read UTF-8
    const url = URL.createObjectURL(new Blob([bom + text], { type: mime }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  U.stamp = (ms = Date.now()) => { const d = new Date(ms); return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`; };

  /** 64-bit FNV-1a (two 32-bit lanes) — a tamper-evidence checksum for the local audit chain, not a security hash. */
  U.hash = str => {
    let h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x5bd1e995;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0; h2 ^= h2 >>> 15;
    }
    return h1.toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
  };

  U.copyText = async text => {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back below */ }
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove(); return ok;
  };

  U.ls = {
    get(k, fallback = null) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }, // throws on quota — callers handle it
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };
})(window.PulseED);
