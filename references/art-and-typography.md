# Art, baking and pixel typography

## Study references before rebuilding

Inspect the implementation and actual assets when a user links a reference. Inventory geometry, skins, clips, texture UVs, audio and procedural motion. A GLB with no animation clips may still be animated by code. Preserve known original meshes/UVs when fidelity is required; mark inferred backsides and recreated environments as reconstruction. Publicly downloadable material is not automatically licensed for redistribution.

The reusable skill intentionally contains no character, environment texture, music sample or screenshot from the originating project. Use project-owned or authorized assets for each new work.

## Blender → runtime contract

Preserve an editable `.blend` plus packed or clearly linked textures. Keep a stable eye point and consistent unit scale; render an environment without the animated subject, then an alpha subject sequence from the same eye, projection and lighting setup. Do not burn the subject into the backdrop and composite it again.

Record [bake metadata](../assets/templates/bake-contract.json): eye, axes, FOV, frame count/rate, crop, cubemap face convention, color transform and source revision. A crop is normalized UV space relative to the original camera image; its location matters as much as its dimensions. Render a numbered axis test to catch flipped cube faces. Verify alpha and looping continuity before packaging.

For batch Blender use, prefer background rendering with explicit scene/camera/output arguments. If driving the user's live Blender, first inspect open work and avoid discarding unsaved state. Scripts should not overwrite unrelated scenes or substitute a procedural approximation for an expressly requested reference model.

Performance choices: pre-decode immutable assets, share caches, invalidate superseded loads, release every decoded bitmap, batch equal-style geometry, avoid repeated base64 decoding. Reduce texture dimensions or transformation count only after seeing the actual bottleneck. Keep the high-quality editing sources alongside optimized runtime outputs.

## Pixel typography with CJK coverage

The included unmodified fonts are Fusion Pixel 12 monospaced, official release 2026.11.10, with Simplified-Chinese and Taiwan Traditional-Chinese glyph forms. They are licensed under OFL 1.1; the main notice and upstream notices travel with the font. Upstream: [Fusion Pixel Font](https://github.com/TakWolf/fusion-pixel-font). Its build software license and its font license are distinct. Exact file hashes and a glyph probe are in [font-provenance.json](../docs/font-provenance.json).

The starter defaults to `zh-CN`. Use `init_project.py ... --font-locale zh-TW` to choose Taiwan glyph forms; this selects the font and does not translate the app's editable copy. Each full font is approximately 5.1 MB, so measure target load time and consider a properly licensed project-specific subset when size matters. Never reuse an old project subset without checking the next project's characters: the original subset omitted several common Traditional characters.

AIUI registration:

```json
{"fonts":[{"family":"FusionPixel","src":"assets/fonts/FusionPixel12.otf","weight":400,"style":"normal"}]}
```

Canvas text explicitly sets `ctx.font='12px FusionPixel'`. Use 12 px or integer multiples for deliberate pixel rhythm, align baselines to whole pixels, and measure actual strings. `imageSmoothingEnabled=false` controls bitmap resampling; it does not force font rasterization into a pixel grid. For offline Napi Canvas rendering, register the same font via `GlobalFonts.registerFromPath` before drawing.

Verify a native-size specimen including `回中 校准 速度 音量 場景 選擇 確認 返回 0123456789 ± ·`. Check localization variants and fallback glyphs, not just the font family name. In a very small fixed vocabulary, a glyph atlas is an alternative; keep a mapping and missing-glyph fallback. Do not call a handwritten Latin-only bitmap alphabet a CJK font solution.

Use typography as hierarchy, not decoration everywhere: a clear title, compact status, readable action labels. Keep long labels away from the reticle. Distinguish active, focused and inactive states through shape/brightness as well as color. Mono-green and color previews need separately inspected contrast.

## Icons and store art

Map icons to actual functions or instruments, not to historic letter labels. Test at the final 16–24 px footprint. Preserve padding, keep the first interactive tile clear, and avoid perspective shrinking the label into noise.

For existing icon families, reuse/edit their native source. When raster generation or editing is appropriate, use imagegen with exact invariants and save source, output and prompt in the project. For a rounded app icon, exterior corners should be alpha or a deliberately full-bleed design; black corner wedges inside a square PNG will survive a different platform mask. Inspect against light and dark backgrounds and check corner alpha. Never flatten transparency during conversion. Do not put a store icon's decorative border around the in-glasses viewport by default.
