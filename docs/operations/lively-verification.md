# Lively motion, styles and new animals: verification (1.3.0)

Date: 2026-10-05. Environment: Linux/WSL, Node.js 22.22.1, OMP 18.6.1, Pi 1.0.3, tmux 3.2a, 140×40 panes.

Design reference: `video-references/Referensi-Overlay.mp4` (1280×720, 15 s, 30 fps; SHA-256 `b68d879d49cf982ff1995cb8f1180118a634fd5cfbca3f5119168fed02374da5`), studied at 200 ms frame intervals. Only motion qualities were adapted: perch–dart–settle timing, overshoot, squash/stretch, gaze, limb reach, a dashed tether, and filled/fuzzy bodies with ball-tipped legs. No characters, art, labels or branding from the reference were copied. Animal geometry is original.

## Automated checks

`npm test`: 29/29 passed. Contracts added or changed:

- Lively motion (every animal, 15 and 30 fps): most frames perched, visible darts, roams more than 40% of the width, centroid step under 7 cells at 33 ms and 11 cells at 67 ms. The earlier "under 2 cells per frame" rule still applies to `normal`.
- Perch target: the body's left edge lands 1–4 cells right of the supplied word end, on its row. Invalid perches fall back to the unperched frame; a non-function perch renders nothing.
- Option matrix: 8 animals × 3 styles × ASCII/Braille × sizes × motions × positions, and every theme × tether, at 40×16, 81×25 and 160×64. Never more than 128 cells, outside the safe half or overlapping.
- Filled styles keep every wireframe outline cell. `fuzzy` adds a fringe beyond `orb`; `tether off` removes silk.
- Perch extraction ignores ANSI/APC escapes when computing columns, skips non-ASCII rows and short words, and respects the safe height. Picks are deterministic per hop.
- Command parser accepts the new style, tether and fps choices and rejects invalid ones.

Render cost, 200×60, all animals, 30 s at 33 ms steps: mean 0.04 ms (wireframe), 0.13 ms (orb), 0.14 ms (fuzzy); worst observed frame 1.6 ms.

## Real harness sessions

Launched OMP and Pi with `--no-extensions --no-tools --no-skills --no-session -e ./extensions/<harness>.ts` (Pi also `--offline`). Then ran `/neon style fuzzy`, `/neon theme lime`, `/neon animal mite`, `/neon fps 30` and `/neon on` inside each CLI.

- Status in both CLIs read `Neon: on, mite, fuzzy, lime, medium, lively, roam, tether on, 30 fps, Braille`.
- Cells per frame ranged 49–68. The animal travelled about 37 columns within 7 seconds.
- Distinct overlay frames per second, sampled from pane captures: OMP 15.3 / 30.3 and Pi 15.3 / 30.3 at `fps 15` / `fps 30`.
- `/neon demo urchin|octopus|crab|fox` was shown with orb/fuzzy styles and magenta/neon/sunset/lime themes. Rendered frames were inspected visually.
- Typing paused the overlay (0 Braille cells), and it resumed after the one-second pause (OMP 72 cells, Pi 101). `/neon off` left 0 Braille cells in both.
- Overlay cells end with an SGR foreground reset; host text colors after the animal were unchanged in the raw pane escapes.
- Pi perch run, 24 s: 14 distinct rests were observed. 9 sat directly right of visible text. The other 5 were in rows without eligible text (blank or non-ASCII), where the deterministic fallback applies.

## Showcase media

`docs/media/lively-showcase.gif` (1120×370, 392 frames, 15 fps, infinite loop; SHA-256 `d9c37fb34aa2ef2d5b8370cf4bed35b058775878db75e0eb685c3a61839e5a31`) comes from 15 Hz `tmux capture-pane -e` snapshots of a real OMP 18.6.1 session. Four scenes run with `/neon on`, 30 fps and lively motion: mite/fuzzy/lime, octopus/orb/magenta, crab/orb/sunset and spider/wireframe/neon.

Each captured cell was redrawn at its column and row with its recorded foreground color. Braille dots were drawn from their bit patterns because the available monospace font lacks Braille glyphs. Only the top 22 rows are kept. It is a faithful re-rendering of real pane contents, not a screen recording of a terminal emulator. Font metrics, background and anti-aliasing differ from any particular terminal.

## Boundaries

- The renderer uses Braille dots in 128 sparse foreground-only cells. Gradients, glow, transparency and soft fur from the reference cannot be reproduced; `fuzzy` approximates fur with a dot fringe.
- Status-label overlays, two cooperating creatures, and cross-pane handoffs from the reference were not implemented.
- OMP exposes only a cursor position, not rendered lines. OMP perches therefore use deterministic wandering targets, not text.
- Pi perch extraction relies on `tui.render(columns)` returning the rendered document, which Pi 1.0.3 does. Rows with non-ASCII or wide text are skipped.
- Companion panes reuse the standalone preview and so gain the same options. Codex, Claude Code and other companion harnesses were not re-run for 1.3.0. Neither were macOS or native Windows terminals.
