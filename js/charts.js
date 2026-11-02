/* PulseED — dependency-free SVG control charts (XmR / individuals chart with computed limits). */
(function (PE) {
  'use strict';
  const U = PE.util, D = PE.domain;

  /**
   * series: [{ name, values:[number|null], cls:'s1'|'s2' }]
   * Returns { svg, status:{ label, tone }, legend }
   */
  PE.charts = {
    xmr(labels, series, opts = {}) {
      const W = 640, H = 230, L = 40, R = 12, T = 12, B = 30;
      const iw = W - L - R, ih = H - T - B;
      const lim = series.map(s => D.xmr(s.values));
      const all = [];
      series.forEach((s, i) => { s.values.forEach(v => v != null && all.push(v)); if (lim[i].enough) all.push(lim[i].ucl, lim[i].lcl); });
      let yMin = opts.yMin != null ? opts.yMin : Math.floor(Math.min(...all, 0));
      let yMax = opts.yMax != null ? opts.yMax : Math.max(...all, 10);
      if (opts.yMax == null) yMax = Math.ceil(yMax * 1.1 / 5) * 5;
      if (yMax <= yMin) yMax = yMin + 10;
      const x = i => L + (labels.length < 2 ? iw / 2 : (i * iw) / (labels.length - 1));
      const y = v => T + ih - ((Math.min(Math.max(v, yMin), yMax) - yMin) / (yMax - yMin)) * ih;
      const o = [];
      o.push(`<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${U.esc(opts.title || 'control chart')}">`);
      for (let k = 0; k <= 4; k++) {
        const v = yMin + ((yMax - yMin) * k) / 4, yy = y(v);
        o.push(`<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" class="grid"/><text x="${L - 6}" y="${yy + 3}" class="axis" text-anchor="end">${U.round(v)}</text>`);
      }
      labels.forEach((lb, i) => { if (i % 3 === 0 || i === labels.length - 1) o.push(`<text x="${x(i)}" y="${H - 10}" class="axis" text-anchor="middle">${U.esc(lb)}</text>`); });
      if (opts.target != null) o.push(`<line x1="${L}" x2="${W - R}" y1="${y(opts.target)}" y2="${y(opts.target)}" class="target"/><text x="${W - R}" y="${y(opts.target) - 4}" class="axis tgt" text-anchor="end">target ${opts.target}${opts.unit || ''}</text>`);
      series.forEach((s, si) => {
        const l = lim[si];
        if (l.enough) {
          o.push(`<line x1="${L}" x2="${W - R}" y1="${y(l.mean)}" y2="${y(l.mean)}" class="mean ${s.cls}"/>`);
          o.push(`<line x1="${L}" x2="${W - R}" y1="${y(l.ucl)}" y2="${y(l.ucl)}" class="limit ${s.cls}"/>`);
          o.push(`<line x1="${L}" x2="${W - R}" y1="${y(l.lcl)}" y2="${y(l.lcl)}" class="limit ${s.cls}"/>`);
        }
        let d = '', pen = false;
        s.values.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `; pen = true; });
        if (d) o.push(`<path d="${d}" class="line ${s.cls}"/>`);
        s.values.forEach((v, i) => {
          if (v == null) return;
          const bad = l.enough && l.outside.includes(i);
          o.push(`<circle cx="${x(i)}" cy="${y(v)}" r="${bad ? 4.5 : 3}" class="pt ${s.cls}${bad ? ' bad' : ''}"><title>${U.esc(s.name)} ${U.esc(labels[i])}: ${v}${U.esc(opts.unit || '')}${bad ? ' — outside control limits' : ''}</title></circle>`);
        });
      });
      o.push('</svg>');
      const enough = lim.some(l => l.enough);
      const signal = lim.some(l => l.enough && l.signal);
      const status = !enough ? { label: 'Insufficient data', tone: 'muted' } : signal ? { label: 'Special-cause signal', tone: 'red' } : { label: 'In control', tone: 'green' };
      const legend = series.map((s, i) => `<span class="lg"><i class="sw ${s.cls}"></i>${U.esc(s.name)}${lim[i].enough ? ` · mean ${U.round(lim[i].mean)}${U.esc(opts.unit || '')} · UCL ${U.round(lim[i].ucl)} · LCL ${U.round(lim[i].lcl)}` : ` · ${lim[i].n} hourly point(s)`}</span>`).join('');
      return { svg: o.join(''), status, legend };
    },
  };
})(window.PulseED);
