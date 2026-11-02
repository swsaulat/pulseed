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

      acts.sort((a, b) => a.t - b.t);
      let st = D.emptyState(), skipped = 0;
      acts.forEach(a => {
        try { st = D.apply(st, { type: a.type, payload: a.payload }, { user: { name: a.who[0], role: a.who[1] }, device: 'Demo Station', now: a.t, settings }).state; }
        catch (e) { skipped++; }
      });
      // Overdue alerts the system would have logged.
      D.activePatients(st).forEach(p => { st = D.apply(st, { type: 'SYSTEM_OVERDUE', payload: { id: p.id } }, { user: { name: 'System', role: 'System' }, device: 'Demo Station', now, settings }).state; });
      st.demo = true;
      return { state: st, skipped };
    },
  };
})(window.PulseED);
