# Random wildlife implementation plan

**Goal:** Viewport-aware random animals with occasional cartoon encounters.
**Architecture:** Seeded pure scene planner feeds the existing species rasterizer; one scene renderer is shared by native overlay and standalone/companion preview.
**Tech:** Node.js 22+, ESM, TypeScript host adapter, tmux PTY smoke, existing node:test.
**Spec:** [random-encounters-spec.md](random-encounters-spec.md).

## Constraints and review focus
No dependencies, host patches, remote publication or model prompts. Retain editor protection and reduced-motion guard. Combined output <=256 unique narrow cells without sliced bodies. Cover event boundaries, both winners, smaller resized viewport, disabled/still/fixed interactions and distant routes at 15/30 fps.

## Work slices
1. Scene planner (`src/scene.mjs`, `test/scene.test.mjs`): implement sampleJourney/planScene contract from spec; finite seeded targets, distance-aware easing, occasional distinct visitor, approach/contact, loser disappearance and winner celebration. Write behavioral tests before implementation. Parent verifies after integration; workers skip tests/build/format mid-flight.
2. Integration (`src/settings.mjs`, `src/extension.ts`, `scripts/demo.mjs`, `src/companion.mjs`, parser tests): random default, encounters toggle and key e; create uint32 seed per session; renderScene result, 256-cell pool and native phase/species status. Keep resize/input/off/terminal cleanup and historical modes intact.
3. Renderer (parent: `src/renderer.mjs`, `test/renderer.test.mjs`): fail a pair consumer test first; add private actor placement with uniform fitting, random single motion and validated seed, renderScene unique merge and bounded effects. No adapter truncation.
4. Integration gate (parent): focused and full tests, actual interactive preview and native CLI resize/typing/off, companion real process, visual contact sheet and frame-cost measurements. Critique spec versus result, repair defects, then document observed results in operations report and update README/changelog/BMAD iteration.

No implicit commit or push.

## Completion

All four slices completed. Two adversarial reviews identified resize retiming and hidden collision effects; both were repaired with failing-before/passing-after regression tests. `npm test` passed 46/46. Actual preview and companion scenes exercised the complete encounter sequence; native OMP/Pi pairs, resize guards, typing pause and off cleanup were observed. Renderer cost and documented visual limits are recorded in [the verification report](../operations/random-encounters-verification.md).

## Publication follow-up

The user subsequently authorized commit/push and a latest-update README GIF. A fresh real OMP capture replaces the opening README GIF; capture provenance and the publication scope are recorded in the verification report. No local source videos, social packs or signing keys belong in this commit.
