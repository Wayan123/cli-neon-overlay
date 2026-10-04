# Changelog

## Replacement source recording

- Replaced the README GIF, public MP4 and poster with derivatives of the new supplied CLI recording, removing the first recording's server-launch screen from current demo files.
- Regenerated all five local social MP4 exports, matching covers, source manifest and posting ZIP; updated English copy for the new system-health session.
- Kept social material local-only. Earlier commits retain the first recording; no Git history rewrite was performed.

## README GIF revision

- Replaced the README's linked MP4 and static poster with an inline, infinitely looping GIF converted from the same supplied actual CLI recording.
- Preserved the full terminal frame and complete sequence; left social MP4 exports unchanged.


## Demo media correction

- Used the supplied `assets/video-example.mp4` as the primary README video, preserving its full actual CLI frame and video stream while removing audio.
- Added a poster extracted from that recording; stopped presenting reconstructed standalone media as the primary demo.
- Rebuilt the local social pack from the same footage with full-frame padded exports and English captions specific to the spider clip; social files remain local-only.

## 1.2.1

- Made direct live CLI commands the primary demo: native OMP/Pi first, then the live standalone preview and tmux companion panes.
- Removed separate GIF/MP4 promotion from the README; retained earlier recordings and terminal logs only as historical evidence.
- Translated the historical verification narrative to English and clarified the live preview's English help/footer.
- Replaced the active local social posting copy with English captions and instructions for capturing the actual CLI; archived the previous composed social exports locally.
- Fixed companion teardown for a host that ignores SIGHUP/SIGTERM; direct OpenCode execution exposed the survivor, and a regression plus a real rerun verified its process group stops.

## 1.2.0

- Added the MIT license and SPDX package metadata.
- Added an isolated tmux companion launcher for Codex, Claude Code and other interactive CLI commands, reusing the existing animal renderer and settings.
- Preserved argument quoting, working directory, initial harness keyboard focus and exit status; clean up only the launcher's private tmux session on normal exit, detach or termination.
- Propagated harness keyboard-interrupt status through a waiting POSIX shell, including tmux 3.2 where pane signal metadata is unavailable.
- Kept OMP/Pi native overlays separate from generic pane mode; documented requirements, first-run screens, reduced motion and verified compatibility boundaries.
- Removed social posting materials and their render tool from current repository tracking while preserving local files; ignored them for subsequent commits.

## 1.1.0

- Added original cat, fox and jellyfish wireframes alongside the articulated spider, with species-specific blinking, tail sway and bell/tentacle motion.
- Replaced the spider-only renderer API with `renderAnimal`; migrated the standalone preview and native adapters.
- Added catalog-driven animal selection, next, neon/sunset/mono palettes, size, motion, position and reset commands. Empty `/neon` shows help; invalid or surplus arguments leave preferences unchanged.
- Added standalone preview flags and keyboard browsing, with animation space separated from controls.
- Added safe, marked-wrapper OMP/Pi installation, dry-run and uninstall without changing harness settings or overwriting unrelated files.
- Reworked public setup instructions and included original terminal image/GIF/MP4 demos, BMAD research, critique and verification evidence.

## 1.0.0

- Added video-reference procedural eight-legged cyan/magenta wireframe spider with Braille and ASCII rasterization.
- Added native sparse-cell overlay integration for OMP and Pi, auto/on/off/demo controls, reduced-motion and headless guards.
- Protected editor coordinates, keyboard focus, typing/dialog suspension, resize, demo expiry and teardown.
- Fixed Pi reload focus acquisition and managed input subscription across TUI renderer changes.
- Verified both actual CLI runtimes and installed local entrypoints; documented terminal-fidelity and OMP scrollback tradeoffs.
