# Neon companions: BMAD specification

## Intent and discovery
Extend the existing native OMP/Pi sparse overlay into a configurable animal companion, keep typing and agent output usable, make cloning/trying/installing straightforward, and publish truthful image/video demos to Wayan123/cli-neon-overlay. The local directory has no Git metadata; the destination repository is empty (observed through gh on 2026-10-04). Preserve existing historical evidence.

## Research and critique
Primary sources consulted 2026-10-04:
- https://github.com/craftzdog/asciiquarium-js: species-specific movement and direct keyboard controls make a terminal scene discoverable. Adopt distinct motion signatures, not its art or GPL code.
- https://github.com/dropdevrahul/campy: companion selection and event-aware animation give coding-agent pets personality. Keep this project's sparse native overlay instead of adding side panes, happiness counters, speech bubbles, or model hooks.
- https://clig.dev/#help and https://clig.dev/#ease-of-discovery: expose examples, list choices, explain errors, offer reversible setup. These guidelines exclude fullscreen TUIs, so apply them to command discovery and installer only.

## Decisions
One original procedural renderer, one shared validated settings catalog, existing session lifecycle, and two thin host entrypoints. No runtime dependencies, network, model calls, copied sprites, or harness patches. Catalog-driven choices make adding an animal local to its geometry plus catalog, not another lifecycle branch.

Animal IDs: spider (eight articulated legs), cat (ears, whiskers, blinking eyes, swinging tail), fox (pointed ears, long muzzle, bushy swaying tail), jellyfish (pulsing bell and trailing tentacles). Silhouettes must be visibly distinguishable in both Braille and ASCII. Cat/fox stay upright instead of inheriting spider rotation.

Renderer API: renderAnimal({columns, rows, elapsedMs, ascii=false, animal='spider', theme='neon', size='medium', motion='normal', position='roam'}). Output unchanged: at most 128 unique narrow {x,y,text,color} cells, only top half. Invalid dimensions/time/settings produce [] rather than clipped or misleading output. No renderSpider compatibility alias; migrate all live consumers. Themes neon (cyan/magenta), sunset (amber/coral), mono (neutral foreground with no truecolor requirement). Sizes small/medium/large are upper targets, fitted down to capacity and safe viewport. Motion still freezes pose and location, slow scales time, normal keeps current pace. Positions roam/left/center/right constrain placement above editor.

Settings module exports ANIMALS ({id,label,description}[]), THEMES (palette map), SIZES (scale map), MOTIONS (time factor map), POSITIONS (string[]), DEFAULT_SETTINGS, HELP, parseNeonCommand(text). Parser returns {type:'info', topic:'help'|'list'|'status'} | {type:'mode', mode:'auto'|'on'|'off'} | {type:'demo', animal?:string} | {type:'set', key:'animal'|'theme'|'size'|'motion'|'position'|'ascii', value:string|boolean} | {type:'reset'} | {type:'error', message:string}. Strict token arity and enumerations; invalid input never changes state. Empty /neon shows help, not an implicit mode change.

Commands: /neon list; /neon animal cat (also /neon cat as discoverable shortcut); /neon next; /neon theme neon|sunset|mono; /neon size small|medium|large; /neon motion still|slow|normal; /neon position roam|left|center|right; /neon demo [animal]; existing auto/on/off/ascii/braille/status/help; /neon reset returns settings and mode to defaults and ends demo. /neon next represented by set animal value 'next', resolved from current selection in session. Selection alone does not turn on an idle/off session. Demo explicitly previews for 17 seconds and retains chosen animal afterward. Session-local settings, no secret persistence.

Standalone demo: same renderer/settings, --help and --list without TTY, flags --animal/--theme/--size/--motion/--position and --ascii; keyboard n/p animal, t theme, s size, m motion, l position, a glyph, q/Escape/Ctrl+C exit. Keep headers/footer outside animation region and restore terminal raw/cursor/alternate-screen state, including signals and resize/tiny state.

Installer: node scripts/install.mjs omp|pi|both [--dry-run] [--uninstall]. No dependencies or downloads. Resolve project path dynamically, respect HOME via os.homedir(), use file URL imports safely across spaces/platform separators. Own a marked wrapper only, refuse unrelated existing files; idempotent install and uninstall; do not mutate harness settings or source. Dry-run never writes. Explain restart/reload and moved checkout behavior.

Visual direction: original wireframe menagerie, ENERGY 3 / RHYTHM 2 / MOTION 2. Neon colors preserve project identity, sunset offers a warmer option, mono avoids truecolor dependence. One companion focal point, whitespace protects editor, species-specific movement creates personality without fake intelligence. Host theme supplies notifications. Output overlays inherit arbitrary terminal backgrounds; no universal contrast claim.

## Acceptance gate
1. Four recognizable distinct silhouettes and movement signatures; each respects 128-cell budget, top-half bounds, tiny/invalid input and ASCII fallback.
2. Actual OMP and Pi accept animal/style commands, reject bad arguments without mutation, support status/list/help, typing/dialog pause, off and repeat demo; selection does not steal editor focus.
3. Standalone demo works without harness; documented flags and keyboard controls exercised; terminal restores on exit; non-TTY help/list work and animation rejects pipes.
4. Safe installer exercised against isolated HOME for both targets, repeated install, dry-run, unrelated-file refusal and uninstall; installed wrapper loads in real harness.
5. README clone commands contain no workstation paths, explain limitations/reduced motion/uninstall, show real rendered screenshot and short GIF plus downloadable MP4, distinguish standalone from native integration.
6. BMAD review records concrete defects and fixes and verification evidence; no fake claims of pixel transparency, Windows screenshots, paid inference, or untested compatibility.
7. Reviewed, secret-checked source/docs/media committed and pushed to the explicitly requested empty repository without force push.

## Readiness
PASS: bounded extension of the existing renderer and command flow. No external services or assets required. Root coordinator owns settings/extension/docs/integration; renderer and standalone installer slices have disjoint files and the API above as their shared contract. Keep the existing default spider and auto-mode safety behavior.
