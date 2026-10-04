import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNeonCommand } from '../src/settings.mjs';

test('unknown animals and extra tokens cannot become state-changing commands', () => {
  for (const command of ['animal tiger', 'cat extra', 'demo cat extra', 'on cat', 'off now',
    'ascii false', 'reset all', 'next cat', 'theme constructor', 'theme __proto__',
    'size huge', 'motion fast', 'position bottom', 'theme', 'help cat', 'status cat']) {
    const result = parseNeonCommand(command);
    assert.equal(result.type, 'error', command);
    assert.match(result.message, /Use /, 'invalid input explains a recovery command');
  }
});

test('selection and explicit demo remain separate actions', () => {
  assert.deepEqual(parseNeonCommand('  ANIMAL  Cat '), { type: 'set', key: 'animal', value: 'cat' });
  assert.deepEqual(parseNeonCommand('cat'), { type: 'set', key: 'animal', value: 'cat' });
  assert.deepEqual(parseNeonCommand('demo cat'), { type: 'demo', animal: 'cat' });
  assert.deepEqual(parseNeonCommand(''), { type: 'info', topic: 'help' });
  assert.deepEqual(parseNeonCommand('motion still'), { type: 'set', key: 'motion', value: 'still' });
});
