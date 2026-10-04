# CLI Neon Spider Implementation Plan

**Goal:** Reference-inspired wireframe spider exclusively inside OMP/Pi interactive terminals.
**Architecture:** Pure sparse-cell procedural renderer plus one shared lifecycle adapter and two host entrypoints. Native TUI overlay API only.
**Tech stack:** JavaScript ESM core, TypeScript extension entrypoints, Node built-in tests. No dependencies.
**Spec:** `docs/bmad/design.md`.

## Constraints and review focus
- Keep cells within viewport top half; resize cannot paint the editor.
- Preserve focus on OMP, where overlay mounting otherwise steals it.
- Repeated starts and stop/shutdown must not retain timers/overlays.
- Unicode output uses narrow Braille characters; ASCII fallback is real.
- Interactive-only guards exclude RPC and piped execution.

## Task 1: Motion renderer
Create `src/renderer.mjs`, `test/renderer.test.mjs`. Public `renderSpider({columns, rows, elapsedMs, ascii}): Array<{x:number,y:number,text:string,color:string}>`; max 128 distinct single-column cells. Write geometry/boundary invariants first. Implement eight jointed legs, connected body, smooth bounded motion and reference-colored scan strokes. Coordinator runs tests after all implementation slices finish.

## Task 2: Harness lifecycle
Create `src/extension.ts`, `extensions/omp.ts`, `extensions/pi.ts`. Share a minimal structural TUI/API contract instead of importing mismatched harness packages. Consume `renderSpider` from task 1. Mount zero-row widget to obtain TUI; pool single-cell overlays, protect focus, pause typing/modal input, auto activity lifecycle, demo and mode controls. No settings file mutation. Coordinator tests actual installed CLIs through PTY after integration.

## Task 3: Integration verification and critique
Coordinator creates package scripts, launches real OMP/Pi without model requests, exercises demo/input/off/repeated starts/resizes/headless guards. Capture terminal artifacts and comparison preview. Critique against reference and resolve observed important defects. Install only thin first-party global entrypoints and document reload/use/limitations. Do not commit or push without request.
