import test from 'node:test';
import assert from 'node:assert/strict';
import * as renderer from '../src/renderer.mjs';

test('animal selection yields distinct silhouettes and static motion freezes the full frame', () => {
  assert.equal(typeof renderer.renderAnimal, 'function', 'multi-animal renderer is available');
  const input = { columns: 110, rows: 40, elapsedMs: 0, motion: 'still', ascii: true };
  const frames = ['spider', 'cat', 'fox', 'jellyfish'].map(animal => {
    const frame = renderer.renderAnimal({ ...input, animal });
    assert.deepEqual(renderer.renderAnimal({ ...input, animal, elapsedMs: 12500 }), frame,
      `${animal} must not move, blink or scan in still mode`);
    return frame;
  });
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      assert.notDeepEqual(frames[i], frames[j], 'different species must not be recolored copies');
    }
  }
});
