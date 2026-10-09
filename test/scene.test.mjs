import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleJourney, planScene } from '../src/scene.mjs';

const viewport = { columns: 120, rows: 24 };
const distance = (a, b, columns = 1, rows = 0.5) => Math.hypot((a[0] - b[0]) * columns, (a[1] - b[1]) * rows * 2);
const frames = (seed, end = 65_000, step = 50, size = viewport) => {
  const result = [];
  for (let elapsedMs = 0; elapsedMs <= end; elapsedMs += step) {
    result.push({ elapsedMs, ...planScene({ ...size, seed, elapsedMs, animal: 'cat' }) });
  }
  return result;
};
const assertState = state => {
  for (const point of [state.point, state.from, state.to]) {
    assert.equal(point.length, 2);
    assert.ok(point.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
  }
  for (const name of ['flying', 'anticipation', 'landing']) {
    assert.ok(Number.isFinite(state[name]) && state[name] >= 0 && state[name] <= 1, name);
  }
};

test('journeys visit opposite corners and traverse horizontal, vertical and diagonal routes in both directions', () => {
  for (const seed of [1, 9, 2026]) {
    const corners = new Set();
    const directions = new Set();
    let curved = false;
    let anticipation = false;
    let landing = false;
    const pauseLengths = [];
    let pause = 0;
    for (let elapsedMs = 0; elapsedMs <= 300_000; elapsedMs += 100) {
      const state = sampleJourney({ ...viewport, seed, elapsedMs });
      assertState(state);
      const [x, y] = state.point;
      if ((x < 0.08 || x > 0.92) && (y < 0.08 || y > 0.92)) corners.add(`${x < 0.5},${y < 0.5}`);
      const dx = state.to[0] - state.from[0];
      const dy = state.to[1] - state.from[1];
      if (Math.abs(dx) > 0.7 && Math.abs(dy) < 0.01) directions.add(dx > 0 ? 'right' : 'left');
      if (Math.abs(dy) > 0.7 && Math.abs(dx) < 0.01) directions.add(dy > 0 ? 'down' : 'up');
      if (Math.abs(dx) > 0.7 && Math.abs(dy) > 0.7) directions.add(dx > 0 ? 'diagonal-right' : 'diagonal-left');
      if (state.flying > 0.3) {
        const cross = Math.abs((x - state.from[0]) * dy - (y - state.from[1]) * dx);
        curved ||= cross > 0.015;
      }
      anticipation ||= state.anticipation > 0.3;
      landing ||= state.landing > 0.3;
      if (state.flying === 0) pause += 100;
      else if (pause) { pauseLengths.push(pause); pause = 0; }
    }
    assert.equal(corners.size, 4);
    assert.deepEqual(directions, new Set(['right', 'left', 'down', 'up', 'diagonal-right', 'diagonal-left']));
    assert.ok(curved && anticipation && landing);
    assert.ok(new Set(pauseLengths).size > 2, 'pauses vary rather than repeating one timer');
  }
});

test('journeys are deterministic, seed-sensitive, continuous and distance-aware at both supported frame rates', () => {
  const input = { ...viewport, elapsedMs: 6789, seed: 7 };
  assert.deepEqual(sampleJourney(input), sampleJourney(input));
  assert.notDeepEqual(sampleJourney(input), sampleJourney({ ...input, seed: 8 }));
  for (const fps of [15, 30]) {
    for (const size of [{ columns: 80, rows: 12 }, { columns: 320, rows: 48 }]) {
      let previous = sampleJourney({ ...size, seed: 7, elapsedMs: 0 }).point;
      for (let elapsedMs = 1000 / fps; elapsedMs < 160_000; elapsedMs += 1000 / fps) {
        const state = sampleJourney({ ...size, seed: 7, elapsedMs });
        assert.ok(distance(previous, state.point, size.columns, size.rows) < 6, 'no frame teleports');
        previous = state.point;
      }
    }
  }
});

test('the first encounter fits a demo and proceeds through contact, defeat, celebration, departure and return', () => {
  const samples = frames(1);
  const phases = samples.filter((frame, index) => index === 0 || frame.phase !== samples[index - 1].phase);
  assert.deepEqual(phases.slice(0, 10).map(frame => frame.phase),
    ['solo', 'arrival', 'chase', 'approach', 'fight', 'defeat', 'celebrate', 'departure', 'return', 'solo']);
  assert.ok(phases[1].elapsedMs < 17_000);
  assert.ok(phases[10].elapsedMs - phases[9].elapsedMs >= 10_000, 'substantial solo time between visitors');
  for (const frame of samples) {
    if (frame.actors.length === 2) assert.notEqual(frame.actors[0].animal, frame.actors[1].animal);
    if (frame.phase === 'fight') {
      assert.equal(frame.actors.length, 2);
      assert.ok(distance(frame.actors[0].state.point, frame.actors[1].state.point, viewport.columns, viewport.rows) < 5,
        'fight requires actual close contact');
      assert.ok(frame.effects.some(effect => effect.kind === 'spark'));
    }
    if (frame.phase === 'defeat') assert.ok(frame.effects.some(effect => effect.kind === 'puff'));
  }
});

test('both species can win and the loser stays gone throughout the winner celebration', () => {
  const winners = new Set();
  for (let seed = 1; seed <= 16; seed++) {
    const samples = frames(seed, 35_000);
    const celebrations = samples.filter(frame => frame.phase === 'celebrate');
    assert.ok(celebrations.length > 10);
    const winner = celebrations[0].actors[0].id;
    winners.add(winner);
    for (const frame of celebrations) {
      assert.equal(frame.actors.length, 1);
      assert.equal(frame.actors[0].id, winner);
      assert.equal(frame.actors[0].scale, 1);
    }
    const fight = samples.find(frame => frame.phase === 'fight');
    const defeat = samples.filter(frame => frame.phase === 'defeat');
    const loser = fight.actors.find(actor => actor.id !== winner).id;
    assert.ok(defeat.at(-1).actors.find(actor => actor.id === loser).scale < 0.15);
    if (winner === 'visitor') {
      for (const frame of samples.filter(frame => frame.phase === 'departure')) {
        assert.ok(!frame.actors.some(actor => actor.id === 'resident'));
      }
      assert.ok(samples.some(frame => frame.phase === 'return' && frame.actors.some(actor => actor.id === 'resident')));
    }
  }
  assert.deepEqual(winners, new Set(['resident', 'visitor']));
});

test('scene motion and actor scale remain continuous through every event boundary', () => {
  for (const seed of [1, 2, 7]) {
    for (const fps of [15, 30]) {
      const samples = frames(seed, 60_000, 1000 / fps);
      for (let index = 1; index < samples.length; index++) {
        const previous = samples[index - 1];
        const current = samples[index];
        for (const actor of current.actors) {
          const before = previous.actors.find(item => item.id === actor.id);
          if (before) {
            assert.ok(distance(before.state.point, actor.state.point, viewport.columns, viewport.rows) < 8,
              `${previous.phase} -> ${current.phase}: ${actor.id}`);
            assert.ok(Math.abs(before.scale - actor.scale) < 0.15);
          } else assert.ok(actor.scale < 0.15, 'actors enter by growing, not popping in');
        }
        for (const actor of previous.actors) {
          if (!current.actors.some(item => item.id === actor.id)) assert.ok(actor.scale < 0.15, 'actors shrink before removal');
        }
        if (current.phase === 'solo') {
          assert.deepEqual(current.actors[0].state,
            sampleJourney({ ...viewport, seed, elapsedMs: current.elapsedMs }));
        }
      }
    }
  }
});

test('solo fallback uses safe drawable height, and resize and finite extremes keep bounded deterministic state', () => {
  for (const size of [{ columns: 79, rows: 24 }, { columns: 120, rows: 11 }, { columns: 1, rows: 1 }]) {
    for (const elapsedMs of [0, 5000, 10_000, 14_000, 22_000]) {
      const scene = planScene({ ...size, seed: 1, elapsedMs, animal: 'fox' });
      assert.equal(scene.phase, 'solo');
      assert.deepEqual(scene.actors.map(actor => actor.id), ['resident']);
    }
  }
  assert.ok(frames(1, 17_000, 100, { columns: 80, rows: 12 }).some(frame => frame.actors.length === 2),
    'the exact minimum safe viewport permits a visitor');
  for (const elapsedMs of [5000, 10_000, Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
    for (const size of [viewport, { columns: 80, rows: 12 }, { columns: Number.MAX_SAFE_INTEGER, rows: Number.MAX_SAFE_INTEGER }]) {
      const input = { ...size, elapsedMs, seed: 0xffffffff, animal: 'octopus' };
      const scene = planScene(input);
      assert.deepEqual(scene, planScene(input));
      assert.ok(scene.actors.length >= 1 && scene.actors.length <= 2);
      for (const actor of scene.actors) {
        assertState(actor.state);
        assert.ok(Number.isFinite(actor.scale) && actor.scale >= 0 && actor.scale <= 1);
        assert.ok(Number.isFinite(actor.tilt) && Math.abs(actor.tilt) <= 0.3);
      }
      for (const effect of scene.effects) {
        assert.ok(['spark', 'puff'].includes(effect.kind));
        assert.ok(effect.point.every(value => Number.isFinite(value) && value >= 0 && value <= 1));
      }
      const solo = planScene({ ...input, encounters: 'off' });
      assert.equal(solo.phase, 'solo');
      assert.deepEqual(solo.actors[0].state, sampleJourney(input));
    }
  }
});

test('resizing refits journeys without retiming motion or reversing encounter phases', () => {
  for (const seed of [1, 11]) {
    for (let elapsedMs = 1000; elapsedMs < 90_000; elapsedMs += 250) {
      const input = { seed, elapsedMs, animal: 'cat' };
      const before = planScene({ ...input, columns: 120, rows: 24 });
      const resized = planScene({ ...input, columns: 320, rows: 48 });
      assert.equal(resized.phase, before.phase, `resize must not rewind the story at ${elapsedMs}ms`);
      assert.deepEqual(resized.actors.map(actor => actor.id), before.actors.map(actor => actor.id));
      for (let index = 0; index < before.actors.length; index++) {
        assert.equal(resized.actors[index].scale, before.actors[index].scale);
        assert.ok(distance(resized.actors[index].state.point, before.actors[index].state.point) < 0.02,
          'resize changes fitting, not progress along the route');
      }
      assert.deepEqual(sampleJourney({ ...input, columns: 120, rows: 24 }),
        sampleJourney({ ...input, columns: 320, rows: 48 }));
    }
  }
});
