import test from 'node:test';
import assert from 'node:assert/strict';
import { today, isLink, toCsv, emptyApplication, STATUSES, mergeImported, formatDate, parseDate } from '../src/model.js';

test('today uses the local date, zero padded', () => {
  assert.equal(today(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('a new application defaults to today and the first status', () => {
  const a = emptyApplication();
  assert.equal(a.appliedOn, today());
  assert.equal(a.status, STATUSES[0]);
});

test('isLink accepts urls and rejects descriptions', () => {
  assert.ok(isLink('https://example.com/jobs/1'));
  assert.ok(!isLink('We are hiring https://example.com'));
  assert.ok(!isLink(''));
});

test('toCsv quotes commas, quotes and newlines', () => {
  const csv = toCsv([
    { appliedOn: '2026-11-02', status: 'Applied', client: 'Acme', title: 'Dev, Lead', cv: 'cv.pdf', job: 'say "hi"\nnow' },
  ]);
  assert.equal(
    csv,
    'Applied on,Status,Client,Role,CV,Job\n02/11/26,Applied,Acme,"Dev, Lead",cv.pdf,"say ""hi""\nnow"'
  );
});

test('mergeImported adds new entries and skips ids already present', () => {
  const current = [{ id: 'a', client: 'Acme' }];
  const file = JSON.stringify([{ id: 'a', client: 'Changed' }, { id: 'b', client: 'Beta' }]);
  const r = mergeImported(current, file);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 1);
  assert.equal(r.apps.length, 2);
  assert.equal(r.apps[0].client, 'Acme');
  assert.equal(r.apps[1].status, STATUSES[0]);
});

test('mergeImported rejects files that are not an application list', () => {
  assert.throws(() => mergeImported([], '{"x":1}'), /list of applications/);
});

test('formatDate shows dd/mm/yy', () => {
  assert.equal(formatDate('2026-11-02'), '02/11/26');
  assert.equal(formatDate(''), '');
});

test('parseDate accepts dd/mm/yy and dd/mm/yyyy, rejects impossible dates', () => {
  assert.equal(parseDate('02/11/26'), '2026-11-02');
  assert.equal(parseDate('2.1.2026'), '2026-01-02');
  assert.equal(parseDate('31/02/26'), null);
  assert.equal(parseDate('2026-11-02'), null);
  assert.equal(parseDate(''), null);
});
