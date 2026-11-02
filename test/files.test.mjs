import test from 'node:test';
import assert from 'node:assert/strict';
import { safeName } from '../src/files.js';

test('safeName strips characters Windows forbids', () => {
  assert.equal(safeName('Acme: R&D / "Berlin"?'), 'Acme R&D Berlin');
});

test('safeName trims trailing dots and spaces and collapses whitespace', () => {
  assert.equal(safeName('  Foo   Bar. . '), 'Foo Bar');
});

test('safeName falls back when nothing is left', () => {
  assert.equal(safeName('???'), 'Unnamed');
  assert.equal(safeName('', 'CV'), 'CV');
});
