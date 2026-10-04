import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseCompanionArgs, createCompanion } from '../src/companion.mjs';

const hasTmux = process.platform !== 'win32' && spawnSync('tmux', ['-V']).status === 0;

test('bad companion options fail before they can change the launched command', () => {
  for (const args of [[], ['--animal', 'tiger', '--', 'codex'], ['--bad', '--', 'claude'], ['--', ''], ['--theme', '--', 'codex']]) {
    assert.throws(() => parseCompanionArgs(args));
  }
  const result = parseCompanionArgs(['--animal', 'fox', '--ascii', '--', 'claude', '--help']);
  assert.equal(result.help, false, 'the harness help flag must not replace the launcher action');
});

test('a fast harness exit keeps its exit code and literal filenames cannot execute shell substitutions', { skip: !hasTmux, timeout: 15000 }, async () => {
  const folder = mkdtempSync(join(tmpdir(), 'neon-test-'));
  const injected = join(folder, 'injected');
  const output = join(folder, `don't $(touch ${injected.replaceAll('/', '_')}); report.txt`);
  const command = [process.execPath, '-e', 'require("node:fs").writeFileSync(process.argv[1], "saved"); process.exit(7)', output];
  let session;
  try {
    session = createCompanion({ command, cwd: folder, columns: 120, rows: 32, previewArgs: ['--animal', 'cat'] });
    assert.equal(await session.waitForExit(), 7);
    assert.equal(readFileSync(output, 'utf8'), 'saved');
    assert.equal(existsSync(join(folder, injected.replaceAll('/', '_'))), false);
    session.close();
    assert.equal(existsSync(session.socketPath), false);
  } finally {
    session?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});

test('concurrent companions keep separate tmux ownership when one closes', { skip: !hasTmux, timeout: 15000 }, async () => {
  const command = [process.execPath, '-e', 'setInterval(() => {}, 1000)'];
  let first;
  let second;
  try {
    first = createCompanion({ command, columns: 120, rows: 32 });
    second = createCompanion({ command, columns: 120, rows: 32 });
    first.close();
    const alive = spawnSync('tmux', ['-S', second.socketPath, 'has-session', '-t', 'neon']);
    assert.equal(alive.status, 0, 'closing one launcher must not terminate another');
    const panes = spawnSync('tmux', ['-S', second.socketPath, 'list-panes', '-F', '#{pane_id}:#{pane_active}'], { encoding: 'utf8' }).stdout.trim().split('\n');
    assert.ok(panes.includes(`${second.hostPane}:1`), 'typing starts in the harness rather than the animal controls');
  } finally {
    first?.close();
    second?.close();
  }
});

test('Ctrl+C in the harness pane propagates the standard interrupted exit status', { skip: !hasTmux, timeout: 15000 }, async () => {
  const session = createCompanion({ command: [process.execPath, '-e', 'console.log("READY"); setInterval(() => {}, 1000)'] });
  try {
    const deadline = Date.now() + 5000;
    for (;;) {
      const pane = spawnSync('tmux', ['-S', session.socketPath, 'capture-pane', '-p', '-t', session.hostPane], { encoding: 'utf8' });
      if (pane.stdout.includes('READY')) break;
      assert.ok(Date.now() < deadline, 'the harness must start before receiving keyboard interrupt');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    spawnSync('tmux', ['-S', session.socketPath, 'send-keys', '-t', session.hostPane, 'C-c']);
    assert.equal(await session.waitForExit(), 130);
  } finally {
    session.close();
  }
});

test('closing a companion stops a harness that ignores terminal hangup and termination', { skip: !hasTmux, timeout: 15000 }, async () => {
  const folder = mkdtempSync(join(tmpdir(), 'neon-close-'));
  const pidFile = join(folder, 'pid');
  const code = 'process.on("SIGHUP", () => {}); process.on("SIGTERM", () => {}); require("node:fs").writeFileSync(process.argv[1], String(process.pid)); setInterval(() => {}, 1000)';
  let session;
  let pid;
  const running = () => {
    const state = spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim();
    return state !== '' && !state.startsWith('Z');
  };
  try {
    session = createCompanion({ command: [process.execPath, '-e', code, pidFile] });
    const readyDeadline = Date.now() + 5000;
    while (!existsSync(pidFile)) {
      assert.ok(Date.now() < readyDeadline, 'the harness must install its signal handlers before closing');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    pid = Number(readFileSync(pidFile, 'utf8'));
    session.close();
    const exitDeadline = Date.now() + 3000;
    while (running() && Date.now() < exitDeadline) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(running(), false, 'closing the panes must not leave the harness running');
  } finally {
    if (pid && running()) process.kill(pid, 'SIGKILL');
    session?.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
