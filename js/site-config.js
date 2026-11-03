/* PulseED — deployment configuration (the only file to edit after deploying the Apps Script back-end).
 * Everything else — staff, roles, report recipients, report times, clinical thresholds — is managed in the
 * "PulseED Register" Google Sheet (owner: swsaulat@gmail.com) or on the PulseED Settings page.
 *
 * API_URL: Apps Script → Deploy → Manage deployments → Web app URL (ends with /exec).
 * Leave apiUrl empty for local / training use (data stays in this browser). */
window.PULSEED_SITE = {
  backend: { mode: 'google', apiUrl: 'https://script.google.com/macros/s/AKfycbyP3y7x6JWEg20C-rQd7VvYtb3SS-wEjCfemNG-zZKzxPpNYFzWc7wqrwXCH1F2dzwf/exec' },
  forceLive: false,
};
// ?training opens Training / Demo mode: synthetic patients kept in this browser only, never the live register.
window.PULSEED_SITE.training = /[?&]training(=|&|$)/.test(location.search);
// Live only on the real site; anywhere else (localhost, file preview) the training/demo option stays available.
if (/(^|\.)patientflowms\.com$/.test(location.hostname) && window.PULSEED_SITE.backend.apiUrl && !window.PULSEED_SITE.training) window.PULSEED_SITE.forceLive = true;
