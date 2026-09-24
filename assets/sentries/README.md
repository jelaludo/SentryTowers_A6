# Sentry families — three detail levels

33 equipment variants: eleven families × three equipment tiers. Each has a detailed LOD0 master, articulated LOD1 game export and static LOD2 distance/loading export. D0 intact only; equipment tiers T1–T3 are not damage states or LODs. Models by jelaludo. Hand-off: the commit containing this README plus `assets/sentries/`.

Open `sentries/` through the Workshop HTTP server. Choose family, equipment tier, detail level and plain/Meshopt encoding. The viewer provides measured triangles/draws/bytes, wireframe, neutral material, frame/reset, aiming/recoil and Heptapod Walk/Anchor controls. Static LOD2 disables motion. Download follows the current selection.

## Authoring and exports

The original 33 GLBs and `assets/manifest.json` are preserved with SHA-256 lineage in this package's manifest. `tools/asset-pipeline/build-sentry-lods.mjs` is the deterministic new authoring/export source; it reads those original models. LOD0 adds small beveled edges to eligible armor boxes, preserving the family silhouette and its outer envelope. LOD1 omits these close-shot bevels and reduces eligible source geometry while retaining crisp face normals. Already sparse geometry is retained where reduction would distort identity. Geometry is merged within independently moving assemblies using vertex colors and separate signal materials. All exports are texture-free and self-contained.

LOD2 bakes the original rest pose into one vertex-colored mesh/material. Small plasma nozzle perforations become a simple hollow tapered sleeve; close tiers retain actual holes. Distance signal colors are baked, without animated/emissive indicators. The hierarchy remains as static lookup placeholders, not working pivots. Do not aim, recoil, spin or play a clip on this tier. Distance reduction locks the original outer envelope. All three tiers preserve metre scale, +Y up, +Z forward, root datum, bounds, socket positions and gameplay family/equipment metadata.

`lod0/`, `lod1/`, `lod2/` contain authoritative plain GLBs; `derived/meshopt/` contains optional compressed derivatives. Game release gltfpack remains game-owned. `manifest.json` contains every file's hashes, byte sizes, triangles, draw calls, plot reservation, bounds, sockets, clip durations and name migration. `validation-report.json` covers all 198 plain/decoded files. `previews/` contains 99 rendered views and three labeled review sheets. The existing original Python generators remain available and unchanged.

## Runtime interfaces

Retain `ROOT`, `BASE`, `YAW`, `PITCH`, `RECOIL`, family-specific `ROTOR`, every `MUZZLE_nn`, and Heptapod body/leg/anchor nodes. The manifest's `required_nodes` is authoritative per variant. Original duplicate surface-part labels are now unique, dot-free underscore names; `node_name_mapping` records the migration in original node order. Existing unique control names are preserved. Do not hard-code duplicate legacy surface names.

For turret families, drive `YAW.rotation.y`, negative `PITCH.rotation.x` for elevation, and `RECOIL.position.z` for recoil. Preserve any authored pivot translation and parent transform. Rotor also exposes `ROTOR` for engine-driven barrel rotation. Relay is fully stationary; its inherited empty aiming nodes are compatibility lookups. Heptapod is a six-legged vertical launcher and uses its body/leg hierarchy instead of the empty turret pivots.

Heptapod clips are preserved, not renamed: `Walk` is a 1.8-second repeating in-place cycle; `Anchor` is a 1.2-second one-shot clamped at its end. These clips animate legs/body/anchors, not turret aim. Stop/reset the active action before switching modes. Locomotion displacement, terrain IK, deployment permissions, collision, firing and resource/gameplay events remain game-owned. Muzzle sockets carry world positions and +Z local normals in the rest pose; query the live node transform when firing an articulated unit.

The manifest's `plot_m` is the symmetric X/Z reservation around the original root for the rest pose. It is not a certified full rotation/recoil/walk clearance envelope or collision mesh. Damaged D1–D3, physics colliders and terrain IK are not authored by this update.

## LOD selection and budgets

Use LOD0 for close inspection and recordings. Use LOD1 for active gameplay and all aiming/animation. The current collaboration contract keeps units on one game tier; LOD2 is supplied for optional static map/loading previews and should not be substituted into active combat without game-side policy. Numerical distance thresholds remain unset pending the actual game camera and phone review. Apply hysteresis if the game adopts swaps.

| Tier | Triangle range | Rendered draw range | Plain byte range |
| --- | ---: | ---: | ---: |
| LOD0 | 1,756–17,516 | 2–50 | 73,952–741,560 |
| LOD1 | 424–4,556 | 2–50 | 36,536–471,992 |
| LOD2 | 412–2,000 | 1 | 33,944–227,376 |

All game exports are below the unit target of 25k triangles. The 50-draw Heptapods retain rigid articulated leg assemblies and signals; the other families use 2–5 draws. This is not a claim of measured FPS improvement. Further Heptapod draw reduction through skinning is a possible separate optimization, requiring animation and target-device checks.

## Rebuild and verification

From the repository root, with the dependencies in `tools/asset-pipeline/` installed:

```sh
node tools/asset-pipeline/build-sentry-lods.mjs
node tools/asset-pipeline/validate-sentry-lods.mjs
node tools/asset-pipeline/test-sentry-viewer.mjs
# Run Blender in background with --python tools/blender/render_sentry_lods.py
node tools/asset-pipeline/build-sentry-review-sheets.mjs
python3 tools/build-workshop-docs.py
```

Validation checks original hashes, 99 plain and 99 decoded exports, zero glTF errors/warnings, zero degenerate triangles, measured budgets, unique names, required nodes, bounds, sockets, explicit clip durations and matching detailed/game animation transforms. The viewer test loads real assets with a mocked renderer and covers all 99 selections, static control restrictions, metadata, encoding, aim/recoil, wire/clay, reset, stale loads and failure handling. All 99 rendered views are included for review; representative desktop Safari rendering and Heptapod Walk were checked live.

Pending: consuming-game Three r160 and release gltfpack compatibility, game-camera and mobile review, optional LOD thresholds, phone measurements, and game feedback. This is a contract candidate, not Reviewed runtime status. The collaboration contract is unchanged.
