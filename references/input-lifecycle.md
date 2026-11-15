# Input ownership and lifecycle

## State ownership

Keep world focus, dwell candidate/latch, menu index/scroll, and manual editing focus separate. A mode transition clears stale focus and pending dwell. An empty-world tap is a no-op unless the product explicitly assigns it an action.

For a swipe-only menu, both protections are necessary:

1. The renderer returns no gaze targets while the menu is open.
2. The update loop skips gaze/dwell processing in menu mode.

Only semantic swipe actions change menu index or scroll offset. Test after scrolling beyond the first visible rows, then apply yaw/pitch/roll changes. A menu that no longer changes index but still scrolls with head pitch remains broken. A head-locked menu can redraw just when its content changes; if its background is frozen, describe that behavior accurately.

## Physical input is a host adapter

The tested mapping was Enter → confirm, Backspace → back, ArrowUp/Down → swipe. One Glasses 2 host also emitted horizontal duplicates. GlobalHook was not an independent confirm. Keep those mappings in an adapter instead of embedding firmware assumptions in world geometry.

Long hold had two paths: a keyboard-compatible timer and a physical touch wakeup. On one tested Ink 0.21 host, `onVoiceWakeup` arrived with `keyword='assistant'`. Older examples listed `clickAiAssist`; an equality filter for only that value made the real control unresponsive. For a product that owns wakeup as menu, consume the event with `preventDefault`, cancel hold state, and suppress the following release. If the app also owns a voice assistant flow, inspect source metadata and product semantics before routing every wakeup to the menu.

For key handling, prevent default only when the app owns that action. At scene root, a back action can remain the host's exit behavior; inside a menu, consume it to close once. Deduplicate repeats using observed behavior, without merging distinct legitimate swipes. Avoid asynchronous Enter release confirming immediately after long-hold menu open. Hiding the page cancels all pending holds.

## Dwell

Use an optional dwell mode, not an accidental replacement for explicit confirmation. On target identity change reset timing and focus immediately. A short focus-stability delay (e.g. 100 ms) differs from a dwell threshold (e.g. 850 ms). Trigger once per uninterrupted target; require looking away to re-arm. In a video, start the timer at the actual first hit, even if a menu just closed. Derive frame-quantized trigger time rather than animating a decorative ring on a different schedule.

## Pose freshness and failure

Normalize finite quaternions, reject zero/non-finite input, timestamp sample receipt in a known clock. Refuse recenter and world confirmation when pose is stale. Stop using an old focus if IMU disappears. Offer an explicit manual or retry path suited to the product.

Prefer absolute orientation when it is available. If integrating gyro fallback, verify radians/second, axis basis and timestamp units; cap implausible integration gaps, reset after resume, and re-anchor on first absolute pose. Do not generalize a heuristic inferred from one device's timestamp scale.

## Lifecycle

AIUI Page order is `onLoad → onShow → first presentation → onReady`. Canvas starts only after it exists. Repeated show/hide must not multiply listeners or render loops. On hide: mark invisible, invalidate asynchronous generations, cancel frame/hold timers, stop sensors and audio, clear focus. On unload: additionally release bitmaps, nodes and final references. Guard async decode/resume callbacks with both generation and visibility; late work must not revive a hidden page.
