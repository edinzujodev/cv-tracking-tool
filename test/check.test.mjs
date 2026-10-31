import test from 'node:test';
import assert from 'node:assert/strict';
import { checkReadBack } from '../src/ats/check.js';
import { emptyProfile } from '../src/model.js';

const profile = {
  ...emptyProfile(),
  name: 'JANE EXAMPLE',
  headline: 'Engineering Lead',
  email: 'jane@example.com',
  phone: '+1 555 010 0100',
  location: 'Springfield',
  summary: 'Engineering lead with ten years building products for energy and retail clients.',
  experience: [
    { title: 'Senior Engineer', company: 'Acme Co', location: 'Berlin', start: '08/2024', end: 'Present', description: 'Built the platform.' },
    { title: 'Engineer', company: 'Globex', location: 'Paris', start: '01/2019', end: '03/2022', description: 'Shipped features.' },
  ],
  education: [{ school: 'Example University', degree: 'BSc in Computer Science', start: '2006', end: '2010' }],
  skills: ['TypeScript', 'Go', 'Docker'],
};

// One item per line, top to bottom, left margin.
const column = (lines, x = 0, y0 = 0) => lines.map((str, i) => ({ str, x, y: y0 + i * 14, h: 10, eol: true }));

const goodLines = [
  'JANE EXAMPLE Engineering Lead',
  'jane@example.com +1 555 010 0100 Springfield',
  'Summary',
  profile.summary,
  'Experience',
  'Senior Engineer', 'Acme Co', 'Built the platform.', '08/2024 – Present', 'Berlin',
  'Engineer', 'Globex', 'Shipped features.', '01/2019 – 03/2022', 'Paris',
  'Education',
  'BSc in Computer Science', 'Example University', '2006 – 2010',
  'Skills',
  'TypeScript, Go, Docker',
];

const status = (res, id) => res.results.find((r) => r.id === id)?.status;

test('a clean single-column resume reads back fully', () => {
  const res = checkReadBack(profile, column(goodLines));
  assert.equal(res.score, 100, JSON.stringify(res.results.filter((r) => r.status !== 'pass')));
});

test('an image-only resume fails the text check', () => {
  const res = checkReadBack(profile, []);
  assert.equal(status(res, 'text'), 'fail');
  assert.ok(res.score < 40);
});

test('an unrecognised heading is reported', () => {
  const lines = goodLines.map((l) => (l === 'Experience' ? 'My Journey' : l));
  const res = checkReadBack(profile, column(lines));
  assert.equal(status(res, 'headings'), 'fail');
});

test('dates that drift away from their job are caught', () => {
  const lines = [...goodLines];
  // Move the first job's dates down into the second job.
  lines.splice(lines.indexOf('08/2024 – Present'), 2);
  lines.splice(lines.indexOf('Paris') + 1, 0, '08/2024 – Present', 'Berlin');
  const res = checkReadBack(profile, column(lines));
  assert.notEqual(status(res, 'exp-dates'), 'pass');
});

test('a side-by-side layout that merges headings only fails in visual order', () => {
  // Skills in a left column sit on the same lines as the Experience column.
  const left = column(['Skills', 'TypeScript, Go, Docker', '', ''], 0, 100);
  const right = column(['Experience', 'Senior Engineer', 'Acme Co', 'Built the platform.'], 200, 100);
  const head = column(goodLines.slice(0, 4), 0, 0);
  const rest = column(['08/2024 – Present', 'Berlin', 'Engineer', 'Globex', 'Shipped features.', '01/2019 – 03/2022', 'Paris', 'Education', 'BSc in Computer Science', 'Example University', '2006 – 2010'], 200, 160);
  const res = checkReadBack(profile, [...head, ...left, ...right, ...rest]);
  const headings = res.results.find((r) => r.id === 'headings');
  assert.equal(headings.status, 'fail');
  assert.match(headings.detail, /not recognised|only when/i);
});

test('a missing email is a failure', () => {
  const lines = goodLines.map((l) => l.replace('jane@example.com', ''));
  const res = checkReadBack(profile, column(lines));
  assert.equal(status(res, 'email'), 'fail');
});

test('line-break hyphens and case do not cause false failures', () => {
  const lines = goodLines.map((l) => (l === 'Senior Engineer' ? 'SENIOR EN-GINEER' : l));
  const res = checkReadBack(profile, column(lines));
  assert.equal(status(res, 'exp-found'), 'pass');
});
