# Device verification

Record the actual device model, display mode, host/Ink version and connection method in project-local evidence. Do not hardcode a prior device serial into reusable scripts. If several devices are connected, select the intended target explicitly. Installation, launch, screen capture, input injection and logs prove different things.

## Before installation

Run the project's own focused checks, then official `aix check`. Inspect the packed archive with `aix list` and compare a source manifest. Ensure routes, font/OFL notice, scenes, icons and audio are present, and that preview dependencies, private logs and nested `.aix` caches are absent. Keep source version, cloud debugging version and public store version as separate fields.

Portable commands, after checking current CLI help:

```sh
adb devices -l
adb -s DEVICE_SERIAL shell getprop ro.product.model
aix check agent
aix pack agent --output output/app.aix
aix list output/app.aix
aix install agent --serial DEVICE_SERIAL
aix launch-page agent pages/index/index --serial DEVICE_SERIAL
adb -s DEVICE_SERIAL exec-out screencap -p > output/device.png
```

Avoid broad destructive log clearing. Capture relevant bounded logcat output, filtering by app tag and the trace interval; redact unrelated account details before sharing. Preserve a known-good package rather than uninstalling another app to make room.

## Acceptance matrix

| Check | Suitable evidence |
| --- | --- |
| Quaternion normalization, recenter identity, rolled hit geometry | Deterministic math tests |
| Menu head-motion invariance, hold release, repeated input, cleanup | Actual page or state-machine execution |
| Scene loading, alpha/crop, glyphs, native dimensions | Renderer output + package inventory |
| IMU reaches page, device FPS/draw time, storage result | Native runtime logs and screenshots |
| Physical long hold/swipe, comfort, optics, speaker quality | Wearer feedback or a direct device interaction |
| Uploaded icon/video persists, correct agent/version | Cloud UI after save/reopen |

Start with high-value behavior: neutral forward calibration; left/right/up/down/roll; every actionable surface; blank click; menu open, scroll, head movement, confirm and back; pause/resume; background/foreground; sensor loss; asynchronous late loads; cleanup. Tests should exercise behavior, not search for matching implementation text.

## Measure what the hardware actually did

Log sample freshness, rendered FPS, average/worst frame draw time, active scene, texture count and bounded audio node count. Report observed ranges and conditions. A peak 30 fps during one static interval is not sustained performance across all moving-head scenes. Desktop FPS is not native evidence.

Read/write/restore persistence must succeed across an actual restart before claiming it. One tested host returned `lock() not supported` from both sync and async storage. Keep the app usable in-session, report the failure, and do not cite mock-storage success as device persistence.

Use the [evidence template](../assets/templates/evidence.json) only for facts you have. “Not tested” is a valid status. User feedback that long hold opened the menu does not validate a later revised swipe handler or every other physical gesture.
