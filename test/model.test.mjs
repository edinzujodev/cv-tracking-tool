import test from 'node:test';
import assert from 'node:assert/strict';
import { today, isLink, toCsv, emptyApplication, STATUSES } from '../src/model.js';

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
    'Applied on,Status,Client,Role,CV,Job\n2026-11-02,Applied,Acme,"Dev, Lead",cv.pdf,"say ""hi""\nnow"'
  );
});
