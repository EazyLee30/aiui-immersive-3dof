# AIUI Studio upload, review and release

This route covers the complete release process without implying that every task authorizes every stage. Initial evidence covered draft creation and asset replacement; a later optimization upload updated the same agent's debug version while its older store version was already marked live. That did not publish the optimization. Read current labels, requirements and firmware behavior from the live platform.

## Keep release states distinct

`Local source → checked AIX → device-tested candidate → cloud draft → submitted → under review → approved → live`

Transitions can differ by platform. Record the exact observed state. A successful upload or a download button does not mean an app is live. Never fabricate a listing URL or approval timestamp.

Honor the current user's scope: if they asked to create/upload a draft, finish that. If they explicitly requested submission or publication and existing authorization covers it, proceed through the available supported steps. If a consequential approval is required, prepare the final package, metadata and preview first so that the approval concerns a concrete result. Do not re-ask for already authorized routine uploads or edits.

## Prepare a reviewable candidate

- A clean checked AIX with all runtime assets and license notices.
- A square store icon with deliberate alpha/edge treatment; inspect at the platform's real thumbnail size.
- Name, category, trigger/intent description, functional introduction, opening text and change notes consistent with actual behavior.
- Screenshots and a sound-verified demonstration. Clearly mark simulation or future capabilities. Avoid private desktop context in public-facing screenshots.
- A versioned source/archive manifest and evidence record, including limitations that materially affect usage.

Do not put development jargon in the user's opening instructions unless it helps them operate the app. Name useful controls and recovery actions. Preserve the user's edits to marketing copy. Do not silently reinsert removed sentences when changing an unrelated icon or video.

## Create or update

Prefer a supported connector or official CLI when it exposes the needed operation. Otherwise use the available browser automation tool on [AIUI Studio](https://aiui.rokid.com/). Read its current documentation and use fresh page state between actions. Do not automate through private authenticated endpoints discovered in network traces when normal supported UI suffices.

An observed workflow was New Agent → import `.aix` → fill basic information → upload icon → package and save → review-material tab. Verify the intended agent identity before every upload or package replacement. Use the browser's documented file-chooser flow with an absolute local path. Do not assume an arbitrary input-file method exists.

For an existing agent, an observed Studio 1.3.0 update path was its **More operations → .aix import → confirm replacing current code → Device debugging → Repack and save**. This preserved the original cloud identity, icon and intent description. Do not use New Agent for an update. The platform version field may update after the upload success toast; read the final state before recording it.

One observed Studio build required 3–5 preview materials with at least one image and one video. **Read the live requirement** rather than enforcing those numbers forever. Inspect uploaded dimensions, media duration and preview appearance. If replacing a video, upload/verify the replacement first when the material limit permits, then remove the exact superseded item; never delete by a guessed array index. Preserve the local original.

Uploading a new icon may leave “资料待保存”. Use the platform's save/pack action if necessary; the observed UI automatically advanced the debugging version on repack. Do not overwrite a prior version archive with a new bundle under the old name. Local `nativeVersion` and displayed platform version need not match. Record both and the new cloud artifact identity.

After saving, verify a clear success signal and the new image or media metadata. Reopen/reload when persistence is uncertain and no unsaved user edits are at risk. If the user is concurrently editing, avoid disruptive navigation; a definitive save result plus updated visible state may suffice. Save the required proof screenshot, complete the browser task, and update local release records.

For a performance-tested release, download the generated cloud AIX using the visible control and compare decompressed files against the tested local archive. Check unique paths, missing/extra entries, application/asset bytes and manifest size/hash integrity. Studio may regenerate VERSION/package identifiers and serialize equivalent JSON differently; distinguish these expected changes from changed executable code or assets. One observed repack also changed manifest `engine` from an explicit minimum to `*`, while preserving the source `inkVersion`. Record the actual result and verify the intended compatibility requirement rather than assuming identical ZIP hashes or identical manifest constraints. Keep both archives and hashes under distinct names; never report uploaded code as device-tested when it differs from the tested candidate.

## Submit and publish when requested

1. Ensure the final candidate and metadata are complete, and identify the exact agent, version, region/audience and requested final state.
2. Read current eligibility, permission, policy/rights and material requirements. Resolve concrete blockers without inventing hypothetical requirements.
3. If the requested action is authorized, use the visible submit/release control. If a new contract, CAPTCHA or other action requiring user handoff appears, apply the active tool's confirmation rule at that step and explain the precise blocker.
4. Observe success and record the submitted/reviewing state. If approval is pending, report that status; do not mark it live or leave a permanent background polling task unless requested.
5. When approval is actually available and publication is within scope, complete the platform's release step if one exists. Verify the version's live state and user-facing listing. Record the timestamp and URL only after observing them.

Use [release-record.json](../assets/templates/release-record.json). Keep account tokens, cookies, OTPs, personal identifiers, device serials and private capture files out of reusable repositories. Source rights should be documented accurately; referencing an artist is not the same as owning the assets.

## Future-device teaser

A caption like “Full-color preview; planned for a future color device” is a content promise the user may request. It is not proof that current glasses display color, nor authorization to publish automatically in the future. Do not invent a launch date. If asked for a standing reminder, use the app's automation facility; a promotional caption alone does not request one.
