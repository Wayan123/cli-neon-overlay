import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, parseNeonCommand } from '../src/settings.mjs';
import { parseCompanionArgs } from '../src/companion.mjs';

test('unknown animals and extra tokens cannot become state-changing commands', () => {
  for (const command of ['animal tiger', 'cat extra', 'demo cat extra', 'on cat', 'off now',
    'ascii false', 'reset all', 'next cat', 'theme constructor', 'theme __proto__',
    'size huge', 'motion fast', 'position bottom', 'theme', 'help cat', 'status cat',
    'style neon', 'style', 'tether maybe', 'fps 60', 'fps 30 now',
    'motion random extra', 'encounters', 'encounters maybe', 'encounters on extra', 'encounters off extra']) {
    const result = parseNeonCommand(command);
    assert.equal(result.type, 'error', command);
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

test('random movement and encounter selection parse without changing defaults', () => {
  const original = { ...DEFAULT_SETTINGS };
  assert.deepEqual(parseNeonCommand('motion random'), { type: 'set', key: 'motion', value: 'random' });
  assert.deepEqual(parseNeonCommand('encounters ON'), { type: 'set', key: 'encounters', value: 'on' });
  assert.deepEqual(parseNeonCommand('encounters off'), { type: 'set', key: 'encounters', value: 'off' });
  for (const command of ['motion random extra', 'encounters on extra', 'encounters off extra']) {
    assert.equal(parseNeonCommand(command).type, 'error');
  }
  assert.deepEqual(DEFAULT_SETTINGS, original);
});

test('historical motions and native modes remain selectable', () => {
  for (const motion of ['still', 'slow', 'normal', 'lively']) {
    assert.deepEqual(parseNeonCommand(`motion ${motion}`), { type: 'set', key: 'motion', value: motion });
  }
  for (const mode of ['auto', 'on', 'off']) {
    assert.deepEqual(parseNeonCommand(mode), { type: 'mode', mode });
  }
});

test('companion forwards validated random and encounter choices without touching host arguments', () => {
  assert.deepEqual(parseCompanionArgs(['--motion', 'random', '--encounters', 'off', '--', 'host', '--encounters', 'host-value']), {
    help: false,
    command: ['host', '--encounters', 'host-value'],
    previewArgs: ['--motion', 'random', '--encounters', 'off'],
  });
  for (const args of [
    ['--encounters', 'maybe', '--', 'host'],
    ['--encounters', '--', 'host'],
    ['--encounters', 'on', 'extra', '--', 'host'],
    ['--motion', 'random', 'extra', '--', 'host'],
  ]) {
    assert.throws(() => parseCompanionArgs(args));
  }
});
