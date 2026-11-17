# Application framework

The starter is a minimum scene: one portal, one pad, one menu. A delivered app also needs state, durable
saves, a scene pipeline, an audio owner and a frame budget. This page gives that shell as module boundaries
with explicit ownership, so a new project starts from a shape instead of inventing one.

Read [Spatial design](spatial-design.md) for geometry and [Input and lifecycle](input-lifecycle.md) for gesture
semantics; this page is about how the whole application is assembled.

## The shell

One page, one canvas, one loop, one audio owner. Every other module is a pure function or an object the page
owns. If two modules each own a timer, a decoder or a player, the lifecycle will leak.

```
sensor ──► pose ──► view matrix A,b ──► renderer ──► {targets, hit, angles}
                                            │                        │
                                            ▼                        ▼
                                       canvas flush          gaze / keys
                                                                     │
                                                              action ──► edit(state)
                                                                     │        │
                                                        audio.sync ◄─┘        └─► store.save
```

## Layer map

| Module | Owns | Must not |
| --- | --- | --- |
| `pages/index/index.ink` | Lifecycle, sensor start/stop, the loop, action → module routing, save flush | Geometry, draw calls, decoding |
| `lib/pose.js` | Quaternion normalize, absolute + gyro fusion, anchor, `device = A·sceneLocal + b` | Knowing about scenes or UI |
| `lib/render.js` | Decode/publish/release, projection, draw order, `{targets, hit, angles, faces}` | Input gestures, persistence |
| `lib/surface.js` | World geometry constants, projected polygons, batched draw | State mutation |
| `lib/gaze.js` | Candidate/focus/latch timer, point-in-polygon | Opening menus, saving |
| `lib/state.js` | Pure `edit(state, action) → changedField`, menu item list, save shape | I/O, timers, sensors |
| `lib/store.js` | Debounced durable writes, validation, checksum, flush | Rendering, audio |
| `lib/audio.js` | Transport: pattern/tempo/volume, priming, metrics, the single player | Canvas, state ownership |
| `lib/audio-worker.js` + `workers/*.js` | DSP only, PCM blocks out | Native audio objects, DOM, canvas |
| `assets/scenes/*.js` | Asset descriptors (lazy `load()` → Blob/bitmap) | Base64 payloads, code |

An imported scene module is data plus loaders. If a scene module starts importing renderer internals, the
directory is a second application and will drift.

## One frame

```text
tick(now):
  if !visible || dead || !ctx || !settled: return          # settled = restore done, not a blank freeze
  pose → A,b                (manual mode substitutes a fixed A)
  {targets, hit} = render(ctx, state, audio, A, now)       # one draw, one hit test, same vertices
  if menu:        reset gaze targets (renderer already returned none)
  elif fresh(now): updateGaze(hit) → maybe action
  else:           reset gaze
  action → activate(): edit → audio.sync(changed) → store.save() when durable
  every 10 s: log one perf line (fps, draw ms, max gap, late frames, decoded MiB, underruns)
```

Cadence is `setTimeout(max(1, 33 - elapsed))`, not `requestAnimationFrame`, and never one timer per module.
Reference values: 480×352, focal 1000 (≈27° horizontal), 33 ms tick, 400 ms pose freshness, 100 ms focus
stability, 850 ms dwell, 650 ms long hold.

## Contracts

### 1. Lifecycle and ownership

`onLoad` builds state, pose, store and transport; `onReady` may only create the canvas context and start the
loop; `onShow` starts sensors and rebuilds the renderer; `onHide`/`onUnload` set `visible`/`dead`, cancel the
frame and hold timers, stop sensors, stop audio, flush the save, then release bitmaps.

Every asynchronous resume (decode, worker reply, save, restore) re-checks `dead`, `visible` and its own epoch
before touching state. A page that hides during a scene load must not publish it later.

### 2. Sensor input degrades visibly

Absolute orientation first, gyroscope as a gap filler with unit inference and a plausibility cap on `dt`.
If no reading arrives within ~1.8 s, enter a manual/keys mode and say so in the HUD. Never fabricate a pose,
never keep an anchor after a sensor restart, and refuse recenter on a stale sample.

### 3. Scene pipeline

- one native decode in flight; yield to the event loop between decodes so audio feeding keeps its deadline
- publish background + neutral pose first, then fill the remaining poses; no low-resolution fallback
- an epoch token cancels superseded loads; a failed load keeps the last published frame visible
- a fixed, package-derived image pool (reference: 41 images) beats evict-and-redecode; cap it and throw if a
  new source is not in the set
- `hide`/`unload`/scene handover close bitmaps and clear the pool; report `decodedBytes` as an RGBA estimate,
  never as measured native memory

### 4. Draw and hit share vertices

Hit-test the same projected polygon that was drawn, in screen space, at the reticle. A ray-plane test is
acceptable only when it provably selects the same surface the user sees. Decide near-plane behavior once:
clip deliberately or reject the whole quad — never let invisible geometry win a hit.

### 5. Mode owns input

A frame-locked menu returns zero gaze targets and the loop skips gaze updates; scroll and index change only on
synthetic swipe actions. Mode changes reset candidate, focus, latch and progress. Consume the release that
follows a long hold, and deduplicate host repeats without merging distinct swipes.

### 6. Audio has one owner

The page constructs one player; the worker returns raw PCM (reference: 44.1 kHz mono s16) and never touches
audio APIs. Feed on a bounded pool of preallocated blocks, submit ~200 ms per RPC, and require an actual
prefill (reference: 600 ms) before `play()`. Native `currentTime` arrives in coarse IPC batches: use it as the
authority for ownership and stall detection, interpolate for visuals, and predict for feeding with a ceiling
(reference: 300 ms). Pattern, tempo and volume edits apply to unscheduled audio only.

### 7. Persistence

A small explicit schema, validated on load and on save; checksum plus generation; two slots so an interrupted
write leaves the previous commit intact; debounce ~350 ms with a ~900 ms ceiling; `flush()` before exit and
refuse to exit silently if the flush failed. Restore before the first real frame and draw a loading frame
instead of a black scene.

## Directory skeleton

```
project/
  agent.json            name, description, launch wording, native/ink version floor
  app.json              pages, agentWorkers, fonts, permissions
  pages/index/index.ink single entry, orchestration only
  lib/{pose,render,surface,gaze,state,store,audio,audio-worker}.js
  workers/{dsp}.js      DSP only
  assets/scenes/*.js    asset descriptors, no inline Base64
  assets/fonts/         licensed pixel font + OFL text
  tests/                geometry, gaze, input, lifecycle, storage
  scripts/check.mjs     syntax, imports, single entry, SFC config
```

## Boot checklist

1. Fix the coordinate convention, viewport, focal and content coverage; record them.
2. Land the skeleton above with a placeholder scene before any art.
3. Make one frame draw and hit-test correctly under yaw, pitch and roll.
4. Add gaze + input adapter, then prove menu invariance under head motion.
5. Add the store; prove restore-before-frame, then exit and reopen.
6. Add audio with priming and underrun metrics; prove scene changes do not reorder music.
7. Only then decode real scenes, one image at a time, and measure peak decoded bytes.
8. Run the portable checks, then the official CLI, then device verification — in separate reports.

## Failure map

| Symptom | First suspect | Read |
| --- | --- | --- |
| Scene jumps when the head tilts | Relative orientation built from `base⁻¹·current`, or pitch baked into the anchor | [Spatial design](spatial-design.md) |
| Menu selection moves with the head | Renderer still returns world targets, or the loop still runs gaze | [Input and lifecycle](input-lifecycle.md) |
| Tap confirms right after long hold | Release not consumed, duplicate not filtered | [Input and lifecycle](input-lifecycle.md) |
| Dwell fires while staring at nothing | Stale sample accepted, or `dt` spike counted as continuous gaze | This page, §2; [Field notes](field-notes.md) |
| Audio stutters during a scene change | Decode and PCM feeding share one deadline; no prefill handshake | [Native performance](native-performance.md) |
| Memory climbs across scene swaps | Reuse pool not capped, or `close()` never reached | [Native performance](native-performance.md) |
| Save lost after exit | Write acknowledged before close+readback, or no flush on exit | This page, §7 |
| Restored state shows a black first frame | Render loop started before restore settled | This page, §7 |

## What this framework does not give you

It does not choose real-time meshes over baked layers, does not certify frame rate or memory, does not prove
temple gesture mapping on a given firmware, and does not make a store release. Those are measurement and
authorization steps, recorded separately.
