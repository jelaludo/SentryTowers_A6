# Helmet Lab 03 / RK-MG02

Revision 3 rebuilds RK-MG02 as a fitted motocross enclosure. The shell is narrower and lower, the brow has a thick root and short tapered lip, and a continuous U-shaped guard connects both temples to the chin. Real recessed side vents, a recessed face insert, shallow optical barrels and a compact rubber seal replace the thin overlays of revision 2. The broad crown band and five-sensor formation remain.

Local viewer:
http://localhost:8788/helmet-lab/?helmet=rk-mg02

Public route after the containing commit is published:
https://jelaludo.github.io/SentryTowers_A6/helmet-lab/?helmet=rk-mg02

## Revision 3 / Construction and proportion

- Overall width reduces from 298.0 to **272.0 mm**; height from 364.3 to **347.8 mm**; depth from 341.9 to **322.2 mm**. The crown is 16.5 mm lower. Flatter temples and a tighter rear break up the old ellipsoid.
- The crown band remains broad: **122.1 mm** versus Hex Witness's 80.6 mm. The cowl now has **112 cells**, with a separate lower rear skirt.
- The brow has a **4–13 mm tapered section**, actual apertures with recessed backing, and supporting temple seats. The guard has a **10 mm section**, upper and underside returns, four side vent openings with backing approximately **6 mm behind the surface**, and six actual chin grille openings with an 8 mm recessed filter.
- Main optical rim projection reduces from about 21 to **14 mm** relative to its face mounting surface; main glass projection reduces from about 29 to **11.8 mm**. The central socket moves 30.6 mm rearward overall with the rebuilt insert. The upper pair moves approximately 5.3 mm rearward; the lower pair moves 4.1 mm forward as the face becomes flatter. This is not a uniform translation of the old array.
- Six shared material finishes distinguish ceramic, anodized metal, face polymer, rubber, red glass and a restrained emitter. The emitter sits behind slightly transparent glass. Edge wear is limited to bevels; there are no raised scratch tubes or external textures.
- Compressed rubber folds and the guard's underside return tuck the seal into the helmet. The collar and head/neck attachment datums remain fixed.

The supplied F-STACK / MX image guides construction and silhouette. RK-MG02 retains one large central optic and four small surrounding optics; it does not adopt the reference's two stacked large lenses.

## Preservation and upgrade notes

Complete preceding files and authoring sources are archived byte-for-byte under `originals/r1/` (commit `40bd38b55635726721d419ed6512017794b08474`) and `originals/r2/` (commit `aa89bcfddc9b84e829d05845aa7bdb8bbee0b12e`). Archives are repository-only and excluded from the current ZIP. Hex Witness, Breach Warden, robot models and the received collaboration contract are unchanged.

All existing node names and module rest frames are retained. **`SOCKET_NECK` and `SOCKET_HEAD_DATUM` are unchanged.** Exact optical, front and respirator frames intentionally change with the reshaped assembly: refresh attachments from this manifest when upgrading. `SURFACE_COLLAR_SEAL` is a new named surface under `PART_COLLAR` in master/game and a static marker in distance. Names, frames and the new bounds match across all three current tiers.

## Downloads and measured costs

`rk-mg02.zip` includes three self-contained plain GLBs, this README, manifest, runtime, decoded validation report and SHA-256 checksums. The viewer GLB download follows the selected detail tier. Plain GLB remains the source of truth; upstream compressed copies are not supplied.

| File | Triangles | Draws | Plain bytes | Role |
| --- | ---: | ---: | ---: | --- |
| `rk_mg02_d0_lod0.glb` | 137,960 | 11 | 3,915,716 | Detailed recording / close inspection |
| `rk_mg02_d0_lod1.glb` | 21,438 | 11 | 812,632 | Inspectable game modules |
| `rk_mg02_d0_lod2.glb` | 2,704 | 1 | 125,816 | Static distance / loading |

Costs are measured from decoded model geometry and browser model renders, excluding the viewer floor, fit references and postprocessing. Master/game retain eight inspectable modules. A separate rubber seal adds one draw: **11 draws**, above the landmark ten-draw reference. Game stays below the unit 25k triangle reference but exceeds the landmark 8k/400 KB references. Distance meets 3k triangles / one draw / 250 KB. These helmet costs are part of a complete character budget. No FPS claim.

Game retains all cowl cells, the real vent/filter openings and inspection pivots, with simpler curves and hardware. Distance is an explicitly authored coarse exterior merged to one matte surface; no cell geometry, fine vent recesses, liner or active optical emission. Its visible geometry is `DISTANCE_SURFACE`; all other names are static markers. Damage identifiers are separate from LOD: only D0 is authored; D1–D3 remain pending.

Load distance first. Provisional selection: enter game inside 12 m and return to distance beyond 16 m. Use master explicitly for close shots and recordings. Review these distances in the consuming game's camera.

## Coordinates and fit

Metres, +Y up, +Z forward; `RK_MG02_ROOT` is on the collar ground datum at plot centre. Reserve 0.36 × 0.40 m. All current tiers share X ±0.136023, Y 0 to 0.347800, Z −0.132987 to +0.189197 m. Width × height × depth: **272.0 × 347.8 × 322.2 mm**.

`SOCKET_NECK` is [0, 0.055, 0], with local +Z pointing down −Y. `SOCKET_HEAD_DATUM` is [0, 0.090, 0], with local +Z pointing up +Y. Lens sockets point outward along their respective face normals. Exact positions and quaternions are in the manifest; L/R is wearer left/right, +X wearer left.

The human reference is an authored 174 × 234 × 222 mm head ellipsoid centred at [0, 0.207, 0], plus nose and a 98 mm neck diameter. No helmet triangle intersects the head or nose envelope in any tier. This is a rest-fit proportion check, not a donning or moving-character clearance claim.

The original AUREL-03 sensor head is displayed unchanged at scale 1, translated [0, −1.465, 0]. Its attachment socket meets the helmet head datum with opposing normals. All 1,740 head triangles are checked for rest-pose surface intersection. To equip the full neutral robot, translate this helmet root by [0, +1.465, 0] without scaling, then parent to the head transform while preserving that neutral alignment. Reference-head geometry is not in the GLBs/ZIP.

## Runtime and viewer

Eight `PART_*` modules: `SHELL`, `CROWN_BAND`, `FACEPLATE`, `OPTICS`, `JAW`, `RESPIRATOR`, `COLLAR`, `LINER`. `SURFACE_*` meshes belong to their respective modules. `OPTICAL_GLASS` and `OPTICAL_CORES` belong to `PART_OPTICS`; the new `SURFACE_COLLAR_SEAL` belongs to `PART_COLLAR`.

`createRig(scene).pose({spread: 0…1})` separates master/game for inspection; zero restores assembly. This is an inspection transformation, not an operational opening or breathing animation. Optics are fixed. There are no baked clips. Distance returns `static: true` and ignores separation.

Viewer controls: helmet and module selectors, assembled/exploded states and slider, six camera presets/free orbit, human/robot fit, half section, wireframe, turntable, fullscreen, PNG, selected-tier GLB and all-tier ZIP. **Plain gray** temporarily substitutes one neutral material for silhouette/construction review and restores original materials when unchecked. **Contact shading** toggles RK-MG02's GTAO; it is bypassed during half section, wireframe and fit inspection. Soft area lights, a subtle directional shadow, tone mapping and FXAA make up its studio presentation. Other helmets retain their original lighting. All rendering effects and fit references are viewer-only, excluded from exports. Contact shading adds rendering cost; disable it as needed. No reference-device performance claim.

## Validation and handoff

```sh
node tools/asset-pipeline/build-rk-mg02.mjs
node tools/asset-pipeline/validate-rk-mg02.mjs
python3 tools/package-rk-mg02.py
python3 tools/build-workshop-docs.py
node tools/asset-pipeline/test-rk-mg02-viewer.mjs
```

Decoded checks cover zero glTF errors/warnings, finite nondegenerate geometry, unique dot-free names, current-tier frames/bounds, head/nose and unchanged AUREL clearance, 96 module poses, unobstructed lenses, six chin openings, four cheek vents, sampled brow thickness, distinct material finishes, archive hashes and preserved original families. Browser checks cover costs, isolates, all controls, gray/material restoration, contact shading, downloads, original-family regression and 390 px layout. Reports are `validation-report.json` and `viewer-validation.json`.

Pin the containing Git commit plus **`assets/helmet-lab/rk-mg02/`**, using manifest hashes. Procedural source: `tools/asset-pipeline/rk-mg02-shape.mjs`; builder: `build-rk-mg02.mjs`; pipeline dependencies are locked. Current exports are marked derived from the original Hex Witness family at `84713783451299097150ca80eb8f6552b7e353ed`; LOD0 is the authored revision and LOD1/2 are reduced derivatives.

Completed: enclosure/proportion rebuild, materials, viewer inspection, three tiers, archive and downloads. Pending: visual acceptance, character-specific moving fit/donning, D1–D3, consuming-game gltfpack release decode and game/device profiling. The game owns release compression; no compressed-validation claim is made here.

Original models, revisions, runtime and previews by **jelaludo / Model Workshop**, guided by user-supplied `HexWitness.png` and `ChatGPT Image Nov 9, 2026, 01_44_23 PM.png`. Reference images remain external, with fingerprints retained in the manifests; no concept pixels or third-party geometry are distributed. Original Workshop reuse terms apply.

Models by jelaludo — https://jelaludo.github.io/SentryTowers_A6/
