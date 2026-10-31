// The one data shape every part of the extension agrees on.
// The scanner fills it, the panel edits it, templates render it.

export function emptyProfile() {
  return {
    name: '',
    headline: '',
    location: '',
    email: '',
    phone: '',
    links: [],          // [{ label, url }]
    summary: '',
    experience: [],     // [{ title, company, location, start, end, description }]
    education: [],      // [{ school, degree, start, end }]
    skills: [],         // [string]
    skillGroups: [],    // [{ name, items: [string] }]; shown instead of skills when set
    certifications: [], // [{ name, issuer, date }]
    awards: [],         // [{ title, issuer, date }]
    projects: [],       // [{ name, description }]
    volunteering: [],   // [{ role, organization, start, end, description }]
    languages: [],      // [string]
  };
}

// Fill any missing keys so templates never have to null-check the shape.
export function normalizeProfile(raw) {
  return { ...emptyProfile(), ...(raw || {}) };
}

export const STORAGE_KEY = 'profile';
export const TEMPLATE_KEY = 'template';

export async function loadProfile() {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeProfile(got[STORAGE_KEY]);
}

export function saveProfile(profile) {
  return chrome.storage.local.set({ [STORAGE_KEY]: profile });
}
