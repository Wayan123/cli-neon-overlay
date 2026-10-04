# Multi-harness companion: verification

Date: 2026-10-04. Product version: 1.2.0. Runtime surface: tmux companion panes, not native overlays inside Codex or Claude Code.

Historical 1.2.0 report. The later direct OpenCode run exposed a surviving host process after detach; 1.2.1 fixes that teardown. See [the current direct CLI verification](live-cli-verification.md) for the fix, expanded harness checks and English local social-kit paths.

## Decision and boundaries

Keep native OMP/Pi extension integration unchanged. Add `npm run companion -- [animal options] -- executable [arguments...]` for other interactive CLIs. `src/companion.mjs` owns the private tmux lifecycle; `scripts/companion.mjs` owns terminal attachment and signals. The animal pane runs the existing `scripts/demo.mjs` and renderer. Options reuse validation from `src/settings.mjs` rather than introducing another animal catalog.

Each launch creates a private socket directory under the OS temporary directory and a tmux server started with `/dev/null` configuration. Keyboard focus starts in the harness. Arguments are quoted as literal POSIX shell arguments, the executable is resolved before starting tmux, and the harness receives the caller's working directory. A pane-death hook and `tmux wait-for` carry completion without timer polling. The dead host pane is retained until its exit status is read. Setup failures, detach, normal exit and termination clean up only that launch's server/directory.

Requirements: Node.js 22+, tmux 3.2+, Linux/macOS/WSL and a terminal initially at least 82 columns × 16 rows. macOS has not been exercised here. Native Windows PowerShell is explicitly rejected; use WSL. Generic panes do not consume agent lifecycle events, pause on typing, inject `/neon` commands, or provide alpha compositing. User login, trust and permissions remain the harness's responsibility. As with closing a terminal, independent background jobs launched by a harness are not managed by this launcher.

Sources informing the boundary:
- [Official Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli): CLI, skills/plugins and configuration interfaces. No claim of a generic overlay API is made.
- [Claude Code status line](https://code.claude.com/docs/en/statusline): captured script output, event-driven updates and an optional refresh interval. This is not used as an animation/PTY compositor and no statusLine settings are installed.
- The locally installed tmux 3.2a command interfaces were inspected before implementation, including pane hooks, split-window, respawn-pane and wait-for.

## Observed runtime evidence

Environment: Linux via WSL, Node.js 22.22.1, tmux 3.2a.

- **Codex CLI 0.159.1:** launched with `--no-alt-screen` in a real 140×38 PTY. Codex showed its folder-trust screen in the left pane while the cat animated in the right pane. Switched focus to the animal, pressed `n`, observed Fox, and left the Codex trust screen intact. Resized to 110×28, then used Ctrl+B/d. Launcher exited 0, its private socket directory disappeared, and PTY termios matched its initial state. No folder-trust decision was saved and no model prompt was submitted.
- **Claude Code 2.1.63:** launched in a real 140×38 PTY alongside Fox. Its first-run theme screen remained usable and the animal animated independently. Sent SIGTERM to the launcher: exit 143, private socket directory removed, terminal attributes restored. No setup answer, login or model prompt was submitted.
- **Generic interactive Node CLI:** launched alongside Cat, received `n host-only\n` through the host pane and wrote exactly that line to its output file. The key did not trigger the animal selector. Its exit code 7 propagated through the attached launcher and the terminal restored.
- **Non-TTY guard:** a piped invocation failed before creating a companion session, with an interactive-terminal diagnostic. `--help` works without a TTY.
- **Harness Ctrl+C:** the first signal-exit probe exposed exit 128 instead of 130 on tmux 3.2a; `display-message -a` confirmed that `pane_dead_signal` was absent. The harness now runs under a waiting POSIX shell that reports the command's signal exit as a normal numeric pane status. A real launcher PTY subsequently showed Cat, forwarded Ctrl+C to the ready harness, exited 130 and restored the original terminal attributes.

These checks establish startup, pane/input isolation and lifecycle behavior, not an authenticated inference round trip. OpenCode, Aider, Gemini CLI and other named commands are examples of the generic executable interface; their individual versions were not run in this verification.

## Regression coverage

`test/companion.test.mjs` exercises the real tmux server, not a mock:
- invalid animal/options and an absent command are rejected before launch; harness `--help` is not mistaken for launcher help;
- immediate command exit retains status 7; a literal filename containing an apostrophe, shell substitution and semicolon is written without executing the substitution;
- simultaneous companions have separate ownership: closing one leaves the other alive and initially focused on its harness pane;
- Ctrl+C sent to a ready harness propagates exit 130. This regression failed with 128 before the fix and passed afterward.

The tmux integration cases skip explicitly when tmux is unavailable; geometry/parser tests continue to run. In this environment the tmux cases ran, with no skips. The existing native extensions, installer and geometry tests remain unchanged.

Final commands: `npm test` passed 23/23 with 0 skips; `node --check src/companion.mjs` and `node --check scripts/companion.mjs` exited 0. No language server was available for `.mjs`; no LSP verification is claimed. The documented npm invocation was also exercised in a PTY with Jellyfish/still: host input and caller cwd matched, exit 0 propagated, the complete pane-switch/quit footer displayed and the terminal restored.

## License and local posting materials

Added the standard MIT license with copyright 2026 Wayan123 and SPDX `MIT` package metadata. Original renderer geometry is project-owned; research references and installed CLI harnesses are not relicensed.

Social captions, posting guidance, covers/videos, the ZIP pack, manifest and render tool remain on disk under their existing local paths. `.gitignore` excludes `docs/media/social/` and `scripts/render-social.py`; those previously tracked paths are removed from the current index. New caption contents are not staged. Previously pushed copies remain in Git history; no force push or history rewrite is performed.
