# Helmet Lab 02 / Hex Witness

A separate optical helmet for human-sized heads and humanoid robots. A rounded pale green ceramic cowl carries 166 curved cells, predominantly hexagons with pentagons that close the spherical pattern. A smooth band runs over the crown. One large central red optic and four smaller lenses sit on a dark, recessed faceplate, above curved jaw armor and a six-slot chin filter. The collar, liner and shell leave an open neck bore and head cavity. Original procedural geometry uses vertex colours, without external textures.

Local viewer:
http://localhost:8788/helmet-lab/?helmet=hex-witness

Public route after the containing commit is published:
https://jelaludo.github.io/SentryTowers_A6/helmet-lab/?helmet=hex-witness

## Downloads and measured costs

`hex-witness.zip` contains all three self-contained plain GLBs, this README, manifest, runtime, decoded validation report and SHA-256 checksums. The viewer's GLB download follows its selected detail tier. Breach Warden remains available from the Helmet selector and the original default route.

| File | Triangles | Draws | Plain bytes | Role |
| --- | ---: | ---: | ---: | --- |
| `hex_witness_d0_lod0.glb` | 104,704 | 10 | 3,060,392 | Detailed recording / close inspection |
| `hex_witness_d0_lod1.glb` | 15,602 | 10 | 671,516 | Inspectable game modules |
| `hex_witness_d0_lod2.glb` | 2,994 | 1 | 134,388 | Static distance / loading |

Costs are measured from decoded models, excluding the viewer floor and fit references. LOD1/2 are derived reductions. Master/game use eight inspectable modules and three shared materials; optics use a metal barrel surface, red glass and emissive cores. The game tier meets the contract's 25k unit triangle reference, but exceeds the stationary-landmark 8k/400 KB references. Its ten draws and geometry still consume part of a complete character budget. Distance meets 3k triangles / one draw / 250 KB. No FPS claim.

Game retains all 166 cells with fewer curved-surface samples, simpler hardware and optical etchings. Distance uses an explicitly authored coarse exterior merged to one matte surface, with the five-lens silhouette and crown band but no fine honeycomb, liner or active emission. All node names remain as static lookup markers. Start with distance at load time, enter game inside 12 m and return to distance beyond 16 m; these provisional values need game-camera review. Choose master explicitly for close shots/recordings.

## Coordinates, fit and attachment

- Metres; +Y up, +Z forward. `HEX_WITNESS_ROOT` is on the collar ground datum at plot centre; reserve 0.36 × 0.40 m.
- Identical assembled bounds in all tiers: X ±0.139289, Y 0 to 0.379000, Z −0.168991 to +0.186331 m. Width × height × depth: **278.6 × 379.0 × 355.3 mm**.
- `SOCKET_NECK`: [0, 0.055, 0], local +Z points down −Y.
- `SOCKET_HEAD_DATUM`: [0, 0.090, 0], local +Z points up +Y.
- `SOCKET_FRONT`, `SOCKET_RESPIRATOR` and five `SOCKET_OPTIC_*` frames follow their respective modules. Lens sockets point outward along each local face normal; exact positions/quaternions are in the manifest. L/R is wearer left/right, with +X wearer left.

The human reference is an authored 174 × 234 × 222 mm head ellipsoid centred at [0, 0.207, 0], plus a nose and 98 mm neck diameter. Geometry checks find no helmet triangles intersecting the head or nose envelope in any tier. This is an authored proportion check; character-specific fit, moving collar/shoulder clearance and donning remain to be designed.

The viewer references the original AUREL-03 sensor head at scale 1, translated [0, −1.465, 0]. Its attachment socket meets the helmet's head datum with opposing normals. All 1,740 reference-head triangles are checked: no rest-pose surface intersections in any helmet tier. The reference head is unchanged and is not bundled in these GLBs or ZIP.

To place the helmet over AUREL's neutral full-body pose, translate the helmet root by [0, +1.465, 0] with no scaling. Parent it to the head transform while preserving that neutral alignment to follow animation. The original robot is not modified or automatically equipped.

## Modules and runtime

Eight `PART_*` modules: `SHELL`, `CROWN_BAND`, `FACEPLATE`, `OPTICS`, `JAW`, `RESPIRATOR`, `COLLAR`, `LINER`. `SURFACE_*` meshes belong to their corresponding modules; `OPTICAL_GLASS` and `OPTICAL_CORES` also belong to `PART_OPTICS`.

Use `createRig(scene).pose({spread: 0…1})` from `runtime.js` to separate master/game for inspection. `spread: 0` restores assembly. It is an inspection transform, not an operational opening or breathing animation. The optics are fixed and have no tracking simulation. No baked clips are included. Distance returns `static: true` and ignores separation; its visible geometry is `DISTANCE_SURFACE` and all other names are markers only.

D0 is the intact design with restrained surface variation. Gameplay damage states D1–D3 have not been authored. Damage and detail are separate identifiers.

## Review and validation

Viewer controls include the helmet selector, eight module isolates, assembled/exploded states and separation slider, six camera presets/free orbit, human/robot fit references, half section, wireframe, turntable, fullscreen, PNG capture and GLB/ZIP downloads. Half section clips only the viewer. Fit references render through surfaces for inspection and are excluded from download geometry.

From the repository root:

```sh
node tools/asset-pipeline/build-hex-witness.mjs
node tools/asset-pipeline/validate-hex-witness.mjs
python3 tools/package-hex-witness.py
python3 tools/build-workshop-docs.py
node tools/asset-pipeline/test-hex-witness-viewer.mjs
```

`validation-report.json` records zero glTF errors/warnings, finite/nondegenerate geometry, matching names/rest frames/sockets/bounds, head/nose and original robot-head clearance, five unobstructed outward-facing optics, six actual chin slots reaching a recessed filter and 96 module pose checks. Lens-centre and off-centre rays check that housings do not obscure the glass. All Breach Warden and robot assembly files plus the received collaboration contract remain byte-identical to baseline commit `ed6d5cad6c40975d7a18159ebab14ec51989cb75`.

`viewer-validation.json` records browser cost measurements, controls, downloads, layout and shared-viewer regression. The game owns release-time gltfpack compression. No upstream compressed copies are supplied; decoded release validation and reference-device/game-camera profiling remain pending.

## Handoff and provenance

Pin the containing Git commit plus **`assets/helmet-lab/hex-witness/`**, with file hashes from the manifest. Procedural source is `tools/asset-pipeline/hex-witness-shape.mjs`; builder is `build-hex-witness.mjs`. Shared pipeline dependencies are locked in `tools/asset-pipeline/package-lock.json`.

Original geometry, runtime, viewer additions and derived previews by **jelaludo / Model Workshop**, guided by user-supplied `HexWitness.png`. The reference image stays external and is fingerprinted in the manifest; no image pixels or third-party geometry are distributed. Original Workshop reuse terms apply. Credit:

Models by jelaludo — https://jelaludo.github.io/SentryTowers_A6/

Completed: second standalone helmet, detailed/game/static exports, inspection controls, fit references and downloads. Pending: visual acceptance, character-specific moving fit/donning, gameplay damage and consuming-game integration.
