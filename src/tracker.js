import {
  STATUSES, emptyApplication, isLink, toCsv, today, formatDate, parseDate, loadApplications, saveApplications, mergeImported,
} from './model.js';
import {
  putCv, getCv, deleteCv, fileKey, getRoot, setRoot, ensureWritable, saveToClientFolder,
} from './files.js';
import { fetchJobText, listCapturableTabs, captureTab } from './scrape.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const rows = $('rows');
const filter = $('filter');

let apps = [];
let editingId = null;

const options = (list) => list.map((s) => `<option>${s}</option>`).join('');

const BADGE = {
  Applied: 'primary', Interview: 'info', Offer: 'success', Rejected: 'danger', Ghosted: 'secondary', Withdrawn: 'dark',
};
const STATUS_ICON = {
  Applied: 'send', Interview: 'chat-dots', Offer: 'trophy', Rejected: 'x-circle', Ghosted: 'incognito', Withdrawn: 'arrow-counterclockwise',
};

// Follow the system light/dark setting.
const dark = window.matchMedia('(prefers-color-scheme: dark)');
const applyTheme = () => { document.documentElement.dataset.bsTheme = dark.matches ? 'dark' : 'light'; };
applyTheme();
dark.addEventListener('change', applyTheme);

function icon(name) {
  const i = document.createElement('i');
  i.className = `bi bi-${name}`;
  return i;
}

function iconButton(name, label, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn btn-sm ${cls}`;
  b.title = label;
  b.setAttribute('aria-label', label);
  b.append(icon(name));
  return b;
}

function jobCell(a) {
  const title = [a.client, a.title].filter(Boolean).join(' — ');
  const td = document.createElement('td');
  td.className = 'job';
  if (title) td.append(title);
  if (isLink(a.job)) {
    const link = document.createElement('a');
    link.href = a.job;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = title ? new URL(a.job).hostname : a.job;
    if (title) {
      const small = document.createElement('small');
      small.className = 'text-body-secondary';
      small.append(icon('box-arrow-up-right'), ' ', link);
      small.firstChild.className += ' me-1';
      td.append(small);
    } else td.append(link);
  } else {
    const text = a.job.length > 140 ? `${a.job.slice(0, 140)}…` : a.job;
    if (title) {
      const small = document.createElement('small');
      small.className = 'text-body-secondary';
      small.textContent = text;
      td.append(small);
    } else td.append(text);
  }
  return td;
}

function row(a) {
  const tr = document.createElement('tr');
  tr.className = a.status;

  const date = document.createElement('td');
  date.className = 'text-nowrap';
  date.textContent = formatDate(a.appliedOn);

  const cv = document.createElement('td');
  if (a.cvKey) {
    const link = document.createElement('a');
    link.className = 'cv';
    link.href = '#';
    link.append(icon('file-earmark-text'), ` ${a.cv}`);
    link.firstChild.className += ' me-1';
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const file = await getCv(a.cvKey);
      if (!file) return alert('The stored file is missing. Edit this row and upload it again.');
      window.open(URL.createObjectURL(file), '_blank');
    });
    cv.append(link);
  } else cv.textContent = a.cv;

  const status = document.createElement('td');
  const select = document.createElement('select');
  select.className = `form-select form-select-sm status-select text-bg-${BADGE[a.status] || 'secondary'}`;
  select.setAttribute('aria-label', 'Status');
  select.innerHTML = options(STATUSES);
  select.value = a.status;
  select.addEventListener('change', async () => {
    a.status = select.value;
    await saveApplications(apps);
    render();
  });
  status.append(select);

  const actions = document.createElement('td');
  actions.className = 'text-end text-nowrap';
  const edit = iconButton('pencil', 'Edit', 'btn-outline-secondary me-1');
  edit.addEventListener('click', () => startEdit(a));
  const del = iconButton('trash', 'Delete', 'btn-outline-danger');
  del.addEventListener('click', async () => {
    if (!confirm('Delete this application?')) return;
    apps = apps.filter((x) => x.id !== a.id);
    if (editingId === a.id) resetForm();
    await saveApplications(apps);
    await pruneCv(a.cvKey);
    render();
  });
  if (a.jobText) {
    const view = iconButton('file-text', 'View saved job text', 'btn-outline-primary me-1');
    view.addEventListener('click', () => {
      $('jobDialogTitle').textContent = [a.client, a.title].filter(Boolean).join(' — ') || 'Job posting';
      $('jobDialogBody').textContent = a.jobText;
      $('jobDialog').showModal();
    });
    actions.append(view);
  }
  actions.append(edit, del);

  tr.append(date, jobCell(a), cv, status, actions);
  return tr;
}

// Drop a stored CV file once no application points at it.
async function pruneCv(key) {
  if (key && !apps.some((a) => a.cvKey === key)) await deleteCv(key);
}

function fillCvPick(selected = '') {
  const used = new Map(apps.filter((a) => a.cvKey).map((a) => [a.cvKey, a.cv]));
  const pick = form.elements.cvPick;
  pick.innerHTML = '<option value="">Upload a new file…</option>';
  for (const [key, name] of used) {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = name;
    pick.append(o);
  }
  pick.value = used.has(selected) ? selected : '';
}

function render() {
  const shown = apps
    .filter((a) => filter.value === 'All' || a.status === filter.value)
    .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id));

  rows.replaceChildren(...shown.map(row));
  $('empty').hidden = shown.length > 0;
  $('table').hidden = shown.length === 0;
  $('count').textContent = `Applications (${shown.length}${filter.value === 'All' ? '' : ` ${filter.value.toLowerCase()}`})`;
  renderStats();
  fillCvPick(form.elements.cvPick.value);
}

function renderStats() {
  const box = $('stats');
  const tiles = [['All', apps.length, 'list-check', 'primary'], ...STATUSES.map((s) => [s, apps.filter((a) => a.status === s).length, STATUS_ICON[s], BADGE[s]])];
  box.replaceChildren(...tiles.map(([name, n, ic, color]) => {
    const col = document.createElement('div');
    col.className = 'col-6 col-md-4 col-lg';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `stat card h-100 w-100 text-start border-0 shadow-sm${filter.value === name ? ' active' : ''}`;
    btn.innerHTML = `<div class="card-body py-2 px-3 d-flex align-items-center gap-3">
      <span class="stat-icon text-bg-${color}"><i class="bi bi-${ic}"></i></span>
      <span><span class="d-block fs-4 fw-semibold lh-1"></span><small class="text-body-secondary"></small></span></div>`;
    btn.querySelector('.fs-4').textContent = n;
    btn.querySelector('small').textContent = name === 'All' ? 'Total' : name;
    btn.addEventListener('click', () => { filter.value = name; render(); });
    col.append(btn);
    return col;
  }));
}

function resetForm() {
  editingId = null;
  const blank = emptyApplication();
  form.reset();
  scrapeMsg('');
  form.elements.appliedOn.value = formatDate(blank.appliedOn);
  form.elements.status.value = blank.status;
  fillCvPick();
  syncCvHint();
  setSaveLabel('Add application', 'plus-lg');
  $('cancel').hidden = true;
}

function setSaveLabel(text, ic) {
  $('save').replaceChildren(icon(ic), ` ${text}`);
  $('save').firstChild.className += ' me-1';
}

function startEdit(a) {
  editingId = a.id;
  for (const f of ['job', 'jobText', 'client', 'title', 'status']) form.elements[f].value = a[f] || '';
  $('scrapeMsg').textContent = '';
  form.elements.appliedOn.value = formatDate(a.appliedOn);
  fillCvPick(a.cvKey);
  form.elements.cvFile.value = '';
  syncCvHint();
  setSaveLabel('Save changes', 'check-lg');
  $('cancel').hidden = false;
  form.scrollIntoView({ behavior: 'smooth' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const applied = form.elements.appliedOn.value.trim() ? parseDate(form.elements.appliedOn.value) : today();
  if (!applied) {
    form.elements.appliedOn.setCustomValidity('Use the format dd/mm/yy, for example 05/11/26.');
    form.elements.appliedOn.reportValidity();
    return;
  }
  const data = {
    job: form.elements.job.value.trim(),
    jobText: form.elements.jobText.value.trim(),
    client: form.elements.client.value.trim(),
    title: form.elements.title.value.trim(),
    appliedOn: applied,
    status: form.elements.status.value,
  };
  const file = form.elements.cvFile.files[0];
  const picked = form.elements.cvPick.value;
  if (!file && !picked) {
    form.elements.cvFile.setCustomValidity('Choose a CV you used before, or upload one.');
    form.elements.cvFile.reportValidity();
    return;
  }
  // A link with no saved text yet: try to save the posting now, while the link still works.
  let scrapeNote = '';
  if (isLink(data.job) && !data.jobText) {
    try {
      data.jobText = await fetchJobText(data.job);
    } catch (err) {
      scrapeNote = ' The job text could not be saved automatically; edit the row and use "Capture from open tab".';
    }
  }
  // Ask for folder access now, while the click that submitted the form still counts.
  const root = await getRoot();
  const canWrite = root ? await ensureWritable(root) : false;

  if (file) {
    await putCv(file);
    data.cv = file.name;
    data.cvKey = fileKey(file);
  } else {
    data.cvKey = picked;
    data.cv = apps.find((a) => a.cvKey === picked).cv;
  }

  const blob = file || (await getCv(data.cvKey));
  let savedTo = '';
  if (canWrite && blob) {
    try {
      savedTo = await saveToClientFolder(root, data.client, blob);
    } catch (err) {
      alert(`Saved the application, but could not write the CV to your folder: ${err.message}`);
    }
  }

  let oldKey = '';
  if (editingId) {
    const existing = apps.find((a) => a.id === editingId);
    oldKey = existing.cvKey;
    Object.assign(existing, data);
  } else {
    apps.push({ ...emptyApplication(), ...data, id: crypto.randomUUID() });
  }
  await saveApplications(apps);
  if (oldKey !== data.cvKey) await pruneCv(oldKey);
  resetForm();
  render();
  if (savedTo) flash(`CV saved to ${savedTo}.${scrapeNote}`);
  else if (!canWrite) flash(`Application saved. Choose a CV folder to also save the file on disk.${scrapeNote}`);
  else if (scrapeNote) flash(`Application saved.${scrapeNote}`);
});

function scrapeMsg(msg, bad = false) {
  const el = $('scrapeMsg');
  el.textContent = msg;
  el.className = `small align-self-center ${bad ? 'text-danger' : 'text-body-secondary'}`;
}

$('fetchBtn').addEventListener('click', async () => {
  const url = form.elements.job.value.trim();
  if (!isLink(url)) return scrapeMsg('Put the job link in the first box.', true);
  scrapeMsg('Fetching…');
  try {
    form.elements.jobText.value = await fetchJobText(url);
    scrapeMsg('Saved the text from the link.');
  } catch (err) {
    scrapeMsg(err.name === 'AbortError' ? 'The site took too long to answer.' : err.message, true);
  }
});

async function fillTabPick() {
  const pick = $('tabPick');
  pick.innerHTML = '<option value="">Open tab…</option>';
  for (const t of await listCapturableTabs()) {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = (t.title || t.url).slice(0, 80);
    pick.append(o);
  }
}
$('tabPick').addEventListener('focus', fillTabPick);

$('captureBtn').addEventListener('click', async () => {
  if (!$('tabPick').value) await fillTabPick();
  const id = Number($('tabPick').value);
  if (!id) return scrapeMsg('Pick the open tab with the job posting first.', true);
  try {
    const r = await captureTab(id);
    form.elements.jobText.value = r.text;
    if (!isLink(form.elements.job.value)) form.elements.job.value = r.url;
    scrapeMsg(`Captured ${r.text.length.toLocaleString()} characters from the tab.`);
  } catch (err) {
    scrapeMsg(err.message, true);
  }
});

$('jobClose').addEventListener('click', () => $('jobDialog').close());
$('jobCopy').addEventListener('click', () => navigator.clipboard.writeText($('jobDialogBody').textContent));

function syncCvHint() {
  form.elements.cvFile.setCustomValidity('');
  const hasFile = form.elements.cvFile.files.length > 0;
  form.elements.cvPick.disabled = hasFile;
  $('cvHint').textContent = hasFile ? 'The uploaded file will be used.' : 'Pick one you used before, or upload a new one.';
}
form.elements.cvFile.addEventListener('change', syncCvHint);
form.elements.appliedOn.addEventListener('input', () => form.elements.appliedOn.setCustomValidity(''));
$('todayBtn').addEventListener('click', () => { form.elements.appliedOn.value = formatDate(today()); form.elements.appliedOn.setCustomValidity(''); });

function flash(msg) {
  $('folderName').textContent = msg;
}

async function showFolder() {
  const root = await getRoot();
  $('folderName').textContent = root
    ? `Saving CVs to …\${root.name}\<client>`
    : 'No folder chosen: CVs are kept in the browser only.';
}

$('pickFolder').addEventListener('click', async () => {
  try {
    await setRoot(await showDirectoryPicker({ id: 'cv-folder', mode: 'readwrite' }));
    showFolder();
  } catch (err) {
    if (err.name !== 'AbortError') alert(`Could not use that folder: ${err.message}`);
  }
});

$('cancel').addEventListener('click', resetForm);
filter.addEventListener('change', render);

$('export').addEventListener('click', () => {
  const blob = new Blob([toCsv(apps)], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `applications-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('exportJson').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(apps, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `applications-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('importJson').addEventListener('click', () => $('importFile').click());
$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const result = mergeImported(apps, await file.text());
    apps = result.apps;
    await saveApplications(apps);
    render();
    alert(`Imported ${result.added} application(s); ${result.skipped} already present or skipped.`);
  } catch (err) {
    alert(`Import failed: ${err.message}`);
  }
});

(async () => {
  form.elements.status.innerHTML = options(STATUSES);
  filter.innerHTML = options(['All', ...STATUSES]);
  apps = await loadApplications();
  showFolder();
  resetForm();
  render();
})();
