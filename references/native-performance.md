# Native memory, scene switching and audio continuity

Use this route when repeated scene changes grow memory, tempo edits stall the page, or sound breaks during rendering. It records a tested Canvas/PCM approach on a Glasses 2 host with Ink 0.21.0 in November 2026. The architecture is conditional on measured target behavior; the numbers below are an example, not a firmware contract or mandatory music engine.

Contents: establish evidence → bounded rendering → continuous audio → lifecycle → USB acceptance → measured case.

## Establish a comparable baseline

Preserve the requested scene coverage, resolution/alpha, character reactions, musical voices, controls and persistence. Optimize redundant work first. Reducing texture resolution, dropping scenes/animation or lowering sample rate changes the experience and must be an explicit decision, not a hidden performance fix.

Verify the source revision and the package **actually executing** on the glasses. A successful Studio upload, phone resource update or ADB open request alone does not prove a cached host loaded the candidate. Log a build marker and runtime capabilities. Keep source, cloud-debug and store versions separate. If testing locally, reuse the authorized development identity and confirm the installed package hash; do not repeatedly install differently identified agents with the same spoken name. Read [Device verification](device-verification.md) before installation.

Measure these independently, with units, timestamps and scope:

| Measurement | What it establishes |
| --- | --- |
| AIX bytes and compressed assets | Distribution size; not resident memory |
| `width × height × 4`, image count, decode count | Estimated RGBA ownership and repeated decoding; excludes native caches/copies |
| Native Heap Alloc / RSS / PSS | Different native/process measurements; never label whole AIUI host PSS app-exclusive |
| FPS, draw time, scene decode/load time | Rendering and loading costs; time awaiting audio prefill is a separate cost |
| Player/track identity, native underrun-frame delta | Whether that native track received continuous data during the sampled interval |
| Queue duration and edit-to-audible latency | Responsiveness cost of prebuffering |
| Checkpoint checksum and actual cold restore | Persistence survived; a mock store or successful write alone is insufficient |

Use a matched workload and comparable cold/warm conditions. A lighter silent prototype is not a valid final-product percentage-reduction baseline. A bounded sawtooth PSS curve is not a flat plateau; a seven-minute test does not establish hour-long stability. Missing/failed samples remain missing, not zero. The optional [performance record](../assets/templates/performance-evidence.json) keeps these distinctions explicit.

## Bound decoded image ownership

1. Package native asset blobs/paths plus small metadata where supported. Avoid embedding PNG Base64 in executable JS and rebuilding it byte by byte; that adds string, source-parsing and buffer copies without reducing decoded pixels. Compare asset bytes or decoded pixels when changing packaging.
2. Count unique packaged images and their decoded budget before selecting a cache policy. On a small finite scene set that fits measured headroom, lazy decode-once reuse can avoid accumulating native objects when `ImageBitmap.close()` is unavailable. Cache by stable asset identity; enforce the finite allow-list and count/byte ceiling. Never turn this into an unlimited URL cache or indiscriminate preload.
3. If the set does not fit, select eviction/streaming from **verified** host disposal behavior, or redesign loading granularity. Recreating a supposedly released bitmap on every scene change can increase native memory despite a small JS live-object count. Inspect `close` availability and attempt/success/error counts; JS reference release and native reclamation are separate observations.
4. Serialize cold decodes and yield around expensive native work. Show the background and neutral pose first, then finish the remaining actions. Cache hits do no native work: return immediately rather than adding one timer round-trip for every cached pose.
5. Use a generation token and latest-request ownership for asynchronous scenes. Dispose late unowned results; do not close a bitmap still owned by the shared pool. A failed or canceled load must not replace the current scene or leave input targeting the wrong geometry.
6. On actual teardown, cancel pending loads, release shared ownership once, clear maps/failure caches and stop further publication. Distinguish hide/show policy from permanent destruction, and test repeated reopening.

One host lacked useful bitmap `close` support. A bounded pool of 41 images held 58.57 MiB estimated RGBA and stopped repeated decode growth. An earlier active-only estimate near 20 MiB looked smaller but did not prove lower native residency. Choose from native evidence, not the smaller bookkeeping number.

Canvas `reset()` followed by a full repaint can help release retained draw state on some hosts; capability-check it and restore all drawing styles/transforms after reset. It is not a portable garbage collector. A large drop coinciding with Skia/SurfaceTexture recreation must not be attributed solely to JS `destroy()` or used to justify periodic disruptive surface/context resets.

## Reduce rendering work without changing geometry

Precompute immutable world-space vertices and topology. Project each shared vertex once per frame into reusable scratch storage; cache against the complete pose/calibration/viewport inputs, not a stale head angle. Derive hit targets from that same projection. Keep semantic target IDs and depth ordering intact.

Cull only when the geometry is provably outside the viewport and near-plane rules permit it, allowing for text, icon and stroke extents outside the mesh bounds. A partially visible pad, near-plane crossing, clipped edge or rolled target must still render and hit correctly. Do not turn a horizontal world surface into a flat screen overlay to save projection cost.

Before accepting the optimization, compare rendered pixels **and hit results** over neutral, pitched, yawed, rolled, recentered and near-edge poses, plus menu states and all scenes. Exact pixel comparison fits a mathematically equivalent rewrite; otherwise document a meaningful visual tolerance. Source-code pattern tests do not establish fidelity. Do not build a new exhaustive suite for a trivial unrelated edit.

## Keep audio continuous across scene and tempo edits

### Choose the simplest verified audio path

A bounded persistent Web Audio graph may be sufficient on a host that schedules independently of page stalls and reclaims its nodes. Avoid creating sources/automation timelines indefinitely. Change tempo/pattern state without rebuilding contexts or the whole graph, and test cancellation as well as node counts.

If native evidence still shows growth or stalls, worker-generated PCM is one tested alternative. It adds worker memory and buffering latency, so benchmark the **complete** product before declaring it better. Keep all intended voices, envelopes, sample rate and volume behavior; verify output rather than assuming an engine rewrite sounds identical.

### Separate synthesis from the native player

In the tested architecture, a foreground worker performed pure DSP with fixed WASM memory, while the Page owned one `AudioPlayer` in the supported host context. A worker's lack of native audio support was not solved by importing browser audio APIs into it. Inspect installed target types/examples for Worker, PCM format and player lifecycle; do not assume a web browser's `AudioWorklet`, transferable buffers or a worker audio module exists.

Bound every queue: DSP events/voices, in-flight RPCs, pending auditions, completed blocks and native output buffers. Batch useful PCM work per message rather than sending one message per sample/note. Validate block ID, frame start, frame count, byte length and order before append. Copy or transfer using actual runtime semantics; do not retain an unbounded backlog of completed buffers. Report errors and stop safely on capacity or protocol failure instead of silently corrupting sound.

The measured example used 44.1 kHz mono s16, at most 200ms per block, at most four in-flight RPCs, an eight-slot output pool of 141,184 bytes and fixed WASM memory of 786,432 bytes. These are **tunable implementation choices**; derive capacity from format, scheduling delays and the maximum queue lifetime for the next product.

### Distinguish playback, feeding and visual clocks

- **Confirmed native playback time** owns buffer recycling and stall evidence. Do not overwrite a buffer merely because a predicted clock says it has played; include a measured safety margin if the host retains append memory.
- **Bounded feed prediction** may compensate for coarse native clock IPC so the queue stays supplied. Clamp its lead and keep checking actual progress. It must not conceal a stalled player indefinitely.
- **Visual interpolation** smooths animation between native time reports; clamp to submitted audio and reset on pause/stop. It is not measured playback time and cannot prove audio continuity.

Use a monotonic clock such as the target's supported `performance.now()` for elapsed work and scheduling. Measure clock-call cost when profiling reveals it matters; wall clock changes and excessive native clock reads can distort a hot loop. Retain raw/native observations in diagnostics.

### Prefill actual bytes, then start or load

`onCanplay` may fire after the first small block, before the native track's startup buffer is filled. Start only when both player readiness and the required amount of **actually appended** PCM are satisfied. Planning a future block or returning from a fire-and-forget `prime()` is not prefill.

Use low/high watermarks to refill in batches, bounded by available output slots and worker capacity. The reference candidate used a 400→600ms target with up to 300ms feed prediction; this handled roughly 240–360ms native clock-report batches on that host. Choose the smallest buffer that passes representative native load tests. Record queued duration and audible edit latency; more buffering does not preserve instant controls.

Before an expensive scene change, await a fixed prefill target, then check that the request is still latest and the page/player still alive. Do not chase a moving target forever. A canceled prime resolves unsuccessfully; it must not continue the scene mutation. Keep the music engine alive across scene, tempo and pattern edits. Already-submitted PCM is immutable: edits affect future blocks; pause/stop, audition and volume need deliberate semantics and tests.

### Lifecycle and persistence must remain correct

On hide/exit: invalidate generation, cancel drawing/sensors/hold timers and outstanding prime waiters, reject/drop stale worker responses, stop/destroy the player once, drain/close worker ownership and prevent post-exit append. If teardown is asynchronous, wait for the previous engine to close before preparing its replacement. Returning to a conversation card does not prove the Page was unloaded; handle hide/show as well as unload. Verify reopening creates one active engine, not another engine beside the old one.

Restore saved state before the first heavy scene decode so the saved scene does not cause loading a default scene and immediately discarding it. Coalesce frequent save writes but retain a bounded checkpoint interval and exit flush. Use the actual supported persistence API; optimization cannot silently replace persistent saves with session-only state. Keep the user's latest pre-test pattern and settings intact.

## USB acceptance and clean handover

Use the explicitly selected USB serial for commands; do not silently fall back to Wi-Fi ADB. Determine the running host PID dynamically. Capture a bounded log interval and store raw host logs only in project-local evidence, since they can contain unrelated personal data.

For a host that exposes these counters, inspect supported output before writing a parser:

```sh
adb -s DEVICE_SERIAL shell pidof HOST_PACKAGE
adb -s DEVICE_SERIAL shell dumpsys meminfo HOST_PACKAGE
adb -s DEVICE_SERIAL shell dumpsys media.audio_flinger
```

Associate audio measurements with the target PID/track; system-wide totals can include other sound. Record successful/failed sample counts, starting/ending track IDs, underrun **deltas** and native frames consumed versus monotonic elapsed time. Compare adjacent successful observations of the same track; mark resets or gaps uncertain rather than subtracting across them. Inspect counter bases/units: this host displayed Server frame positions in hexadecimal, and underruns in frames, not audible dropout events or exact silence duration. A track reset must not masquerade as a reset-to-zero success. Application scheduling counters alone can say zero while the native sink underruns.

Heavy `dumpsys meminfo`/heap sampling can perturb playback. Prefer a supported light process/PSS sample during stress, and collect detailed heap data at boundaries or after stopping. Keep collector overhead and cadence visible; missing native-heap data during playback is not a measured zero. A complete reconnect/reboot test also needs a fresh boot/PID marker, not an old `boot_completed` property.

An effective workload includes:

- Snapshot the **current** user save, stop gaze/dwell from mutating the test, warm all scenes, then repeat every scene several times.
- Change tempo/pattern during playback; include the product's densest intended musical load and a sustained playback interval. Confirm character reactions and controls remain available.
- Watch native memory, decode count, worker/player/track count, frame cost, queue duration and sink underruns together. Separate cold decode time, cache-hit time and prefill wait.
- Exercise cancel/rapid switch, background/foreground and stop/reopen, then restore the captured user state and verify an actual restart checksum.
- Remove benchmark injection. Install/launch a clean package on the same authorized identity, verify hash/version and restored state, and repeat ordinary interaction/playback. Restore any temporary device setting and check it; network/Bluetooth disconnects can close the host page and confound a run.

Do not change connectivity merely to obtain cleaner numbers. If a user-authorized diagnostic changes it, record the condition and restore it before handover. Do not clear all host storage/logs or overwrite a newer user save with an old fixture.

Native continuous feeding establishes only the observed sink behavior. Speaker quality, audible glitches and end-to-end editing latency need acoustic capture or appropriate wearer feedback. A head-moved screenshot says little about frame continuity. After an authorized cloud update, download the generated package and compare application bytes against the tested local candidate; see [AIUI release](aiui-release.md).

## Do not promote intermediate experiments to solutions

- Periodic audio-context/graph rotation and bounded JS node counts did not establish native memory or playback stability. Reconstructing the graph during playback also introduced gaps.
- Main-thread JS PCM, WASM alone, more buffer alone and moving DSP alone each failed some native workloads. Accept the integrated final candidate only after replaying the complete workload.
- Tiny top-ups on every predicted tick recreated frequent IPC. Batching plus low/high watermarks mattered; message throttling or buffer-copy overhead was not proven to be a firmware defect.
- Disabling Canvas did not eliminate all audio degradation. A heavy memory sample coinciding with an underrun is correlation, not a complete root-cause diagnosis.
- Texture trimming was estimated but not shipped in this case. Changing cropped four-corner affine mapping can alter the image; do not describe an estimate as implemented lossless optimization.

## Measured case, not a performance promise

The full source application was tested for 420.444 seconds: six rounds of four scenes (24 switches), ten tempo edits, 170 BPM with all 80 cells enabled for 20 seconds, then sustained playback checkpoints. All four scenes, five musical tracks, original image pixels and character reactions remained present.

| Observation | Result and limit |
| --- | --- |
| Warm AIUI host PSS | 265.9–305.8 MiB; repeated sawtooth recovery, not app-exclusive or constant |
| Decode reuse | Fixed 41 images / 41 decodes; tracked RGBA 58.57 MiB |
| Warm scene load | 0–1ms in rounds 2–6; separate prefill wait up to 100.3ms |
| Render rate | 22.9–30.0 FPS, median 26.5; not sustained 30 FPS |
| Native sound | 421 successful polls, one track, zero added underrun frames; no acoustic recording |
| Native progression | Consumed audio duration / monotonic wall duration ≈ 0.999975 |
| Queue/edit tradeoff | Target about 600ms; raw-clock queue max 770ms, edit-latency diagnostic about 755ms |
| Fidelity and handover | 1,418 pad frames/hits and 120 scene frames compared; clean reopen restored saved state and a separate 35s playback added zero sink underruns |

Temporary Bluetooth isolation was part of the long run after phone disconnects repeatedly closed the host page; Bluetooth was restored and ordinary playback rechecked. This condition belongs with the results. An earlier 17.85% reduction from a different silent/failed-audio comparison is **not** a valid final-package improvement claim.

These sanitized observations inform the workflow. No raw device logs, serial, account/agent identity, user save payload or source-project art belongs in the reusable skill. The generic starter does not acquire this engine or these measured results merely by including the reference.
