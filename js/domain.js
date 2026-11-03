/* PulseED — domain model: workflow rules, state transitions, timing and metrics.
 * Pure functions only (no DOM, no storage) so every rule can be unit-tested in tests/tests.html. */
(function (PE) {
  'use strict';
  const U = PE.util;
  const D = (PE.domain = {});

  D.WF = { vitals: 'Vitals Monitoring', bed: 'Awaiting ED Bed', procedure: 'Awaiting Procedure' };
  D.WF_KEYS = ['vitals', 'bed', 'procedure'];
  D.CTAS = ['CTAS 1', 'CTAS 2', 'CTAS 3', 'CTAS 4', 'CTAS 5', 'Other'];
  D.PROC_STATUS = ['Awaiting', 'Ready', 'In Progress', 'Deferred', 'Done', 'Cancelled'];
  D.PROC_TERMINAL = ['Done', 'Cancelled'];
  D.CONSENT = ['Pending', 'Obtained', 'Not required', 'Declined'];
  D.ARRANGED = ['No', 'Yes', 'N/A'];
  D.EXIT_TYPES = {
    placed: 'Placed on ED bed (Global Exit)',
    direct: 'Sent directly to ward / unit',
    discharged: 'Discharged from waiting area',
    lwbs: 'Left without being seen (LWBS)',
    dama: 'Left against medical advice',
    transferred: 'Transferred to another facility',
    deceased: 'Deceased',
    error: 'Entered in error',
  };
  D.EXIT_NEEDS_REASON = ['dama', 'transferred', 'error', 'deceased'];

  class RuleError extends Error { constructor(msg, code) { super(msg); this.code = code || 'RULE'; } }
  D.RuleError = RuleError;
  const fail = (msg, code) => { throw new RuleError(msg, code); };

  D.emptyState = () => ({ schema: 2, rev: 0, patients: {}, events: [], chainAnchor: '0000000000000000', updatedAt: null });

  D.isSupervisor = user => !!user && PE.SUPERVISOR_ROLES.includes(user.role);
  D.activePatients = state => Object.values(state.patients).filter(p => p.status === 'active');
  D.activeWfs = p => D.WF_KEYS.filter(k => p.workflows[k] && p.workflows[k].active);

  // ------------------------------------------------------------------ timing

  /** Reassessment timing for the vitals workflow. */
  D.vitalsTiming = (p, settings, now = Date.now()) => {
    const v = p.workflows.vitals;
    if (!v || !v.active) return { state: 'inactive', rank: 9 };
    const iv = settings.ctasIntervals[p.ctas];
    if (p.ctas === 'CTAS 1' || iv === 0) return { state: 'continuous', rank: 0, label: 'Continuous' };
    if (!(iv > 0)) return { state: 'noTarget', rank: 5, label: 'No target — set CTAS' };
    const base = U.toMs(v.lastReassessment || v.startTime);
    const due = base + iv * 60000;
    const diff = due - now;
    const soonWin = Math.min(settings.dueSoonMaxMin, iv * settings.dueSoonFraction) * 60000;
    if (diff < 0) {
      const late = Math.floor(-diff / 60000);
      return { state: 'overdue', rank: 1, due, intervalMin: iv, overdueMin: late, label: `${U.t24(due)} · overdue ${late < 1 ? '<1m' : U.dur(late)}` };
    }
    const left = Math.ceil(diff / 60000);
    if (diff <= soonWin) return { state: 'dueSoon', rank: 2, due, intervalMin: iv, minsToDue: left, label: `${U.t24(due)} · in ${left}m` };
    return { state: 'ok', rank: 3, due, intervalMin: iv, minsToDue: left, label: `${U.t24(due)} · in ${U.dur(left)}` };
  };

  D.waitLevel = (mins, amber, red) => (mins >= red ? 'red' : mins >= amber ? 'amber' : 'ok');
  D.bedWait = (p, s, now = Date.now()) => {
    const b = p.workflows.bed; const m = U.minsBetween(b.addedTime, b.placementTime || now);
    return { mins: m, level: D.waitLevel(m, s.bedWaitAmberMin, s.bedWaitRedMin) };
  };
  D.procWait = (p, s, now = Date.now()) => {
    const r = p.workflows.procedure; const m = U.minsBetween(r.requestTime, r.completionTime || now);
    return { mins: m, level: D.waitLevel(m, s.procWaitAmberMin, s.procWaitRedMin) };
  };
  /** Whether a procedure is actually able to go ahead. */
  D.procReadiness = r => {
    const issues = [];
    if (r.consent === 'Pending') issues.push('Consent pending');
    if (r.consent === 'Declined') issues.push('Consent declined');
    if (r.arranged === 'No') issues.push('Not arranged');
    return { ready: !issues.length, issues };
  };

  /** Most urgent first: CTAS 1 in waiting area, overdue (longest first), due soon, then by due time. */
  D.byVitalsUrgency = (s, now) => (a, b) => {
    const ta = D.vitalsTiming(a, s, now), tb = D.vitalsTiming(b, s, now);
    if (ta.rank !== tb.rank) return ta.rank - tb.rank;
    if (ta.state === 'overdue') return tb.overdueMin - ta.overdueMin;
    return (ta.due || 0) - (tb.due || 0);
  };

  // ------------------------------------------------------------------ factories

  const newVitals = (now, active) => ({ active, startTime: active ? U.iso(now) : null, lastReassessment: null, reassessments: [], endTime: null, endReason: null });
  const newBed = (now, active, specialty) => ({
    active, addedTime: active ? U.iso(now) : null, intendedSpecialty: active ? specialty : null, bedAllocated: false, allocatedBed: null,
    firstAllocationTime: null, allocationTime: null, physicallyPlaced: false, placementTime: null, endTime: null, endReason: null,
  });
  const newProc = (now, active, d = {}) => ({
    active, plannedProcedure: active ? d.plannedProcedure : null, consent: active ? d.consent : null, arranged: active ? d.arranged : null,
    status: active ? 'Awaiting' : null, requestTime: active ? U.iso(now) : null, completionTime: null, endTime: null, endReason: null,
  });

  // ------------------------------------------------------------------ validation helpers

  const URN_RE = /^[A-Za-z0-9][A-Za-z0-9\-\/.]{2,23}$/;
  function validDetails(d, state, selfId) {
    const out = {};
    if ('urn' in d) {
      out.urn = U.norm(d.urn).toUpperCase();
      if (!URN_RE.test(out.urn)) fail('URN / MRN must be 3–24 letters, digits, "-", "/" or "." — copy it exactly from the EHR.');
      const dup = D.activePatients(state).find(p => p.id !== selfId && U.key(p.urn) === U.key(out.urn));
      if (dup) fail(`URN ${out.urn} is already active on the board (${dup.name}). Open the existing record instead of creating a duplicate.`, 'DUPLICATE');
    }
    if ('encounterId' in d && d.encounterId != null) {
      out.encounterId = U.norm(d.encounterId).toUpperCase();
      if (out.encounterId && !URN_RE.test(out.encounterId)) fail('Encounter ID contains invalid characters.');
      const dup = out.encounterId && D.activePatients(state).find(p => p.id !== selfId && U.key(p.encounterId) === U.key(out.encounterId));
      if (dup) fail(`Encounter ${out.encounterId} is already in use by ${dup.urn}.`, 'DUPLICATE');
    }
    if ('name' in d) { out.name = U.norm(d.name); if (out.name.length < 2) fail('Patient name is required.'); }
    if ('diagnosis' in d) { out.diagnosis = U.norm(d.diagnosis); if (!out.diagnosis) fail('Presenting complaint / diagnosis is required.'); }
    if ('ctas' in d) { out.ctas = d.ctas; if (!D.CTAS.includes(out.ctas)) fail('Select a CTAS triage level.'); }
    if ('team' in d) { out.team = U.norm(d.team); if (!out.team) fail('ED team is required.'); }
    if ('physician' in d) out.physician = U.norm(d.physician) || 'Unassigned';
    return out;
  }
  function validProcFields(d) {
    const plannedProcedure = U.norm(d.plannedProcedure);
    if (!plannedProcedure) fail('Planned procedure / imaging is required.');
    if (!D.CONSENT.includes(d.consent)) fail('Select a consent status.');
    if (!D.ARRANGED.includes(d.arranged)) fail('Select whether the procedure is arranged.');
    return { plannedProcedure, consent: d.consent, arranged: d.arranged };
  }
  function bedHolder(state, bed, selfId) {
    const k = U.key(bed);
    return D.activePatients(state).find(p => p.id !== selfId && p.workflows.bed && p.workflows.bed.active && p.workflows.bed.bedAllocated && U.key(p.workflows.bed.allocatedBed) === k);
  }

  // ------------------------------------------------------------------ reducer

  /**
   * Apply one action to the freshest state. Returns { state, events, patient }.
   * ctx = { user:{name, role}, device, now(ms), settings }
   * Throws RuleError when a rule blocks the action (nothing is changed).
   */
  D.apply = function (state0, action, ctx) {
    const state = U.clone(state0);
    const now = ctx.now;
    const s = ctx.settings;
    const user = ctx.user;
    if (!user || !user.name) fail('Sign in to the station before making changes.', 'AUTH');
    const events = [];
    const ev = (p, workflow, eventType, prev, next, notes, id) => events.push({
      id: id || U.uuid(), ts: U.iso(now), patientId: p ? p.id : null, urn: p ? p.urn : '', encounterId: p ? p.encounterId : '',
      workflow, eventType, prev: prev == null ? '' : String(prev), next: next == null ? '' : String(next),
      user: user.name, role: user.role, device: ctx.device || '', notes: notes || '',
    });
    const a = action.payload || {};
    const get = () => {
      const p = state.patients[a.id];
      if (!p) fail('Patient record not found — it may have been removed on another station.', 'NOT_FOUND');
      if (a.expectedVersion != null && p.version !== a.expectedVersion && action.type !== 'RECORD_REASSESSMENT')
        fail(`${p.urn} was changed by ${p.updatedBy || 'another user'} at ${U.t24(p.updatedAt)} while you were editing. Re-open it to see the latest details.`, 'CONFLICT');
      return p;
    };
    const getActive = () => { const p = get(); if (p.status !== 'active') fail(`${p.urn} has already exited the waiting area.`, 'EXITED'); return p; };
    const touch = p => { p.version = (p.version || 0) + 1; p.updatedAt = U.iso(now); p.updatedBy = user.name; };
    const archive = (p, key) => { (p.pastEpisodes = p.pastEpisodes || []).push(Object.assign({ wf: key, ctas: p.ctas }, U.clone(p.workflows[key]))); };

    let p = null;
    switch (action.type) {
      case 'ADMIT': {
        const det = validDetails({ urn: a.urn, encounterId: a.encounterId || '', name: a.name, diagnosis: a.diagnosis, ctas: a.ctas, team: a.team, physician: a.physician }, state, null);
        const wf = a.workflows || {};
        if (!wf.vitals && !wf.bed && !wf.procedure) fail('Enrol the patient in at least one workflow.');
        let specialty = null, proc = {};
        if (wf.bed) { specialty = U.norm(a.intendedSpecialty); if (!specialty) fail('Intended specialty is required for Awaiting ED Bed.'); }
        if (wf.procedure) proc = validProcFields(a);
        if (!det.encounterId) det.encounterId = 'ENC-' + U.stamp(now).replace('-', '') + '-' + Math.floor(Math.random() * 900 + 100);
        p = Object.assign({ id: a.id || U.uuid(), status: 'active', exit: null, createdAt: U.iso(now), createdBy: user.name, version: 0, pastEpisodes: [] }, det);
        p.workflows = { vitals: newVitals(now, !!wf.vitals), bed: newBed(now, !!wf.bed, specialty), procedure: newProc(now, !!wf.procedure, proc) };
        touch(p);
        state.patients[p.id] = p;
        const names = D.activeWfs(p).map(k => D.WF[k]);
        ev(p, names.join(', '), 'Patient Registered', 'None', 'Active', `${p.name} · ${p.ctas} · ${p.team} · ${p.diagnosis}. Enrolled in: ${names.join(', ')}.`);
        D.activeWfs(p).forEach(k => ev(p, D.WF[k], 'Episode Started', 'None', 'Active',
          k === 'bed' ? `Intended specialty: ${specialty}` : k === 'procedure' ? `${proc.plannedProcedure} · consent ${proc.consent} · arranged ${proc.arranged}` : `Interval: ${intervalText(p.ctas, s)}`));
        if (p.ctas === 'CTAS 1') ev(p, D.WF.vitals, 'Safety Alert', '', 'CTAS 1 in waiting area', 'CTAS 1 patients require immediate resuscitation-area care and continuous observation.');
        break;
      }

      case 'UPDATE_DETAILS': {
        p = getActive();
        const det = validDetails(a.changes || {}, state, p.id);
        const changed = Object.keys(det).filter(k => det[k] !== p[k]);
        if (!changed.length) fail('No changes to save.', 'NOCHANGE');
        changed.forEach(k => {
          const label = { urn: 'URN', encounterId: 'Encounter ID', name: 'Name', diagnosis: 'Diagnosis', ctas: 'CTAS', team: 'Team', physician: 'Physician' }[k];
          ev(p, k === 'ctas' ? D.WF.vitals : 'Patient Details', k === 'ctas' ? 'Re-triaged' : `${label} Updated`, p[k], det[k], a.note || '');
          p[k] = det[k];
        });
        touch(p);
        break;
      }

      case 'RECORD_REASSESSMENT': {
        p = getActive();
        const v = p.workflows.vitals;
        if (!v.active) fail(`${p.urn} is not on vitals monitoring.`);
        const t = a.time ? U.toMs(a.time) : now;
        if (isNaN(t)) fail('Invalid reassessment time.');
        if (t > now + 60000) fail('Reassessment time cannot be in the future.');
        if (t < now - s.backdateMaxMin * 60000) fail(`Reassessments can only be back-dated up to ${s.backdateMaxMin} minutes. Document older observations in the EHR.`);
        const floor = U.toMs(v.lastReassessment || v.startTime);
        if (t < floor) fail(`Time must be after the ${v.lastReassessment ? 'previous reassessment' : 'start of monitoring'} (${U.t24(floor)}).`);
        const before = D.vitalsTiming(p, s, t);
        v.reassessments.push(U.iso(t));
        v.lastReassessment = U.iso(t);
        touch(p);
        const after = D.vitalsTiming(p, s, now);
        ev(p, D.WF.vitals, 'Reassessment Recorded',
          before.state === 'overdue' ? `Overdue ${U.dur(before.overdueMin)}` : before.label || 'Due',
          after.due ? `Next due ${U.t24(after.due)}` : after.label,
          `Observations taken ${U.t24(t)}${t < now - 60000 ? ' (back-dated)' : ''}; physiological values recorded in the EHR.${a.note ? ' ' + U.norm(a.note) : ''}`);
        break;
      }

      case 'ALLOCATE_BED': {
        p = getActive();
        const b = p.workflows.bed;
        if (!b.active) fail(`${p.urn} is not on the Awaiting ED Bed workflow.`);
        const bed = U.norm(a.bed);
        if (!bed) fail('Enter or select the bed being allocated.');
        const specialty = U.norm(a.specialty) || b.intendedSpecialty;
        if (!specialty) fail('Intended specialty is required.');
        const holder = bedHolder(state, bed, p.id);
        if (holder && !a.override) fail(`${bed} is already allocated to ${holder.urn}. Confirm the override only if that allocation is wrong.`, 'BED_TAKEN');
        if (b.bedAllocated && U.key(b.allocatedBed) === U.key(bed) && specialty === b.intendedSpecialty) fail('No changes to save.', 'NOCHANGE');
        const prev = b.bedAllocated ? `Allocated (${b.allocatedBed})` : 'Unallocated';
        if (specialty !== b.intendedSpecialty) ev(p, D.WF.bed, 'Specialty Changed', b.intendedSpecialty, specialty, '');
        b.intendedSpecialty = specialty;
        if (!b.bedAllocated || U.key(b.allocatedBed) !== U.key(bed)) {
          ev(p, D.WF.bed, b.bedAllocated ? 'Bed Re-allocated' : 'Bed Allocated', prev, `Allocated (${bed})`,
            (holder ? `Override: ${bed} was also allocated to ${holder.urn}. ` : '') + (a.note ? U.norm(a.note) : ''));
          b.bedAllocated = true; b.allocatedBed = bed; b.allocationTime = U.iso(now);
          if (!b.firstAllocationTime) b.firstAllocationTime = U.iso(now);
        }
        touch(p);
        break;
      }

      case 'UNALLOCATE_BED': {
        p = getActive();
        const b = p.workflows.bed;
        if (!b.active || !b.bedAllocated) fail('No bed is allocated.');
        const reason = U.norm(a.reason); if (!reason) fail('Give a reason for releasing the bed.');
        ev(p, D.WF.bed, 'Bed Released', `Allocated (${b.allocatedBed})`, 'Unallocated', reason);
        b.bedAllocated = false; b.allocatedBed = null; b.allocationTime = null;
        touch(p);
        break;
      }

      case 'UPDATE_PROCEDURE': {
        p = getActive();
        const r = p.workflows.procedure;
        if (!r.active) fail(`${p.urn} has no active procedure.`);
        const f = validProcFields({ plannedProcedure: a.plannedProcedure || r.plannedProcedure, consent: a.consent, arranged: a.arranged });
        const status = a.status;
        if (!D.PROC_STATUS.includes(status)) fail('Select a procedure status.');
        const note = U.norm(a.note);
        if (['Ready', 'In Progress', 'Done'].includes(status)) {
          if (f.consent === 'Pending' || f.consent === 'Declined') fail(`Cannot mark "${status}" while consent is ${f.consent.toLowerCase()}.`);
          if (status !== 'Done' && f.arranged === 'No') fail(`Cannot mark "${status}" until the procedure is arranged.`);
        }
        if ((status === 'Cancelled' || status === 'Deferred') && !note) fail(`A reason is required to mark the procedure ${status.toLowerCase()}.`);
        const changes = [];
        if (f.plannedProcedure !== r.plannedProcedure) changes.push(['Procedure Changed', r.plannedProcedure, f.plannedProcedure]);
        if (f.consent !== r.consent) changes.push(['Consent Updated', r.consent, f.consent]);
        if (f.arranged !== r.arranged) changes.push(['Arrangement Updated', r.arranged, f.arranged]);
        if (status !== r.status) changes.push(['Procedure Status Updated', r.status, status]);
        if (!changes.length) fail('No changes to save.', 'NOCHANGE');
        changes.forEach(c => ev(p, D.WF.procedure, c[0], c[1], c[2], note));
        Object.assign(r, f, { status });
        if (status === 'Done') { r.completionTime = U.iso(now); r.active = false; r.endTime = U.iso(now); r.endReason = 'Completed'; }
        if (status === 'Cancelled') { r.active = false; r.endTime = U.iso(now); r.endReason = 'Cancelled: ' + note; }
        if (!r.active) ev(p, D.WF.procedure, 'Episode Closed', status, 'Closed', r.endReason);
        touch(p);
        break;
      }

      case 'START_WORKFLOW': {
        p = getActive();
        const k = a.wf;
        if (!D.WF[k]) fail('Unknown workflow.');
        if (p.workflows[k].active) fail(`${p.urn} is already on ${D.WF[k]}.`);
        let note = '';
        if (k === 'vitals') { if (p.workflows.vitals.startTime) archive(p, k); p.workflows.vitals = newVitals(now, true); note = `Interval: ${intervalText(p.ctas, s)}`; }
        if (k === 'bed') {
          const sp = U.norm(a.intendedSpecialty); if (!sp) fail('Intended specialty is required.');
          if (p.workflows.bed.addedTime) archive(p, k); p.workflows.bed = newBed(now, true, sp); note = `Intended specialty: ${sp}`;
        }
        if (k === 'procedure') {
          const f = validProcFields(a);
          if (p.workflows.procedure.requestTime) archive(p, k); p.workflows.procedure = newProc(now, true, f);
          note = `${f.plannedProcedure} · consent ${f.consent} · arranged ${f.arranged}`;
        }
        ev(p, D.WF[k], 'Episode Started', 'None', 'Active', note);
        touch(p);
        break;
      }

      case 'STOP_WORKFLOW': {
        p = getActive();
        const k = a.wf, w = p.workflows[k];
        if (!w || !w.active) fail('That workflow is not active.');
        const reason = U.norm(a.reason); if (!reason) fail('Give a reason for ending this workflow.');
        w.active = false; w.endTime = U.iso(now); w.endReason = reason;
        if (k === 'procedure') w.status = 'Closed - Not Performed';
        if (k === 'bed') { w.bedAllocated = false; }
        ev(p, D.WF[k], 'Episode Ended', 'Active', 'Ended', reason);
        touch(p);
        break;
      }

      case 'EXIT': {
        p = getActive();
        const type = a.type;
        if (!D.EXIT_TYPES[type]) fail('Select how the patient left the waiting area.');
        const reason = U.norm(a.reason);
        if (D.EXIT_NEEDS_REASON.includes(type) && !reason) fail('A reason / note is required for this disposition.');
        let bed = null;
        if (type === 'placed') {
          bed = U.norm(a.bed) || (p.workflows.bed.bedAllocated ? p.workflows.bed.allocatedBed : '');
          if (!bed) fail('Enter the ED bed the patient was physically placed in.');
          const holder = bedHolder(state, bed, p.id);
          if (holder && !a.override) fail(`${bed} is still allocated to ${holder.urn} on the waiting list. Confirm the override if they are not going to that bed.`, 'BED_TAKEN');
        }
        const snapshot = U.clone(p.workflows);
        const closed = D.activeWfs(p);
        const label = D.EXIT_TYPES[type];
        const t = U.iso(now);
        const v = p.workflows.vitals, b = p.workflows.bed, r = p.workflows.procedure;
        if (v.active) Object.assign(v, { active: false, endTime: t, endReason: 'Exit: ' + label });
        if (b.active) {
          Object.assign(b, { active: false, endTime: t, endReason: 'Exit: ' + label });
          if (type === 'placed') Object.assign(b, { physicallyPlaced: true, placementTime: t, allocatedBed: bed, bedAllocated: true });
        }
        if (r.active) Object.assign(r, { active: false, endTime: t, endReason: 'Exit: ' + label, status: 'Closed - Exited Scope' });
        p.status = 'exited';
        p.exit = { type, label, time: t, bed, reason, by: user.name, closedWorkflows: closed, snapshot };
        touch(p);
        ev(p, type === 'placed' ? 'Global Exit (ED Bed Placement)' : 'Global Exit (Disposition)', type === 'placed' ? 'Physical Bed Placement' : 'Patient Exited',
          'Waiting Area Active', 'Closed / Exited Scope',
          `${label}${bed ? ` — ${bed}` : ''}. Closed: ${closed.map(k => D.WF[k]).join(', ') || 'no active workflows'}. Unfinished procedures closed without being marked Done.${reason ? ' Note: ' + reason : ''}`);
        if (type === 'placed' && closed.indexOf('bed') < 0) ev(p, D.WF.bed, 'Bed Placement (not on bed list)', '', bed, 'Placed without an Awaiting ED Bed episode.');
        break;
      }

      case 'REOPEN': {
        p = get();
        if (p.status !== 'exited' || !p.exit) fail('Patient is already active.');
        const ownRecent = p.exit.by === user.name && now - U.toMs(p.exit.time) < 10 * 60000;
        if (!ownRecent && !D.isSupervisor(user)) fail('Only a Charge Nurse, ED Leader or Admin can reopen an exit made by someone else or more than 10 minutes ago.', 'FORBIDDEN');
        const reason = U.norm(a.reason); if (!reason) fail('Give a reason for reopening.');
        const dup = D.activePatients(state).find(x => U.key(x.urn) === U.key(p.urn));
        if (dup) fail(`URN ${p.urn} has been re-registered since the exit; use that record.`, 'DUPLICATE');
        const prevExit = p.exit;
        p.workflows = prevExit.snapshot;
        p.status = 'active'; p.exit = null;
        touch(p);
        ev(p, 'Global Exit', 'Exit Reversed', prevExit.label, 'Waiting Area Active', `${reason}. Restored: ${D.activeWfs(p).map(k => D.WF[k]).join(', ') || 'none'}. Timers continue from their original times.`);
        break;
      }

      case 'SYSTEM_OVERDUE': {
        // Logged once per overdue interval by the leader station; deterministic id makes it idempotent across stations.
        p = state.patients[a.id];
        if (!p || p.status !== 'active') return { state: state0, events: [], patient: null };
        const t = D.vitalsTiming(p, s, now);
        if (t.state !== 'overdue') return { state: state0, events: [], patient: null };
        const id = `ovd-${p.id}-${t.due}`;
        if (state.events.some(e => e.id === id)) return { state: state0, events: [], patient: null };
        ev(p, D.WF.vitals, 'Reassessment Overdue', 'Active', 'Overdue', `Due ${U.t24(t.due)} (${p.ctas}, every ${t.intervalMin} min). Alert raised on ${ctx.device || 'station'}.`, id);
        events[events.length - 1].user = 'System';
        events[events.length - 1].role = 'System';
        break;
      }

      default:
        fail('Unknown action ' + action.type);
    }

    D.appendEvents(state, events);
    state.rev = (state.rev || 0) + 1;
    state.updatedAt = U.iso(now);
    return { state, events, patient: p ? state.patients[p.id] : null };
  };

  function intervalText(ctas, s) {
    const iv = s.ctasIntervals[ctas];
    return ctas === 'CTAS 1' || iv === 0 ? 'continuous' : iv > 0 ? `every ${iv} min (${ctas})` : 'no target set';
  }

  // ------------------------------------------------------------------ audit chain

  const eventBody = e => [e.id, e.ts, e.patientId, e.urn, e.encounterId, e.workflow, e.eventType, e.prev, e.next, e.user, e.role, e.device, e.notes].join('|');
  D.appendEvents = (state, events) => {
    let prev = state.events.length ? state.events[state.events.length - 1].hash : state.chainAnchor;
    events.forEach(e => { e.prevHash = prev; e.hash = U.hash(prev + '|' + eventBody(e)); prev = e.hash; state.events.push(e); });
  };
  /** Returns { ok, checked, brokenAt } — detects any edited, inserted or deleted audit row. */
  D.verifyChain = state => {
    let prev = state.chainAnchor;
    for (let i = 0; i < state.events.length; i++) {
      const e = state.events[i];
      if (e.prevHash !== prev || e.hash !== U.hash(prev + '|' + eventBody(e))) return { ok: false, checked: i, brokenAt: e };
      prev = e.hash;
    }
    return { ok: true, checked: state.events.length };
  };

  /** Drop exited patients and events past retention. Keeps the chain verifiable by moving the anchor. */
  D.purge = (state0, s, now) => {
    const state = U.clone(state0);
    let changed = false;
    Object.values(state.patients).forEach(p => {
      if (p.status === 'exited' && now - U.toMs(p.exit.time) > s.exitedRetentionHours * 3600000) { delete state.patients[p.id]; changed = true; }
    });
    const cutoff = now - s.eventRetentionHours * 3600000;
    let n = 0; while (n < state.events.length && U.toMs(state.events[n].ts) < cutoff) n++;
    if (n) { state.chainAnchor = state.events[n - 1].hash; state.events = state.events.slice(n); changed = true; }
    return changed ? state : null;
  };

  // ------------------------------------------------------------------ metrics (computed from real data)

  function episodes(state, key) {
    const out = [];
    Object.values(state.patients).forEach(p => {
      (p.pastEpisodes || []).filter(e => e.wf === key).forEach(e => out.push({ p, e, ctas: e.ctas }));
      const w = p.workflows[key];
      if (w && (w.startTime || w.addedTime || w.requestTime)) out.push({ p, e: w, ctas: p.ctas });
    });
    return out;
  }

  D.metrics = (state, s, now = Date.now(), hours = 24) => {
    const from = now - hours * 3600000;
    const startHour = new Date(now); startHour.setMinutes(0, 0, 0);
    const firstBucket = startHour.getTime() - (hours - 1) * 3600000;
    const bucketOf = ms => Math.floor((ms - firstBucket) / 3600000);
    const labels = Array.from({ length: hours }, (_, i) => U.t24(firstBucket + i * 3600000));
    const series = () => Array.from({ length: hours }, () => []);

    const alloc = [], place = [], tat = [];
    const allocH = series(), placeH = series(), tatH = series(), compH = series();

    episodes(state, 'bed').forEach(({ e }) => {
      const added = U.toMs(e.addedTime);
      const fa = U.toMs(e.firstAllocationTime);
      if (!isNaN(fa) && fa >= from) { const m = (fa - added) / 60000; alloc.push(m); const b = bucketOf(fa); if (b >= 0 && b < hours) allocH[b].push(m); }
      const pt = U.toMs(e.placementTime);
      if (e.physicallyPlaced && !isNaN(pt) && pt >= from) { const m = (pt - added) / 60000; place.push(m); const b = bucketOf(pt); if (b >= 0 && b < hours) placeH[b].push(m); }
    });
    episodes(state, 'procedure').forEach(({ e }) => {
      const ct = U.toMs(e.completionTime);
      if (e.status === 'Done' && !isNaN(ct) && ct >= from) { const m = (ct - U.toMs(e.requestTime)) / 60000; tat.push(m); const b = bucketOf(ct); if (b >= 0 && b < hours) tatH[b].push(m); }
    });
    let dueCount = 0, onTime = 0;
    const grace = s.complianceGraceMin * 60000;
    episodes(state, 'vitals').forEach(({ e, ctas }) => {
      const iv = s.ctasIntervals[ctas];
      if (!(iv > 0)) return;
      const times = [U.toMs(e.startTime), ...(e.reassessments || []).map(U.toMs)].sort((x, y) => x - y);
      const end = e.endTime ? U.toMs(e.endTime) : now;
      for (let i = 0; i < times.length; i++) {
        const due = times[i] + iv * 60000;
        if (due > end || due < from || due > now) continue; // only intervals that actually fell due during the episode
        const ok = i + 1 < times.length && times[i + 1] <= due + grace;
        dueCount++; if (ok) onTime++;
        const b = bucketOf(due); if (b >= 0 && b < hours) compH[b].push(ok ? 100 : 0);
      }
    });
    const avgSeries = h => h.map(a => (a.length ? U.round(U.mean(a), 1) : null));
    const kpi = a => ({ n: a.length, mean: U.round(U.mean(a)), median: U.round(U.median(a)) });
    return {
      labels, hours,
      bedAlloc: kpi(alloc), bedPlace: kpi(place), procTat: kpi(tat),
      compliance: { n: dueCount, pct: dueCount ? U.round((onTime / dueCount) * 100) : null, median: U.round(U.median(compH.filter(x => x.length).map(U.mean))) },
      hourly: { alloc: avgSeries(allocH), place: avgSeries(placeH), tat: avgSeries(tatH), compliance: avgSeries(compH) },
    };
  };

  /** Individuals (XmR) control limits. Signals: a point outside the limits, or 8 consecutive points on one side of the mean. */
  D.xmr = values => {
    const pts = values.map((v, i) => [i, v]).filter(x => x[1] != null);
    if (pts.length < 6) return { enough: false, n: pts.length };
    const xs = pts.map(x => x[1]);
    const mean = U.mean(xs);
    const mrs = xs.slice(1).map((x, i) => Math.abs(x - xs[i]));
    const mr = U.mean(mrs) || 0;
    const ucl = mean + 2.66 * mr, lcl = Math.max(0, mean - 2.66 * mr);
    const outside = pts.filter(x => x[1] > ucl + 1e-9 || x[1] < lcl - 1e-9).map(x => x[0]);
    let run = 0, side = 0, shift = false;
    xs.forEach(x => { const sd = x > mean ? 1 : x < mean ? -1 : 0; if (sd && sd === side) run++; else { side = sd; run = sd ? 1 : 0; } if (run >= 8) shift = true; });
    return { enough: true, n: pts.length, mean, ucl, lcl, outside, shift, signal: outside.length > 0 || shift };
  };

  // ------------------------------------------------------------------ handoff (SBAR) — built from live data only

  D.sbar = (state, s, now, opts = {}) => {
    const show = p => (opts.privacy ? `${p.urn} (${U.initials(p.name)})` : `${p.urn} ${p.name}`);
    const act = D.activePatients(state);
    const vit = act.filter(p => p.workflows.vitals.active);
    const bed = act.filter(p => p.workflows.bed.active);
    const proc = act.filter(p => p.workflows.procedure.active);
    const overdue = vit.filter(p => D.vitalsTiming(p, s, now).state === 'overdue').sort(D.byVitalsUrgency(s, now));
    const ctas1 = act.filter(p => p.ctas === 'CTAS 1');
    const ctasMix = D.CTAS.map(c => [c, act.filter(p => p.ctas === c).length]).filter(x => x[1]).map(x => `${x[0]}: ${x[1]}`).join(', ') || 'none';
    const longBed = bed.map(p => [p, D.bedWait(p, s, now)]).filter(x => x[1].level !== 'ok').sort((a, b) => b[1].mins - a[1].mins);
    const unalloc = bed.filter(p => !p.workflows.bed.bedAllocated);
    const notReady = proc.filter(p => !D.procReadiness(p.workflows.procedure).ready);
    const noWf = act.filter(p => !D.activeWfs(p).length);
    const m = D.metrics(state, s, now);
    const since = now - 12 * 3600000;
    const exited = Object.values(state.patients).filter(p => p.status === 'exited' && U.toMs(p.exit.time) >= since);
    const placed = exited.filter(p => p.exit.type === 'placed').length;
    const lwbs = exited.filter(p => p.exit.type === 'lwbs' || p.exit.type === 'dama').length;
    const L = [];
    L.push(`=== PULSE-ED SHIFT HANDOFF (SBAR) — ${s.siteName} ===`);
    L.push(`Generated: ${U.full(now)} by ${opts.user || '—'}${opts.demo ? '   [TRAINING / DEMO DATA]' : ''}`, '');
    L.push('[S] SITUATION');
    L.push(`- Active waiting-area patients: ${act.length} (${ctasMix})`);
    L.push(`- Vitals monitoring: ${vit.length} | Awaiting ED bed: ${bed.length} (${unalloc.length} unallocated) | Awaiting procedure: ${proc.length}`);
    L.push(`- OVERDUE reassessments: ${overdue.length}`);
    overdue.forEach(p => L.push(`    • ${show(p)} ${p.ctas} — ${D.vitalsTiming(p, s, now).label}`));
    if (ctas1.length) { L.push(`- CTAS 1 IN WAITING AREA: ${ctas1.length}`); ctas1.forEach(p => L.push(`    • ${show(p)} — ${p.diagnosis}`)); }
    L.push('', '[B] BACKGROUND (last 12 h)');
    L.push(`- Exited waiting area: ${exited.length} (placed on ED bed: ${placed}, LWBS/AMA: ${lwbs})`);
    L.push(`- Last 24 h: bed allocation median ${m.bedAlloc.median ?? '—'} min (n=${m.bedAlloc.n}); placement median ${m.bedPlace.median ?? '—'} min (n=${m.bedPlace.n}); procedure TAT median ${m.procTat.median ?? '—'} min (n=${m.procTat.n}); reassessment compliance ${m.compliance.pct ?? '—'}% (n=${m.compliance.n}).`);
    L.push('', '[A] ASSESSMENT');
    L.push(`- Bed waits over ${s.bedWaitAmberMin} min: ${longBed.length}`);
    longBed.slice(0, 10).forEach(([p, w]) => L.push(`    • ${show(p)} — waiting ${U.dur(w.mins)} for ${p.workflows.bed.intendedSpecialty}${p.workflows.bed.bedAllocated ? ` (allocated ${p.workflows.bed.allocatedBed})` : ' (UNALLOCATED)'}`));
    L.push(`- Procedures not ready: ${notReady.length}`);
    notReady.forEach(p => L.push(`    • ${show(p)} — ${p.workflows.procedure.plannedProcedure}: ${D.procReadiness(p.workflows.procedure).issues.join(', ')}`));
    if (noWf.length) { L.push(`- On board with NO active workflow (need disposition): ${noWf.length}`); noWf.forEach(p => L.push(`    • ${show(p)}`)); }
    L.push('', '[R] RECOMMENDATION');
    let n = 1;
    if (ctas1.length) L.push(`${n++}. Move CTAS 1 patient(s) to resuscitation now; escalate to the ED physician in charge.`);
    if (overdue.length) L.push(`${n++}. Reassess the ${overdue.length} overdue patient(s) first, longest overdue at top.`);
    if (longBed.length) L.push(`${n++}. Escalate the ${longBed.length} prolonged bed wait(s) to the bed coordinator / inpatient teams.`);
    if (notReady.length) L.push(`${n++}. Resolve consent / arrangement for ${notReady.length} procedure(s).`);
    if (noWf.length) L.push(`${n++}. Record a disposition for patients with no active workflow.`);
    if (n === 1) L.push('1. No outstanding safety actions. Continue routine reassessment schedule.');
    if (opts.notes) L.push('', '[NOTES FROM OUTGOING NURSE]', opts.notes);
    L.push('', '=== END OF REPORT ===');
    return L.join('\n');
  };
})(window.PulseED);
