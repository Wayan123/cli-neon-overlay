/** Perch candidates from rendered Pi document lines; pure so it can be tested without a TUI. */
const CONTROL = /\x1b(?:\[[0-?]*[ -/]*[@-~]|_[^\x07\x1b]*(?:\x07|\x1b\\)|\][^\x07\x1b]*(?:\x07|\x1b\\))/g;
const MAX_CANDIDATES = 64;
const MIN_WORD = 3;

/**
 * Returns `{x, y}` cells at the end of visible words in the rows above `safeRows`.
 * Lines containing non-printable-ASCII text are skipped: their cell columns are not knowable.
 */
export function perchCandidates(lines, safeRows, columns) {
  const candidates = [];
  const limit = Math.min(lines.length, safeRows);
  for (let y = 0; y < limit && candidates.length < MAX_CANDIDATES; y++) {
    const text = lines[y].replace(CONTROL, '');
    if (!/^[\x20-\x7e]*$/.test(text)) continue;
    for (const match of text.matchAll(/\S+/g)) {
      const end = match.index + match[0].length - 1;
      if (match[0].length >= MIN_WORD && end < columns - 1) candidates.push({ x: end, y });
      if (candidates.length >= MAX_CANDIDATES) break;
    }
  }
  return candidates;
}

/** Deterministic pick for one hop; a stable result per hop is the renderer's contract. */
export function pickPerch(candidates, hop) {
  if (candidates.length === 0) return undefined;
  const mixed = Math.imul((hop % 2147483647) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return candidates[mixed % candidates.length];
}
