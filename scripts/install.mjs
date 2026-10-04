import { constants } from 'node:fs';
import { lstat, stat, mkdir, open, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MARKER = '// cli-neon-overlay installer wrapper v1';
const PREFIX = `${MARKER}\nimport neonOverlay from `;
const SUFFIX = ';\nexport default neonOverlay;\n';
const HELP = [
  'Usage: node scripts/install.mjs omp|pi|both [--dry-run] [--uninstall]',
  '',
  'Install marked local extension wrappers; no downloads or settings edits.',
  '',
  'Targets (under os.homedir(), respecting HOME):',
  '  omp   ~/.omp/agent/extensions/cli-neon-overlay.ts',
  '  pi    ~/.pi/agent/extensions/cli-neon-overlay/index.ts',
  '  both  Install or uninstall both wrappers',
  '',
  'Options:',
  '  --dry-run    Show planned actions without writing anything',
  '  --uninstall  Remove only wrappers owned by this installer',
  '  --help       Show this help',
  '',
  'Existing unrelated files and symlinks are refused, never overwritten.',
  'Repeat installs are safe; reinstall after moving the checkout.',
  'After changes: restart OMP; run /reload in Pi or restart Pi.',
  '',
  'Examples:',
  '  node scripts/install.mjs both --dry-run',
  '  node scripts/install.mjs omp',
  '  node scripts/install.mjs both --uninstall',
].join('\n');

function parseOptions(args) {
  let target;
  let dryRun = false;
  let uninstall = false;
  let help = false;
  for (const arg of args) {
    if (arg === '--help') help = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--uninstall') uninstall = true;
    else if (['omp', 'pi', 'both'].includes(arg) && target === undefined) target = arg;
    else throw new Error(`Unknown or extra argument: ${arg}. Use --help.`);
  }
  if (!help && target === undefined) throw new Error('Choose omp, pi, or both. Use --help.');
  return { target, dryRun, uninstall, help };
}

function wrapper(url) {
  return `${PREFIX}${JSON.stringify(url)}${SUFFIX}`;
}

function isOwned(content) {
  if (!content.startsWith(PREFIX) || !content.endsWith(SUFFIX)) return false;
  try {
    const url = JSON.parse(content.slice(PREFIX.length, -SUFFIX.length));
    return typeof url === 'string' && new URL(url).protocol === 'file:' && content === wrapper(url);
  } catch {
    return false;
  }
}

async function inspect(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

async function checkParents(home, parent) {
  let current = home;
  for (const component of relative(home, parent).split(sep)) {
    current = join(current, component);
    const info = await inspect(current);
    if (info && (info.isSymbolicLink() || !info.isDirectory())) {
      throw new Error(`Refusing unsafe extension directory: ${current}`);
    }
  }
}

async function inspectWrapper(path) {
  const info = await inspect(path);
  if (!info) return undefined;
  if (info.isSymbolicLink() || !info.isFile() || info.nlink !== 1) {
    throw new Error(`Refusing non-regular, linked, or symlink wrapper: ${path}`);
  }
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const actual = await handle.stat();
    if (actual.dev !== info.dev || actual.ino !== info.ino || !actual.isFile() || actual.nlink !== 1) {
      throw new Error(`Wrapper changed during inspection: ${path}`);
    }
    const content = await handle.readFile('utf8');
    if (!isOwned(content)) throw new Error(`Refusing unrelated existing file: ${path}`);
    return { info: actual, content };
  } finally {
    await handle.close();
  }
}

async function installWrapper(path, content, previous) {
  const flags = previous
    ? constants.O_RDWR | (constants.O_NOFOLLOW ?? 0)
    : constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  const handle = await open(path, flags, 0o644);
  try {
    if (previous) {
      const info = await handle.stat();
      if (info.dev !== previous.info.dev || info.ino !== previous.info.ino || info.nlink !== 1
          || await handle.readFile('utf8') !== previous.content) {
        throw new Error(`Wrapper changed before installation: ${path}`);
      }
    }
    const bytes = Buffer.from(content);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesWritten } = await handle.write(bytes, offset, bytes.length - offset, offset);
      if (bytesWritten === 0) throw new Error(`Unable to finish writing wrapper: ${path}`);
      offset += bytesWritten;
    }
    await handle.truncate(bytes.length);
  } finally {
    await handle.close();
  }
}

async function run(options) {
  const home = homedir();
  if (!isAbsolute(home)) throw new Error('HOME must resolve to an absolute directory.');
  const hosts = options.target === 'both' ? ['omp', 'pi'] : [options.target];
  const plans = [];
  for (const host of hosts) {
    const path = host === 'omp'
      ? join(home, '.omp', 'agent', 'extensions', 'cli-neon-overlay.ts')
      : join(home, '.pi', 'agent', 'extensions', 'cli-neon-overlay', 'index.ts');
    await checkParents(home, dirname(path));
    const previous = await inspectWrapper(path);
    const entry = fileURLToPath(new URL(`../extensions/${host}.ts`, import.meta.url));
    const content = wrapper(pathToFileURL(entry).href);
    if (!options.uninstall && !(await stat(entry)).isFile()) {
      throw new Error(`Missing extension entrypoint: ${entry}`);
    }
    const action = options.uninstall
      ? (previous ? 'Remove' : 'Already absent')
      : (!previous ? 'Install' : previous.content === content ? 'Already installed' : 'Update');
    plans.push({ path, previous, content, action });
  }
  for (const { path, previous, content, action } of plans) {
    if (!options.dryRun && ['Install', 'Update', 'Remove'].includes(action)) {
      await checkParents(home, dirname(path));
      if (options.uninstall) {
        const current = await inspectWrapper(path);
        if (!current || current.info.ino !== previous.info.ino || current.info.dev !== previous.info.dev
            || current.content !== previous.content) {
          throw new Error(`Wrapper changed before removal: ${path}`);
        }
        await unlink(path);
      } else {
        await mkdir(dirname(path), { recursive: true });
        await checkParents(home, dirname(path));
        await installWrapper(path, content, previous);
      }
    }
    console.log(`${options.dryRun ? '[dry-run] ' : ''}${action}: ${path}`);
  }
  if (options.dryRun) console.log('Dry run: nothing written.');
  else console.log('Restart OMP; run /reload in Pi or restart Pi.');
  if (!options.uninstall) console.log('Wrappers point to this checkout. Reinstall if you move it.');
}

try {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) console.log(HELP);
  else await run(options);
} catch (error) {
  console.error(`Install: ${error.message}`);
  process.exitCode = 1;
}
