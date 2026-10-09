import { ANIMALS } from './settings.mjs';

const UINT32 = 0x100000000;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
const point = ([x, y]) => [clamp(x), clamp(y)];
const mix = (a, b, progress) => [a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress];
const clock = value => Number.isFinite(value) && value > 0 ? value : 0;
const dimension = value => Number.isFinite(value) ? Math.max(1, Math.min(4096, value)) : 1;
const seedValue = value => Number.isFinite(value) ? value >>> 0 : 1;

function hash(value) {
  let result = value >>> 0;
  result = Math.imul(result ^ (result >>> 16), 0x7feb352d);
  result = Math.imul(result ^ (result >>> 15), 0x846ca68b);
  return (result ^ (result >>> 16)) >>> 0;
}

const random = (seed, slot) => hash(seed ^ Math.imul(slot + 1, 0x9e3779b9)) / UINT32;
const span = (a, b) => Math.hypot((a[0] - b[0]) * 120, (a[1] - b[1]) * 48);
const pose = (position, from = position, to = position, flying = 0, anticipation = 0, landing = 0) => ({
  point: point(position), from, to, flying: clamp(flying), anticipation: clamp(anticipation), landing: clamp(landing),
});

function travel(from, to, progress, bend = 0) {
  const p = clamp(progress);
  const eased = smooth(p);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const control = point([(from[0] + to[0]) / 2 - dy / length * bend,
    (from[1] + to[1]) / 2 + dx / length * bend]);
  const position = mix(mix(from, control, eased), mix(control, to, eased), eased);
  return pose(position, from, to, Math.sin(Math.PI * p));
}

/** Fixed logical distances keep route progress stable when the terminal is resized. */
export function sampleJourney({ elapsedMs = 0, seed = 1 } = {}) {
  const key = seedValue(seed);
  const a = [0.025, 0.025];
  const b = [0.975, 0.025];
  const c = [0.975, 0.975];
  const d = [0.025, 0.975];
  const transform = ([x, y]) => {
    if (key & 1) x = 1 - x;
    if (key & 2) y = 1 - y;
    return key & 4 ? [y, x] : [x, y];
  };
  const targets = [a, b, c, a, d, c, b, a, c, d,
    [0.2 + random(key, 0) * 0.6, 0.2 + random(key, 1) * 0.6], b].map(transform);
  const legs = targets.map((from, index) => {
    const to = targets[(index + 1) % targets.length];
    const hold = 650 + random(key, index + 2) * 1100;
    const duration = 1400 + span(from, to) / 26 * 1000;
    return { from, to, hold, duration, bend: (index % 3 === 1 ? 0 : 0.07) * (random(key, index + 20) < 0.5 ? -1 : 1) };
  });
  const total = legs.reduce((sum, leg) => sum + leg.hold + leg.duration, 0);
  let local = clock(elapsedMs) % total;
  for (const leg of legs) {
    if (local < leg.hold) {
      return pose(leg.from, leg.from, leg.to, 0,
        (local - (leg.hold - 350)) / 350, 1 - local / 450);
    }
    if (local < leg.hold + leg.duration) {
      return travel(leg.from, leg.to, (local - leg.hold) / leg.duration, leg.bend);
    }
    local -= leg.hold + leg.duration;
  }
  return pose(targets[0], targets[0], targets[1]);
}

const actor = (id, animal, state, scale = 1, tilt = 0) => ({ id, animal, state, scale: clamp(scale), tilt });
const scene = (phase, actors, effects = []) => ({ phase, actors, effects });

/** Pure seeded choreography; resize re-fits normalized paths without viewport-sized work. */
export function planScene({ elapsedMs = 0, seed = 1, columns = 120, rows = 24,
  animal = 'spider', encounters = 'on' } = {}) {
  const time = clock(elapsedMs);
  const key = seedValue(seed);
  const journey = at => sampleJourney({ elapsedMs: at, seed: key });
  const solo = () => scene('solo', [actor('resident', animal, journey(time))]);
  if (encounters !== 'on' || columns < 80 || rows < 12) return solo();

  const width = dimension(columns);
  const diagonal = Math.hypot(120, 48);
  const durations = {
    arrival: 1250 + diagonal / 170 * 1000,
    chase: 2400 + diagonal / 150 * 1000,
    approach: 1000 + diagonal / 140 * 1000,
    fight: 1250,
    defeat: 850,
    celebrate: 1700,
    departure: 1200 + diagonal / 170 * 1000,
    return: 1300 + diagonal / 85 * 1000,
  };
  const eventDuration = Object.values(durations).reduce((sum, value) => sum + value, 0);
  const firstArrival = 4200 + random(key, 40) * 900;
  const soloDuration = 14_000 + random(key, 41) * 8000;
  const cycleDuration = firstArrival + eventDuration + soloDuration;
  const cycleTime = time % cycleDuration;
  if (cycleTime < firstArrival || cycleTime >= firstArrival + eventDuration) return solo();

  const eventTime = cycleTime - firstArrival;
  const start = time - eventTime;
  const eventIndex = Math.floor(time / cycleDuration) % UINT32;
  const eventSeed = hash(key ^ Math.imul(eventIndex, 0x9e3779b9));
  const species = ANIMALS.filter(entry => entry.id !== animal);
  const visitor = species[Math.floor(random(eventSeed, 42) * species.length)].id;
  const winner = hash(eventSeed ^ 0xa5a5a5a5) & 1 ? 'visitor' : 'resident';
  const loser = winner === 'resident' ? 'visitor' : 'resident';
  const meeting = [0.38 + random(eventSeed, 43) * 0.24, 0.35 + random(eventSeed, 44) * 0.3];
  const side = random(eventSeed, 45) < 0.5 ? -1 : 1;
  const gap = Math.min(0.035, 2 / Math.max(50, width - 30));
  const residentContact = [meeting[0] - side * gap / 2, meeting[1]];
  const visitorContact = [meeting[0] + side * gap / 2, meeting[1]];
  const residentApproach = [meeting[0] - side * 0.13, meeting[1] - 0.07];
  const visitorApproach = [meeting[0] + side * 0.13, meeting[1] + 0.07];
  const visitorEdge = [side > 0 ? 0.975 : 0.025, 0.2 + random(eventSeed, 46) * 0.6];
  const visitorEntry = [meeting[0] + side * 0.25, meeting[1] + 0.12];
  const arrivalEnd = start + durations.arrival;
  const resume = journey(start + eventDuration);
  let local = eventTime;
  let phase;
  for (const [name, duration] of Object.entries(durations)) {
    if (local < duration || name === 'return') { phase = name; break; }
    local -= duration;
  }
  const progress = clamp(local / durations[phase]);
  const eased = smooth(progress);
  const resident = (state, scale = 1, tilt = 0) => actor('resident', animal, state, scale, tilt);
  const guest = (state, scale = 1, tilt = 0) => actor('visitor', visitor, state, scale, tilt);
  const contact = id => id === 'resident' ? residentContact : visitorContact;
  const winningActor = (state, scale = 1, tilt = 0) => winner === 'resident'
    ? resident(state, scale, tilt) : guest(state, scale, tilt);

  if (phase === 'arrival') {
    return scene(phase, [resident(journey(time)), guest(travel(visitorEdge, visitorEntry, progress, 0.035), eased)]);
  }
  if (phase === 'chase') {
    return scene(phase, [
      resident(travel(journey(arrivalEnd).point, residentApproach, progress, side * 0.14)),
      guest(travel(visitorEntry, visitorApproach, progress, -side * 0.18)),
    ]);
  }
  if (phase === 'approach') {
    const state = (from, to) => {
      const result = travel(from, to, progress);
      result.anticipation = Math.sin(Math.PI * progress) * 0.6;
      return result;
    };
    return scene(phase, [resident(state(residentApproach, residentContact)), guest(state(visitorApproach, visitorContact))]);
  }
  if (phase === 'fight') {
    const envelope = Math.sin(Math.PI * progress) ** 2;
    const wobble = Math.sin(progress * Math.PI * 10) * envelope;
    const clash = (center, sign) => pose([center[0] + sign * wobble * 0.003,
      center[1] - envelope * 0.015], center, center, envelope * 0.5, 0, envelope * 0.6);
    const effects = [-1, 0, 1].map(offset => ({ kind: 'spark',
      point: point([meeting[0] + offset * 0.022 * envelope, meeting[1] - 0.065 * envelope]) }));
    return scene(phase, [resident(clash(residentContact, -1), 1, wobble * 0.18),
      guest(clash(visitorContact, 1), 1, -wobble * 0.18)], effects);
  }
  if (phase === 'defeat') {
    const shrinking = 1 - eased;
    return scene(phase, [resident(pose(residentContact), loser === 'resident' ? shrinking : 1,
      loser === 'resident' ? Math.sin(progress * Math.PI) * 0.25 : 0),
    guest(pose(visitorContact), loser === 'visitor' ? shrinking : 1,
      loser === 'visitor' ? -Math.sin(progress * Math.PI) * 0.25 : 0)],
    [{ kind: 'puff', point: contact(loser) }]);
  }
  if (phase === 'celebrate') {
    const center = contact(winner);
    const bounce = Math.sin(progress * Math.PI * 3) ** 2;
    return scene(phase, [winningActor(pose([center[0], center[1] - bounce * 0.055], center, center,
      bounce, 0, Math.sin(progress * Math.PI * 6) ** 2 * 0.3))]);
  }
  if (phase === 'departure') {
    if (winner === 'resident') return scene(phase, [resident(pose(residentContact))]);
    return scene(phase, [guest(travel(visitorContact, visitorEdge, progress, -side * 0.08), 1 - eased)]);
  }
  if (winner === 'resident') {
    return scene('return', [resident(travel(residentContact, resume.point, progress, side * 0.04))]);
  }
  const returnStart = journey(start + eventDuration - durations.return).point;
  return scene('return', [resident(travel(returnStart, resume.point, progress, side * 0.04), eased)]);
}
