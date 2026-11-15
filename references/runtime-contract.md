# Runtime contract

Use this when starting or porting a full-screen AIUI experience. These contracts were checked against local AIUI reference material and an installed official AIX CLI on 2026-11-15; recheck the target's current types/help when a capability or signature matters.

Primary entry points: [AIUI documentation](https://open.rokid.com/aiui), [AIUI Studio](https://aiui.rokid.com/). If a local `aiui-dev` skill is available, use its relevant framework/API references. This skill remains usable without that local installation.

## Source shape

```text
agent/
  AGENTS.md
  agent.json
  app.json
  app.js
  pages/index/index.ink
  lib/
  assets/fonts/
```

`app.json.pages` contains extensionless routes. A route uses either a single `.ink` file (`script def`, `script setup`, `page`, `style`) or the matching multi-file format; do not mix both. App/Page/Widget logic uses `export default`, not `App()` or `Page()` registration. Use `setData` for state consumed by templates. Canvas-only private renderer state can live on the instance.

Declare each route, bundled font and actual permission. Do not add microphone permission just because playback exists. Sensor availability must be checked on the target. A browser's DOM, WebGL, Web Audio, storage, Canvas constructor, or media capture support does not imply the same surface in native Ink.

Mounted Canvas: obtain `wx.createCanvasContext('scene')` after `onReady`. It can return null; draw only when available, call `flush()` if supplied. Do not construct `CanvasRenderingContext2D` directly. Only draw open supported images/bitmaps. Do not assume HTMLImageElement or OffscreenCanvas is accepted.

## Check the toolchain before using it

Use the installed official `@yodaos-pkg/aix-cli`, checking its version/package metadata and `--help`. A current observed command set is:

```sh
aix check agent
aix pack agent --output output/app.aix
aix list output/app.aix
aix preview agent --html-out output/preview.html
aix install agent --serial DEVICE_SERIAL
aix launch-page agent pages/index/index --serial DEVICE_SERIAL
```

`aix` above is the installed binary or an invocation of its `dist/cli.js` via Node. Verify subcommand help before relying on flags. Do not silently choose the first stale npm cache directory or install/update a toolchain unrelated to the task. Run package-manager commands from the intended project directory; an accidental parent-directory install can alter another project's lockfile.

Keep browser preview adapters, simulated sensors, Node dependencies and offline audio engines outside the AIUI upload root. Check the actual archive inventory, not merely the staging folder. Hidden `.aix` cache/identity directories must not be recursively re-embedded in an upload package.

## Starter boundaries

The included starter demonstrates geometry, native typography, absolute-pose input and swipe-only menu ownership. Its default 480×352 viewport and focal length are a tested design profile, not claimed optical calibration. It has no finished scene art, no music engine, no persistence promise and no automatic cloud deploy. It intentionally omits a gyro fallback until units and axis conventions are verified.
