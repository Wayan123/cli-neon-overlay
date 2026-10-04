# CLI Neon Spider: historical verification and critique

This is an English translation of the original spider-only report. Its versions, test counts and findings describe that earlier iteration, not the current release. Original terminal logs and captures remain unchanged as primary evidence.

## Status at the time

Implemented locally and installed through OMP/Pi extension discovery. This iteration was not an external publication or release, and no commit or push had been made. An existing OMP session needed a restart; Pi could use `/reload`.

## Observed evidence

- `npm test`: all 7 renderer tests passed after lifecycle fixes. Covered geometry, clipping, protected rows, unique cells, capacity, ASCII, leg connectivity, determinism and bounded motion.
- OMP 18.5.0 and Pi 1.0.0 were launched in actual PTYs without other extensions, tools or model prompts. Auto mode was exercised by injecting `agent_start`/`agent_end` events, not through paid model inference.
- `artifacts/native-smoke.json`: the demo appeared and changed between frames; editor input remained intact; typing hid the overlay; `/model` hid it and Escape restored it; 38×14 hid it and 100×30 restored it. Repeated demos, 17-second expiry, clean off state and reduced-motion disabling were exercised. All final assertions were true.
- Pi `/reload` removed the old overlay, and `/neon demo` displayed it again. OMP teardown/restart was exercised through injected `session_shutdown`/`session_start` events. OMP extension hot reload was not verified; `/reload` and `/reload-plugins` did not establish extension refresh in the initial experiment.
- `artifacts/pi-mode-switch.json`: with isolated Pi configuration under `/tmp`, opened `/settings`, found `TUI mode`, selected regular mode and pressed Escape. The demo appeared, typing hid it, input remained intact and off removed it. User configuration was not changed.
- `artifacts/installed-entrypoints.json`: both installed discovery entrypoints were loaded explicitly; demo, off, help and status worked.
- `artifacts/headless-smoke.json`: both CLIs answered `get_state` in RPC mode with piped stdin/stdout, without animation ANSI or Braille output.
- The standalone preview ran in a PTY; toggled ASCII, then pressed q. Exit was 0, raw mode returned to its original state and the alternate screen restored. Non-TTY execution returned exit 1 without ANSI on stdout.

The final CLI smoke command was `python3 /tmp/neon-final-smoke.py`, using a 110×32 PTY and isolated pyte 0.8.2. Temporary QA scaffolding was removed after saving the evidence. The scenarios above describe the steps to repeat. No separate TypeScript compiler check was performed; both actual harnesses loaded the TypeScript extension.

## Defects found and fixed

1. **The OMP editor is not always at the bottom of the screen.** An initial capture showed the shape crossing the status/editor area. The boundary now uses the cursor position from `getDebugPaint()` with a two-row gap. In the final example, cells occupied y=2..8 while the editor was lower.
2. **OMP render immutability.** Reusing a mutated array could prevent the render cache from noticing a change. Each glyph change now returns a new array.
3. **Pi reload captured a temporary Container as focus.** Instrumentation showed the baseline changing from `Container` to `CustomEditor` after reload. Focus capture now accepts only a component that renders the cursor marker and retries after the editor returns. The smoke failed before the fix and passed afterward.
4. **Pi TUI mode changes lost the direct input listener.** Review traced renderer replacement. The listener now uses `ctx.ui.onTerminalInput`, which the harness transfers. The actual `/settings` path passed after the fix.

The final independent code review found both lifecycle issues addressed and no new evidence-backed findings. Reviewers did not run tests; runtime evidence came from the coordinator.

## Critique against the reference

**Achieved:** eight legs with two segments each, a connected wireframe body, cyan/magenta edges, bright joints, movement and rotation, local scan effects, and display above CLI content without a rectangular panel or desktop window.

**Deliberately calmer:** the gait cycle is about 5.7 seconds, with short sweeps only during selected phases. The reference video has more dramatic highlight bars and diagonal streaks. Visual review found no required correction for this terminal adaptation. Increasing leg amplitude/asymmetry or highlights would be additional fidelity work, not evidence of an identical reproduction.

**Not reproduced:** pixel glow, background text magnification, video perspective or 60-fps detail. Terminal fonts and fallback selection affect Braille dots; ASCII is available. No invented similarity percentage was reported.

**Observed tradeoff:** shape cells temporarily cover underlying characters. OMP holds scrollback commits while native overlays are visible. Auto mode, keyboard/dialog pause and off limit interference. Alpha transparency and zero overhead were not claimed.

## Historical CLI quality gate

- Hard gate: every delivered command was exercised in an actual CLI. Off, idle, headless, reduced-motion, pause and tiny-viewport states were observed. No fabricated statistics, active links, identities or research content were used.
- Purpose gate: cyan/magenta, the articulated spider and scan effects came from the reference motif, not a generic spinner or card. No avatar/logo assets were created.
- Liveliness: energy 3, rhythm 2 and motion 3 were limited to a small motif. Eight legs, changing frames, movement and protected whitespace were visible.
- Craftsmanship: native OMP/Pi, keyboard, dialogs, resize, off, glyphs, Pi lifecycle and TUI mode switching were exercised. Notification text used the harness theme; neon colors were decorative and did not communicate status alone.

PNG captures reconstruct actual ANSI PTY output with a Braille font fallback. They are not Windows Terminal desktop screenshots. Windows emulator visuals, SSH/tmux and the Tern native protocol were not verified in this earlier iteration. Without safe editor coordinates or required overlay support, the effect stops or hides instead of taking over the terminal.
