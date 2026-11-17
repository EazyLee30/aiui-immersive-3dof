---
name: aiui-immersive-3dof
description: Build, optimize and deliver immersive fixed-eye 3DoF experiences for Rokid AIUI, including spatial scenes, IMU and temple input, CJK pixel typography, native memory and audio profiling, synchronized demonstrations, and authorized Studio upload or store release. Use for immersive AIUI projects rather than ordinary flat widgets or positional 6DoF applications.
---

# AIUI Immersive 3DoF

Turn a spatial idea into an inspectable AIUI application, a truthful demonstration, and the requested release state. Carry forward the user's visual references, controls, target hardware, and existing authorization. The music toy that informed this skill is an example, not a mandatory theme or layout.

## Select only the needed route

| Work | Read |
| --- | --- |
| New project or runtime port | [Runtime contract](references/runtime-contract.md) |
| Fixed-eye scene, projection, recenter, horizontal surface | [Spatial design](references/spatial-design.md) |
| IMU, temple gestures, menu, cleanup | [Input and lifecycle](references/input-lifecycle.md) |
| Blender, atlases, pixel fonts, icons, mono/color appearance | [Art and typography](references/art-and-typography.md) |
| Actual recording or offline video with synchronized sound | [Audio and video](references/audio-and-video.md) |
| Memory growth, scene/tempo stalls, audio dropouts, USB stress tests | [Native performance](references/native-performance.md) |
| ADB, package checks, performance, acceptance | [Device verification](references/device-verification.md) |
| Studio creation, icon/material uploads, review, release | [AIUI release](references/aiui-release.md) |
| Interpret a failure or distinguish evidence levels | [Field notes](references/field-notes.md) |

## Establish the project contract

Inspect the existing project and prior decisions before changing it. Record the target device/host version, viewport, coordinate conventions, scene coverage, interaction map, font choice, and requested delivery state. Use local context before asking for missing information. Use an independent project directory for a new work; preserve existing source and version snapshots.

Choose the rendering method from actual target capabilities. A fixed-eye panorama plus transparent animation layers may be a good fit for limited Canvas hosts. Real-time 3D is appropriate when verified capabilities and the product's occlusion, lighting, or movement needs justify it. Do not label baked layers as real-time mesh rendering, positional tracking, or stereoscopic depth.

The bundled [starter](assets/starter) is a small **480×352 monochrome reference**, with a forward portal, horizontal pad, native CJK font and input adapter. It is not a universal device specification or a finished product. Instantiate without overwriting existing work:

```sh
python3 scripts/init_project.py /absolute/new-project --name "My Spatial Scene"
```

The initializer copies code and the OFL font; it does not install dependencies, access hardware, create a cloud agent, or publish anything. Update viewport, projection and host mappings together when the target changes.

## Preserve these spatial invariants

- Keep content in world coordinates and the reticle in screen coordinates. Render and hit-test the same projected geometry, including roll and perspective.
- Distinguish content's explorable angular coverage from the display's instantaneous field of view. Neither implies 360° coverage.
- When the user wants a desk beneath a forward scene, put the desk on a horizontal plane. Derive its pitch from height and distance; do not replace it with a screen-facing trapezoid.
- Calibrate only from a fresh valid pose. A full-pose recenter makes the current orientation virtual forward. A gravity-preserving recenter has different behavior; choose deliberately and state the tradeoff.
- Do not animate the camera to a beat. Put animation and feedback in the scene.

## Make input ownership explicit

In the default interaction design, head movement selects world targets, a single tap confirms, a double tap returns, a long hold opens the menu, and temple swipes select menu rows. Adapt this map when the user's target or request differs.

While a swipe-only menu is open, skip world gaze updates **and return no head-selectable menu targets**. Selection and scroll offset must both stay unchanged during head motion. Reset stale focus on mode changes. Consume long-hold release and duplicate host events so opening a menu cannot also confirm an item.

Read the actual host trace. One tested Glasses 2 host delivered a physical long hold via `onVoiceWakeup` with keyword `assistant`; that is an observed compatibility case, not a permanent firmware contract. ADB key injection alone cannot validate physical temple gestures.

## Build for the real image and sound path

Keep Blender sources, exported runtime assets and presentation media separate. Preserve the bake eye, projection/FOV, crop UVs, alpha, frame timing and color transform as data. Give decoded assets explicit ownership and a measured cache budget; dispose superseded/late results when they have no shared owner. Profile the actual device before adding per-frame clipping, transformations or allocations.

Register and package a licensed pixel font. Verify Simplified and Traditional Chinese glyph coverage, actual 12 px rendering, punctuation and truncation. Do not assume CSS registration changes Canvas text, or that a bitmap-looking font remains sharp at arbitrary scales.

Use actual audio time for music-driven animation. In an offline demo, execute one deterministic action timeline for both audio and visuals, including pauses, edits, randomness, tempo, volume and any dwell threshold. In a device recording, prove whether audio was captured; do not assume an MP4 contains it.

For store icons, inspect transparency on light and dark backgrounds. Remove unintended exterior black wedges without flattening alpha. If the task calls for bitmap generation/editing, use the available image-generation workflow and save the result in the project.

## Optimize without losing the experience

For performance work, read [Native performance](references/native-performance.md). Preserve scene coverage, art, sound and interaction unless the user authorizes a tradeoff. Separate compressed package bytes, estimated decoded RGBA, native allocations and whole-host PSS. A counter decrement or missing `close()` is not proof of native reclamation.

Prefer bounded ownership over repeated reconstruction: a measured finite image pool, reusable world geometry and scratch buffers, and an audio lifetime independent of scene/tempo edits. When the target needs worker-generated PCM, keep one native player in its supported host context, bound work/messages/buffers, and wait for actual prefill before playback or heavy scene work. Tune buffering with its control latency visible; do not treat the reference project's 600ms setting as a universal default.

Verify repeated scene cycles and edits with native memory and audio-track evidence, restore the latest user state, then test a clean package without benchmark injection. Reuse the authorized existing agent identity; local testing must not silently create another voice entry. Report the tested duration, memory range, frame range and audio evidence level instead of claiming zero leaks, constant FPS or audible perfection.

## Verify the requested result

Run the applicable static/package checks and focused behavioral checks, then inspect actual output. High-value checks include recenter identity, rolled hit targets, menu head-motion invariance, stale-pose rejection, no duplicate confirm, cleanup/reopen, scene alpha and coverage, sound presence, synchronization and decoded peak headroom.

Useful portable helpers:

```sh
node --test tests/*.test.mjs
node scripts/check_package.mjs
python3 scripts/asset_manifest.py /absolute/agent-source --output /absolute/evidence/assets.json
node scripts/inspect_media.mjs /absolute/demo.mp4 --require-audio
```

`tests/*.test.mjs` and `scripts/check_package.mjs` validate this skill repository and its starter, not the user's AIX. Run the target project's checks and official `aix check`/archive inspection separately; the asset-manifest helper accepts that project's source directory.

Use [evidence](assets/templates/evidence.json), [bake metadata](assets/templates/bake-contract.json) and [release record](assets/templates/release-record.json) when those artifacts help the task. Replace example fields with observations, not assumptions. Do not require a full ceremony for a small icon or copy edit.

## Deliver and release within scope

Use supported connectors/CLI first, or the available browser automation surface for Studio controls. Follow the current browser's upload and screenshot documentation. Complete local packaging and reviewable materials before any approval that is actually required. Do not ask again for actions already authorized.

Creating a draft, uploading files, submitting review, passing review, and being live are distinct states. Execute the state the user requested and verify it. An upload request does not imply store submission. A release request does not guarantee review approval. A future-device teaser does not create an automatic future publishing job.

Report source checks, simulation, device evidence, physical user feedback, and cloud state separately. Keep the final answer short: what changed, where it is, what was verified, and any material unfinished dependency. Include artifact links and required UI proof. Never transfer local account identifiers, device serials, private recordings or third-party project art into a reusable skill by default.
