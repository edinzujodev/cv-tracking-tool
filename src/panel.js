import { loadProfile, saveProfile, normalizeProfile, TEMPLATE_KEY } from './model.js';
import { TEMPLATES } from './templates/index.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
const status = $('status');
const FIELDS = ['name', 'headline', 'location', 'email', 'phone'];

let profile = normalizeProfile();

function say(msg, isError = false) {
  status.textContent = msg;
  status.className = isError ? 'error' : '';
}

function show() {
  form.hidden = false;
  for (const f of FIELDS) form.elements[f].value = profile[f] || '';
  $('counts').firstElementChild.textContent =
    `${profile.experience.length} roles, ${profile.education.length} schools, ${profile.skills.length} skills found`;
}

async function activeLinkedInTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url?.startsWith('https://www.linkedin.com/in/') ? tab : null;
}

$('scan').addEventListener('click', async () => {
  const tab = await activeLinkedInTab();
  if (!tab) return say('Open your LinkedIn profile in this tab first.', true);

  say('Reading your profile…');
  let res;
  try {
    res = await chrome.tabs.sendMessage(tab.id, { type: 'scan' });
  } catch {
    return say('Reload the LinkedIn page, then try again.', true);
  }
  if (!res?.ok) return say(res?.message || 'Could not read the page.', true);

  // Keep contact details the user already typed in; LinkedIn hides them behind a dialog.
  const prev = await loadProfile();
  profile = { ...res.profile, email: prev.email, phone: prev.phone };
  await saveProfile(profile);
  show();
  say('Done. Check the details and add your email and phone.');
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  for (const f of FIELDS) profile[f] = form.elements[f].value.trim();
  await saveProfile(profile);
  await chrome.storage.local.set({ [TEMPLATE_KEY]: $('template').value });
  chrome.tabs.create({ url: chrome.runtime.getURL('src/resume.html') });
});

(async () => {
  $('template').innerHTML = TEMPLATES.map(
    (t) => `<option value="${t.id}" ${t.ready ? '' : 'disabled'}>${t.name}</option>`
  ).join('');
  const { [TEMPLATE_KEY]: saved } = await chrome.storage.local.get(TEMPLATE_KEY);
  if (saved) $('template').value = saved;

  profile = await loadProfile();
  if (profile.name) show();
})();
