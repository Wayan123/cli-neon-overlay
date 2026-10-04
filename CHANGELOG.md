# Changelog

## Unreleased

- Added a social posting pack: 18-second H.264 videos in vertical 1080p, portrait feed, square, landscape and lightweight 720p Status formats.
- Added matching PNG covers, a four-animal portrait carousel, Indonesian captions/SRT, conservative safe-area guidance and a complete ZIP download.
- Added a local Pillow/FFmpeg render recipe and measured output manifest; original 10 fps CLI footage is preserved and repeated to 30 fps export without motion interpolation.

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
