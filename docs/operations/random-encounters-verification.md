# Random routes and cartoon encounters: verification (1.4.0)

Date: 2026-10-09. Initial verification environment: Linux/WSL, Node.js 22.22.1, OMP 18.8.6, Pi 1.1.0, tmux 3.2a. The initial implementation was local-only; a subsequent user request explicitly authorized a new README GIF, commit and push. No installer changes or model requests were made.

## Goal and implementation

The [BMAD specification](../bmad/random-encounters-spec.md) and [implementation plan](../bmad/random-encounters-plan.md) cover random horizontal, vertical, diagonal and corner routes, terminal fitting, occasional distinct-species visitors, a cartoon fight on contact, disappearance of the loser and expressive motion.

`src/scene.mjs` supplies seeded normalized journeys and encounter actors. `src/renderer.mjs` fits whole animals in shared cell-space margins, merges overlapping Braille dots and renders contact effects. Native OMP/Pi and the standalone/companion preview consume the same scene. The default motion is `random`; `/neon encounters off` keeps solo random motion. Still, slow, normal, lively and fixed positions remain selectable. Encounters require random + roam and at least 80 columns by 12 safe drawable rows.

Route duration uses distance in a fixed 120-column by 24-safe-row logical viewport. Physical dimensions change fitting and apparent cell speed, not elapsed narrative progress. This avoids resize jumps without maintaining a second mutable scene clock. Each session seeds its routes once; the bounded twelve-leg itinerary repeats with seeded pauses and bends. It is not fresh randomness on every frame. Visitors and winners vary across encounter cycles.

## Regression and full-suite evidence

`node --test test/scene.test.mjs test/scene-renderer.test.mjs`: 14/14 passed after the critique fixes. `npm test`: 46/46 passed, zero failures/skips, exit 0 (about 13 seconds in this run).

Behavior covered includes both movement axes and directions, corner coverage, continuous motion at 15/30 fps in 80–320-column viewports, distinct visitors, close contact before fight, both possible winners, loser shrink/removal, selected-animal return after a winning visitor leaves, continuity at every event boundary, disabled/fixed/still cases, deterministic seeds, finite extremes, unique bounded narrow cells and complete fitting across species/styles/glyphs.

### Adversarial BMAD findings and repairs

1. **Resize retimed active motion and reversed encounter progress.** Journey leg durations and encounter cycle durations originally depended on the current terminal dimensions. Re-evaluating the same timestamp after resize selected another route progress or phase. A sequential resize regression failed before the fix. Logical distances and encounter durations are now independent of physical dimensions; the regression checks phase, identities, scale and normalized trajectory progress across 120×24 to 320×48 safe viewports. It passes after the fix.
2. **Filled bodies could hide the clash completely.** Effects originally discarded occupied cells. The seed-11 mite/orb/lime ASCII scene at 12,500 ms had phase `fight` but no visible `*` contact spark. Its consumer regression failed before the fix. Contact effects now highlight occupied cells; Braille dots are OR-merged with body dots, while ASCII draws the contact glyph in place. The regression passes. Body positions are not sliced to admit effects; the scene retains its 256-cell capacity bound.
3. **Same-colored overlapping bodies were hard to distinguish visually.** Visitors now swap the selected palette's primary and secondary colors, without adding a new theme or changing style. Actual preview, OMP and Pi pair captures were inspected after the change. Mono mode naturally cannot distinguish animals by color.

The independent scene and surface reviewers found no additional evidence-backed defects in their assigned static-review slices. They did not run tests; the commands and live checks below were performed by the integration owner.

## Actual interactive smoke

OMP and Pi were launched in isolated tmux PTYs with `--no-extensions --no-tools --no-skills --no-session -e ./extensions/<harness>.ts`; Pi also used `--offline`. No paid prompts were sent. A local `!printf 'viewport smoke\n%.0s' {1..24}` shell command supplied enough OMP transcript rows above its editor.

- OMP: mite, fuzzy, lime, random, encounters on, 30 fps. Pi: cat, orb, magenta, same motion/control settings. Both rendered two distinct species. Sampled cell counts ranged 5–140 in OMP and 0–175 in Pi across a 24-second capture interval; the zero is retained rather than claiming every transition is nonempty.
- Standalone preview: `node scripts/demo.mjs --animal mite --style orb --theme lime --fps 30`, 120×40. A fresh 23-second capture observed solo, arrival, chase, approach, fight, defeat, celebrate, departure and return. Pair, contact, shrink and winner frames were inspected visually.
- Companion: a real local Node host printed `HOST_READY` and exited after 22 seconds, inside a 300×50 session with an 80-column crab/orb/random/30-fps animal pane. The pane exposed every encounter phase listed above. Host exit status was 0; closing the companion removed its private socket. This proves the launcher/preview path, not a new compatibility run for Codex or Claude Code.
- Native resize: 140×50 -> 80×24 -> 39×14 -> 140×50. Pi showed 52 cells with maximum row 7 at 80×24, zero below minimum size, then 69 cells with maximum row 16 on restoration. All observed cells remained in the protected upper half.
- OMP moved its editor near the top when resized and discarded the earlier visible transcript. The overlay correctly paused with `not enough space above editor`, including after restoring dimensions. Supplying another real shell-output block restored usable space. This is a host-layout constraint, not permission to paint below the editor.
- Typing hid native Braille cells; clearing input and waiting restored 119 OMP cells and 62 Pi cells in the measured samples. `/neon encounters off` produced native status with `latest scene solo`. `/neon off` left zero Braille cells in both.
- Preview key `e` switched to encounters off and solo; `a` produced ASCII with no Braille; 39×13 showed the resize instruction; `q` closed the preview. The isolated smoke server was stopped afterward.

## Renderer cost

Command: Node ESM loop over `renderScene`, all eight species, each style, seed 11, 200×60 physical/synthetic rows, elapsed time 0–30,000 ms at 33 ms steps (7,280 frames per style). These are renderer-only measurements; native overlay allocation, terminal output and host compositing are excluded.

| Style | Mean ms/frame | Worst observed ms/frame | Maximum observed cells |
| --- | ---: | ---: | ---: |
| wireframe | 0.098 | 3.147 | 144 |
| orb | 0.280 | 2.325 | 174 |
| fuzzy | 0.290 | 2.254 | 191 |

## Media provenance and limits

[The phase sheet](../media/random-encounters.png), 1200×620, uses cropped actual standalone preview pane captures. Each terminal cell was reconstructed at its captured position and foreground color; Braille bits were drawn explicitly because the available monospace font lacks Braille glyphs. Captured midpoint phases were selected, with a later defeat frame to show shrink. Labels outside the crops identify captured phases. It is not a terminal-emulator/desktop screen recording. Older 1.3.0 images and GIFs remain historical media, not proof of random encounters.

Native animals occupy only the area above the editor, never the full terminal merely because it is large. Tiny areas suppress visitors, and areas below native safety limits hide the overlay. Apparent speed scales on very large terminals; timing does not retime on resize. Overlapping cells temporarily cover host text; there is no transparency, glow, gradient, audio, combat scoring or model inference. No current macOS, native Windows, SSH or third-party CLI-version compatibility claims were added.

## README GIF and publication follow-up

On 2026-10-09 the user explicitly requested commit/push and a README GIF of the latest update. The opening README GIF now links to `docs/media/random-encounters.gif`; the earlier `lively-showcase.gif` remains available as historical media.

The new recording launched real OMP 18.8.7 in a 120×50 isolated tmux PTY with `--no-extensions --no-tools --no-skills --no-session -e ./extensions/omp.ts`. `!npm test` ran in its local shell and reported 46 tests, 46 passes and zero failures. Settings were mite/fuzzy/lime, random motion, encounters on and 30 fps. The captured visitor was a fox. The pair, clash, shrinking departure and return frames were visually inspected; `/neon off` left zero Braille cells. The recording's isolated server was stopped afterward.

420 `tmux capture-pane -e` frames were sampled at 15 Hz over 28 seconds. Only the top 30 terminal rows were retained, containing all animal cells and real host/test output. Foreground/background colors were decoded from recorded ANSI, Braille bits and block-logo glyphs were redrawn, and the available monospace font rendered text. No animal trajectories, host text or fake CLI elements were inserted. This is a cell reconstruction, not a desktop recording; font metrics and anti-aliasing differ from a terminal emulator.

FFmpeg encoded an infinitely looping 1200×600 GIF: 420 frames, 27.99-second decoded duration, 591,024 bytes. A complete FFmpeg decode completed without errors. SHA-256: `b6808cca7bcc2bc7f2112693c5e186b7e9be351596c953d570043357ccc7bea3`.

Publication scope is the 1.4.0 source, behavioral tests, BMAD/docs, phase sheet and new GIF on `main` at `Wayan123/cli-neon-overlay`. Local `assets/`, `video-references/`, capture work directories and signing keys are excluded. The package declares no runtime or development dependencies; no dependency manifest entries or lockfiles were added.
