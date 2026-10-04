import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAnimal } from '../src/renderer.mjs';
import { ANIMALS, THEMES, SIZES, MOTIONS, POSITIONS, DEFAULT_SETTINGS } from '../src/settings.mjs';

const foreground = /^\u001b\[38;2;(\d{1,3});(\d{1,3});(\d{1,3})m$/;

function assertFrame(frame, columns, rows, ascii, theme = 'neon') {
  assert.ok(frame.length > 0, 'valid geometry must show the animal');
  assert.ok(frame.length <= 128, 'sparse overlay capacity must not be exceeded');
  const positions = new Set();
  for (const cell of frame) {
    assert.ok(Number.isInteger(cell.x) && Number.isInteger(cell.y));
    assert.ok(cell.x >= 0 && cell.x < columns, 'cell must fit horizontally');
    assert.ok(cell.y >= 0 && cell.y < Math.floor(rows / 2), 'bottom half is protected');
    const key = `${cell.x}:${cell.y}`;
    assert.ok(!positions.has(key), 'each overlay position must be unique');
    positions.add(key);
    assert.equal([...cell.text].length, 1, 'one narrow glyph per overlay');
    if (ascii) assert.match(cell.text, /^[|/\\+o.\-]$/);
    else assert.ok(cell.text.codePointAt(0) > 0x2800 && cell.text.codePointAt(0) <= 0x28ff);
    assert.ok(Object.values(THEMES[theme]).includes(cell.color), 'foreground must come from the selected palette');
    if (theme !== 'mono') {
      const match = cell.color.match(foreground);
      assert.ok(match, 'color themes use only truecolor foreground escapes');
      assert.ok(match.slice(1).every((channel) => Number(channel) <= 255));
    } else assert.equal(cell.color, '\u001b[39m');
  }
}

function centroid(frame) {
  return {
    x: frame.reduce((sum, cell) => sum + cell.x, 0) / frame.length,
    y: frame.reduce((sum, cell) => sum + cell.y, 0) / frame.length,
  };
}

function largestConnectedComponent(frame) {
  const remaining = new Set(frame.map((cell) => `${cell.x}:${cell.y}`));
  let largest = 0;
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const [x, y] = stack.pop().split(':').map(Number);
      size++;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const neighbor = `${x + dx}:${y + dy}`;
          if (remaining.delete(neighbor)) stack.push(neighbor);
        }
      }
    }
    largest = Math.max(largest, size);
  }
  return largest;
}

test('invalid or tiny geometry hides the effect instead of clipping it', () => {
  for (const input of [undefined, null, {}, { columns: 39, rows: 16, elapsedMs: 0 },
    { columns: 40, rows: 15, elapsedMs: 0 }]) {
    assert.deepEqual(renderAnimal(input), []);
  }
  for (const field of ['columns', 'rows', 'elapsedMs']) {
    for (const invalid of [NaN, Infinity, -Infinity, '80', null, undefined, -1]) {
      assert.deepEqual(renderAnimal({ columns: 80, rows: 24, elapsedMs: 0, [field]: invalid }), []);
    }
  }
  for (const field of ['columns', 'rows']) {
    for (const invalid of [0, 40.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.deepEqual(renderAnimal({ columns: 80, rows: 24, elapsedMs: 0, [field]: invalid }), []);
    }
  }
});

test('roaming and scan phases stay sparse, unique, narrow and above the protected half', () => {
  const geometries = [[40, 16], [41, 17], [48, 20], [80, 24], [120, 48], [240, 80]];
  for (const [columns, rows] of geometries) {
    for (const ascii of [false, true]) {
      for (let elapsedMs = 0; elapsedMs <= 180_000; elapsedMs += 733) {
        assertFrame(renderAnimal({ columns, rows, elapsedMs, ascii }), columns, rows, ascii);
      }
    }
  }
});

test('finite very large times and dimensions remain bounded without viewport-sized work', () => {
  for (const elapsedMs of [Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
    assertFrame(renderAnimal({ columns: 80, rows: 24, elapsedMs }), 80, 24, false);
  }
  const frame = renderAnimal({ columns: Number.MAX_SAFE_INTEGER, rows: Number.MAX_SAFE_INTEGER, elapsedMs: 0 });
  assertFrame(frame, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, false);
});

test('rendering is deterministic, stateless and does not mutate caller input', () => {
  const input = Object.freeze({ columns: 100, rows: 40, elapsedMs: 6200, ascii: false });
  const first = renderAnimal(input);
  renderAnimal({ columns: 40, rows: 16, elapsedMs: 9000, ascii: true });
  assert.deepEqual(renderAnimal(input), first);
  first[0].text = 'x';
  assert.notEqual(renderAnimal(input)[0].text, 'x', 'returned frames must not share mutable cells');
});

test('ASCII rasterization preserves connected directional geometry rather than substituting dots', () => {
  const input = { columns: 120, rows: 48, elapsedMs: 0 };
  const ascii = renderAnimal({ ...input, ascii: true });
  const braille = renderAnimal(input);
  assertFrame(ascii, input.columns, input.rows, true);
  assert.ok(new Set(ascii.map((cell) => cell.text)).size >= 3, 'lines and joints need distinct glyphs');
  assert.ok(ascii.some((cell) => '/\\|-'.includes(cell.text)), 'fallback must draw real strokes');
  assert.ok(ascii.filter((cell) => cell.text === 'o').length >= 8, 'all eight articulated knees remain visible');
  assert.equal(largestConnectedComponent(ascii), ascii.length, 'legs must connect to the wireframe body');
  assert.equal(largestConnectedComponent(braille), braille.length);
  assert.notDeepEqual(ascii.map((cell) => cell.text), braille.map((cell) => cell.text));
});

test('capacity fitting keeps every leg connected rather than truncating one side', () => {
  for (const ascii of [false, true]) {
    for (let elapsedMs = 0; elapsedMs < 70_000; elapsedMs += 1193) {
      const frame = renderAnimal({ columns: 80, rows: 32, elapsedMs, ascii });
      assert.ok(largestConnectedComponent(frame) >= frame.length * 0.8,
        'only short scan accents may be separate from the connected spider');
      const center = centroid(frame);
      assert.ok(frame.some((cell) => cell.x < center.x - 2), 'left legs must survive capacity fitting');
      assert.ok(frame.some((cell) => cell.x > center.x + 2), 'right legs must survive capacity fitting');
    }
  }
});

test('motion roams over time without teleporting between adjacent frames', () => {
  const input = { columns: 120, rows: 48 };
  const start = centroid(renderAnimal({ ...input, elapsedMs: 0 }));
  let maximumTravel = 0;
  for (let elapsedMs = 0; elapsedMs <= 60_000; elapsedMs += 500) {
    const frame = renderAnimal({ ...input, elapsedMs });
    const next = renderAnimal({ ...input, elapsedMs: elapsedMs + 67 });
    const a = centroid(frame);
    const b = centroid(next);
    assert.ok(Math.hypot(b.x - a.x, b.y - a.y) < 2, 'adjacent frames should move slowly');
    maximumTravel = Math.max(maximumTravel, Math.hypot(a.x - start.x, a.y - start.y));
  }
  assert.ok(maximumTravel > 10, 'the spider should roam, not remain a rotating spinner');
});

test('every species fits option combinations without clipping or exceeding sparse capacity', () => {
  for (const { id: animal } of ANIMALS) {
    for (const theme of Object.keys(THEMES)) {
      for (const size of Object.keys(SIZES)) {
        for (const motion of Object.keys(MOTIONS)) {
          for (const position of POSITIONS) {
            for (const ascii of [false, true]) {
              for (const [columns, rows] of [[40, 16], [81, 25], [160, 64]]) {
                for (const elapsedMs of [0, 2750, 4600, 7600, 31_000]) {
                  const frame = renderAnimal({ columns, rows, elapsedMs, animal, theme, size, motion, position, ascii });
                  assertFrame(frame, columns, rows, ascii, theme);
                }
              }
            }
          }
        }
      }
    }
  }
});

test('invalid settings never silently render a different animal or style', () => {
  const input = { columns: 80, rows: 24, elapsedMs: 0 };
  for (const key of ['animal', 'theme', 'size', 'motion', 'position']) {
    for (const value of ['', 'unknown', 'toString', '__proto__', null, 1, {}, []]) {
      assert.deepEqual(renderAnimal({ ...input, [key]: value }), []);
    }
  }
  for (const ascii of [null, 0, 1, 'false', {}, []]) {
    assert.deepEqual(renderAnimal({ ...input, ascii }), []);
  }
  assert.deepEqual(renderAnimal(input), renderAnimal({ ...input, ...DEFAULT_SETTINGS }));
});

test('all animals handle finite extremes without viewport-sized geometry or unsafe cells', () => {
  for (const { id: animal } of ANIMALS) {
    for (const ascii of [false, true]) {
      for (const elapsedMs of [Number.MAX_SAFE_INTEGER, Number.MAX_VALUE]) {
        for (const [columns, rows] of [[40, 16], [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]]) {
          const frame = renderAnimal({ columns, rows, elapsedMs, animal, ascii, size: 'large' });
          assertFrame(frame, columns, rows, ascii);
          assert.ok(frame.every(cell => Number.isSafeInteger(cell.x) && Number.isSafeInteger(cell.y)));
        }
      }
    }
  }
});

test('still freezes pose, accents and roaming for every animal and glyph mode', () => {
  for (const { id: animal } of ANIMALS) {
    for (const ascii of [false, true]) {
      const input = { columns: 120, rows: 48, animal, ascii, motion: 'still' };
      const frame = renderAnimal({ ...input, elapsedMs: 0 });
      for (const elapsedMs of [2750, 4600, 7600, 60_000, Number.MAX_VALUE]) {
        assert.deepEqual(renderAnimal({ ...input, elapsedMs }), frame);
      }
    }
  }
});

test('slow scales the complete animation clock rather than only the limbs', () => {
  for (const { id: animal } of ANIMALS) {
    const input = { columns: 120, rows: 48, animal };
    assert.deepEqual(renderAnimal({ ...input, elapsedMs: 10_000, motion: 'slow' }),
      renderAnimal({ ...input, elapsedMs: 4500, motion: 'normal' }));
  }
});

function bounds(frame) {
  return {
    left: Math.min(...frame.map(cell => cell.x)),
    right: Math.max(...frame.map(cell => cell.x)),
    top: Math.min(...frame.map(cell => cell.y)),
    bottom: Math.max(...frame.map(cell => cell.y)),
  };
}

function silhouette(frame) {
  const { left, top } = bounds(frame);
  return frame.map(cell => `${cell.x - left}:${cell.y - top}:${cell.text}`).sort().join(',');
}

test('fixed positions anchor the whole animal on the requested side', () => {
  for (const { id: animal } of ANIMALS) {
    const input = { columns: 120, rows: 48, elapsedMs: 0, animal, motion: 'still' };
    const left = bounds(renderAnimal({ ...input, position: 'left' }));
    const center = bounds(renderAnimal({ ...input, position: 'center' }));
    const right = bounds(renderAnimal({ ...input, position: 'right' }));
    assert.ok(left.right < input.columns / 2);
    assert.ok(right.left > input.columns / 2);
    assert.ok(center.left < input.columns / 2 && center.right > input.columns / 2);
  }
});

test('size targets increase silhouette extent when the viewport has room', () => {
  for (const { id: animal } of ANIMALS) {
    const input = { columns: 160, rows: 64, elapsedMs: 0, animal, motion: 'still', position: 'center' };
    const small = bounds(renderAnimal({ ...input, size: 'small' }));
    const large = bounds(renderAnimal({ ...input, size: 'large' }));
    assert.ok(large.right - large.left > small.right - small.left);
    assert.ok(large.bottom - large.top > small.bottom - small.top);
  }
});

test('species have distinct connected silhouettes and their own changing poses', () => {
  for (const ascii of [false, true]) {
    const shapes = [];
    for (const { id: animal } of ANIMALS) {
      const input = { columns: 160, rows: 64, animal, ascii, position: 'center' };
      const first = renderAnimal({ ...input, elapsedMs: 0 });
      shapes.push(silhouette(first));
      assert.equal(largestConnectedComponent(first), first.length, 'anatomy connects to the body');
      assert.notEqual(silhouette(renderAnimal({ ...input, elapsedMs: 1600 })), silhouette(first),
        'animation must change the species pose, not merely move its location');
    }
    assert.equal(new Set(shapes).size, ANIMALS.length);
  }
});

test('cat blinks while cat and fox keep their faces above their feet', () => {
  for (const animal of ['cat', 'fox']) {
    const input = { columns: 160, rows: 64, animal, ascii: true, size: 'large', position: 'center' };
    for (const elapsedMs of [0, 1600, 7600, 20_000, 50_000]) {
      const frame = renderAnimal({ ...input, elapsedMs });
      const box = bounds(frame);
      const eyes = frame.filter(cell => cell.text === 'o');
      assert.equal(eyes.length, animal === 'cat' ? 2 : 1);
      assert.ok(eyes.every(cell => cell.y < box.top + (box.bottom - box.top) * 0.5),
        'upright companions must not rotate their faces below their bodies');
      assert.ok(frame.filter(cell => cell.text === '+' && cell.y >= box.bottom - 1).length >= 2,
        'both feet remain present');
    }
    if (animal === 'cat') {
      const blink = renderAnimal({ ...input, elapsedMs: 4600 });
      assert.equal(blink.filter(cell => cell.text === 'o').length, 0);
    }
  }
});
