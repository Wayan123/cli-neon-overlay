import { ANIMALS, THEMES, SIZES, MOTIONS, POSITIONS, STYLES, TETHERS, DEFAULT_SETTINGS } from './settings.mjs';

const ANIMAL_IDS = new Set(ANIMALS.map(({ id }) => id));
const CAPACITY = 128;
const RADIUS = 22;
const BRAILLE_BITS = [[1, 2, 4, 64], [8, 16, 32, 128]];

// Lively roaming: perch, anticipate, dart with a small overshoot, land with a squash.
export const HOP_SECONDS = 2.6;
const FLIGHT_SECONDS = 0.7;
const HOLD_SECONDS = HOP_SECONDS - FLIGHT_SECONDS;
const ANTICIPATION_SECONDS = 0.35;
const LANDING_SECONDS = 0.3;
const TETHER_FADE_SECONDS = 0.8;
const TETHER_MAX_CELLS = 24;
const STRETCH = 0.18;
const ELASTIC_MARGIN = 1.2;
const NEUTRAL_POSE = Object.freeze({ gaze: [0, 0], drag: [0, 0] });

const THORAX = [[0, -6], [-3.1, -4], [-2.7, 0], [0, 1.5], [2.7, 0], [3.1, -4]];
const ABDOMEN = [[0, 0], [-3.7, 3], [-3.2, 7], [0, 8.5], [3.2, 7], [3.7, 3]];
const ROOTS = [[3.1, -4], [2.7, 0], [3.7, 3], [3.2, 7]];
const KNEES = [[8, -8], [10, -3], [10, 3], [8, 8]];
const FEET = [[12, -13], [15, -6], [15, 6], [12, 13]];

const clamp01 = value => Math.min(1, Math.max(0, value));
const add = (point, offset, factor = 1) => [point[0] + offset[0] * factor, point[1] + offset[1] * factor];

/** Deterministic pseudo-random value in [0, 1); fmod keeps sine finite for huge clocks. */
function hash(value, salt) {
  const wrapped = value % 1000003;
  const noise = Math.sin(wrapped * 127.1 + salt * 311.7) * 43758.5453;
  return noise - Math.floor(noise);
}

/** easeInOutBack: a small backwards wind-up, a fast middle and a settling overshoot. */
function overshoot(progress) {
  const c = 1.2 * 1.525;
  const t = progress * 2;
  return t < 1 ? (t * t * ((c + 1) * t - c)) / 2 : ((t - 2) ** 2 * ((c + 1) * (t - 2) + c) + 2) / 2;
}

/** Stateless perch target: a slow drift spans the viewport; bounded jitter keeps hops short. */
function wanderTarget(hop) {
  return [0.5 + 0.32 * Math.sin((hop % 1000003) * 0.3) + 0.12 * (hash(hop, 1) * 2 - 1),
    0.5 + 0.26 * Math.sin((hop % 1000003) * 0.47 + 0.4) + 0.14 * (hash(hop, 2) * 2 - 1)];
}

function ellipse(cx, cy, rx, ry, count) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

function walkLine(x0, y0, x1, y1, plot) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const stepX = x0 < x1 ? 1 : -1;
  const stepY = y0 < y1 ? 1 : -1;
  let error = dx - dy;
  for (;;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) return;
    const twice = error * 2;
    if (twice > -dy) {
      error -= dy;
      x0 += stepX;
    }
    if (twice < dx) {
      error += dx;
      y0 += stepY;
    }
  }
}

function strokeGlyph(dx, dy) {
  if (Math.abs(dy) < Math.abs(dx) * 0.4) return '-';
  if (Math.abs(dx) < Math.abs(dy) * 0.4) return '|';
  return dx * dy < 0 ? '/' : '\\';
}

/** Cells in raster-local coordinates; inputs to `walk` are Braille dot coordinates. */
function createRaster(ascii) {
  const cells = new Map();
  function plot(x, y, color, priority, text, joint = false) {
    const cellX = ascii ? x : Math.floor(x / 2);
    const cellY = ascii ? y : Math.floor(y / 4);
    const key = `${cellX}:${cellY}`;
    let cell = cells.get(key);
    if (!cell) {
      cell = { x: cellX, y: cellY, mask: 0, text, color, priority };
      cells.set(key, cell);
    }
    if (!ascii) {
      const dotX = x - cellX * 2;
      const dotY = y - cellY * 4;
      cell.mask |= BRAILLE_BITS[dotX][dotY];
      // A paired dot brightens a knee without widening the occupied cell.
      if (joint) cell.mask |= BRAILLE_BITS[1 - dotX][dotY];
    }
    if (priority > cell.priority) {
      cell.priority = priority;
      cell.color = color;
      cell.text = text;
    } else if (ascii && priority === cell.priority && text !== cell.text && priority < 3 && priority >= 1) {
      cell.text = '+';
    }
  }
  const grid = point => [Math.round(point[0] / (ascii ? 2 : 1)), Math.round(point[1] / (ascii ? 4 : 1))];
  function walk(a, b, color, priority, dash = 0) {
    const [x0, y0] = grid(a);
    const [x1, y1] = grid(b);
    const text = strokeGlyph((b[0] - a[0]) / 2, (b[1] - a[1]) / 4);
    let step = 0;
    walkLine(x0, y0, x1, y1, (x, y) => {
      if (!dash || Math.floor(step / dash) % 2 === 0) plot(x, y, color, priority, text);
      step++;
    });
  }
  return { cells, plot, walk, grid };
}

function inside(polygon, x, y) {
  let hit = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function fillPolygon(raster, polygon, color, ascii) {
  const xs = polygon.map(point => point[0]);
  const ys = polygon.map(point => point[1]);
  const [unitX, unitY] = ascii ? [2, 4] : [1, 1];
  for (let y = Math.ceil(Math.min(...ys) / unitY); y <= Math.floor(Math.max(...ys) / unitY); y++) {
    for (let x = Math.ceil(Math.min(...xs) / unitX); x <= Math.floor(Math.max(...xs) / unitX); x++) {
      if (inside(polygon, x * unitX, y * unitY)) raster.plot(x, y, color, 0.5, '#');
    }
  }
}

function fringe(raster, polygon, color, ascii, flicker) {
  const cx = polygon.reduce((sum, point) => sum + point[0], 0) / polygon.length;
  const cy = polygon.reduce((sum, point) => sum + point[1], 0) / polygon.length;
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.6));
    for (let step = 0; step < steps; step++) {
      const chance = hash(index * 37 + step, flicker);
      if (chance < 0.5) continue;
      const qx = a[0] + ((b[0] - a[0]) * step) / steps;
      const qy = a[1] + ((b[1] - a[1]) * step) / steps;
      const length = Math.hypot(qx - cx, qy - cy) || 1;
      const reach = (ascii ? 2.5 : 1.2) + chance * 2.5;
      const [x, y] = raster.grid([qx + ((qx - cx) / length) * reach, qy + ((qy - cy) / length) * reach]);
      raster.plot(x, y, color, 0.4, '*');
    }
  }
}

function draw(geometry, transform, ascii, style, flicker) {
  const raster = createRaster(ascii);
  if (style !== 'wireframe') {
    for (const { points, color } of geometry.fills) {
      const polygon = points.map(transform);
      fillPolygon(raster, polygon, color, ascii);
      if (style === 'fuzzy') fringe(raster, polygon, color, ascii, flicker);
    }
  }
  for (const edge of geometry.edges) raster.walk(transform(edge.start), transform(edge.end), edge.color, edge.priority);
  for (const joint of geometry.joints) {
    const [x, y] = raster.grid(transform(joint.point));
    if (joint.text === '+' && style !== 'wireframe') {
      // Ball-tipped limbs: a 3x3 Braille dot disc or an ASCII bead.
      if (ascii) raster.plot(x, y, joint.color, joint.priority, 'o');
      else for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) raster.plot(x + dx, y + dy, joint.color, joint.priority, 'o');
    } else {
      raster.plot(x, y, joint.color, joint.priority, joint.text, joint.text === 'o');
    }
  }
  return raster;
}

function drawing() {
  const edges = [];
  const joints = [];
  const fills = [];
  const edge = (start, end, color, priority = 2) => edges.push({ start, end, color, priority });
  const path = (points, color, closed = false, priority = 2) => {
    for (let index = 1; index < points.length; index++) edge(points[index - 1], points[index], color, priority);
    if (closed) edge(points[points.length - 1], points[0], color, priority);
  };
  const mark = (point, color, text = '+', priority = 4) => joints.push({ point, color, priority, text });
  const fill = (points, color) => fills.push({ points, color });
  return { edges, joints, fills, edge, path, mark, fill };
}

function spiderGeometry(seconds, palette, pose) {
  const { primary: CYAN, secondary: MAGENTA, joint: AMBER, bright: BRIGHT } = palette;
  const shape = drawing();
  const { edge, path, mark, fill } = shape;
  const bob = Math.sin(seconds * 0.7) * 0.16;

  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 4; leg++) {
      // Alternate two sets of four legs with a slow swing and inward foot lift.
      const phase = seconds * 1.1 + (leg % 2) * Math.PI + (side === 1 ? Math.PI : 0);
      const swing = Math.sin(phase);
      const lift = Math.max(0, Math.cos(phase));
      const root = [ROOTS[leg][0] * side, ROOTS[leg][1] + bob];
      const knee = add([(KNEES[leg][0] + Math.cos(phase) * 0.55) * side,
        KNEES[leg][1] + swing * 0.65 + bob], pose.drag, 0.5);
      const foot = add([(FEET[leg][0] - lift * 0.85) * side, FEET[leg][1] + swing * 1.3], pose.drag);
      const color = (leg + (side === 1 ? 1 : 0)) % 2 ? MAGENTA : CYAN;
      edge(root, knee, color, 1);
      edge(knee, foot, color === CYAN ? MAGENTA : CYAN, 1);
      mark(knee, AMBER, 'o', 3);
      mark(foot, BRIGHT);
    }
  }

  for (const [polygon, color] of [[THORAX, CYAN], [ABDOMEN, MAGENTA]]) {
    const points = polygon.map(([x, y]) => [x, y + bob]);
    path(points, color, true);
    fill(points, color);
  }
  edge([0, -6 + bob], [0, 8.5 + bob], CYAN);
  edge([-3.7, 3 + bob], [3.2, 7 + bob], CYAN);
  edge([3.7, 3 + bob], [-3.2, 7 + bob], MAGENTA);
  return shape;
}

function catGeometry(seconds, palette, pose) {
  const { primary, secondary, joint, bright } = palette;
  const shape = drawing();
  const { edge, path, mark, fill } = shape;
  const head = [[-7, -7], [-8, -11], [-6, -16], [-2, -12], [2, -12],
    [6, -16], [8, -11], [7, -7], [4, -4], [-4, -4]];
  const body = [[-4, -4], [-5, 1], [-7, 8], [-6, 14], [6, 14], [7, 8], [5, 1], [4, -4]];
  path(head, primary, true);
  path(body, secondary, true);
  fill(head, primary);
  fill(body, secondary);
  edge([-3, 2], [-3, 14], primary);
  edge([3, 2], [3, 14], primary);
  mark([-3, 14], bright);
  mark([3, 14], bright);

  const blink = seconds % 5 >= 4.5 && seconds % 5 < 4.75;
  for (const side of [-1, 1]) {
    edge([3 * side, -9], [2 * side, -12], secondary);
    if (blink) edge([2 * side, -9], [4 * side, -9], bright);
    else mark(add([3 * side, -9], pose.gaze, 0.8), bright, 'o');
    edge([2 * side, -6], [12 * side, -8], primary);
    edge([2 * side, -6], [12 * side, -5], secondary);
    edge([6 * side, -16], [5 * side, -11], secondary);
  }
  path([[-1, -6], [0, -5], [1, -6]], joint);
  edge([0, -5], [0, -4], joint);
  mark([0, -6], joint);

  const swing = Math.sin(seconds * 1.25) * 3;
  path([[7, 8], [13, 10], [18 + swing * 0.4, 5],
    add([20 + swing, -1], pose.drag, 0.6), add([17 + swing, -6], pose.drag)], secondary);
  return shape;
}

function foxGeometry(seconds, palette, pose) {
  const { primary, secondary, joint, bright } = palette;
  const shape = drawing();
  const { edge, path, mark, fill } = shape;
  const nod = Math.sin(seconds * 0.9) * 0.8;
  const head = [[-10, -7], [-9, -17], [-6, -12], [-2, -17], [1, -10],
    [8, -8 + nod], [14, -5 + nod], [7, -3], [1, -3], [-6, -2]];
  const body = [[-6, -2], [-10, 4], [-10, 13], [0, 13], [3, 4], [1, -3]];
  path(head, primary, true);
  path(body, secondary, true);
  fill(head, primary);
  fill(body, secondary);
  path([[1, -3], [5, 6], [8, 13], [3, 13], [0, 6]], primary, true);
  edge([-6, 5], [-6, 13], primary);
  mark([-6, 13], bright);
  mark([6, 13], bright);
  path([[-2, -17], [-3, -11], [0, -8]], secondary);
  edge([-9, -17], [-8, -10], secondary);
  edge([0, -8], [8, -8 + nod], joint);
  edge([7, -3], [10, -5 + nod], bright);
  mark(add([0, -8], pose.gaze, 0.8), bright, 'o');
  mark([14, -5 + nod], joint);

  const sway = Math.sin(seconds * 0.8 + 0.5) * 2.5;
  const tip = add([-23 + sway, 5], pose.drag);
  path([[-10, 4], [-15, 1], add([-21 + sway, 0], pose.drag, 0.6), tip,
    add([-22 + sway, 9], pose.drag, 0.6), [-17, 13], [-10, 13]], secondary);
  path([add([-21 + sway, 0], pose.drag, 0.6), add([-18 + sway, 5], pose.drag, 0.6),
    add([-22 + sway, 9], pose.drag, 0.6)], bright);
  edge(tip, add([-18 + sway, 5], pose.drag, 0.6), bright);
  return shape;
}

function jellyfishGeometry(seconds, palette, pose) {
  const { primary, secondary, bright } = palette;
  const shape = drawing();
  const { edge, path, mark, fill } = shape;
  const pulse = Math.sin(seconds * 1.6);
  const width = 11 + pulse * 1.6;
  const crown = -14 + pulse * 1.2;
  const bell = [[-width, -4], [-width * 0.9, -8], [-width * 0.55, crown + 2],
    [0, crown], [width * 0.55, crown + 2], [width * 0.9, -8], [width, -4]];
  path(bell, primary, true);
  fill(bell, primary);
  path([[-width, -4], [-width * 0.5, -7 + pulse], [0, -8 + pulse],
    [width * 0.5, -7 + pulse], [width, -4]], secondary);
  edge([0, crown], [0, -8 + pulse], secondary);
  for (let index = 0; index < 5; index++) {
    const root = (index - 2) * 4;
    const phase = seconds * 1.1 - index * 0.65;
    const tip = add([root + Math.sin(seconds * 1.1 - 1.2) * 3, 17 + Math.sin(phase) * 1.2], pose.drag, 1.5);
    path([[root, -4], add([root + Math.sin(phase) * 1.5, 2], pose.drag, 0.4),
      add([root + Math.sin(phase - 0.6) * 2.5, 9], pose.drag, 0.9), tip], index % 2 ? secondary : primary);
    mark(tip, bright);
  }
  return shape;
}

function miteGeometry(seconds, palette, pose) {
  const { primary, secondary, joint, bright } = palette;
  const shape = drawing();
  const { edge, path, mark, fill } = shape;
  const breathe = 1 + Math.sin(seconds * 2.2) * 0.05;
  const body = ellipse(0, 0, 6.5 * breathe, 6 * breathe, 14);
  path(body, primary, true);
  fill(body, primary);
  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 3; leg++) {
      // Tripod gait: alternate legs share a phase so three feet are always planted.
      const phase = seconds * 3 + ((leg + (side === 1 ? 1 : 0)) % 2) * Math.PI;
      const angle = [-0.55, 0.15, 0.85][leg];
      const root = [side * 6.5 * breathe * Math.cos(angle), 6 * breathe * Math.sin(angle)];
      const knee = add([root[0] + side * 4, root[1] - 3 + Math.max(0, Math.sin(phase)) * -1.2], pose.drag, 0.5);
      const foot = add([knee[0] + side * 3, knee[1] + 6 + Math.cos(phase) * 0.8], pose.drag);
      edge(root, knee, secondary, 1);
      edge(knee, foot, secondary, 1);
      mark(foot, joint);
    }
  }
  for (const side of [-1, 1]) {
    edge([side * 1.2, -5.5], [side * 2.5, -8.5 + Math.sin(seconds * 2.5 + side) * 0.6], secondary);
    mark(add([side * 2.4, -1.8], pose.gaze, 0.9), bright, 'o');
  }
  return shape;
}

function urchinGeometry(seconds, palette, pose) {
  const { primary, secondary, joint, bright } = palette;
  const shape = drawing();
  const { edge, path, mark, fill } = shape;
  const core = ellipse(0, 0, 5.5, 5.5, 12);
  path(core, primary, true);
  fill(core, primary);
  for (let index = 0; index < 12; index++) {
    const angle = (index / 12) * Math.PI * 2 + seconds * 0.25;
    const length = 6 + Math.sin(seconds * 2.4 + index * 0.9) * 1.5;
    const root = [Math.cos(angle) * 5.5, Math.sin(angle) * 5.5];
    const tip = add([Math.cos(angle) * (5.5 + length), Math.sin(angle) * (5.5 + length)], pose.drag);
    edge(root, tip, index % 2 ? secondary : primary, 1);
    mark(tip, joint);
  }
  for (const side of [-1, 1]) mark(add([side * 2, -1], pose.gaze, 0.8), bright, 'o');
  return shape;
}

function octopusGeometry(seconds, palette, pose) {
  const { primary, secondary, joint, bright } = palette;
  const shape = drawing();
  const { path, mark, fill } = shape;
  const swell = 1 + Math.sin(seconds * 1.8) * 0.05;
  const mantle = ellipse(0, -7, 6.5 * swell, 7 * swell, 14);
  path(mantle, primary, true);
  fill(mantle, primary);
  for (let index = 0; index < 8; index++) {
    const rootX = -5.6 + index * 1.6;
    const points = [[rootX, -1]];
    for (let joint = 1; joint <= 3; joint++) {
      const wave = Math.sin(seconds * 2 - index * 0.7 + joint * 0.9) * joint * 0.7;
      points.push(add([rootX * (1 + joint * 0.35) + wave, -1 + joint * 4], pose.drag, joint * 0.5));
    }
    const last = points[points.length - 1];
    const curl = Math.sin(seconds * 2.4 + index) * 1.5;
    points.push([last[0] + (rootX < 0 ? -1 : 1) * 1.5, last[1] + 1.2 + curl * 0.3]);
    path(points, index % 2 ? secondary : primary, false, 1);
    mark(points[points.length - 1], joint);
  }
  for (const side of [-1, 1]) mark(add([side * 2.4, -5], pose.gaze, 0.9), bright, 'o');
  return shape;
}

function crabGeometry(seconds, palette, pose) {
  const { primary, secondary, joint, bright } = palette;
  const shape = drawing();
  const { edge, path, mark, fill } = shape;
  const shell = ellipse(0, 0, 10, 5.5, 16);
  path(shell, primary, true);
  fill(shell, primary);
  const snap = Math.max(0, Math.sin(seconds * 2.3)) ** 4;
  const open = 2.6 * (1 - snap);
  for (const side of [-1, 1]) {
    edge([side * 3, -5], [side * 3.5, -9.5], secondary);
    mark(add([side * 3.5, -10], pose.gaze, 0.6), bright, 'o');
    const base = [side * 13.5, -10];
    path([[side * 9, -2], [side * 13, -6], base], secondary);
    edge(base, [side * (14 - open), -14.5], joint);
    edge(base, [side * (14 + open), -14], joint);
    for (let leg = 0; leg < 3; leg++) {
      const phase = seconds * 3.4 + leg * 2.1 + (side === 1 ? Math.PI : 0);
      const root = [[side * 8, 1], [side * 7, 3], [side * 5, 4.5]][leg];
      const knee = [root[0] + side * 4, root[1] + 1 - Math.max(0, Math.sin(phase)) * 2.4];
      const foot = add([knee[0] + side * (2 + Math.sin(phase) * 1.5), knee[1] + 5 + Math.cos(phase) * 1.2], pose.drag);
      edge(root, knee, secondary, 1);
      edge(knee, foot, secondary, 1);
      mark(foot, joint);
    }
  }
  return shape;
}

const GEOMETRIES = {
  spider: spiderGeometry, cat: catGeometry, fox: foxGeometry, jellyfish: jellyfishGeometry,
  mite: miteGeometry, urchin: urchinGeometry, octopus: octopusGeometry, crab: crabGeometry,
};

function extents(geometry) {
  let x = 0;
  let y = 0;
  const include = point => {
    x = Math.max(x, Math.abs(point[0]));
    y = Math.max(y, Math.abs(point[1]));
  };
  for (const edge of geometry.edges) {
    include(edge.start);
    include(edge.end);
  }
  for (const joint of geometry.joints) include(joint.point);
  return { x, y };
}

function cellBounds(cells) {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const cell of cells.values()) {
    left = Math.min(left, cell.x);
    right = Math.max(right, cell.x);
    top = Math.min(top, cell.y);
    bottom = Math.max(bottom, cell.y);
  }
  return { left, right, top, bottom };
}

/** Normalized flight state; `target(hop)` must be deterministic for a stateless render. */
function livelyState(seconds, target) {
  const time = seconds % HOP_SECONDS;
  const hop = (seconds - time) / HOP_SECONDS;
  const from = target(hop);
  const to = target(hop + 1);
  if (time < HOLD_SECONDS) {
    return {
      point: from, from, to, flying: 0,
      anticipation: clamp01((time - (HOLD_SECONDS - ANTICIPATION_SECONDS)) / ANTICIPATION_SECONDS),
      landing: hop >= 1 ? clamp01(1 - time / LANDING_SECONDS) : 0,
      tether: hop >= 1 && time < TETHER_FADE_SECONDS ? { anchor: target(hop - 1), length: 1 - time / TETHER_FADE_SECONDS } : undefined,
    };
  }
  const progress = (time - HOLD_SECONDS) / FLIGHT_SECONDS;
  const eased = overshoot(progress);
  return {
    point: [from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased],
    from, to, flying: Math.sin(Math.PI * progress), anticipation: 0, landing: 0,
    tether: { anchor: from, length: 1 },
  };
}

/**
 * Pure sparse terminal geometry; coordinates never address the bottom half.
 * `perch(hop)` may return a viewport cell `{x, y}` to land beside; it must be stable per hop.
 */
export function renderAnimal(input) {
  if (input === null || typeof input !== 'object') return [];
  const { columns, rows, elapsedMs, ascii = DEFAULT_SETTINGS.ascii,
    animal = DEFAULT_SETTINGS.animal, theme = DEFAULT_SETTINGS.theme, size = DEFAULT_SETTINGS.size,
    motion = DEFAULT_SETTINGS.motion, position = DEFAULT_SETTINGS.position,
    style = DEFAULT_SETTINGS.style, tether = DEFAULT_SETTINGS.tether, perch } = input;
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows)
    || columns < 40 || rows < 16 || !Number.isFinite(elapsedMs) || elapsedMs < 0
    || typeof ascii !== 'boolean' || !ANIMAL_IDS.has(animal)
    || typeof theme !== 'string' || !Object.hasOwn(THEMES, theme)
    || typeof size !== 'string' || !Object.hasOwn(SIZES, size)
    || typeof motion !== 'string' || !Object.hasOwn(MOTIONS, motion)
    || !POSITIONS.includes(position) || !STYLES.includes(style) || !TETHERS.includes(tether)
    || (perch !== undefined && typeof perch !== 'function')) return [];

  const halfRows = Math.floor(rows / 2);
  const seconds = elapsedMs * MOTIONS[motion] / 1000;
  const palette = THEMES[theme];
  const lively = motion === 'lively' && position === 'roam';
  const base = GEOMETRIES[animal](seconds, palette, NEUTRAL_POSE);
  // Only the spider rotates. Its original conservative radius also contains scans.
  const angle = animal === 'spider'
    ? Math.sin(seconds * 0.07) * 0.52 + Math.sin(seconds * 0.13) * 0.22 : 0;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const extent = animal === 'spider' ? { x: RADIUS, y: RADIUS } : extents(base);
  const elastic = lively ? ELASTIC_MARGIN : 1;
  let scale = Math.min(SIZES[size], (columns * 2 - 5) / (extent.x * 2 * elastic),
    (halfRows * 4 - 5) / (extent.y * 2 * elastic));
  const marginX = (extent.x * elastic * scale + 2) / 2;
  const marginY = (extent.y * elastic * scale + 2) / 4;
  const rangeX = Math.max(0, columns - 1 - marginX * 2);
  const rangeY = Math.max(0, halfRows - 1 - marginY * 2);

  let state;
  let horizontal;
  let vertical;
  if (lively) {
    const target = hop => {
      const point = perch?.(hop);
      if (point && Number.isFinite(point.x) && Number.isFinite(point.y)) {
        // Body's left edge sits one cell right of the word end; centre offset is its half-width.
        const centre = point.x + 2 + (extent.x * scale) / 2;
        return [rangeX > 0 ? clamp01((centre - marginX) / rangeX) : 0.5,
          rangeY > 0 ? clamp01((point.y - marginY) / rangeY) : 0.5];
      }
      return wanderTarget(hop);
    };
    state = livelyState(seconds, target);
    [horizontal, vertical] = state.point;
  } else {
    horizontal = position === 'roam' ? 0.5 + 0.35 * Math.sin(seconds * 0.043)
      : position === 'left' ? 0 : position === 'right' ? 1 : 0.5;
    vertical = position === 'roam' ? 0.5 + 0.28 * Math.sin(seconds * 0.071 + 0.4) : 0.5;
  }
  const centerX = marginX + rangeX * clamp01(horizontal);
  const centerY = marginY + rangeY * clamp01(vertical);

  // Flight direction in Braille dot space drives stretch; in body space it drives gaze and drag.
  let direction = [0, 0];
  if (state) {
    const dx = (state.to[0] - state.from[0]) * rangeX * 2;
    const dy = (state.to[1] - state.from[1]) * rangeY * 4;
    const length = Math.hypot(dx, dy);
    if (length > 1e-9) direction = [dx / length, dy / length];
  }
  const local = [direction[0] * cosine + direction[1] * sine, -direction[0] * sine + direction[1] * cosine];
  const pose = state ? {
    gaze: local,
    drag: [local[0] * (1.2 * state.anticipation - 1.5 * state.flying), local[1] * (1.2 * state.anticipation - 1.5 * state.flying)],
  } : NEUTRAL_POSE;
  const geometry = state ? GEOMETRIES[animal](seconds, palette, pose) : base;

  const stretch = state ? STRETCH * state.flying : 0;
  const [ux, uy] = direction;
  const [vx, vy] = [-uy, ux];
  const squashX = state ? 1 + 0.12 * state.landing + 0.05 * state.anticipation : 1;
  const squashY = state ? 1 - 0.15 * state.landing - 0.08 * state.anticipation : 1;
  const s00 = (1 + stretch * ux * ux - (stretch / 2) * vx * vx) * squashX;
  const s01 = (stretch * ux * uy - (stretch / 2) * vx * vy) * squashX;
  const s10 = (stretch * ux * uy - (stretch / 2) * vx * vy) * squashY;
  const s11 = (1 + stretch * uy * uy - (stretch / 2) * vy * vy) * squashY;
  const matrix = [s00 * cosine + s01 * sine, -s00 * sine + s01 * cosine,
    s10 * cosine + s11 * sine, -s10 * sine + s11 * cosine];
  const fractionX = centerX - Math.floor(centerX);
  const fractionY = centerY - Math.floor(centerY);
  const flicker = Math.floor(seconds * 8);
  const transformAt = current => ([x, y]) => [
    (matrix[0] * x + matrix[1] * y) * current + fractionX * 2,
    (matrix[2] * x + matrix[3] * y) * current + fractionY * 4,
  ];

  // Rasterize near zero, then translate cells: even huge finite viewports cannot
  // produce unsafe subcell integers or viewport-proportional raster loops.
  let raster;
  let offsetX;
  let offsetY;
  for (;;) {
    raster = draw(geometry, transformAt(scale), ascii, style, flicker);
    const box = cellBounds(raster.cells);
    const fits = raster.cells.size <= CAPACITY
      && box.right - box.left <= columns - 1 && box.bottom - box.top <= halfRows - 1;
    if (fits) {
      // Elastic poses may exceed the nominal margin; shift instead of clipping.
      offsetX = Math.min(Math.max(Math.floor(centerX), -box.left), columns - 1 - box.right);
      offsetY = Math.min(Math.max(Math.floor(centerY), -box.top), halfRows - 1 - box.bottom);
      break;
    }
    scale *= 0.9;
  }

  // Admit a whole accent or none; never budget by dropping legs or slicing cells.
  const admit = paint => {
    const extra = createRaster(ascii);
    paint(extra);
    let added = 0;
    for (const [key, cell] of extra.cells) {
      const x = offsetX + cell.x;
      const y = offsetY + cell.y;
      if (x < 0 || x >= columns || y < 0 || y >= halfRows) return;
      if (!raster.cells.has(key)) added++;
    }
    if (raster.cells.size + added > CAPACITY) return;
    for (const [key, cell] of extra.cells) {
      const existing = raster.cells.get(key);
      if (!existing) raster.cells.set(key, cell);
      else existing.mask |= cell.mask;
    }
  };
  const scanPhase = seconds % 11;
  const transform = transformAt(scale);
  if (animal === 'spider' && scanPhase >= 2 && scanPhase < 3.2) {
    const y = -7 + ((scanPhase - 2) / 1.2) * 14;
    admit(extra => extra.walk(transform([-9, y]), transform([9, y]), palette.primary, 0));
  }
  if (animal === 'spider' && scanPhase >= 7.2 && scanPhase < 8) {
    const drift = (scanPhase - 7.2) * 3;
    admit(extra => extra.walk(transform([-13 + drift, 6]), transform([-7 + drift, -3]), palette.secondary, 0));
  }
  if (state?.tether && tether === 'on') {
    const anchorX = marginX + rangeX * clamp01(state.tether.anchor[0]);
    const anchorY = marginY + rangeY * clamp01(state.tether.anchor[1]);
    const bodyX = offsetX + fractionX;
    const bodyY = offsetY + fractionY;
    const dx = anchorX - bodyX;
    const dy = anchorY - bodyY;
    const span = Math.max(Math.abs(dx), Math.abs(dy));
    if (span >= 2) {
      // A short dashed silk line retracts after landing; bounded length keeps work constant.
      const reach = Math.min(1, TETHER_MAX_CELLS / span) * state.tether.length;
      admit(extra => extra.walk([fractionX * 2, fractionY * 4],
        [(fractionX + dx * reach) * 2, (fractionY + dy * reach) * 4], palette.secondary, 0, ascii ? 1 : 3));
    }
  }

  return Array.from(raster.cells.values(), (cell) => ({
    x: offsetX + cell.x,
    y: offsetY + cell.y,
    text: ascii ? cell.text : String.fromCodePoint(0x2800 + cell.mask),
    color: cell.color,
  }));
}
