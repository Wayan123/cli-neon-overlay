import test from 'node:test';
import assert from 'node:assert/strict';
import { perchCandidates, pickPerch } from '../src/perch.mjs';

test('perches mark visible word ends above the editor, ignoring styling and unsafe text', () => {
  const lines = [
    '\x1b[1mDeploy\x1b[0m the service now',
    'ab cd',
    'résumé café bistro',
    'tail word near edge-of-screen-x',
    'hidden below the safe rows',
  ];
  const cells = perchCandidates(lines, 4, 31);
  assert.deepEqual(cells.filter(cell => cell.y === 0), [
    { x: 5, y: 0 }, { x: 9, y: 0 }, { x: 17, y: 0 }, { x: 21, y: 0 },
  ], 'escape sequences must not shift word columns');
  assert.equal(cells.filter(cell => cell.y === 1).length, 0, 'short words are not perches');
  assert.equal(cells.filter(cell => cell.y === 2).length, 0, 'non-ASCII rows have unknowable cell widths');
  assert.ok(cells.every(cell => cell.x < 30), 'perches leave room at the right edge');
  assert.ok(cells.every(cell => cell.y < 4), 'rows at or below the safe height are never perches');
});

test('perch picks are deterministic per hop and absent when nothing is visible', () => {
  const cells = perchCandidates(['alpha beta gamma delta epsilon'], 1, 80);
  assert.deepEqual(pickPerch(cells, 41), pickPerch(cells, 41));
  assert.ok(new Set(Array.from({ length: 20 }, (_, hop) => pickPerch(cells, hop).x)).size > 1);
  assert.equal(pickPerch([], 3), undefined);
});
