# Neon companions: verification and BMAD critique

Date: 2026-10-04. Scope: version 1.1.0, the selectable-animal extension and its public setup/demo path. Historical spider-only evidence is preserved separately.

## Observed evidence

Machine-readable results: [artifacts/multi-animal-smoke.json](../../artifacts/multi-animal-smoke.json).

- `node --test test/companions.test.mjs` failed before implementation: `renderAnimal` was undefined. After integration, `npm test` passed 19/19 tests. Covers protected rows, cell budget, glyphs, finite extremes, option combinations, invalid settings/arguments, connected/distinct species, positions, size fitting, motion clock/freeze and original spider articulation.
- Actual OMP **18.6.0** and Pi **1.0.0** launched in PTYs with `--no-extensions --no-skills --no-tools --no-session -e <entrypoint>`. No model prompts or paid inference were sent. The named model in screenshots is host configuration, not a model execution.
- Both loaded installer-generated static file-URL TypeScript wrappers. Both also loaded those wrappers after reinstalling from a temporary checkout whose path contained spaces, including percent-encoded spaces in the import URL.
- Both accepted `list`, empty-command help, direct `cat`, `demo cat`, all animal switches while active, `next`, `theme sunset/mono`, `size large`, `motion slow/still`, `position right`, ASCII/Braille, status, reset, repeated demos and off. Invalid `animal tiger` left the selected spider and style intact, confirmed by status.
- In off mode, selection did not turn the overlay on. Demo did override off and later returned to a clean off state. Reset restored spider/neon/medium/normal/roam/Braille and auto-idle with no visible cells. Switching animals retained at most 128 visible Braille cells.
- Still motion produced identical successive visible frames. Typing `keyboard-proof-123` hid the overlay without losing the text; it recovered after the typing pause. `/model` hid the overlay, Escape restored it. A 38×14 viewport hid it. Pi recovered at 110×36; OMP recovered once its editor again had sufficient document space above it.
- Pi `/reload` cleaned the old demo; a new `/neon demo cat` worked afterward. OMP was closed and relaunched after the notification improvement; hot-reload is not claimed.
- `CLI_NEON_REDUCED_MOTION=1` disabled demos in both actual hosts with an explanatory notification. Both RPC processes answered a `get_state` request with plain output containing neither animation ANSI nor Braille.
- The standalone preview accepted flags and each keyboard control `n`, `p`, `t`, `s`, `m`, `l`, `a`; the on-screen selection/style changed accordingly. Still mode froze its screen. A 35×12 viewport displayed resize guidance, and 80×24 recovered. `q`, Escape and Ctrl+C exited with code 0 and restored raw mode, cursor and alternate screen. SIGINT/SIGTERM/SIGHUP restored the terminal and returned 130/143/129 respectively.
- Piped `--help` and `--list` returned 0 without animation. A bad animal and attempted piped animation returned 1, no stdout ANSI, and actionable stderr.
- Isolated-HOME installer checks passed: dry-run wrote no files; both wrappers installed; repeat install was idempotent; an unrelated Pi file refused the whole planned `both` install without creating the OMP target; dangling target and controlled-ancestor symlinks were refused; moved checkout updated owned wrappers; uninstall dry-run preserved them; uninstall removed only wrappers; repeat uninstall was safe. Real user discovery files were not overwritten or uninstalled.

PTY output must be drained while testing timers: a stopped reader can fill the kernel terminal buffer and delay the host event loop. The expiry observation was made after draining output, not advertised as a precision timing benchmark.

## Concrete critique and resolutions

1. **Private paths made public instructions unusable.** Replaced workstation-specific launch commands with clone-relative commands and a location-aware installer. A path containing spaces was exercised in both real loaders, rather than assuming quoting was enough.
2. **Generic rotation would make a cat unreadable.** Only spider geometry rotates. Cat and fox remain upright and have different frontal/profile silhouettes. Jellyfish pulses its bell and trails tentacles. Original procedural geometry avoids copied art and adds species-specific character.
3. **New controls could accidentally activate an off session.** Parser separates selection from mode/demo; real native selection-while-off and demo/reset/off transitions were exercised. Unknown and surplus arguments never reach mutation.
4. **A notification showed a stale typing pause.** The original new acknowledgement reused live status immediately after pressing Enter, recording `paused (typing)` long after animation resumed. Configuration acknowledgements now describe the selected settings and explicit demo request; `/neon status` remains the separate point-in-time diagnostic. Both hosts were relaunched and observed after the fix.
5. **One new test counted the renderer's punctuation instead of anatomy.** It treated every ASCII `+` as a jellyfish tentacle tip, but rasterized intersections also use `+`. Removed this incidental representation test rather than repinning its count or modifying correct geometry to satisfy it. Connectedness/boundary tests and actual visual inspection remain.
6. **An OMP resize expectation ignored editor location.** After shrinking the terminal, the editor could remain near the top even after enlarging it. Status correctly said not enough space above editor. The smoke restored actual document space using a local `!printf` command and then observed recovery. Safety behavior was preserved; no forced drawing over the editor was added. This shell context was not used as marketing footage.
7. **Different output is not proof of recognizable animals.** Inspected the four actual standalone Braille previews, all four ASCII previews, minimum-size ASCII views, real OMP/Pi screenshots, and sampled MP4 frames. Cat has ears/whiskers/front paws/thin tail, fox has long muzzle/profile/bushy tail, jellyfish has a domed bell/trailing tentacles; spider retains its eight jointed legs. Fine details merge in small native safe areas, a terminal-grid limit disclosed below.

Two independent read-only reviewers examined renderer/settings/tests and native controls/demo/installer/README against both code standards and the BMAD specification. Both returned no evidence-backed actionable defects. Their runtime gaps were checked by the coordinator; reviewers did not run tests. The final notification refinement was verified in relaunched native hosts.

## Media provenance

- [companions.png](../media/companions.png): 2×2 montage of actual 80×24 standalone preview captures, large size and center placement.
- [omp-cat.png](../media/omp-cat.png), [pi-jellyfish.png](../media/pi-jellyfish.png): actual native host output at 110×36, with no model interaction.
- [demo.gif](../media/demo.gif) and [demo.mp4](../media/demo.mp4): 180 actual standalone PTY frames, **18 seconds**, **832×560**, **10 fps**, H.264 MP4 without audio. MP4 metadata checked with ffprobe; preview grid inspected. GIF inspected as a decoded frame and checked for 180 frames/18 seconds.

Capture command: `node scripts/demo.mjs --size large --position center`. At 3s press `n`; 6s `nt`; 9s `n`; 12s `a`; 15s `tm`. This records spider, cat, fox, jellyfish, sunset, ASCII, mono and still motion. Quit with `q` after 18s.

ANSI was parsed with pyte 0.8.2 and drawn with Pillow using local Unifont, a dark background and the captured cell foregrounds. This is terminal reconstruction, not desktop pixels. Font rasterization differs from Windows Terminal, iTerm2 or other emulators. No AI-generated product screenshot, copied sprite, HTML mock terminal, external rendering service or music was used. Local FFmpeg encoded PNG frames with libx264/yuv420p/faststart and a GIF palette.

## Delivery gates

- **BMAD readiness PASS:** existing renderer/lifecycle reused; explicit species/command contracts; acceptance scenarios mapped to implementation and proof.
- **Hard/function gate PASS:** keyboard controls and native commands exercised; invalid, idle, off, tiny, reduced-motion and headless states observed; installer collision/dry-run/uninstall verified. No dead control, fabricated testimonial/statistic or unrequested generated logo.
- **Purpose/liveliness gate PASS:** ENERGY 3 / RHYTHM 2 / MOTION 2; original wireframe identity, species-specific motion, one companion focal point, protected whitespace and limited palette. ASCII minimum and typical sizes inspected. Terminal notifications inherit the host theme; no universal contrast claim for arbitrary user backgrounds.
- **Craftsmanship gate PASS:** original species and both glyph modes inspected; all shipped standalone controls used; native settings/lifecycle checked; README separates standalone preview from native screenshots and states setup/removal limitations.
- **Secret scan:** `uvx --from detect-secrets==1.5.0 detect-secrets scan --all-files --exclude-files '^\.git/'` returned `results: {}`. This tool ran from an ephemeral utility environment, not a product dependency. There are no runtime or development npm dependencies to audit. No signing key or existing commit-signing configuration was available; no global Git security configuration was changed.

## Limits, intentionally unchanged

Settings last the session; there is no preference file. Large size is a target, not a promise when safe height or the cell budget is small. Sparse cells occlude text locally and OMP can hold scrollback commits while visible. Use auto/off for long output. Braille depends on font support; ASCII is the fallback. Neon/sunset are best on dark backgrounds; mono follows terminal foreground.

No Windows/macOS desktop, SSH/tmux or alternative native renderer/backend QA was performed. Agent activity and subagent guards were not re-injected in this iteration; their implementation is unchanged and historical injection evidence is in the earlier verification. New proof covers idle, selection, mode/demo controls and reset, not paid model inference. No alpha-transparency, zero-overhead or pixel-identical video claim is made.

## Operational runbook

From a checkout: `npm test`, `npm run demo -- --animal cat`, then install only the desired host with `npm run install:omp` / `npm run install:pi`. Restart OMP or `/reload` Pi. Inspect choices with `/neon list`; start with `/neon demo cat`. For invisible overlays, inspect `/neon status`, terminal dimensions, editor space, focus and reduced-motion environment. For font boxes, switch to `/neon ascii`; for brightness mismatch, `/neon theme mono`. After moving the checkout rerun the installer. Remove using the corresponding `uninstall:*` script, then restart/reload.

## GitHub delivery receipt

Source and media published to the public repository https://github.com/Wayan123/cli-neon-overlay on `main`, commit `2f640b620bb7b822d7429e52cd1b5991508e20dc`. GitHub's commits API returned that exact SHA. The repository description was updated to describe animal companions, style controls, standalone preview and safe setup; default branch `main` and public visibility were observed through `gh repo view`.

A fresh clone from the GitHub URL passed `npm test` (19/19), ran the documented `npm run demo -- --animal cat` flow in a real PTY, restored the terminal on `q`, and contained every linked README media file. No `npm install` was needed. No force push, remote visibility change, paid inference or CI pass was claimed. This receipt is a documentation follow-up to the source commit.

The follow-up secret scan flagged the public source commit SHA in YAML as a hex high-entropy string. It was verified against GitHub and allowlisted on that exact line only; no credential or file-wide exclusion was added.
