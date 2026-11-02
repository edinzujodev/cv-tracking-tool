import {
  STATUSES, emptyApplication, isLink, toCsv, today, loadApplications, saveApplications,
} from './model.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const rows = $('rows');
const filter = $('filter');

let apps = [];
let editingId = null;

const options = (list) => list.map((s) => `<option>${s}</option>`).join('');

function jobCell(a) {
  const td = document.createElement('td');
  td.className = 'job';
  if (a.title) td.append(a.title);
  if (isLink(a.job)) {
    const link = document.createElement('a');
    link.href = a.job;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = a.title ? new URL(a.job).hostname : a.job;
    if (a.title) {
      const small = document.createElement('small');
      small.append(link);
      td.append(small);
    } else td.append(link);
  } else {
    const text = a.job.length > 140 ? `${a.job.slice(0, 140)}…` : a.job;
    if (a.title) {
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
  cv.textContent = a.cv;

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
    render();
  });
  actions.append(edit, del);

  tr.append(date, jobCell(a), cv, status, actions);
  return tr;
}

function render() {
  const shown = apps
    .filter((a) => filter.value === 'All' || a.status === filter.value)
    .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn) || b.id.localeCompare(a.id));

  rows.replaceChildren(...shown.map(row));
  $('empty').hidden = shown.length > 0;
  $('table').hidden = shown.length === 0;
  $('count').textContent = `Applications (${shown.length}${filter.value === 'All' ? '' : ` ${filter.value.toLowerCase()}`})`;
  $('cvs').innerHTML = options([...new Set(apps.map((a) => a.cv))]);
}

function resetForm() {
  editingId = null;
  const blank = emptyApplication();
  form.reset();
  form.elements.appliedOn.value = blank.appliedOn;
  form.elements.status.value = blank.status;
  $('save').textContent = 'Add application';
  $('cancel').hidden = true;
}

function startEdit(a) {
  editingId = a.id;
  for (const f of ['job', 'title', 'cv', 'appliedOn', 'status']) form.elements[f].value = a[f];
  $('save').textContent = 'Save changes';
  $('cancel').hidden = false;
  form.scrollIntoView({ behavior: 'smooth' });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    job: form.elements.job.value.trim(),
    title: form.elements.title.value.trim(),
    cv: form.elements.cv.value.trim(),
    appliedOn: form.elements.appliedOn.value || today(),
    status: form.elements.status.value,
  };
  if (editingId) {
    Object.assign(apps.find((a) => a.id === editingId), data);
  } else {
    apps.push({ ...emptyApplication(), ...data, id: crypto.randomUUID() });
  }
  await saveApplications(apps);
  resetForm();
  render();
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
  resetForm();
  render();
})();
