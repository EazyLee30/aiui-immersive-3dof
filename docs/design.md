# Visual system

The repository uses a spatial-instrument editorial language: graphite, warm ivory, phosphor green, generous margins and a precise hierarchy. It describes an engineering practice without turning the README into a simulated headset UI.

## Assets

- `assets/banner.png`: original imagegen cover, 2172×724, 3:1, full bleed. The portal/table composition communicates perpendicular spatial surfaces. It is conceptual artwork, not a screenshot or performance claim.
- `assets/badges/*.svg`: local, editable vector badges. They report version, platform, documentation languages and repository license; none pretends to be a live CI score. Local badges avoid external badge-service dependencies and stay visually consistent with the editorial cover palette.
- The three README editions share visual rhythm and information structure. The English cover is common to all three; each README has its own localized body and navigation.

| Token | Value | Role |
| --- | --- | --- |
| Graphite | `#0d1612` | Badge and diagram ground |
| Structure | `#2b4535` | Quiet borders |
| Muted type | `#8ca195` | Context and labels |
| Phosphor | `#b8f4c5` | Main badge text |
| Cover typography | Warm ivory, open grotesk | Human-readable editorial headline |
| Native UI typography | Fusion Pixel 12 | Crisp compact in-glasses controls |

The production UI font and the large repository cover typography have different jobs. A pixel interface does not require tiny pixel lettering throughout its documentation.

## Cover generation

Tool: built-in imagegen. No project character artwork was supplied. `transparent_background=false`. The selected output was copied into the repository without transformation.

Prompt:

> Create an exceptionally refined editorial GitHub repository hero banner, very wide 3:1 composition, 1800×600 intended. Dark near-black graphite background, warm ivory typography, restrained luminous phosphor green, a hint of icy silver. A premium spatial-computing field manual aesthetic: precise industrial design, generous empty space, subtle grain, beautiful real light, absolutely no gamer UI clutter. Left half: typeset the exact small eyebrow 'AIUI / IMMERSIVE', then large beautifully spaced Swiss grotesk title on two lines: 'A world at' and 'your glance.' Below small exact caption '3DoF · Pixel typography · Sound · Release'. Right half: a sculptural visualization of a fixed-eye immersive scene, an upright translucent rectangular portal in front, an elegant horizontal pad extending toward the viewer underneath it (vertical portal and horizontal table at 90 degrees), a small crisp green reticle suspended at the eye position, only three delicate orbital arcs describing yaw pitch roll. Portal contains abstract curved landscape surfaces and one floating sphere, no person, no copyrighted character, no product logos. A handful of pixel-square controls sit on the pad, physical depth and perspective, tactile smoked glass with thin green edge highlights, beautiful darkness and fine texture. At bottom left small 'FIELD GUIDE 01'; bottom right tiny 'FIXED EYE / WORLD ANCHOR'. Keep all typography legible, generous outer safe margins. Flat full-bleed rectangle, no rounded outer corners, no black corner wedges, no badges, no website chrome. This is an original repository cover artwork, not a screenshot or product capability claim.
