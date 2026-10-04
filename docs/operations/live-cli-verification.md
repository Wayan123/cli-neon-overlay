# English copy and direct live CLI verification

Date: 2026-10-04. Product version: 1.2.1. Environment: Linux/WSL, Node.js 22.22.1, tmux 3.2a. The runtime scenarios below launched actual interactive programs in PTYs; they did not use a recording or simulated harness. The current README and social recording provenance is documented separately under “Current supplied recording: replacement source.”

## Historical live-first revision

- The README starts with commands that load the native extension into OMP/Pi, then presents the live standalone renderer and real companion-pane launches.
- Removed the README's GIF/MP4 promotion. Earlier recordings and original terminal logs remain historical evidence, not the current demo. Historical logs are not rewritten to change their language or output.
- Current CLI strings, project narrative and active local social copy are English. The original spider-only verification narrative was translated while retaining its historical versions, counts and findings.
- The active local posting kit contains English captions, a guide and untimed live-demo talking points under `docs/media/social/`. Its ZIP contains only those three Markdown files. It does not contain composed footage, covers or subtitles.
- Previous Indonesian social exports are preserved locally under `.cache/legacy-social/assets/`; their renderer is `.cache/legacy-social/render-social.py`. They are not active posting assets and are not included in the new ZIP or product delivery.

## Native OMP/Pi: actual CLI commands

Launched OMP 18.6.0 and Pi 1.0.0 at 140×40 with:

```bash
omp --no-extensions --no-tools --no-skills --no-session -e ./extensions/omp.ts
pi --no-extensions --no-tools --no-skills --no-session -e ./extensions/pi.ts --offline
```

The extra flags isolate extension discovery and avoid tools/session persistence during verification; no global installation or configuration change was needed.

Entered `/neon demo spider`, `/neon demo cat`, `/neon demo fox` and `/neon demo jellyfish` inside each actual CLI. Every species appeared as native Braille cells. Cat changed between captured live frames, and the demo acknowledgment was English.

Then exercised `/neon on`, `/neon theme sunset`, `/neon motion slow`, `/neon ascii`, `/neon braille`, `/neon status` and `/neon off`:

- Style selections appeared in the English acknowledgment; ASCII removed Braille output and Braille restored it.
- Typed an unsent draft, observed the native overlay hide while the draft remained in the editor, removed the draft without submitting it, and observed animation recover.
- Resized 140×40 to 38×14: the overlay hid. Restored 140×40: it appeared again.
- Status reported the selected configuration and `paused (typing)` at command time. That notification is a point-in-time diagnostic, not a later-frame running-state indicator.
- Off removed the native cells. Pi exited 0; the owned OMP verification process was terminated with SIGTERM (143). A natural OMP quit and native termios restoration were not asserted in this run.

No model prompt was submitted. These checks exercise extension commands and rendering, not a model-inference workflow or new agent-activity injection.

## Standalone: documented npm command

Ran `npm run demo -- --animal cat` in a 120×36 PTY. Observed the English `Live standalone preview` footer and changing live Cat frames. Keyboard `n` displayed Fox, Jellyfish and Spider. Keys `t/s/m/l/a` selected sunset, large, still, left and ASCII; the complete still frame remained unchanged across time.

Resized to 30×12 and observed the English minimum-size message, then restored 120×36 and the live controls. Pressed q: exit 0 and terminal attributes exactly matched their initial state. This is actual standalone execution, not evidence of a native coding-harness integration.

## Companion panes: actual harness startup

| Harness | Exercised version | Observed surface and controls |
| --- | --- | --- |
| Codex CLI | 0.159.1 | Actual startup screen beside changing Cat frames; animal keyboard control changed Cat to Fox without changing the host screen |
| Claude Code | 2.1.63 | Actual startup screen beside changing Cat frames; independent animal control and preserved host screen |
| OpenCode | 1.15.3 | Actual welcome/editor surface; live Cat/Fox, independent focus, resize and post-fix teardown |
| Gemini CLI | 0.43.0 at launch | Actual folder-trust dialog left unanswered; changing Cat frames, Fox selection, host focus and resize |

Codex, Claude and OpenCode were run again after the cleanup fix through `node scripts/companion.mjs --animal cat -- <actual CLI>`. Verification used disposable HOME/XDG/TMPDIR locations without provider credentials. Codex used `--no-alt-screen`; OpenCode used `--pure` with a disposable project and inline `autoupdate: false`. The [OpenCode configuration documentation](https://opencode.ai/docs/config/) documents inline configuration and the update setting.

For each post-fix run: host focus was initially active; Ctrl+B/Right then n changed Cat to Fox; the host screen stayed unchanged; Ctrl+B/Left restored host focus. Resize to 160×44 preserved the live controls. Ctrl+B/d exited the launcher 0, restored the original terminal attributes, removed its socket directory and left no running process in the recorded owned host session. Zombies were treated as terminated, not running processes.

The Gemini startup run also exercised focus/species control, preserved the trust dialog, and resized 140×40 to 160×44. Two Ctrl+C presses ended that launcher 0; terminal attributes restored, its socket directory disappeared and recorded host processes were absent.

Aider was not installed and was not exercised. Individual other CLI versions, authenticated model work, macOS, native Windows and other terminal backends remain unverified. No trust/setup/login decision or model request was submitted.

## Cleanup defect discovered by real OpenCode execution

The initial OpenCode detach removed the tmux socket and restored the terminal but left its waiting shell and OpenCode running in the shell's process group. OpenCode survived a targeted SIGTERM. The verification worker removed only its recorded survivor with SIGKILL; no unrelated session was targeted.

Root cause: the waiting POSIX shell preserves signal exit statuses, but its trapped hangup plus a hangup-resistant harness meant `tmux kill-server` alone did not guarantee process termination.

`close()` now queries the private live pane for its current PID and dead state before teardown. Only that live pane establishes ownership of the host process group. It sends SIGTERM, shuts down its private tmux server, then SIGKILLs any remaining owned group before removing its directory. It does not signal a cached PID after a missing server or dead pane. Processes that deliberately start independent sessions are outside that live process-group boundary.

A permanent real-tmux regression runs a harness that ignores SIGHUP and SIGTERM. It failed before the fix because the harness remained running; it passed afterward. An actual OpenCode rerun also verified that the owned host session had no running process after detach. Detach is therefore a forced end, not a background-work feature: save or finish work first, or exit the harness normally.

## Unexpected Gemini auto-update

During the first live Gemini startup, the CLI printed an update-success message. Its version before launch was 0.43.0; the installed command afterward reported 0.62.0. The running startup process was still the original 0.43.0 launch. Inspection traced the installed CLI's automatic startup updater to a detached update shell when `general.enableAutoUpdate` was enabled.

No manual install/update command was issued. Disposable HOME/XDG locations did not stop that updater from replacing the installed command. No rollback was attempted, and Gemini 0.62.0 was not launched for this verification. This is an observed third-party startup side effect, not an update feature of the overlay. Check your chosen CLI's own update policy before a demo; do not assume isolation of settings also isolates its installed executable.

## Verification commands

`npm test`: 24/24 passed, 0 failures, 0 skips. `node --check` exited 0 for `scripts/demo.mjs`, `src/companion.mjs` and `scripts/companion.mjs`. Both npm help commands printed English usage. Live proof above comes from actual CLI execution, not tests alone.

Observed checks and boundaries are also recorded in [`artifacts/live-cli-smoke.json`](../../artifacts/live-cli-smoke.json). No language server was available for the `.mjs` reference check; no LSP verification is claimed.

The local social kit remains excluded from Git delivery. No social login, upload, posting, public stream or external clip submission was performed.

## Current supplied recording: replacement source

The user replaced `assets/video-example.mp4` to avoid the first recording's visible server-launch line. Every current derivative of that recording has been regenerated: the inline README GIF, public silent MP4 and poster, all five local social videos and covers, the local source manifest and posting ZIP. The older standalone demo and species-reference images do not derive from either supplied recording and remain unchanged.

Current source: H.264, 1486×754, 30 fps, 368 video frames, approximately 12.27 seconds, with an AAC audio track. SHA-256: `bbda61e016c90b8dd38865a3cb50cb3632b9be10e234b100fbda04bd280044da`. The source stays local and is not modified by conversion.

The new screen shows the spider over actual CLI content during a system-health check. It still contains mixed-language project text, local paths, a machine name and diagnostic output. The first server-launch screen is not the current demo; this replacement is not a claim that the new recording contains no identifying information. It does not establish runtime versions, other species/harnesses or completion of a coding task, and it is not a new execution of the runtime checks above.

`docs/media/live-cli-demo.mp4` is a silent remux of the new source video with faststart, without scaling, cropping or video re-encoding. `docs/media/live-cli-poster.png` is its complete frame at 4 seconds. These files were replaced as well, rather than leaving the first recording accessible through current MP4/poster paths.

The README embeds `docs/media/live-cli-demo.gif` directly as a Markdown image. It retains all 368 frames at 1486×754, with a 256-color palette and infinite looping (`loop=0`). Its 30/40 ms frame delays total 12.26 seconds; GIF timing is quantized to centiseconds. File size: 12,168,822 bytes. SHA-256: `3c2d377c0746e238b1a19faf6cecdc4d70fdc24c0b418c69cdbe4f0cb4db87a6`. Full-resolution text and every frame are retained at the cost of a larger download.

GIF conversion command:

```bash
ffmpeg -hide_banner -loglevel error -y -i assets/video-example.mp4 \
  -filter_complex_threads 1 \
  -filter_complex "[0:v]setpts=PTS-STARTPTS,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -an -vsync 0 -loop 0 docs/media/live-cli-demo.gif
```

The five social exports fit and pad the entire new CLI frame, retain 368 frames at 30 fps and omit audio. Matching covers are extracted at 4 seconds. English captions and talking points describe this system-health session, not the first recording's model-timeout screen. Portrait exports make the wide terminal text smaller than landscape. Assets and their measured manifest remain under ignored `docs/media/social/`; no social login, upload or posting was performed.

The original first recording's derivatives have been overwritten in the current checkout and posting ZIP. Earlier Git commits still contain the first public GIF, MP4 and poster. No force-push/history rewrite was authorized or performed. Archived standalone/composed media is unrelated to the supplied recordings and is not in the active posting pack.

`npm audit --omit=dev` was previously unavailable because this repository has no lockfile; `package.json` declares no dependencies. No dependency or runtime implementation changes are part of this media replacement.

Replacement media verification: FFmpeg fully decoded the new source, public MP4, GIF and five social MP4 exports with `-xerror`, without errors. All MP4s have 368 frames at 30 fps; every derivative omits audio. All 368 decoded public MP4 frame pixel hashes match the new source in order. Pillow decoded the 368-frame GIF and checked dimensions, timing and infinite-loop metadata; all six PNGs decoded successfully. A Chromium smoke showed the new 1486×754 GIF animating automatically with three changing screenshots. The source SHA-256 remained unchanged.

The final local ZIP passed CRC verification with exactly 14 members, each byte-matching its current file, including the updated manifest and English documents. All relative README/provenance links resolved. No first-recording derivative is included in the current posting pack.
