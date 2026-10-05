import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNeonCommand } from '../src/settings.mjs';

test('unknown animals and extra tokens cannot become state-changing commands', () => {
  for (const command of ['animal tiger', 'cat extra', 'demo cat extra', 'on cat', 'off now',
    'ascii false', 'reset all', 'next cat', 'theme constructor', 'theme __proto__',
    'size huge', 'motion fast', 'position bottom', 'theme', 'help cat', 'status cat',
    'style neon', 'style', 'tether maybe', 'fps 60', 'fps 30 now']) {
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
  assert.deepEqual(parseNeonCommand('style FUZZY'), { type: 'set', key: 'style', value: 'fuzzy' });
  assert.deepEqual(parseNeonCommand('fps 30'), { type: 'set', key: 'fps', value: '30' });
  assert.deepEqual(parseNeonCommand('demo octopus'), { type: 'demo', animal: 'octopus' });
});
