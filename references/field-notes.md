# Field notes: observation versus reusable rule

The source project was a fixed-eye AIUI music toy built and tested in November 2026. These findings explain design choices; they are not warranties for later firmware or every immersive product.

| Observed failure or decision | Reusable lesson |
| --- | --- |
| Long-hold logic waited for an Enter hold, but real touch emitted wakeup keyword `assistant` | Trace the physical host path; keep gesture mappings adaptable |
| Head pitch changed menu selection/scroll | Make menu input ownership exclusive; skip gaze and omit head-selectable targets |
| Pitch-clamped recenter left the virtual scene offset on a bench-mounted device | Full-pose and gravity-preserving recenter are different contracts |
| A “desk” appeared as an inclined card | Model constant-height world geometry and derive downward viewing angle |
| Dense per-face clipping/transforms reduced native Canvas frame rate | Measure draw cost; a panorama approximation can be a justified target-specific fallback |
| Runtime notes accumulated too many audio sources | Bound voice/node lifetime; test cancellation and teardown under long runs |
| Offline audio and video used different notions of pause/dwell time | Share a deterministic action timeline and actual audio-derived frame clock |
| A pause/clear action looked correct but the MP4 had no audio stream | Verify encoded streams and audible content before uploading |
| Both sync and async storage returned `lock() not supported` | Test persistence on target; degrade honestly to session-only state |
| Moving-head screenshots looked tilted | Record pose context before “correcting” camera framing |
| Black pixels were baked outside a rounded store icon | Preserve alpha and inspect against the uploader's actual background |
| Saving icon metadata repacked cloud version from 1.0.1 to 1.0.2 | Track cloud/source/store versions separately and preserve prior archives |
| Historical README contradicted newer measured behavior | Date observations and identify superseded decisions |

## What this release actually verifies

This repository's starter and helpers have automated math/input/media checks and an official AIX static check recorded in the repository verification note. That does not establish wearer comfort, physical touch mapping or device performance for this new generic starter. The originating application supplied physical long-hold feedback, IMU logs and observed frame-rate samples; those do not transfer to a new build automatically.

The workflow includes store submission/publication instructions, but the originating agent was saved as a draft. Document this limit rather than describing unperformed publishing as accomplished.

## Sources and refresh points

- [AIUI docs](https://open.rokid.com/aiui): framework/API contracts; inspect current target types if docs are inaccessible.
- [AIUI Studio](https://aiui.rokid.com/): live package, upload and review state.
- [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font): font variants, provenance and OFL license.
- [FFmpeg documentation](https://ffmpeg.org/ffmpeg.html) and [ffprobe documentation](https://ffmpeg.org/ffprobe.html): installed encoding/inspection options.
- The installed official `@yodaos-pkg/aix-cli --help`: exact command signatures.

The reference numbers (viewport, focal length, coverage, dwell delay, node count, menu row count) are named examples. Tune them to the next product and validate the visible result.
