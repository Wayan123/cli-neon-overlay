export const ANIMALS = Object.freeze([
  Object.freeze({ id: 'spider', label: 'Spider', description: 'Eight jointed legs, rotating wireframe and local scans' }),
  Object.freeze({ id: 'cat', label: 'Cat', description: 'Pointed ears, whiskers, a blinking face and swinging tail' }),
  Object.freeze({ id: 'fox', label: 'Fox', description: 'Long muzzle, alert ears and a swaying bushy tail' }),
  Object.freeze({ id: 'jellyfish', label: 'Jellyfish', description: 'Pulsing bell and flowing trailing tentacles' }),
  Object.freeze({ id: 'mite', label: 'Mite', description: 'Round body, six ball-tipped legs and big curious eyes' }),
  Object.freeze({ id: 'urchin', label: 'Urchin', description: 'Spiny orb with pulsing radiating spines' }),
  Object.freeze({ id: 'octopus', label: 'Octopus', description: 'Round mantle and eight waving, curling tentacles' }),
  Object.freeze({ id: 'crab', label: 'Crab', description: 'Wide shell, eye stalks, walking legs and snapping claws' }),
]);
const rgb = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;
export const THEMES = Object.freeze({
  neon: Object.freeze({ primary: rgb(64, 232, 255), secondary: rgb(244, 86, 224), joint: rgb(255, 190, 78), bright: rgb(224, 255, 255) }),
  sunset: Object.freeze({ primary: rgb(255, 190, 78), secondary: rgb(255, 112, 104), joint: rgb(255, 221, 150), bright: rgb(255, 245, 224) }),
  lime: Object.freeze({ primary: rgb(150, 236, 64), secondary: rgb(255, 92, 170), joint: rgb(255, 64, 140), bright: rgb(240, 255, 210) }),
  magenta: Object.freeze({ primary: rgb(255, 64, 160), secondary: rgb(80, 230, 255), joint: rgb(255, 210, 240), bright: rgb(255, 240, 250) }),
  mono: Object.freeze({ primary: '\x1b[39m', secondary: '\x1b[39m', joint: '\x1b[39m', bright: '\x1b[39m' }),
});
export const SIZES = Object.freeze({ small: 0.65, medium: 0.95, large: 1.3 });
/** Clock factors; `lively` uses perch-and-dart flights, `random` uses seeded journeys. */
export const MOTIONS = Object.freeze({ still: 0, slow: 0.45, normal: 1, lively: 1, random: 1 });
export const POSITIONS = Object.freeze(['roam', 'left', 'center', 'right']);
export const STYLES = Object.freeze(['wireframe', 'orb', 'fuzzy']);
export const TETHERS = Object.freeze(['on', 'off']);
export const ENCOUNTERS = Object.freeze(['on', 'off']);
export const FRAME_RATES = Object.freeze(['15', '30']);
export const DEFAULT_SETTINGS = Object.freeze({
  animal: 'spider', theme: 'neon', size: 'medium', motion: 'random', position: 'roam',
  style: 'wireframe', tether: 'on', encounters: 'on', fps: '15', ascii: false,
});
const animalIds = ANIMALS.map(({ id }) => id);
const choices = Object.freeze({
  animal: animalIds, theme: Object.keys(THEMES), size: Object.keys(SIZES), motion: Object.keys(MOTIONS),
  position: POSITIONS, style: STYLES, tether: TETHERS, encounters: ENCOUNTERS, fps: FRAME_RATES,
});
export const HELP = [
  'Neon companions: /neon list, /neon demo cat, /neon animal fox, /neon next.',
  '/neon auto | on | off | demo [animal] | status | ascii | braille | reset | help',
  `/neon animal ${animalIds.join('|')}`,
  ...['theme', 'size', 'motion', 'position', 'style', 'tether', 'encounters', 'fps'].map(key => `/neon ${key} ${choices[key].join('|')}`),
  'Selection does not turn animation on. Demo lasts 17 seconds; settings last this session.',
  'Typing/dialogs pause the overlay. CLI_NEON_REDUCED_MOTION=1 disables it.',
].join('\n');

/** Parse without mutating session state; reject surplus tokens before any action. */
export function parseNeonCommand(text) {
  const tokens = typeof text === 'string' ? text.trim().toLowerCase().split(/\s+/).filter(Boolean) : [];
  const [verb, value] = tokens;
  const error = message => ({ type: 'error', message });
  if (!verb) return { type: 'info', topic: 'help' };
  if (['help', 'list', 'status'].includes(verb) && tokens.length === 1) return { type: 'info', topic: verb };
  if (['auto', 'on', 'off'].includes(verb) && tokens.length === 1) return { type: 'mode', mode: verb };
  if (['ascii', 'braille'].includes(verb) && tokens.length === 1) return { type: 'set', key: 'ascii', value: verb === 'ascii' };
  if (verb === 'reset' && tokens.length === 1) return { type: 'reset' };
  if (verb === 'next' && tokens.length === 1) return { type: 'set', key: 'animal', value: 'next' };
  if (animalIds.includes(verb) && tokens.length === 1) return { type: 'set', key: 'animal', value: verb };
  if (verb === 'demo') {
    if (tokens.length === 1) return { type: 'demo' };
    if (tokens.length === 2 && animalIds.includes(value)) return { type: 'demo', animal: value };
    return error(`Use /neon demo [${animalIds.join('|')}].`);
  }
  if (Object.hasOwn(choices, verb)) {
    if (tokens.length === 2 && choices[verb].includes(value)) return { type: 'set', key: verb, value };
    return error(`Use /neon ${verb} ${choices[verb].join('|')}.`);
  }
  return error(`Unknown command or extra arguments: ${tokens.join(' ')}. Use /neon help or /neon list.`);
}
