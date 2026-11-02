import {
  STATUSES, emptyApplication, isLink, toCsv, today, loadApplications, saveApplications,
} from './model.js';
import {
  putCv, getCv, deleteCv, fileKey, getRoot, setRoot, ensureWritable, saveToClientFolder,
} from './files.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const rows = $('rows');
const filter = $('filter');

let apps = [];
let editingId = null;

const options = (list) => list.map((s) => `<option>${s}</option>`).join('');

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
      small.append(link);
      td.append(small);
    } else td.append(link);
  } else {
    const text = a.job.length > 140 ? `${a.job.slice(0, 140)}…` : a.job;
    if (title) {
      const small = document.createElement('small');
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
  date.textContent = a.appliedOn;

  const cv = document.createElement('td');
  if (a.cvKey) {
    const link = document.createElement('a');
    link.className = 'cv';
    link.href = '#';
    link.textContent = a.cv;
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
  select.innerHTML = options(STATUSES);
  select.value = a.status;
  select.addEventListener('change', async () => {
    a.status = select.value;
    await saveApplications(apps);
    render();
  });
  status.append(select);

  const actions = document.createElement('td');
  const edit = document.createElement('button');
  edit.textContent = 'Edit';
  edit.className = 'outline secondary';
  edit.addEventListener('click', () => startEdit(a));
  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.className = 'outline secondary';
  del.addEventListener('click', async () => {
    if (!confirm('Delete this application?')) return;
    apps = apps.filter((x) => x.id !== a.id);
    if (editingId === a.id) resetForm();
    await saveApplications(apps);
    await pruneCv(a.cvKey);
    render();
  });
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
  fillCvPick(form.elements.cvPick.value);
}

function resetForm() {
  editingId = null;
  const blank = emptyApplication();
  form.reset();
  form.elements.appliedOn.value = blank.appliedOn;
  form.elements.status.value = blank.status;
  fillCvPick();
  syncCvHint();
  $('save').textContent = 'Add application';
  $('cancel').hidden = true;
}

function startEdit(a) {
  editingId = a.id;
  for (const f of ['job', 'client', 'title', 'appliedOn', 'status']) form.elements[f].value = a[f];
  fillCvPick(a.cvKey);
  form.elements.cvFile.value = '';
  syncCvHint();
  $('save').textContent = 'Save changes';
  $('cancel').hidden = false;
  form.scrollIntoView({ behavior: 'smooth' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    job: form.elements.job.value.trim(),
    client: form.elements.client.value.trim(),
    title: form.elements.title.value.trim(),
    appliedOn: form.elements.appliedOn.value || today(),
    status: form.elements.status.value,
  };
  const file = form.elements.cvFile.files[0];
  const picked = form.elements.cvPick.value;
  if (!file && !picked) {
    form.elements.cvFile.setCustomValidity('Choose a CV you used before, or upload one.');
    form.elements.cvFile.reportValidity();
    return;
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
  if (savedTo) flash(`CV saved to ${savedTo}`);
  else if (!canWrite) flash('Application saved. Choose a CV folder to also save the file on disk.');
});

function syncCvHint() {
  form.elements.cvFile.setCustomValidity('');
  const hasFile = form.elements.cvFile.files.length > 0;
  form.elements.cvPick.disabled = hasFile;
  $('cvHint').textContent = hasFile ? 'The uploaded file will be used.' : 'Pick one you used before, or upload a new one.';
}
form.elements.cvFile.addEventListener('change', syncCvHint);

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

(async () => {
  form.elements.status.innerHTML = options(STATUSES);
  filter.innerHTML = options(['All', ...STATUSES]);
  apps = await loadApplications();
  showFolder();
  resetForm();
  render();
})();
