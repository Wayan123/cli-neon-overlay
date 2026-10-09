import test from 'node:test';
import assert from 'node:assert/strict';
import * as renderer from '../src/renderer.mjs';

// A single-animal render or a sliced second body would violate this scene seam.
test('scene renders occasional distinct visitors and removes the defeated actor', () => {
  const phases = new Map();
  for (let elapsedMs = 0; elapsedMs < 75_000; elapsedMs += 100) {
    const frame = renderer.renderScene({ columns: 120, rows: 48, elapsedMs, seed: 11, animal: 'mite', style: 'orb' });
    if (!phases.has(frame.phase)) phases.set(frame.phase, frame);
    assert.ok(frame.cells.length <= 256);
    const occupied = new Set();
    for (const cell of frame.cells) {
      assert.ok(cell.x >= 0 && cell.x < 120 && cell.y >= 0 && cell.y < 24);
      assert.ok(Number.isInteger(cell.x) && Number.isInteger(cell.y));
      assert.equal([...cell.text].length, 1);
      assert.ok(!occupied.has(`${cell.x}:${cell.y}`));
      occupied.add(`${cell.x}:${cell.y}`);
    }
  }
  const fight = phases.get('fight');
  assert.ok(fight, 'animals must meet and fight');
  assert.equal(fight.animals.length, 2);
  assert.equal(new Set(fight.animals).size, 2, 'visitor must be a different species');
  assert.equal(phases.get('celebrate')?.animals.length, 1, 'loser stays gone during celebration');
});

test('scene refits complete animals after resize and suppresses visitors in small viewports', () => {
  for (const [columns, rows] of [[40, 16], [79, 48], [120, 22], [80, 24], [160, 64]]) {
    for (const style of ['wireframe', 'orb', 'fuzzy']) {
      for (const ascii of [false, true]) {
        for (let elapsedMs = 0; elapsedMs < 60_000; elapsedMs += 347) {
          const frame = renderer.renderScene({ columns, rows, elapsedMs, seed: 11, style, ascii, size: 'large' });
          assert.ok(frame.cells.length <= 256);
          assert.ok(frame.cells.every(cell => cell.x >= 0 && cell.x < columns && cell.y >= 0 && cell.y < Math.floor(rows / 2)));
          if (columns < 80 || rows < 24) assert.deepEqual(frame.animals, ['spider']);
        }
      }
    }
  }
});

test('still and fixed modes never start encounters, and encounter off retains random roaming', () => {
  for (const options of [{ motion: 'still' }, { position: 'left' }, { position: 'right' }, { encounters: 'off' }]) {
    const input = { columns: 120, rows: 48, seed: 23, ...options };
    for (const elapsedMs of [0, 13_000, 18_000, 25_000, 61_000]) {
      const frame = renderer.renderScene({ ...input, elapsedMs });
      assert.equal(frame.phase, 'solo');
      assert.deepEqual(frame.animals, ['spider']);
      assert.deepEqual(frame.cells, renderer.renderAnimal({ ...input, elapsedMs }));
    }
  }
});

test('scene hides invalid inputs and remains finite at extreme times and dimensions', () => {
  for (const options of [{ seed: -1 }, { seed: 1.5 }, { seed: 0x100000000 }, { seed: null },
    { encounters: 'maybe' }, { columns: 39 }, { rows: 15 }, { elapsedMs: Infinity }]) {
    assert.deepEqual(renderer.renderScene({ columns: 120, rows: 48, elapsedMs: 0, ...options }),
      { cells: [], phase: 'hidden', animals: [] });
  }
  for (const elapsedMs of [Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
    for (const columns of [80, Number.MAX_SAFE_INTEGER]) {
      const frame = renderer.renderScene({ columns, rows: 48, elapsedMs, seed: 0xffffffff });
      assert.ok(frame.cells.every(cell => Number.isSafeInteger(cell.x) && Number.isSafeInteger(cell.y)
        && cell.x >= 0 && cell.x < columns && cell.y >= 0 && cell.y < 24));
    }
  }
});

test('random animals travel through both screen axes without frame-sized teleports', () => {
  const input = { columns: 160, rows: 64, motion: 'random', tether: 'off', seed: 17 };
  const center = cells => ({
    x: cells.reduce((sum, c) => sum + c.x, 0) / cells.length,
    y: cells.reduce((sum, c) => sum + c.y, 0) / cells.length,
  });
  for (const animal of ['spider', 'cat', 'octopus', 'crab']) {
    const points = [];
    for (let elapsedMs = 0; elapsedMs < 120_000; elapsedMs += 67) {
      const point = center(renderer.renderAnimal({ ...input, animal, elapsedMs }));
      if (points.length) assert.ok(Math.hypot(point.x - points.at(-1).x, point.y - points.at(-1).y) < 8,
        `${animal} must traverse intermediate cells, not jump across the screen`);
      points.push(point);
    }
    assert.ok(Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x)) > 80);
    assert.ok(Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)) > 12);
  }
});

test('different seeded scenes stay reproducible without mutable shared frame cells', () => {
  const input = Object.freeze({ columns: 120, rows: 48, elapsedMs: 14_100, seed: 11 });
  const first = renderer.renderScene(input);
  renderer.renderScene({ columns: 40, rows: 16, elapsedMs: 3000, seed: 55, ascii: true });
  assert.deepEqual(renderer.renderScene(input), first);
  first.cells[0].text = 'X';
  assert.notEqual(renderer.renderScene(input).cells[0].text, 'X');
  const positions = frame => frame.cells.map(c => `${c.x}:${c.y}`).join('|');
  assert.notEqual(positions(renderer.renderScene(input)),
    positions(renderer.renderScene({ ...input, seed: 12 })), 'independent sessions must vary their scenes');
});

test('clash sparks remain visible when filled bodies occupy the contact cells', () => {
  const frame = renderer.renderScene({ columns: 120, rows: 48, elapsedMs: 12500, seed: 11,
    animal: 'mite', theme: 'lime', style: 'orb', ascii: true });
  assert.equal(frame.phase, 'fight');
  assert.ok(frame.cells.some(cell => cell.text === '*'), 'contact must visibly clash, not silently merge');
});
