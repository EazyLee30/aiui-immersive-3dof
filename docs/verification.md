# Verification record

Date: 2026-11-15. This record concerns the reusable skill and its generic starter, not certification of a new physical-device product.

## 2026-11-17 · v1.1.0 performance guide

Added a conditional [native performance route](../references/native-performance.md) and a nullable [performance evidence template](../assets/templates/performance-evidence.json). Source evidence was checked against the final USB acceptance report and the executing renderer, Page, PCM transport and Worker code, rather than earlier failed candidates. No source-project runtime code, raw logs, art, user saves or agent/device identifiers were copied into the skill.

The new route covers finite decoded-image ownership, shared projection geometry, fixed-memory Worker DSP with a Page-owned player, bounded RPC/PCM queues, confirmed versus predicted clocks, actual prefill, hide/unload cleanup and same-identity clean handover. The 600ms example is explicitly paired with its measured edit-latency cost. It records native sound continuity separately from acoustic evidence and preserves the full-product memory/FPS limits.

Validation for this documentation/template update: **17/17 existing behavior/helper tests passed**, the skill-creator validator passed, the package/link/privacy-pattern checker passed for **51 files**, and `git diff --check` passed. The generic starter code is unchanged; this run did not repeat official AIX or native device checks and does not imply that the starter now contains the source application's optimized music engine. The original starter's official check is recorded below.

English, Simplified Chinese and Traditional Chinese READMEs plus the version badge now identify skill v1.1.0. Studio documentation distinguishes the newer optimized debug upload from an older already-live store version and explains comparing the downloaded cloud package with the tested local artifact.

An independent planning pass used a different 12-scene app with 220 MiB estimated RGBA, unknown firmware and no native audio evidence. It correctly deferred cache sizing, disposal strategy and buffer duration pending measurements, and did not equate zero app underruns with sound continuity. It identified an ambiguous helper scope: the entrypoint now explicitly says this repository's tests/package checker do not validate the user's AIX. Native Worker/player API details still require the target's installed contracts. This was a read-only planning check, not a new device run.

## Executed locally

Environment: Node.js 24.15.0, Python 3.13.3, official `@yodaos-pkg/aix-cli` 0.11.0, installed FFmpeg/ffprobe. The repository declares Node 20+ and has no npm runtime dependency installation step.

| Check | Result and boundary |
| --- | --- |
| `node --test tests/*.test.mjs` | **17/17 passed**, no skips locally. Covers quaternion validation, full-pose identity, horizontal geometry and roll, freshness, focus change, dwell latching, menu ownership, duplicate releases, actual Page cleanup, project initialization, deterministic manifests and real encoded audio fixtures. |
| Official `aix check assets/starter` | **13 source files, 5 scripts, zero diagnostics** for source structure, JS syntax, permissions and configuration. No render-input schema is declared, so the optional schema check is reported as skipped by the tool. |
| Skill-creator validator | Valid frontmatter, naming and completed skill scaffold. |
| `node scripts/check_package.mjs` | Local links, required assets, JSON, machine-specific paths and common credential patterns checked. This is a targeted packaging check, not a general secret-scanner certification. |
| Media fixture tests | H.264/AAC with a tone accepted; video without audio rejected when audio is required; all-silent audio stream rejected. |
| Existing 132-second demonstration | H.264 1280×960 at 30 fps, AAC 48 kHz stereo, zero stream-duration difference, decoded peak −2.05 dBFS. Tested read-only; media is not bundled in this repository. |
| CJK character probe | Both official 2026.11.10 font variants contain every character in the recorded Simplified/Traditional specimen. Hashes and the exact probe are in [font-provenance.json](font-provenance.json). |

## Independent forward test

A separate agent received only this skill and a realistic request for a fixed-eye scene, a horizontal control pad, swipe-only menu, full-pose recenter, audible-demo plan and cloud-draft plan. It used an isolated temporary workspace with no device or account mutations.

It instantiated the starter, generated an asset manifest and wrote a delivery plan that correctly remained `local-only`. Independent checks covered 180 combinations of reticle/cell hits under anchors and roll, 100 menu-head-motion iterations including nonzero scroll, and invalid/stale pose rejection.

The independent pass found that a duplicate Enter release after a timed long hold could confirm “continue” and close the newly opened menu. The controller now records the consumed release and suppresses its trailing window; a dedicated regression test was added. The independent reproduction was rerun after refreshing only the patched module: **4/4 independent tests passed**.

The early pass also found links to two documentation files still being authored; those files are now included and checked. The evaluator did not find `aix` on its PATH and correctly reported official validation as unperformed in its own run. The main authoring environment separately ran the installed official CLI. No dependency was silently installed to make that finding disappear.

## Not established by this repository

- Wearer comfort, display optics, physical temple gesture mapping or native FPS for the generic starter.
- Real device persistence or a universal sensor coordinate convention.
- A new app's music engine, art fidelity, licensing or long-term runtime behavior.
- Store review approval, a live public listing, or a future color-device release date.

Those require the next project's actual evidence. A saved draft and a publication guide are not proof of publication.
