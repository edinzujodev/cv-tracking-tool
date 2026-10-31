// Read-back check: can the data in `profile` be found again in the text an ATS reads?
//
//   checkReadBack(profile, items) -> { score, results, modes }
//
// Each result is { id, label, status: 'pass' | 'warn' | 'fail', detail }.
// The text is read in two orders (see reader.js) and every result keeps the worse
// outcome, saying which order caused it. The score is a proxy for "parses cleanly",
// not a promise about any one ATS.

import { toLines } from './reader.js';
import { parseResume } from './parser.js';

const MODES = ['stream', 'visual'];
const RANK = { pass: 0, warn: 1, fail: 2 };

// Case, spacing, hyphens and soft line breaks must not decide whether text matches.
const squash = (s) => String(s || '').toLowerCase().replace(/[\s\-‐-―­]+/g, '');
const has = (hay, needle) => !needle || squash(hay).includes(squash(needle));
const digits = (s) => String(s || '').replace(/\D/g, '');

function ratio(found, total) {
  return total ? found / total : 1;
}

function grade(found, total, warnAt = 1, failBelow = 0.5) {
  const r = ratio(found, total);
  return r >= warnAt ? 'pass' : r >= failBelow ? 'warn' : 'fail';
}

// Locate each entry as the first line (after the previous entry) that holds its
// title with its organisation next to it. Everything up to the next entry belongs to it.
function blocks(lines, entries, titleOf, orgOf) {
  const out = [];
  let from = 0;
  for (const e of entries) {
    const title = titleOf(e);
    const org = orgOf(e);
    let at = -1;
    for (let i = from; i < lines.length; i++) {
      const near = lines.slice(Math.max(0, i - 1), i + 2).join(' ');
      if (has(lines[i], title) && (!org || has(near, org))) {
        at = i;
        break;
      }
    }
    out.push({ entry: e, at });
    if (at >= 0) from = at + 1;
  }
  return out.map((b, i) => {
    if (b.at < 0) return { ...b, text: '' };
    const next = out.slice(i + 1).find((n) => n.at >= 0);
    return { ...b, text: lines.slice(b.at, next ? next.at : lines.length).join(' ') };
  });
}

function checkEntries(label, id, lines, entries, spec) {
  const out = [];
  if (!entries.length) return out;
  const found = blocks(lines, entries, spec.title, spec.org);
  const located = found.filter((b) => b.at >= 0);

  out.push({
    id: `${id}-found`,
    label: `${label}: each entry is found with its title and organisation`,
    status: grade(located.length, entries.length),
    detail: `${located.length} of ${entries.length} found`,
  });

  const withDates = found.filter((b) => b.entry[spec.start] || b.entry[spec.end]);
  if (withDates.length) {
    const ok = withDates.filter((b) => b.at >= 0 && has(b.text, b.entry[spec.start]) && has(b.text, b.entry[spec.end]));
    out.push({
      id: `${id}-dates`,
      label: `${label}: each entry keeps its own dates`,
      status: grade(ok.length, withDates.length),
      detail: `${ok.length} of ${withDates.length} entries have their dates attached`,
    });
  }

  const inOrder = located.length < 2 || located.every((b, i) => i === 0 || b.at > located[i - 1].at);
  out.push({
    id: `${id}-order`,
    label: `${label}: entries stay in order`,
    status: inOrder ? 'pass' : 'warn',
    detail: inOrder ? '' : 'Entries were read out of order',
  });
  return out;
}

function checkOne(profile, items, mode) {
  const lines = toLines(items, mode);
  const parsed = parseResume(lines);
  const sec = (k) => (parsed.sections[k] || []);
  const r = [];
  const add = (id, label, status, detail = '') => r.push({ id, label, status, detail });

  const chars = lines.join('').length;
  add('text', 'Text can be extracted', chars >= 100 ? 'pass' : 'fail',
    chars >= 100 ? '' : 'Almost no text was found. A resume saved as an image cannot be read.');
  const garbled = (lines.join('').match(/[�-]/g) || []).length;
  add('encoding', 'Characters read correctly', garbled ? 'warn' : 'pass', garbled ? `${garbled} unreadable characters` : '');

  const nameLine = parsed.name;
  add('name', 'Name is the first thing read',
    squash(nameLine) === squash(profile.name) ? 'pass' : squash(nameLine).startsWith(squash(profile.name)) ? 'pass' : 'fail',
    squash(nameLine).startsWith(squash(profile.name)) ? '' : `Read "${nameLine.slice(0, 40)}"`);

  if (profile.email) {
    add('email', 'Email address found', parsed.email.toLowerCase() === profile.email.toLowerCase() ? 'pass' : 'fail',
      parsed.email ? '' : 'Not found in the header');
  }
  if (profile.phone) {
    const a = digits(parsed.phone);
    const b = digits(profile.phone);
    add('phone', 'Phone number found', a && (a.endsWith(b.slice(-8)) || b.endsWith(a.slice(-8))) ? 'pass' : 'fail',
      parsed.phone ? '' : 'Not found in the header');
  }

  const want = {
    summary: !!profile.summary,
    experience: profile.experience.length > 0,
    education: profile.education.length > 0,
    skills: profile.skills.length > 0 || profile.skillGroups.length > 0,
    projects: profile.projects.length > 0,
    awards: profile.awards.length + profile.certifications.length > 0,
    volunteering: profile.volunteering.length > 0,
    languages: profile.languages.length > 0,
  };
  const missing = Object.keys(want).filter((k) => want[k] && !(k in parsed.sections));
  add('headings', 'Section headings recognised', missing.length ? 'fail' : 'pass',
    missing.length ? `Not recognised: ${missing.join(', ')}` : '');

  r.push(...checkEntries('Experience', 'exp', sec('experience'), profile.experience,
    { title: (e) => e.title, org: (e) => e.company, start: 'start', end: 'end' }));
  r.push(...checkEntries('Education', 'edu', sec('education'), profile.education,
    { title: (e) => e.degree || e.school, org: (e) => (e.degree ? e.school : ''), start: 'start', end: 'end' }));
  r.push(...checkEntries('Volunteering', 'vol', sec('volunteering'), profile.volunteering,
    { title: (e) => e.role, org: (e) => e.organization, start: 'start', end: 'end' }));

  const skills = profile.skillGroups.length ? profile.skillGroups.flatMap((g) => g.items) : profile.skills;
  if (skills.length) {
    const text = sec('skills').join(' ');
    const n = skills.filter((s) => has(text, s)).length;
    add('skills', 'Skills found under Skills', grade(n, skills.length, 0.95, 0.6), `${n} of ${skills.length} skills`);
  }

  const other = [
    ['projects', 'Projects', profile.projects.map((p) => p.name)],
    ['awards', 'Awards', [...profile.awards.map((a) => a.title), ...profile.certifications.map((c) => c.name)]],
    ['languages', 'Languages', profile.languages],
  ];
  for (const [k, label, names] of other) {
    const list = names.filter(Boolean);
    if (!list.length) continue;
    const text = sec(k).join(' ');
    const n = list.filter((s) => has(text, s)).length;
    add(k, `${label} found`, grade(n, list.length), `${n} of ${list.length}`);
  }

  return r;
}

export function checkReadBack(profile, items) {
  const perMode = Object.fromEntries(MODES.map((m) => [m, checkOne(profile, items, m)]));
  const results = perMode.stream.map((base) => {
    let worst = base;
    let worstMode = 'stream';
    const other = perMode.visual.find((x) => x.id === base.id);
    if (other && RANK[other.status] > RANK[base.status]) {
      worst = other;
      worstMode = 'visual';
    }
    const both = !other || other.status === base.status;
    return {
      ...worst,
      detail: both || worst.status === 'pass'
        ? worst.detail
        : `${worst.detail}${worst.detail ? ' · ' : ''}only when read ${worstMode === 'visual' ? 'top to bottom, left to right' : 'in file order'}`,
    };
  });
  const points = results.reduce((s, x) => s + (x.status === 'pass' ? 1 : x.status === 'warn' ? 0.5 : 0), 0);
  return { score: Math.round((100 * points) / results.length), results };
}
