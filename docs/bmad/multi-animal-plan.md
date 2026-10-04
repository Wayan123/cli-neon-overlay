# Neon companions implementation plan

**Goal:** Deliver selectable original animal companions, usable CLI controls, safe setup, real demos, and GitHub delivery.
**Architecture:** Shared settings catalog and sparse renderer; preserve native session lifecycle. Independent renderer and standalone/setup slices; coordinator owns integration and verification.
**Tech stack:** Node >=22, ESM JavaScript, TypeScript host adapter, node:test; local PTY capture and FFmpeg for demo media.
**Spec:** [multi-animal-spec.md](multi-animal-spec.md).

## Constraints
No runtime dependencies, copied art, network/model calls, harness-source/settings edits, or implicit global installation. At most 128 narrow cells above protected half/editor. Preserve all historical evidence. No compatibility export for renderSpider. Strict invalid commands leave session unchanged.

## Review focus
- Large species/rotated frames at 40x16 must fit without dropping limbs.
- Changing animals during a demo must clear surplus cells and preserve focus.
- Static motion must not turn keyboard/modal pause into permanent disappearance.
- Invalid extra tokens and bad enums must not silently change configuration.
- Installing into paths with spaces and colliding wrapper files must be safe.

## Task 1: Catalog and native controls (coordinator)
- [x] Add a red command/animal smoke, observe failure before production changes.
- [x] Create src/settings.mjs matching spec exports and parseNeonCommand signature. Add behavioral parser tests for invalid arguments, nonmutation and mode/selection semantics.
- [x] Update src/extension.ts to consume renderAnimal and parsed commands, show catalog/settings, implement next/reset, retain lifecycle guards and input pause. All exported-symbol references attempted via LSP first; no server available, use explicit consumer inventory.
- [x] Smoke actual OMP/Pi command surface without sending model prompts.

## Task 2: Original species renderer (worker)
Files: src/renderer.mjs, test/renderer.test.mjs. Consume settings catalog. Replace export with renderAnimal(input), retain original spider behavior and sparse rasterizer; add original cat, fox, jellyfish geometry. Fit size without losing parts; position/motion/themes apply consistently. Migrate and extend geometry tests for bounds, finite extremes, connectivity, distinctive silhouettes and still motion. Workers do not run tests/build/formatters mid-flight; coordinator runs final suite after integration.

Completed. Tests and real Braille/ASCII screenshots inspected; original species retain bounded, connected geometry.

## Task 3: Standalone and setup (worker)
Files: scripts/demo.mjs, scripts/install.mjs. Consume catalog/renderAnimal. Add spec flags and keyboard controls with discoverable bounded text, resize/tiny handling, terminal cleanup. Implement marked-wrapper installer, dry-run/refusal/idempotence/uninstall. No package metadata edits by worker. Coordinator exercises PTY, isolated HOME and paths with spaces.

Completed. Preview PTY cleanup and isolated-HOME/space-path installer scenarios passed.

## Task 4: Review, proof, docs and delivery (coordinator)
- [x] Run full tests after workers finish; fix failures, exercise changed runtime paths.
- [x] Independent standards/spec review; address evidence-backed findings and visually critique each animal.
- [x] Generate PNG/GIF/MP4 from actual terminal output, inspect samples and metadata. No fake host UI.
- [x] Rewrite README for public clone/run/install/use/uninstall and extension authoring; update changelog, BMAD state and operations evidence.
- [x] Initialize Git for the observed empty destination, inspect intended staged diff and secret scan, commit and push without force; verify remote commit.

## Preflight seams
| Producer | Consumer | Contract |
|---|---|---|
| Coordinator settings | Renderer/demo | ANIMALS descriptors, palette/scales/factors, DEFAULT_SETTINGS |
| Renderer | Native adapter/demo | renderAnimal options and <=128 narrow sparse cells |
| Settings parser | Native adapter | Tagged commands, no side effects |
| Installer | Harness | Marked wrapper importing existing entrypoint via file URL |

All acceptance clauses map to the four tasks. Selection remains session-local by design; persistent preference storage is outside the request and would add cross-machine state.
