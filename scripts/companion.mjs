import { spawn } from 'node:child_process';
import { COMPANION_HELP, parseCompanionArgs, createCompanion } from '../src/companion.mjs';

let session;
let attached;
const signals = new Map();
const cleanup = () => {
  for (const [signal, handler] of signals) process.removeListener(signal, handler);
  session?.close();
};

try {
  const options = parseCompanionArgs(process.argv.slice(2));
  if (options.help) console.log(COMPANION_HELP);
  else {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('An interactive terminal is required. Use --help for usage.');
    session = createCompanion({ ...options, columns: process.stdout.columns, rows: process.stdout.rows });
    process.once('exit', cleanup);
    attached = spawn('tmux', [...session.tmuxArgs, 'attach-session', '-t', 'neon'], { stdio: 'inherit', env: session.env });
    for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]]) {
      const handler = () => { process.exitCode = code; cleanup(); };
      signals.set(signal, handler);
      process.once(signal, handler);
    }
    const detach = new Promise((resolve, reject) => {
      attached.once('error', reject);
      attached.once('close', code => resolve(code ?? 1));
    });
    const exitCode = await Promise.race([session.waitForExit(), detach]);
    process.exitCode ??= exitCode;
  }
} catch (error) {
  console.error(`Companion: ${error.message}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
