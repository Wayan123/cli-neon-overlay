# English copy and direct live CLI verification

Date: 2026-10-04. Product version: 1.2.1. Environment: Linux/WSL, Node.js 22.22.1, tmux 3.2a. All scenarios below launched actual interactive programs in PTYs. No video file, video player, composed terminal, or simulated harness supplied the demo.

## Revision

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

## Supplied real CLI recording: demo correction

The revised primary README demo comes from the user-supplied `assets/video-example.mp4`, not the standalone renderer or the earlier reconstructed terminal captures. The source is H.264, 1480×762, 30 fps, with a container duration of 11.52 seconds and an AAC audio track. SHA-256: `cae3b0be063b5875f9382ad406b0774632ade30bcd426af680bbf4b4e8561b25`.

The screen shows a spider animated over actual CLI session text. It includes mixed-language project text, local paths and a model-timeout message. It does not establish the runtime version, a completed model task, other species or other harness integrations. This supplied footage is not a new rerun of the runtime verification above.

`docs/media/live-cli-demo.mp4` is a silent remux of the original video stream with faststart: no scaling, cropping, reconstructed UI or video re-encoding. `docs/media/live-cli-poster.png` is the complete source frame at 4 seconds. The original supplied file remains local and unchanged; only the silent product demo and poster are intended for Git delivery.

The local social pack uses five proportional scale-and-pad exports, matching frame covers and English captions for the spider shown. Padding deliberately preserves the entire CLI; portrait text is smaller than landscape. The audio is omitted rather than publishing unreviewed sound. These assets and their measured provenance manifest stay under ignored `docs/media/social/`. Historical composed exports remain in ignored `.cache/legacy-social/` and are not promoted or included in the revised ZIP. No social login, upload or post was performed.

Media correction checks: FFmpeg decoded the public video and all five social exports with `-xerror`, without errors. Each contains 345 video frames at 30 fps and no audio; the padded exports run 11.50 seconds. All 345 public decoded frame pixel hashes match the source in order (the remux changes the initial timestamp offset). The six PNGs decoded successfully, relative README/provenance links resolved, and the ZIP passed CRC verification with exactly 14 current members. The source SHA-256 remained unchanged.

The existing suite passed 24/24 again for this media-only correction; no implementation files changed and no new live harness/model run is claimed. `npm audit --omit=dev` could not run because the repository has no lockfile. `package.json` declares no dependencies; no lockfile or dependency installation was added just to manufacture an audit result.

## Inline README GIF revision

The README now embeds `docs/media/live-cli-demo.gif` as a Markdown image, replacing its MP4 link and static poster. The earlier MP4 and poster remain historical product media; the social MP4 exports are unchanged.

The GIF comes directly from the same supplied `assets/video-example.mp4`. It preserves all 345 frames at 1480×762 without cropping or scaling, uses a 256-color palette and loops infinitely (`loop=0`). GIF timing is quantized to 30/40 ms frame delays: one loop is 11.51 seconds versus the source video stream's 11.50 seconds. File size: 6,461,384 bytes. SHA-256: `1195944ec8b11354544e3fb0c0fb49c71234397f8e56f37c649ffba1e72e6e49`.

Conversion command:

```bash
ffmpeg -hide_banner -loglevel error -y -i assets/video-example.mp4 \
  -filter_complex_threads 1 \
  -filter_complex "[0:v]setpts=PTS-STARTPTS,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle" \
  -an -vsync 0 -loop 0 docs/media/live-cli-demo.gif
```

Verification: Pillow decoded all 345 frames and checked dimensions, total delay and infinite-loop metadata. FFmpeg decoded the GIF with `-xerror` without errors. A Chromium smoke opened the GIF without clicking play and observed three changing screenshots; the full CLI remained visible. The source SHA-256 was unchanged. No runtime implementation changed; no new model/harness run is claimed.
