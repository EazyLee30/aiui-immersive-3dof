# Spatial design and calibration

## Coordinates, display and content

Use an explicit convention; the reference helpers use +X right, +Y up, −Z forward, row-major matrices. A normalized sensor quaternion `[x,y,z,w]` rotates device vectors into the sensor's world basis. Verify axis signs with real yaw, pitch and roll before depending on this interpretation.

For fixed eye O and world direction d, a baked scene stores radiance `L(O,d)`. Pure head rotation samples `L(O,Rd)`. This supports orientation-based exploration without re-rendering all geometry. It does not create positional parallax, stereo depth, unseen geometry or new occlusion relationships.

With device-to-world rotation `R` and calibrated scene basis `M`, the scene-to-device view is `A = transpose(R) × M`. Full-pose recenter sets `M = R_current`, giving identity at that instant. Preserve pitch and roll if the user declares the current orientation to be forward, including bench-mounted glasses. Gravity-preserving yaw-only recenter is a separate option; it must not masquerade as full recenter.

For a point transformed to `(x,y,z)` with `z < −near`, use `screenX = cx + f*x/−z`, `screenY = cy − f*y/−z`. Derive `f = width / (2*tan(horizontalFov/2))` when the actual view FOV is known. Reuse the projected vertices for point-in-polygon hits. Clip or reject near-plane crossings deliberately; never select invisible geometry behind the viewer.

The reference starter uses `f=1000` at width 480 (about 27° horizontal projection). This is a presentation parameter, not a measurement of all Rokid hardware. A content canvas spread over 120° horizontally is a different quantity. Record both instead of conflating them.

## A desk under a forward scene

Place all desk top vertices at constant Y, with near/far extents along Z. A vertical forward portal and a horizontal desk are perpendicular in world space even though the projected desk looks trapezoidal. Eye-to-row downward angle is `atan2(abs(height), horizontalDistance)`. A reference configuration at Y=−0.55 and Z≈−2.7…−1.7 yields roughly 11–18° low-head access. Treat these as adjustable starting values and verify comfort physically.

Do not slide the desk in screen coordinates as the user looks down. Test every hit target at its world center, edge, representative yaw/pitch, and roll; the near rows may need different visual label spacing. Keep decorative icons outside the target polygon unless they intentionally participate in interaction.

## Choose the scene path

| Path | Good fit | Limits |
| --- | --- | --- |
| Real-time meshes | Dynamic occlusion, lights, geometry and flexible viewpoints | Requires verified runtime/GPU budget |
| Six-face cubemap + transparent animation layers | Fixed eye, rotational exploration, controllable quality | Bake eye/FOV/crop must agree; static visibility |
| Angular panorama crop + affine portrait | Limited Canvas host under measured pressure | Projection approximation near edges; finite angular coverage |
| Photo plane | A deliberately flat photographic setting | Does not contain side/back geometry |

Do not force every future project through the low-cost path. Choose based on visible requirements and device measurements. For baked layers, a face or prop crossing a foreground occluder may require separate near layers or rebaking; a sprite cannot magically interleave with arbitrary geometry.

## Camera motion in evidence

A tilted device screenshot may correctly reflect the user's rolling head. Before adjusting the scene, record the pose or request a neutral calibrated hold when necessary. Camera tilt alone is not evidence of a bad bake. Use scripted poses for a clean simulated demo, and label them as simulated.
