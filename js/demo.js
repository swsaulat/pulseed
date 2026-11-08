/* PulseED — training / demo data. Built by replaying real actions through the domain reducer, so the demo
 * exercises the same rules, audit trail and metrics as live use. Includes the 7 patients from the original prototype. */
(function (PE) {
  'use strict';
  const U = PE.util, D = PE.domain;

  function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const STAFF = [['Nurse J. Doe', 'Nurse'], ['Nurse K. Malik', 'Nurse'], ['CN R. Alvarez', 'Charge Nurse'], ['Bed Coord R. Smith', 'Bed Coordinator'], ['Dr A. Thorne', 'Physician']];
  const FIRST = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey', 'Riley', 'Morgan', 'Jamie', 'Avery', 'Quinn', 'Rowan', 'Skyler', 'Reese', 'Dakota', 'Emerson', 'Harper'];
  const LAST = ['Demo', 'Sample', 'Testcase', 'Training', 'Example', 'Mock', 'Placeholder'];
  const DX = ['Chest pain', 'Abdominal pain', 'Fall — hip pain', 'Shortness of breath', 'Headache', 'Fever', 'Laceration forearm', 'Back pain', 'Syncope', 'Allergic reaction', 'Ankle injury', 'Vomiting', 'Palpitations', 'Dizziness'];
  const PHYS = ['Aris Thorne', 'Elena Vance', 'Mark Roberts', 'Unassigned'];

  PE.demo = {
    build(settings, now = Date.now()) {
      const r = rng(20261102);
      const pick = a => a[Math.floor(r() * a.length)];
      const between = (a, b) => a + r() * (b - a);
      const M = 60000;
      const acts = []; // { t, type, payload, who }
      const add = (t, type, payload, who) => acts.push({ t: Math.round(t), type, payload, who: who || pick(STAFF) });

      // ---------- 24 h of history (exited patients) so analytics have real data to compute from
      for (let i = 0; i < 90; i++) {
        const id = U.uuid();
        const t0 = now - between(26 * 60, 3 * 60) * M;
        const hour = new Date(t0).getHours();
        const surge = hour >= 10 && hour <= 20 ? 1.35 : 1; // daytime crowding lengthens waits
        const ctas = pick(['CTAS 2', 'CTAS 3', 'CTAS 3', 'CTAS 3', 'CTAS 4', 'CTAS 4', 'CTAS 5']);
        const wf = { vitals: r() < 0.85, bed: r() < 0.6, procedure: r() < 0.4 };
        if (!wf.vitals && !wf.bed && !wf.procedure) wf.vitals = true;
        let end = t0 + between(60, 200) * M;
        const bedAlloc = t0 + between(8, 35) * surge * M;
        const bedPlace = bedAlloc + between(15, 55) * surge * M;
        if (wf.bed) end = bedPlace;
        add(t0, 'ADMIT', {
          id, urn: 'D-' + (30000 + i), name: `${pick(FIRST)} ${pick(LAST)}`, ctas, diagnosis: pick(DX), physician: pick(PHYS), team: pick(settings.teams),
          workflows: wf, intendedSpecialty: pick(settings.specialties), plannedProcedure: pick(settings.procedures), consent: 'Obtained', arranged: 'Yes',
        }, STAFF[0]);
        if (wf.procedure) {
          const ready = t0 + between(8, 25) * M, done = ready + between(15, 50) * surge * M;
          add(ready, 'UPDATE_PROCEDURE', { id, status: 'Ready', consent: 'Obtained', arranged: 'Yes' });
          if (done < end - 2 * M || !wf.bed) { add(done, 'UPDATE_PROCEDURE', { id, status: 'Done', consent: 'Obtained', arranged: 'Yes' }); if (!wf.bed) end = Math.max(end, done + 10 * M); }
        }
        if (wf.vitals) {
          const iv = settings.ctasIntervals[ctas];
          for (let t = t0 + iv * between(0.6, 1.2) * M; t < end - M; t += iv * between(0.65, r() < 0.12 ? 1.6 : 1.05) * M) add(t, 'RECORD_REASSESSMENT', { id });
        }
        if (wf.bed) add(bedAlloc, 'ALLOCATE_BED', { id, bed: pick(settings.beds), override: true }, STAFF[3]);
        const lwbs = !wf.bed && r() < 0.08;
        add(end, 'EXIT', wf.bed ? { id, type: 'placed', override: true } : { id, type: lwbs ? 'lwbs' : 'discharged', reason: lwbs ? 'Not found when called ×3' : '' });
        if (wf.bed) { // on the ED bed: most are admitted / referred and later move on; every one is released before now
          const dec = end + between(25, 90) * M, rel = Math.min(dec + between(60, 330) * M, now - between(3, 40) * M);
          if (r() < 0.75 && rel > dec + 10 * M) {
            const unit = pick(['Ward', 'Ward', 'Ward', 'ICU', 'CCU / HDU']);
            add(dec, 'ED_DECISION', { id, decision: r() < 0.7 ? 'admit' : 'refer', specialty: pick(settings.specialties), unit }, STAFF[4]);
            add(rel, 'ED_RELEASE', { id, type: { Ward: 'ward', ICU: 'icu', 'CCU / HDU': 'ccu' }[unit], note: 'Accepted by the receiving team; moved with handover to the ward nurse.' }, STAFF[2]);
          } else add(Math.min(end + between(60, 180) * M, now - between(3, 40) * M), 'ED_RELEASE', { id, type: 'home', note: 'Treated in the ED and discharged home with advice.' }, STAFF[2]);
        }
      }

      // ---------- current waiting area: the original prototype's 7 patients (same timings), plus 3 that show new safety features
      const P = (urn, enc, name, ctas, diagnosis, physician, team) => ({ id: U.uuid(), urn, encounterId: enc, name, ctas, diagnosis, physician, team });
      const cur = [
        [P('P-40921', 'ENC-88392', 'Sarah Jenkins', 'CTAS 2', 'Acute Chest Pain', 'Aris Thorne', 'Team A'), p => {
          add(now - 50 * M, 'ADMIT', Object.assign({}, p, { workflows: { vitals: true, bed: true }, intendedSpecialty: 'Cardiology' }));
          add(now - 40 * M, 'START_WORKFLOW', { id: p.id, wf: 'procedure', plannedProcedure: 'CT Coronary Angiogram', consent: 'Obtained', arranged: 'Yes' });
          add(now - 38 * M, 'UPDATE_PROCEDURE', { id: p.id, status: 'Ready', consent: 'Obtained', arranged: 'Yes' });
          add(now - 30 * M, 'RECORD_REASSESSMENT', { id: p.id });
          add(now - 25 * M, 'ALLOCATE_BED', { id: p.id, bed: 'Acute Bed 12' }, STAFF[3]);
        }],
        [P('P-40912', 'ENC-88311', "Michael O'Neill", 'CTAS 3', 'Severe Abdominal Pain', 'Elena Vance', 'Team B'), p => {
          add(now - 60 * M, 'ADMIT', Object.assign({}, p, { workflows: { vitals: true } }));
          add(now - 30 * M, 'START_WORKFLOW', { id: p.id, wf: 'procedure', plannedProcedure: 'Abdominal Ultrasound', consent: 'Obtained', arranged: 'Yes' });
          add(now - 10 * M, 'RECORD_REASSESSMENT', { id: p.id });
        }],
        [P('P-40935', 'ENC-88402', 'Emily Chen', 'CTAS 1', 'Polytrauma / MVC', 'Mark Roberts', 'Team A'), p => {
          add(now - 30 * M, 'ADMIT', Object.assign({}, p, { workflows: { bed: true }, intendedSpecialty: 'Trauma Surgery' }));
          add(now - 25 * M, 'START_WORKFLOW', { id: p.id, wf: 'vitals' });
          add(now - 22 * M, 'ALLOCATE_BED', { id: p.id, bed: 'Resus Bay 1' }, STAFF[3]);
        }],
        [P('P-40954', 'ENC-88510', 'David Ross', 'CTAS 4', 'Acute Laceration Hand', 'Aris Thorne', 'Team C'), p => {
          add(now - 40 * M, 'ADMIT', Object.assign({}, p, { workflows: { bed: true }, intendedSpecialty: 'Plastic Surgery / Minor Care' }));
          add(now - 35 * M, 'START_WORKFLOW', { id: p.id, wf: 'procedure', plannedProcedure: 'Tendon Repair & Suturing', consent: 'Obtained', arranged: 'Yes' });
          add(now - 33 * M, 'UPDATE_PROCEDURE', { id: p.id, status: 'Ready', consent: 'Obtained', arranged: 'Yes' });
        }],
        [P('P-40978', 'ENC-88621', 'Aisha Patel', 'CTAS 3', 'Suspected Renal Colic', 'Elena Vance', 'Team B'), p => {
          add(now - 45 * M, 'ADMIT', Object.assign({}, p, { workflows: { bed: true }, intendedSpecialty: 'Urology' }));
          add(now - 40 * M, 'START_WORKFLOW', { id: p.id, wf: 'vitals' });
          add(now - 28 * M, 'RECORD_REASSESSMENT', { id: p.id });
          add(now - 15 * M, 'ALLOCATE_BED', { id: p.id, bed: 'Sub-Acute Bed 4' }, STAFF[3]);
        }],
        [P('P-40989', 'ENC-88730', 'Robert Taylor', 'CTAS 2', 'Acute Shortness of Breath', 'Mark Roberts', 'Team C'), p => {
          add(now - 35 * M, 'ADMIT', Object.assign({}, p, { workflows: { vitals: true } }));
          add(now - 30 * M, 'RECORD_REASSESSMENT', { id: p.id });
          add(now - 25 * M, 'START_WORKFLOW', { id: p.id, wf: 'procedure', plannedProcedure: 'Portable Chest X-Ray', consent: 'Not required', arranged: 'Yes' });
          add(now - 20 * M, 'UPDATE_PROCEDURE', { id: p.id, status: 'In Progress', consent: 'Not required', arranged: 'Yes' });
        }],
        [P('P-40995', 'ENC-88812', 'Maria Garcia', 'CTAS 3', 'Persistent Vomiting & Dehydration', 'Aris Thorne', 'Team A'), p => {
          add(now - 65 * M, 'ADMIT', Object.assign({}, p, { workflows: { bed: true }, intendedSpecialty: 'Internal Medicine' }));
          add(now - 55 * M, 'START_WORKFLOW', { id: p.id, wf: 'procedure', plannedProcedure: 'IV Electrolyte Panel & Rehydration', consent: 'Obtained', arranged: 'Yes' });
          add(now - 50 * M, 'UPDATE_PROCEDURE', { id: p.id, status: 'Ready', consent: 'Obtained', arranged: 'Yes' });
          add(now - 40 * M, 'ALLOCATE_BED', { id: p.id, bed: 'Acute Bed 03' }, STAFF[3]);
        }],
        [P('P-41003', '', 'Jordan Sample', 'CTAS 3', 'Fall — suspected hip fracture', 'Unassigned', 'Team B'), p => {
          add(now - 155 * M, 'ADMIT', Object.assign({}, p, { workflows: { vitals: true, bed: true, procedure: true }, intendedSpecialty: 'Orthopaedics', plannedProcedure: 'X-Ray Limb', consent: 'Not required', arranged: 'No' }));
          add(now - 120 * M, 'RECORD_REASSESSMENT', { id: p.id });
          add(now - 88 * M, 'RECORD_REASSESSMENT', { id: p.id });
          add(now - 57 * M, 'RECORD_REASSESSMENT', { id: p.id });
          add(now - 26 * M, 'RECORD_REASSESSMENT', { id: p.id });
        }],
        [P('P-41011', '', 'Casey Example', 'CTAS 2', 'Head injury on anticoagulant', 'Elena Vance', 'Team A'), p => {
          add(now - 22 * M, 'ADMIT', Object.assign({}, p, { workflows: { vitals: true, procedure: true }, plannedProcedure: 'CT Head / Brain', consent: 'Pending', arranged: 'Yes' }));
          add(now - 12 * M, 'RECORD_REASSESSMENT', { id: p.id });
        }],
        [P('P-41020', '', 'Riley Testcase', 'CTAS 4', 'Ankle injury', 'Unassigned', 'Team C'), p => {
          add(now - 95 * M, 'ADMIT', Object.assign({}, p, { workflows: { procedure: true }, plannedProcedure: 'X-Ray Limb', consent: 'Not required', arranged: 'Yes' }));
          add(now - 15 * M, 'UPDATE_PROCEDURE', { id: p.id, status: 'Done', consent: 'Not required', arranged: 'Yes' });
        }],
      ];
      cur.forEach(([p, f]) => f(p));

      // ---------- patients on ED beds now: two boarding overstays, one nearly there, one just referred, two without a decision yet
      const onBed = (p, admitMin, placeMin, bed, spec, dec) => {
        add(now - admitMin * M, 'ADMIT', Object.assign({}, p, { workflows: { vitals: true, bed: true }, intendedSpecialty: spec }), STAFF[0]);
        add(now - placeMin * M, 'EXIT', { id: p.id, type: 'placed', bed, override: true }, STAFF[2]);
        if (dec) add(now - dec[0] * M, 'ED_DECISION', { id: p.id, decision: dec[1], specialty: spec, unit: dec[2] }, STAFF[4]);
      };
      const e1 = P('P-42101', 'ENC-89101', 'Harper Demo', 'CTAS 3', 'Pneumonia, needs IV antibiotics', 'Aris Thorne', 'Team A');
      onBed(e1, 330, 300, 'Acute Bed 05', 'Internal Medicine', [280, 'admit', 'Ward']);
      add(now - 200 * M, 'UPDATE_DETAILS', { id: e1.id, changes: { physician: 'Elena Vance' }, note: 'Handed over at shift change' }, STAFF[4]);
      onBed(P('P-42102', 'ENC-89102', 'Rowan Sample', 'CTAS 2', 'NSTEMI', 'Mark Roberts', 'Team A'), 260, 240, 'Resus Bay 2', 'Cardiology', [200, 'refer', 'CCU / HDU']);
      onBed(P('P-42103', 'ENC-89103', 'Quinn Mock', 'CTAS 3', 'Renal colic, analgesia', 'Elena Vance', 'Team B'), 120, 90, 'Acute Bed 08', 'Urology', null);
      onBed(P('P-42104', 'ENC-89104', 'Skyler Example', 'CTAS 3', 'Appendicitis', 'Aris Thorne', 'Team B'), 200, 180, 'Sub-Acute Bed 2', 'General Surgery', [60, 'refer', 'Ward']);
      onBed(P('P-42105', 'ENC-89105', 'Dakota Testcase', 'CTAS 4', 'Wrist fracture for reduction', 'Mark Roberts', 'Team C'), 70, 40, 'Fast Track 2', 'Orthopaedics', null);
      onBed(P('P-42106', 'ENC-89106', 'Emerson Training', 'CTAS 3', 'Bronchiolitis (child)', 'Elena Vance', 'Team C'), 420, 380, 'Paeds Bed 1', 'Paediatrics', [330, 'admit', 'Ward']);

      acts.sort((a, b) => a.t - b.t);
      let st = D.emptyState(), skipped = 0;
      acts.forEach(a => {
        // Synthetic history picks beds at random, so a bed may still be occupied when a demo patient is allocated it.
        const payload = a.type === 'ALLOCATE_BED' ? Object.assign({ override: true }, a.payload) : a.payload;
        const ctx = { user: { name: a.who[0], role: a.who[1] }, device: 'Demo Station', now: a.t, settings };
        try { st = D.apply(st, { type: a.type, payload }, ctx).state; }
        catch (e) {
          // A bed is never shared: a history patient whose random bed is still occupied goes to the first empty bed instead.
          const free = e.code === 'BED_OCCUPIED' && D.bedBoard(st, settings, a.t).beds.find(b => b.state === 'empty');
          try { if (!free) throw e; st = D.apply(st, { type: a.type, payload: Object.assign({}, payload, { bed: free.bed }) }, ctx).state; }
          catch (e2) { skipped++; }
        }
      });
      // Overdue alerts the system would have logged.
      D.activePatients(st).forEach(p => { st = D.apply(st, { type: 'SYSTEM_OVERDUE', payload: { id: p.id } }, { user: { name: 'System', role: 'System' }, device: 'Demo Station', now, settings }).state; });
      D.inEdPatients(st).forEach(p => { st = D.apply(st, { type: 'SYSTEM_BOARDING', payload: { id: p.id } }, { user: { name: 'System', role: 'System' }, device: 'Demo Station', now, settings }).state; });
      st.demo = true;
      return { state: st, skipped };
    },
  };
})(window.PulseED);
