// The one data shape the tracker uses, plus storage helpers.

export const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected', 'Ghosted', 'Withdrawn'];

export const STORAGE_KEY = 'applications';

// Local date as YYYY-MM-DD (toISOString would give the UTC day, which can be off by one).
export function today(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// Dates are stored as YYYY-MM-DD and shown to the user as dd/mm/yy.
export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : (iso || '');
}

// Accepts dd/mm/yy or dd/mm/yyyy (also . or - as separators). Returns YYYY-MM-DD, or null if invalid.
export function parseDate(text) {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec((text || '').trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  const p = (n) => String(n).padStart(2, '0');
  return `${year}-${p(month)}-${p(day)}`;
}

export function emptyApplication() {
  return {
    id: '',
    job: '',        // link or pasted description
    client: '',     // company; also the name of the folder the CV is saved in
    title: '',      // optional role, e.g. "Backend engineer"
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
  const head = ['Applied on', 'Status', 'Client', 'Role', 'CV', 'Job'];
  const rows = apps.map((a) => [formatDate(a.appliedOn), a.status, a.client, a.title, a.cv, a.job]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

// Parse an exported JSON backup and merge it into the current list.
// Entries whose id already exists are kept as they are; the rest are added.
export function mergeImported(current, text) {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data && data[STORAGE_KEY];
  if (!Array.isArray(list)) throw new Error('This file does not contain a list of applications.');
  const have = new Set(current.map((a) => a.id));
  const added = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const a = { ...emptyApplication(), ...raw };
    a.id = a.id || crypto.randomUUID();
    if (have.has(a.id)) continue;
    have.add(a.id);
    added.push(a);
  }
  return { apps: [...current, ...added], added: added.length, skipped: list.length - added.length };
}

export async function loadApplications() {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  return got[STORAGE_KEY] || [];
}

export function saveApplications(apps) {
  return chrome.storage.local.set({ [STORAGE_KEY]: apps });
}
