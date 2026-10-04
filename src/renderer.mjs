import { ANIMALS, THEMES, SIZES, MOTIONS, POSITIONS, DEFAULT_SETTINGS } from './settings.mjs';

const ANIMAL_IDS = new Set(ANIMALS.map(({ id }) => id));
const CAPACITY = 128;
const RADIUS = 22;
const BRAILLE_BITS = [[1, 2, 4, 64], [8, 16, 32, 128]];

const THORAX = [[0, -6], [-3.1, -4], [-2.7, 0], [0, 1.5], [2.7, 0], [3.1, -4]];
const ABDOMEN = [[0, 0], [-3.7, 3], [-3.2, 7], [0, 8.5], [3.2, 7], [3.7, 3]];
const ROOTS = [[3.1, -4], [2.7, 0], [3.7, 3], [3.2, 7]];
const KNEES = [[8, -8], [10, -3], [10, 3], [8, 8]];
const FEET = [[12, -13], [15, -6], [15, 6], [12, 13]];

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

function rasterize(geometry, scale, cosine, sine, fractionX, fractionY, ascii) {
  const cells = new Map();
  const transform = ([x, y]) => [
    (x * cosine - y * sine) * scale + fractionX * 2,
    (x * sine + y * cosine) * scale + fractionY * 4,
  ];

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
    } else if (ascii && priority === cell.priority && text !== cell.text && priority < 3) {
      cell.text = '+';
    }
  }

  function line(start, end, color, priority) {
    const a = transform(start);
    const b = transform(end);
    const x0 = Math.round(a[0] / (ascii ? 2 : 1));
    const y0 = Math.round(a[1] / (ascii ? 4 : 1));
    const x1 = Math.round(b[0] / (ascii ? 2 : 1));
    const y1 = Math.round(b[1] / (ascii ? 4 : 1));
    const text = strokeGlyph((b[0] - a[0]) / 2, (b[1] - a[1]) / 4);
    walkLine(x0, y0, x1, y1, (x, y) => plot(x, y, color, priority, text));
  }

  for (const edge of geometry.edges) line(edge.start, edge.end, edge.color, edge.priority);
  for (const joint of geometry.joints) {
    const point = transform(joint.point);
    plot(Math.round(point[0] / (ascii ? 2 : 1)), Math.round(point[1] / (ascii ? 4 : 1)),
      joint.color, joint.priority, joint.text, joint.text === 'o');
  }
  return { cells, line };
}

function spiderGeometry(seconds, palette) {
  const { primary: CYAN, secondary: MAGENTA, joint: AMBER, bright: BRIGHT } = palette;
  const edges = [];
  const joints = [];
  const edge = (start, end, color, priority = 1) => edges.push({ start, end, color, priority });
  const bob = Math.sin(seconds * 0.7) * 0.16;

  for (const side of [-1, 1]) {
    for (let leg = 0; leg < 4; leg++) {
      // Alternate two sets of four legs with a slow swing and inward foot lift.
      const phase = seconds * 1.1 + (leg % 2) * Math.PI + (side === 1 ? Math.PI : 0);
      const swing = Math.sin(phase);
      const lift = Math.max(0, Math.cos(phase));
      const root = [ROOTS[leg][0] * side, ROOTS[leg][1] + bob];
      const knee = [(KNEES[leg][0] + Math.cos(phase) * 0.55) * side,
        KNEES[leg][1] + swing * 0.65 + bob];
      const foot = [(FEET[leg][0] - lift * 0.85) * side, FEET[leg][1] + swing * 1.3];
      const color = (leg + (side === 1 ? 1 : 0)) % 2 ? MAGENTA : CYAN;
      edge(root, knee, color);
      edge(knee, foot, color === CYAN ? MAGENTA : CYAN);
      joints.push({ point: knee, color: AMBER, priority: 3, text: 'o' });
      joints.push({ point: foot, color: BRIGHT, priority: 4, text: '+' });
    }
  }

  for (const [polygon, color] of [[THORAX, CYAN], [ABDOMEN, MAGENTA]]) {
    for (let index = 0; index < polygon.length; index++) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      edge([start[0], start[1] + bob], [end[0], end[1] + bob], color, 2);
    }
  }
  edge([0, -6 + bob], [0, 8.5 + bob], CYAN, 2);
  edge([-3.7, 3 + bob], [3.2, 7 + bob], CYAN, 2);
  edge([3.7, 3 + bob], [-3.2, 7 + bob], MAGENTA, 2);
  return { edges, joints };
}

function drawing() {
  const edges = [];
  const joints = [];
  const edge = (start, end, color, priority = 2) => edges.push({ start, end, color, priority });
  const path = (points, color, closed = false) => {
    for (let index = 1; index < points.length; index++) edge(points[index - 1], points[index], color);
    if (closed) edge(points[points.length - 1], points[0], color);
  };
  const mark = (point, color, text = '+') => joints.push({ point, color, priority: 4, text });
  return { edges, joints, edge, path, mark };
}

function catGeometry(seconds, palette) {
  const { primary, secondary, joint, bright } = palette;
  const shape = drawing();
  const { edge, path, mark } = shape;
  path([[-7, -7], [-8, -11], [-6, -16], [-2, -12], [2, -12],
    [6, -16], [8, -11], [7, -7], [4, -4], [-4, -4]], primary, true);
  path([[-4, -4], [-5, 1], [-7, 8], [-6, 14], [6, 14], [7, 8], [5, 1], [4, -4]],
    secondary, true);
  edge([-3, 2], [-3, 14], primary);
  edge([3, 2], [3, 14], primary);
  mark([-3, 14], bright);
  mark([3, 14], bright);

  const blink = seconds % 5 >= 4.5 && seconds % 5 < 4.75;
  for (const side of [-1, 1]) {
    edge([3 * side, -9], [2 * side, -12], secondary);
    if (blink) edge([2 * side, -9], [4 * side, -9], bright);
    else mark([3 * side, -9], bright, 'o');
    edge([2 * side, -6], [12 * side, -8], primary);
    edge([2 * side, -6], [12 * side, -5], secondary);
    edge([6 * side, -16], [5 * side, -11], secondary);
  }
  path([[-1, -6], [0, -5], [1, -6]], joint);
  edge([0, -5], [0, -4], joint);
  mark([0, -6], joint);

  const swing = Math.sin(seconds * 1.25) * 3;
  path([[7, 8], [13, 10], [18 + swing * 0.4, 5],
    [20 + swing, -1], [17 + swing, -6]], secondary);
  return shape;
}

function foxGeometry(seconds, palette) {
  const { primary, secondary, joint, bright } = palette;
  const shape = drawing();
  const { edge, path, mark } = shape;
  const nod = Math.sin(seconds * 0.9) * 0.8;
  path([[-10, -7], [-9, -17], [-6, -12], [-2, -17], [1, -10],
    [8, -8 + nod], [14, -5 + nod], [7, -3], [1, -3], [-6, -2]], primary, true);
  path([[-6, -2], [-10, 4], [-10, 13], [0, 13], [3, 4], [1, -3]], secondary, true);
  path([[1, -3], [5, 6], [8, 13], [3, 13], [0, 6]], primary, true);
  edge([-6, 5], [-6, 13], primary);
  mark([-6, 13], bright);
  mark([6, 13], bright);
  path([[-2, -17], [-3, -11], [0, -8]], secondary);
  edge([-9, -17], [-8, -10], secondary);
  edge([0, -8], [8, -8 + nod], joint);
  edge([7, -3], [10, -5 + nod], bright);
  mark([0, -8], bright, 'o');
  mark([14, -5 + nod], joint);

  const sway = Math.sin(seconds * 0.8 + 0.5) * 2.5;
  const tip = [-23 + sway, 5];
  path([[-10, 4], [-15, 1], [-21 + sway, 0], tip,
    [-22 + sway, 9], [-17, 13], [-10, 13]], secondary);
  path([[-21 + sway, 0], [-18 + sway, 5], [-22 + sway, 9]], bright);
  edge(tip, [-18 + sway, 5], bright);
  return shape;
}

function jellyfishGeometry(seconds, palette) {
  const { primary, secondary, bright } = palette;
  const shape = drawing();
  const { edge, path, mark } = shape;
  const pulse = Math.sin(seconds * 1.6);
  const width = 11 + pulse * 1.6;
  const crown = -14 + pulse * 1.2;
  path([[-width, -4], [-width * 0.9, -8], [-width * 0.55, crown + 2],
    [0, crown], [width * 0.55, crown + 2], [width * 0.9, -8], [width, -4]], primary, true);
  path([[-width, -4], [-width * 0.5, -7 + pulse], [0, -8 + pulse],
    [width * 0.5, -7 + pulse], [width, -4]], secondary);
  edge([0, crown], [0, -8 + pulse], secondary);
  for (let index = 0; index < 5; index++) {
    const root = (index - 2) * 4;
    const phase = seconds * 1.1 - index * 0.65;
    const tip = [root + Math.sin(seconds * 1.1 - 1.2) * 3, 17 + Math.sin(phase) * 1.2];
    path([[root, -4], [root + Math.sin(phase) * 1.5, 2],
      [root + Math.sin(phase - 0.6) * 2.5, 9], tip], index % 2 ? secondary : primary);
    mark(tip, bright);
  }
  return shape;
}

const GEOMETRIES = { spider: spiderGeometry, cat: catGeometry, fox: foxGeometry, jellyfish: jellyfishGeometry };

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

/** Pure sparse terminal geometry; coordinates never address the bottom half. */
export function renderAnimal(input) {
  if (input === null || typeof input !== 'object') return [];
  const { columns, rows, elapsedMs, ascii = DEFAULT_SETTINGS.ascii,
    animal = DEFAULT_SETTINGS.animal, theme = DEFAULT_SETTINGS.theme, size = DEFAULT_SETTINGS.size,
    motion = DEFAULT_SETTINGS.motion, position = DEFAULT_SETTINGS.position } = input;
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows)
    || columns < 40 || rows < 16 || !Number.isFinite(elapsedMs) || elapsedMs < 0
    || typeof ascii !== 'boolean' || !ANIMAL_IDS.has(animal)
    || typeof theme !== 'string' || !Object.hasOwn(THEMES, theme)
    || typeof size !== 'string' || !Object.hasOwn(SIZES, size)
    || typeof motion !== 'string' || !Object.hasOwn(MOTIONS, motion)
    || !POSITIONS.includes(position)) return [];

  const halfRows = Math.floor(rows / 2);
  const seconds = elapsedMs * MOTIONS[motion] / 1000;
  const palette = THEMES[theme];
  const geometry = GEOMETRIES[animal](seconds, palette);
  // Only the spider rotates. Its original conservative radius also contains scans.
  const angle = animal === 'spider'
    ? Math.sin(seconds * 0.07) * 0.52 + Math.sin(seconds * 0.13) * 0.22 : 0;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const extent = animal === 'spider' ? { x: RADIUS, y: RADIUS } : extents(geometry);
  let scale = Math.min(SIZES[size], (columns * 2 - 5) / (extent.x * 2),
    (halfRows * 4 - 5) / (extent.y * 2));
  const marginX = (extent.x * scale + 2) / 2;
  const marginY = (extent.y * scale + 2) / 4;
  const horizontal = position === 'roam' ? 0.5 + 0.35 * Math.sin(seconds * 0.043)
    : position === 'left' ? 0 : position === 'right' ? 1 : 0.5;
  const vertical = position === 'roam' ? 0.5 + 0.28 * Math.sin(seconds * 0.071 + 0.4) : 0.5;
  const centerX = marginX + Math.max(0, columns - 1 - marginX * 2) * horizontal;
  const centerY = marginY + Math.max(0, halfRows - 1 - marginY * 2) * vertical;
  const offsetX = Math.floor(centerX);
  const offsetY = Math.floor(centerY);

  // Rasterize near zero, then translate cells: even huge finite viewports cannot
  // produce unsafe subcell integers or viewport-proportional raster loops.
  let raster = rasterize(geometry, scale, cosine, sine, centerX - offsetX, centerY - offsetY, ascii);
  while (raster.cells.size > CAPACITY) {
    scale *= 0.9;
    raster = rasterize(geometry, scale, cosine, sine, centerX - offsetX, centerY - offsetY, ascii);
  }

  const scanPhase = seconds % 11;
  const accents = [];
  if (animal === 'spider' && scanPhase >= 2 && scanPhase < 3.2) {
    const y = -7 + ((scanPhase - 2) / 1.2) * 14;
    accents.push({ start: [-9, y], end: [9, y], color: palette.primary });
  }
  if (animal === 'spider' && scanPhase >= 7.2 && scanPhase < 8) {
    const drift = (scanPhase - 7.2) * 3;
    accents.push({ start: [-13 + drift, 6], end: [-7 + drift, -3], color: palette.secondary });
  }
  for (const accent of accents) {
    // Admit a whole accent or none; never budget by dropping legs or slicing cells.
    const candidate = rasterize(geometry, scale, cosine, sine, centerX - offsetX, centerY - offsetY, ascii);
    candidate.line(accent.start, accent.end, accent.color, 0);
    if (candidate.cells.size <= CAPACITY) raster = candidate;
  }

  return Array.from(raster.cells.values(), (cell) => ({
    x: offsetX + cell.x,
    y: offsetY + cell.y,
    text: ascii ? cell.text : String.fromCodePoint(0x2800 + cell.mask),
    color: cell.color,
  }));
}
