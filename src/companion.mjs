import { spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANIMALS, DEFAULT_SETTINGS, ENCOUNTERS, FRAME_RATES, MOTIONS, POSITIONS, SIZES, STYLES, TETHERS, THEMES, parseNeonCommand } from './settings.mjs';

export const COMPANION_HELP = `Usage: npm run companion -- [animal options] -- command [arguments...]

Run a CLI in its own tmux pane beside the original animal renderer.
Requires Node.js 22+, tmux 3.2+, Linux/macOS/WSL, and an interactive terminal.

Animal options: --animal ${ANIMALS.map(({ id }) => id).join('|')},
  --style ${STYLES.join('|')}, --theme ${Object.keys(THEMES).join('|')},
  --size ${Object.keys(SIZES).join('|')}, --motion ${Object.keys(MOTIONS).join('|')},
  --position ${POSITIONS.join('|')}, --tether ${TETHERS.join('|')},
  --encounters ${ENCOUNTERS.join('|')}, --fps ${FRAME_RATES.join('|')}, --ascii

Examples:
  npm run companion -- --animal cat -- codex
  npm run companion -- --animal fox -- claude
  npm run companion -- --ascii -- opencode
  npm run companion -- --motion slow -- aider --model your-model

Ctrl+B then Left/Right: switch pane. Animal pane: n/p, y, t, s, m, l, w, e, f, a.
Key e toggles encounters on/off.
Exit your harness normally to close both panes. Ctrl+B then d forcibly ends
the owned live host process group; save work first, not a background detach.
/neon commands and automatic busy/typing detection belong to native OMP/Pi
extensions, not this companion pane. No harness settings are modified.`;

export function parseCompanionArgs(args) {
  const separator = args.indexOf('--');
  const options = separator === -1 ? args : args.slice(0, separator);
  const command = separator === -1 ? [] : args.slice(separator + 1);
  const previewArgs = [];
  let help = false;
  for (let index = 0; index < options.length; index++) {
    const flag = options[index];
    if (flag === '--help') help = true;
    else if (flag === '--ascii') previewArgs.push(flag);
    else {
      const key = flag.slice(2);
      const value = options[++index];
      if (!flag.startsWith('--') || key === 'ascii' || !Object.hasOwn(DEFAULT_SETTINGS, key) || !value) {
        throw new Error(`Unknown or incomplete option: ${flag}. Use --help.`);
      }
      const parsed = parseNeonCommand(`${key} ${value}`);
      if (parsed.type !== 'set' || parsed.key !== key) throw new Error(parsed.message || `Invalid ${flag}.`);
      previewArgs.push(flag, parsed.value);
    }
  }
  if (!help && (!command.length || !command[0])) throw new Error('Supply -- followed by a CLI command. Use --help.');
  return { help, command, previewArgs };
}

const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
const shellCommand = args => `exec ${args.map(quote).join(' ')}`;
// Let the shell report signal exits on tmux versions without pane_dead_signal.
const hostCommand = args => `trap ':' INT TERM HUP; ${args.map(quote).join(' ')}; result=$?; exit "$result"`;

export function createCompanion({ command, previewArgs = [], cwd = process.cwd(), columns = 120, rows = 32 }) {
  if (process.platform === 'win32') throw new Error('Use WSL for companion panes on Windows; native PowerShell is not supported.');
  if (columns < 82 || rows < 16) throw new Error('Companion panes need at least 82 columns x 16 rows; 120 x 30 is recommended.');
  if (!command?.length || command.some(arg => typeof arg !== 'string' || arg.includes('\0')) || !command[0]) {
    throw new Error('A valid executable and argument list is required.');
  }
  const paths = command[0].includes('/') ? [resolve(cwd, command[0])] :
    (process.env.PATH || '').split(delimiter).map(path => resolve(cwd, path, command[0]));
  const executable = paths.find(path => {
    try { accessSync(path, constants.X_OK); return statSync(path).isFile(); } catch { return false; }
  });
  if (!executable) throw new Error(`Executable not found: ${command[0]}. Install that CLI separately.`);
  const env = { ...process.env };
  delete env.TMUX;
  delete env.TMUX_PANE;
  const version = spawnSync('tmux', ['-V'], { encoding: 'utf8', env });
  if (version.error || version.status !== 0) throw new Error('tmux is required. Install tmux separately; no packages are downloaded by this launcher.');
  const match = version.stdout.match(/tmux (\d+)\.(\d+)/);
  if (!match || Number(match[1]) < 3 || (Number(match[1]) === 3 && Number(match[2]) < 2)) {
    throw new Error('tmux 3.2 or newer is required.');
  }
  const folder = mkdtempSync(join(tmpdir(), 'cli-neon-'));
  const socketPath = join(folder, 'tmux.sock');
  const tmuxArgs = ['-S', socketPath, '-f', '/dev/null'];
  let closed = false;
  let hostPane;
  const run = args => {
    const result = spawnSync('tmux', [...tmuxArgs, ...args], { encoding: 'utf8', env, timeout: 10000 });
    if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr.trim() || 'tmux command failed.');
    return result.stdout.trim();
  };
  const close = () => {
    if (closed) return;
    let hostGroup = 0;
    if (hostPane) {
      try {
        const [pid, dead] = run(['display-message', '-p', '-t', hostPane, '#{pane_pid}:#{pane_dead}']).split(':');
        if (dead === '0') hostGroup = Number(pid);
      } catch {
        // A missing server cannot establish ownership of a live process group.
      }
    }
    closed = true;
    const signalHost = signal => {
      if (hostGroup <= 1 || !Number.isInteger(hostGroup)) return;
      try { process.kill(-hostGroup, signal); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    };
    try {
      signalHost('SIGTERM');
    } finally {
      spawnSync('tmux', [...tmuxArgs, 'kill-server'], { env, stdio: 'ignore', timeout: 10000 });
      try { signalHost('SIGKILL'); }
      finally { rmSync(folder, { recursive: true, force: true }); }
    }
  };
  try {
    // Start a holding shell so immediate harness exits cannot race session setup.
    hostPane = run(['new-session', '-d', '-s', 'neon', '-x', String(columns), '-y', String(rows), '-c', cwd, '-P', '-F', '#{pane_id}', '/bin/sh']);
    run(['set-option', '-g', 'default-shell', '/bin/sh']);
    run(['set-window-option', '-t', 'neon', 'remain-on-exit', 'on']);
    run(['set-option', '-t', 'neon', 'status-left', 'Neon | ']);
    run(['set-option', '-t', 'neon', 'status-right', 'Ctrl+B arrows: pane | Ctrl+B d: quit']);
    run(['set-hook', '-p', '-t', hostPane, 'pane-died', 'wait-for -S neon-host-exit']);
    const demo = fileURLToPath(new URL('../scripts/demo.mjs', import.meta.url));
    const motion = env.CLI_NEON_REDUCED_MOTION === '1' ? ['--motion', 'still'] : [];
    const width = Math.max(40, Math.min(80, Math.floor(columns * .35)));
    const animalPane = run(['split-window', '-d', '-h', '-l', String(width), '-t', hostPane, '-c', cwd,
      '-P', '-F', '#{pane_id}', shellCommand([process.execPath, demo, ...previewArgs, ...motion])]);
    run(['select-pane', '-t', hostPane]);
    const waiter = spawn('tmux', [...tmuxArgs, 'wait-for', 'neon-host-exit'], { env, stdio: 'ignore' });
    const finished = new Promise((resolveExit, reject) => {
      waiter.once('error', reject);
      waiter.once('close', code => {
        if (closed) { resolveExit(0); return; }
        if (code !== 0) { reject(new Error('Companion tmux server closed unexpectedly.')); return; }
        try {
          const status = run(['display-message', '-p', '-t', hostPane, '#{pane_dead_status}']);
          if (!status) throw new Error('Harness pane closed without an exit status.');
          resolveExit(Number(status));
        } catch (error) { reject(error); }
      });
    });
    run(['respawn-pane', '-k', '-t', hostPane, '-c', cwd, hostCommand([executable, ...command.slice(1)])]);
    return { socketPath, hostPane, animalPane, env, tmuxArgs, waitForExit: () => finished, close };
  } catch (error) {
    close();
    throw error;
  }
}
