# Helmet Lab 01 / Breach Warden

A standalone boarding helmet for a human-sized head or humanoid robot. Broad flattened brow, recessed dark visor, overlapping cheeks, compact slotted respirator, suspended ceramic temple bar, impact dents and a pale replacement jaw plate. The crown, inner liner and collar are hollow. Original procedural geometry uses vertex colours; no image textures are needed.

Local inspection viewer:
http://localhost:8788/helmet-lab/

Public route after the containing commit is published:
https://jelaludo.github.io/SentryTowers_A6/helmet-lab/

## Revision 2 / Panel alignment

The front and side cheek/jaw plates now follow matching curved profiles. Thickness and bevels follow local surface normals, fasteners sit normal to their plates, and the crown panels meet the brow with narrow seams. The original revision is preserved in `originals/r1/` and at commit `68a7a45235c3c76f9187dcafcea871246378ffc3`. Names, sockets and overall bounds are unchanged. The archive is repository-only and excluded from the current download ZIP.

## Download and tiers

`breach-warden.zip` includes all three self-contained plain GLBs, this README, the manifest, runtime, validation report and SHA-256 checksums. The browser's **Download helmet GLB** follows the selected tier. Master/game contain eleven independent modules; distance is one static merged surface.

| File | Triangles | Draws | Plain bytes | Role |
| --- | ---: | ---: | ---: | --- |
| `breach_warden_d0_lod0.glb` | 183,448 | 11 | 5,098,892 | Close shots, recording and detailed inspection |
| `breach_warden_d0_lod1.glb` | 11,706 | 11 | 446,080 | Inspectable game modules |
| `breach_warden_d0_lod2.glb` | 2,922 | 1 | 166,412 | Static distance/loading surface |

Counts are measured from decoded exports, excluding viewer lights, floor and fit references. LOD1 and LOD2 are derived reductions. Game falls below the contract's 25k unit triangle target, but a helmet consumes part of the complete character's budget. Eleven draws retain module isolation; game also exceeds the stationary-landmark references of 8k triangles, ten draws and 400 KB. Distance meets 3k triangles / one draw / 250 KB. No FPS performance claim.

The two shared materials separate reflective visor from matte armour. LOD1 uses a continuous crown with simplified seams and omits fine wear. LOD2 uses a single matte exterior palette; lining, fine wear, filter wires and small hardware are omitted. Reduced crown surfaces are authored explicitly to avoid intersections between thin overlapping master layers. Suggested starting policy: load LOD2 first, enter LOD1 inside 12 m and return to LOD2 beyond 16 m. These distances need tuning for the game's camera and character size. Select LOD0 explicitly for recordings. Never use LOD2 for exploded inspection.

## Coordinates, fit and attachment

- Metres; +Y up, +Z forward. Root `BREACH_WARDEN_ROOT` sits on the collar ground datum. Reservation is 0.40 × 0.40 m.
- All tiers have identical bounds: X −0.167500 to +0.191300, Y 0 to 0.367000, Z −0.154718 to +0.205800 m. Overall width × height × depth is **358.8 × 367.0 × 360.5 mm**. The single temple bar makes the width asymmetric.
- `SOCKET_NECK`: [0, 0.055, 0], outward −Y. Bottom collar/neck interface.
- `SOCKET_HEAD_DATUM`: [0, 0.090, 0], outward +Y. Interior fit datum.
- `SOCKET_VISOR`, `SOCKET_RESPIRATOR`, `SOCKET_TEMPLE_DEVICE` follow their modules. Exact positions and quaternion frames are in `manifest.json`.

The human reference is an authored ellipsoid measuring 174 × 234 × 222 mm, centred at [0, 0.207, 0], plus a nose and a 98 mm diameter neck. No helmet triangle intersects the head or nose ellipsoid in any tier. This is a proportion reference; production character fit and a method of putting the helmet on remain to be designed.

The viewer also loads the **unchanged AUREL-03 sensor head** at scale 1, translated by [0, −1.465, 0] from its original body-ground coordinates. Its `SOCKET_HEAD_ATTACH` then meets `SOCKET_HEAD_DATUM` at Y = 0.09 with opposing normals. All 1,740 reference-head triangles are checked against the helmet; no rest-pose surface intersections occur in any tier. The AUREL head is a viewer reference, not included in the helmet GLBs or ZIP.

To place the helmet on the full AUREL body in its neutral pose, translate the helmet root by [0, +1.465, 0] without scaling. To follow head motion, parent it to the character's head transform while preserving that neutral placement. Test collar/shoulder clearance through the desired animation; this package does not modify or equip the original robot assets.

The ceramic bar's inner face has a measured centre clearance of 20.75 mm in the master and 21.00 mm in game. Its two small brackets intentionally connect to the shell. All three respirator slots are open to their recessed filter bed in master/game. These are visual mechanisms, not a breathing or pressure system.

## Module runtime

`PART_SHELL`, `PART_BROW`, `PART_VISOR`, `PART_CHEEK_L`, `PART_CHEEK_R`, `PART_JAW_L`, `PART_JAW_R`, `PART_RESPIRATOR`, `PART_TEMPLE_BAR`, `PART_COLLAR`, `PART_LINER` retain the same names and rest frames across tiers. L/R refer to the wearer's left/right: +X is wearer left when facing +Z.

Use `createRig(scene).pose({spread: 0…1})` from `runtime.js` to separate the master/game modules. `spread: 0` restores assembly. This is an inspection transform, not an operational opening sequence. No baked clips are included. LOD2 returns `static: true` and ignores pose changes; its module/surface nodes are lookup markers only. Its visible geometry lives in `DISTANCE_SURFACE`.

The D0 design includes service wear, dents and a replacement plate. D1–D3 gameplay damage states have not been authored. Damage identifiers must not be used as detail levels.

## Review and validation

The viewer provides full orbit/zoom, left/right three-quarter, front, temple, rear and inside cameras, eleven part choices, explosion slider, half section, human and AUREL fit references, wireframe, turntable, fullscreen, PNG capture and GLB/ZIP downloads. Half section is a viewer clipping plane; it does not cut the downloaded geometry. Fit wireframes are rendered through the surface for inspection.

Rebuild and check from the repository root:

```sh
node tools/asset-pipeline/build-breach-warden.mjs
node tools/asset-pipeline/validate-breach-warden.mjs
python3 tools/package-breach-warden.py
node tools/asset-pipeline/test-breach-warden-viewer.mjs
python3 tools/build-workshop-docs.py
```

`validation-report.json` records decoded glTF validation, finite/nondegenerate geometry, names, frames, bounds, sockets, head clearance, grille aperture rays, temple clearance and 132 module pose checks. Seventy-two rays across both cheek and jaw overlaps verify outward/back-face order and at least 0.8 mm clearance between the front plate’s back and the side plate’s face in master/game. This is a targeted overlap check, not an all-surface collision proof. `viewer-validation.json` records browser review separately. The consuming game owns release-time gltfpack compression; no upstream compressed copies are provided. Decoded release validation and reference-device/game-camera profiling remain pending.

## Handoff and provenance

Pin the containing Git commit plus **`assets/helmet-lab/breach-warden/`**, using each file's manifest SHA-256. Procedural source: `tools/asset-pipeline/breach-warden-shape.mjs`; builder: `build-breach-warden.mjs`. Shared pipeline dependencies are locked in `tools/asset-pipeline/package-lock.json`.

Original geometry, runtime, viewer and derived previews by **jelaludo / Model Workshop**, guided by the user-supplied `01BreachWarden.png`. The reference image remains external and is fingerprinted in the manifest. No source image pixels, third-party geometry or imported hand references are distributed. Original workshop reuse terms apply; credit:

Models by jelaludo — https://jelaludo.github.io/SentryTowers_A6/

Completed: the first helmet, three tiers, fit references, inspection controls and downloads. Pending: visual acceptance, additional helmet designs, character-specific moving fit/donning, gameplay damage and consuming-game integration. Original hand, foot and robot exports remain unchanged.
