// The one data shape the tracker uses, plus storage helpers.

export const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Ghosted', 'Withdrawn'];

export const STORAGE_KEY = 'applications';

// Local date as YYYY-MM-DD (toISOString would give the UTC day, which can be off by one).
export function today(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

export function emptyApplication() {
  return {
    id: '',
    job: '',        // link or pasted description
    title: '',      // optional short label, e.g. "Backend engineer, Acme"
    cv: '',         // file name of the CV that was sent, e.g. "CV v3 backend.pdf"
    cvKey: '',      // key of the stored file (see files.js)
    appliedOn: today(),
    status: STATUSES[0],
  };
}

export function isLink(job) {
  return /^https?:\/\/\S+$/i.test((job || '').trim());
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(apps) {
  const head = ['Applied on', 'Status', 'Role', 'CV', 'Job'];
  const rows = apps.map((a) => [a.appliedOn, a.status, a.title, a.cv, a.job]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export async function loadApplications() {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  return got[STORAGE_KEY] || [];
}

export function saveApplications(apps) {
  return chrome.storage.local.set({ [STORAGE_KEY]: apps });
}
