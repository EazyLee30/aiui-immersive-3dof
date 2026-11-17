# Sound, recording and presentation

For live playback stalls, worker DSP, PCM buffering or native audio continuity measurements, use [Native performance](native-performance.md). This document covers capture and presentation; an offline sound check cannot validate a device's live audio path.

## Choose and label the evidence source

| Output | What it proves |
| --- | --- |
| Device capture with verified audio | What that device rendered/captured during that run |
| Desktop native-runtime preview | Preview-host behavior, not physical gesture/optical comfort |
| Deterministic production-renderer film | Reproducible visuals and script actions, not device FPS |
| Concept/color teaser | Intended art direction, not hardware capability or release availability |

Do not rename an offline render “device recording.” Avoid smoothing or cropping away failures in claimed device evidence.

## Actual capture

Check supported capture and codec APIs on the target. ADB `screenrecord` cannot be assumed to include system audio; inspect the resulting streams. An authorized device capture can begin with:

```sh
adb -s DEVICE_SERIAL shell screenrecord --time-limit 30 /sdcard/scene-demo.mp4
adb -s DEVICE_SERIAL pull /sdcard/scene-demo.mp4 output/device-demo.mp4
node scripts/inspect_media.mjs output/device-demo.mp4 --require-audio
```

If audio is absent, choose an available supported system-audio capture path or render audio from the same app timeline and clearly label the composite. Native AIUI `MediaRecorder`/`getUserMedia` support and source selection must be verified against current media contracts; do not copy browser-only flags blindly. Keep microphone recording off unless needed and authorized. Mark the capture source and any alignment offset.

## A reproducible offline film

Use the production renderer, not a screenshot decorated with a fake cursor. Define one timeline with semantic actions, camera poses, state changes, chapter text, theme and duration. Freeze random decisions into the action log. Use the same state reducer as the app; verify confirmations against the renderer's actual hit result.

For a music app, use its production transport and instrument parameters. Either capture its real audio or adapt it to an offline audio engine. Advance audio time incrementally; a rendering engine called only at the end may not execute scheduled control changes correctly. Keep wall time and audio time separate during `suspend`/`resume`, and preserve silent intervals in the exported WAV. The reference project successfully used an isolated `web-audio-engine` context with virtual timers, a deterministic noise seed, and fixed oscillator/noise nodes; this is an example architecture, not a five-track requirement.

Export a frame clock such as `{time,audioTime,playing,phase,step,energy,bpm,volume}` from the actual audio run. Drive every visual frame from that clock. Resume/pause, clearing, auditioning while paused, tempo changes and volume changes must affect both outputs. If dwell starts when a menu closes, reflect that first-hit time; at 30 fps an 850 ms threshold fires on the first eligible frame, not an arbitrary later caption.

Use native font registration and actual renderer coordinates. Label simulated poses and future color previews. Move presentation titles outside the app image when clarity requires it; keep the app's entire viewport visible. Integer raster scaling preserves pixel design. Do not imply higher source detail just because the wrapper is 1280×960.

## Editorial coverage

For each scene, show a neutral forward view, meaningful left/right coverage, an upward environmental detail and a gentle look down to the interaction surface. Respect that scene's real coverage; a photo plane may support a smaller range than a complete room. Never pan into unrendered space to satisfy the word “360.”

Demonstrate real state transitions and their consequences. For a music toy: individual sounds, compose/play/pause, multiple pages, random/clear/undo, menu swipe isolation, recenter, tempo/volume, optional dwell/manual mode. Other apps should choose their own important functions. Use actual sound, with optional narration/captions when requested; a music bed must not mask the function being demonstrated.

## Encode and inspect

```sh
ffmpeg -i visual.mp4 -i audio.wav -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart final.mp4
node scripts/inspect_media.mjs final.mp4 --require-audio
```

Use explicit duration alignment, not `-shortest` to conceal a missing ending. Check both stream durations, H.264/yuv420p compatibility, resolution/fps, decoded AAC peaks, non-silent sound, pauses and action alignment. A constant master gain preserves demonstrated relative volume; aggressive normalization across sections may undo it. Inspect contact sheets and several actual decoded frames, especially menu, dwell and ending; listen to representative sections when a listening tool is available. Do not claim listening based only on waveform statistics.

Keep a reproducible timeline, original WAV, visual master, mux command, file hash and verification JSON. Do not upload build intermediates unless requested. Future-color text must clearly state it is a preview; it cannot claim a release date or automatic future publication without evidence and authorization.
