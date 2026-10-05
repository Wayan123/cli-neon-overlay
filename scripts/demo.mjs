import { ANIMALS, THEMES, SIZES, MOTIONS, POSITIONS, STYLES, TETHERS, FRAME_RATES, DEFAULT_SETTINGS } from '../src/settings.mjs';

const choices = {
  animal: ANIMALS.map(({ id }) => id),
  style: STYLES,
  theme: Object.keys(THEMES),
  size: Object.keys(SIZES),
  motion: Object.keys(MOTIONS),
  position: POSITIONS,
  tether: TETHERS,
  fps: FRAME_RATES,
};
const HELP = [
  'Usage: node scripts/demo.mjs [options]',
  '',
  'Live interactive terminal preview, not an OMP/Pi session or video playback.',
  '',
  'Options:',
  '  --help                  Show this help without a terminal',
  '  --list                  List animal companions without a terminal',
  ...Object.entries(choices).map(([key, values]) =>
    `  --${key.padEnd(22)}${values.join('|')} (default: ${DEFAULT_SETTINGS[key]})`),
  '  --ascii                 Use ASCII instead of Braille',
  '',
  'Keys: n/p animal, y style, t theme, s size, m motion, l position, w tether, f fps, a glyphs.',
  'Exit: q, Escape, or Ctrl+C.',
  '',
  'Examples:',
  '  node scripts/demo.mjs --animal mite --style fuzzy --theme lime',
  '  node scripts/demo.mjs --animal octopus --style orb --fps 30',
].join('\n');

function parseOptions(args) {
  const settings = { ...DEFAULT_SETTINGS };
  let help = false;
  let list = false;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--help') help = true;
    else if (flag === '--list') list = true;
    else if (flag === '--ascii') settings.ascii = true;
    else if (flag.startsWith('--') && Object.hasOwn(choices, flag.slice(2))) {
      const key = flag.slice(2);
      const value = args[++index];
      if (!choices[key].includes(value)) {
        throw new Error(`${flag} requires ${choices[key].join('|')}.`);
      }
      settings[key] = value;
    } else {
      throw new Error(`Unknown argument: ${flag}. Use --help.`);
    }
  }
  return { settings, help, list };
}

function preview(renderAnimal, settings) {
  const started = performance.now();
  const wasRaw = process.stdin.isRaw ?? false;
  let stopped = false;
  let terminalActive = false;
  let timer;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(timer);
    process.stdin.removeListener('data', input);
    process.stdin.removeListener('end', stop);
    process.stdin.removeListener('error', fail);
    process.stdout.removeListener('resize', paint);
    for (const [signal, handler] of signals) process.removeListener(signal, handler);
    process.removeListener('exit', stop);
    try {
      process.stdin.setRawMode(wasRaw);
    } catch {
      // The TTY may already be disconnected.
    }
    process.stdin.pause();
    if (terminalActive) {
      terminalActive = false;
      try {
        process.stdout.write('\x1b[0m\x1b[?25h\x1b[?1049l');
      } catch {
        // A closed output cannot receive terminal cleanup.
      }
    }
  };
  const fail = error => {
    stop();
    process.exitCode = 1;
    console.error(`Preview: ${error.message}`);
  };
  const cycle = (key, direction = 1) => {
    const values = choices[key];
    settings[key] = values[(values.indexOf(settings[key]) + direction + values.length) % values.length];
  };
  const input = data => {
    for (const key of data.toString('utf8')) {
      if (key === '\x03' || key === '\x1b' || key === 'q') {
        stop();
        return;
      }
      if (key === 'n') cycle('animal');
      else if (key === 'p') cycle('animal', -1);
      else if (key === 'y') cycle('style');
      else if (key === 't') cycle('theme');
      else if (key === 's') cycle('size');
      else if (key === 'm') cycle('motion');
      else if (key === 'l') cycle('position');
      else if (key === 'w') cycle('tether');
      else if (key === 'f') {
        cycle('fps');
        clearInterval(timer);
        timer = setInterval(paint, 1000 / Number(settings.fps));
      } else if (key === 'a') settings.ascii = !settings.ascii;
    }
    paint();
  };
  const paint = () => {
    if (stopped) return;
    try {
      const columns = Math.max(1, process.stdout.columns || 1);
      const rows = Math.max(1, process.stdout.rows || 1);
      const width = Math.max(0, columns - 1);
      let frame = '\x1b[0m\x1b[H\x1b[2J';
      const text = (row, value) => {
        if (row >= 1 && row <= rows) frame += `\x1b[${row};1H\x1b[0m${value.slice(0, width)}`;
      };
      const animal = ANIMALS.find(({ id }) => id === settings.animal);
      const status = `${settings.style} | ${settings.theme} | ${settings.size} | ${settings.motion} | ${settings.position} | tether ${settings.tether} | ${settings.fps} fps | ${settings.ascii ? 'ASCII' : 'Braille'}`;
      if (columns < 40 || rows < 14) {
        text(1, `${animal.label} preview`);
        text(2, 'Resize to at least 40 columns x 14 rows.');
        text(3, `Selected: ${settings.animal}`);
        text(4, status);
        text(Math.min(rows, 6), 'q/Esc: exit | n/p: animal');
        if (rows >= 7) text(7, 't/s/m/l/a: style controls');
      } else {
        text(1, `Neon companions | ${animal.label}`);
        text(2, status);
        const cells = renderAnimal({
          columns,
          rows: (rows - 6) * 2,
          elapsedMs: performance.now() - started,
          ...settings,
        });
        for (const cell of cells) {
          frame += `\x1b[${cell.y + 4};${cell.x + 1}H${cell.color}${cell.text}`;
        }
        if (cells.length === 0) text(4, 'Not enough room for this companion. Resize to continue.');
        text(rows - 2, 'n/p: animal | y: style | t: theme | s: size');
        text(rows - 1, 'm: motion | l: position | w: tether | f: fps | a: glyphs');
        text(rows, 'q/Esc/Ctrl+C: exit | Live standalone preview');
      }
      process.stdout.write(`${frame}\x1b[0m`);
    } catch (error) {
      fail(error);
    }
  };
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'].map((signal, index) => [
    signal,
    () => {
      process.exitCode = [130, 143, 129][index];
      stop();
    },
  ]);

  process.once('exit', stop);
  process.stdin.on('error', fail);
  process.stdout.on('error', fail);
  for (const [signal, handler] of signals) process.once(signal, handler);
  try {
    process.stdin.setRawMode(true);
    terminalActive = true;
    process.stdout.write('\x1b[?1049h\x1b[?25l');
    process.stdin.on('data', input);
    process.stdin.once('end', stop);
    process.stdout.on('resize', paint);
    process.stdin.resume();
    timer = setInterval(paint, 1000 / Number(settings.fps));
    paint();
  } catch (error) {
    fail(error);
  }
}

try {
  const { settings, help, list } = parseOptions(process.argv.slice(2));
  if (help) console.log(HELP);
  if (list) {
    console.log(ANIMALS.map(({ id, label, description }) => `${id.padEnd(10)} ${label}: ${description}`).join('\n'));
  }
  if (!help && !list) {
    if (!process.stdout.isTTY || !process.stdin.isTTY) {
      throw new Error('An interactive terminal is required. Use --help or --list, or /neon demo in OMP/Pi.');
    }
    const { renderAnimal } = await import('../src/renderer.mjs');
    preview(renderAnimal, settings);
  }
} catch (error) {
  console.error(`Preview: ${error.message}`);
  process.exitCode = 1;
}
