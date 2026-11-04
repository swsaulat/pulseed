/* PulseED — default configuration. Every value here can be changed per site in Settings. */
(function (PE) {
  'use strict';

  PE.VERSION = '2.0.0';

  PE.DEFAULT_SETTINGS = {
    schema: 2,
    siteName: 'Emergency Department',
    stationName: 'Waiting Area Station',

    // Reassessment interval (minutes) per CTAS level, per CTAS guideline. 0 = continuous observation.
    ctasIntervals: { 'CTAS 1': 0, 'CTAS 2': 15, 'CTAS 3': 30, 'CTAS 4': 60, 'CTAS 5': 120 },
    // "Due soon" window = min(dueSoonMaxMin, interval × dueSoonFraction) so a 15-min CTAS 2 is not "due soon" 2/3 of the time.
    dueSoonMaxMin: 10,
    dueSoonFraction: 0.34,
    complianceGraceMin: 1,
    complianceTargetPct: 90,
    backdateMaxMin: 120,

    bedWaitAmberMin: 60,
    bedWaitRedMin: 120,
    procWaitAmberMin: 60,
    procWaitRedMin: 120,

    chimeRepeatMin: 2,
    autoLockMin: 15,
    exitedRetentionHours: 72,
    eventRetentionHours: 168,

    teams: ['Team A', 'Team B', 'Team C'],
    specialties: ['Cardiology', 'Emergency Medicine', 'General Surgery', 'Internal Medicine', 'Neurology', 'Obstetrics & Gynaecology',
      'Orthopaedics', 'Paediatrics', 'Plastic Surgery / Minor Care', 'Psychiatry', 'Respiratory', 'Trauma Surgery', 'Urology'],
    procedures: ['CT Head / Brain', 'CT Abdomen / Pelvis', 'CT Coronary Angiogram', 'CT Pulmonary Angiogram', 'Portable Chest X-Ray',
      'X-Ray Limb', 'Abdominal Ultrasound', 'FAST Ultrasound', 'MRI', 'ECG', 'Lumbar Puncture', 'Wound Repair / Suturing',
      'Tendon Repair & Suturing', 'Fracture Reduction', 'Procedural Sedation', 'IV Electrolyte Panel & Rehydration', 'Blood Transfusion'],
    beds: ['Resus Bay 1', 'Resus Bay 2', 'Resus Bay 3', 'Acute Bed 01', 'Acute Bed 02', 'Acute Bed 03', 'Acute Bed 04', 'Acute Bed 05',
      'Acute Bed 06', 'Acute Bed 07', 'Acute Bed 08', 'Acute Bed 09', 'Acute Bed 10', 'Acute Bed 11', 'Acute Bed 12',
      'Sub-Acute Bed 1', 'Sub-Acute Bed 2', 'Sub-Acute Bed 3', 'Sub-Acute Bed 4', 'Sub-Acute Bed 5', 'Sub-Acute Bed 6',
      'Fast Track 1', 'Fast Track 2', 'Fast Track 3', 'Paeds Bed 1', 'Paeds Bed 2', 'Isolation Room 1', 'Isolation Room 2'],

    // Shared multi-workstation backend. "local" keeps data in this browser only (single station / training).
    backend: { mode: 'local', supabaseUrl: '', supabaseAnonKey: '', facilityId: '' },
  };

  // [start, name] of each shift. Doctors' 8-hour shifts set the emailed reports; nursing's 12-hour shifts are a view.
  PE.SHIFT_PATTERNS = {
    doctor: { label: 'Doctors', hours: 8, shifts: [['06:00', 'Morning'], ['14:00', 'Evening'], ['22:00', 'Night']] },
    nursing: { label: 'Nursing', hours: 12, shifts: [['07:00', 'Day'], ['19:00', 'Night']] },
  };

  // ED Leader = directors, unit heads, head nurses: the detailed view (analytics, audit, exports) and settings.
  // Admin = the same plus Staff & Access. Everyone else uses the station workflows.
  PE.ROLES = ['Nurse', 'Charge Nurse', 'Physician', 'Bed Coordinator', 'ED Leader', 'Admin'];
  PE.SUPERVISOR_ROLES = ['Charge Nurse', 'ED Leader', 'Admin'];
  // Spreadsheets (Excel exports, the Google Sheet register) are for these roles only.
  PE.LEADER_ROLES = ['ED Leader', 'Admin'];
})(window.PulseED);
