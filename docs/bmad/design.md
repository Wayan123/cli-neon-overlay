# CLI Neon Spider: BMAD design

## Analysis / observed evidence
Reference: `../video-assets/video-overlay.mp4`, 368×368, 60 fps, 16.7 s, H.264. Inspected preview plus frames at 2, 8, 14 seconds. Main motif: small articulated wireframe spider above dense scrolling text, cyan/magenta edges, bright joints, intermittent horizontal/diagonal highlight streaks. The background is contextual, not an animation asset to copy.

Runtime probes: installed OMP 18.5.0 and Pi 1.0.0 both expose `TUI.showOverlay`, `setFocus`, `requestRender`, terminal geometry. Pi supports `nonCapturing`; OMP does not. Neither has public transparent-cell compositing. OMP compositor is private. Do not patch harness internals, intercept terminal writes, replace frame providers, or launch a desktop window.

## Decision
One procedural terminal-cell renderer, two thin extension entrypoints. Sparse one-cell overlay components: blank pixels have no component, so the CLI remains visible without a rectangular opaque panel. Use Unicode Braille for subcell line detail, ASCII as optional fallback. Cyan and magenta are intentional reference colors, amber limited to joints. Dial ENERGY 3 / RHYTHM 2 / MOTION 3 for the small motif, not the whole CLI.

The renderer yields a fixed-capacity set of `{x, y, text, color}` cells, bounded to the top half of the terminal. Eight two-segment legs have alternating phase; a connected body rotates and follows a smooth trajectory. Thin scan streaks stay local to the spider and never impersonate real tools, links, selections, or analysis.

Overlay lifecycle is session-local. Default mode `auto`: visible only during main-agent activity. `/neon demo` starts a 17-second preview; `/neon on`, `/neon off`, `/neon auto`, `/neon status`, `/neon ascii`, `/neon braille` operate from the keyboard. Session reload/shutdown and agent completion dispose overlays/timers. Headless/RPC, piped output, tiny terminals, and reduced-motion (`CLI_NEON_REDUCED_MOTION=1`) create no animated surface. No audio, network requests, provider calls, or copied content.

Acquire the active TUI from a zero-row widget factory, not a persistent `ui.custom` interaction. Preserve focus around sparse overlay mounting and visibility transitions on OMP. Do not handle or consume user input. Pause and hide while typing and while another component owns focus. Geometry recalculated on every frame. Target 15 fps; capped sparse overlay pool rather than a pixel-resolution MP4 decoder.

## Acceptance
- Recognizable connected spider with eight articulated legs, moving cyan/magenta wireframe and scan accents; no spinner/card substitution.
- Real OMP and Pi launch and accept `/neon demo`, text input, off, repeat demo; editor focus/input remains functional.
- Uncovered CLI content remains intact; protected bottom half and input are untouched.
- Width/height changes remain bounded, including narrow terminal; tiny geometry hides the effect.
- Stop/reload/shutdown clear every overlay and timer; no trails remain after repaint.
- Disabled/headless output is plain harness output, no animation ANSI.
- No installed harness code or settings is modified. Global discovery gets only local first-party extension entrypoints.

## Critique / tradeoffs
Braille cannot reproduce pixel glow, lens zoom, or the video's text magnification. Sparse-cell replacement locally occludes text, like the reference, but does not implement semantic text scanning. OMP freezes transcript history commits while overlays are visible; auto mode and typing/modal suspension bound the lifetime. This behavior must be disclosed and exercised, not described as transparent compositing or zero overhead.

## Readiness gate
PASS for procedural CLI adaptation. Exact pixel-identical reproduction is excluded by terminal-grid constraints. Verify observed runtime behavior before final delivery.
