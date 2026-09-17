# SOL-88 Syzygy orbital laser

A suspended mechanical lens engine inside three rotating containment cages. Carbon armor, silver edges, cyan field tracks and amber radiator sectors support full-material close-ups and cyan wireframe telemetry. See docs/SOL-88-SYZYGY.md for the approved design, lore and game-controller migration.

## Lore

The cages circulate stored field energy between passes. Firing requires coherent phases and a clear escape corridor through every rotating layer. Convergence advances the lens train and retracts eight iris blades. The cages maintain the corridor during a continuous ten-second burn, then separate into thermal recovery. Holding alignment consumes field stability, explaining the long interval between attacks. The fictional 120 MW output yields a 1.2 GJ optical-energy budget; losses and waste heat are additional.

## Measured exports

| Tier | Triangles | Draws | Plain bytes | Meshopt bytes | Motion |
| --- | ---: | ---: | ---: | ---: | --- |
| LOD0 detailed master | 65,664 | 7 | 2,303,400 | 459,796 | Six clips; close-up and recording detail |
| LOD1 game | 7,928 | 7 | 386,400 | 106,468 | Six clips; articulated cages, lens groups and iris |
| LOD2 distance | 2,650 | 1 | 81,924 | 27,636 | Derived, merged static charging silhouette |

Game and distance tiers meet the landmark targets. D0 only; damage states are independent of LODs. Plain self-contained GLBs contain no textures or external buffers. Meshopt copies are optional derived release previews, validated after decoding. Actual game gltfpack release output and reference-phone FPS remain pending.

## Runtime contract

- Metres; +Y up; +Z flight; ROOT and APERTURE at [0,0,0]; the beam exits along -Y.
- OPTICS_YAW and OPTICS_PITCH are engine-driven about the aperture. No clip keys either pivot. The tested aiming range is yaw ±35 degrees and pitch ±22 degrees.
- CAGE_OUTER, CAGE_MIDDLE and CAGE_INNER rotate about [0,5,0] at radii 19.2, 15.1 and 11.1 m. Reserve a 40.2 m diameter motion envelope, not merely the current pose bounds.
- LENS_CARRIAGE, FOCUS_COLLAR, APERTURE_IRIS, IRIS_MASTER and IRIS_BLADE_01 through IRIS_BLADE_08 name the optical mechanisms. Let the clips drive these parts unless replacing the entire optical controller.
- ARRAY_L, ARRAY_R, RADIATOR_L and RADIATOR_R are inherited lookup-only compatibility nodes with no wing hardware. SOL-88 uses Convergence; SOL-82 retains Arrays_Deploy unchanged.
- The seven original material names remain. M_Radiator_Glow controls the cage radiator sectors; M_Aperture_Glow and M_Nav_Light remain engine-driven emissive surfaces. Bloom is external.
- Auxiliary sockets moved with the new engine: SOCKET_ENERGY_CORE [0,8.1,0], SOCKET_SENSOR_FORWARD [0,5,3.5], SOCKET_THRUSTER_REAR [0,8.1,-2.5]. Read the manifest for positions and normals. All tiers agree.
- LOD2 retains identical named lookup transforms but its geometry is static. Swap to LOD1 before visible animation, steering or emissive response. Provisional loading policy: LOD2 first; approach at 150 m with 20 m hysteresis. LOD0 is manual cinematic selection.

## Clips and controller

| Clip | Duration | Type |
| --- | ---: | --- |
| Idle_Cycle | 24 s | Loop: charging motion |
| Convergence | 4 s | One-shot: phase alignment and optical opening |
| Firing_Cycle | 10 s | Loopable: continuous clear corridor; game must enforce a ten-second maximum |
| Recovery | 5 s | One-shot: close iris first, then separate cages |
| Aperture_Open | 0.6 s | One-shot: standalone optical opening |
| Aperture_Close | 0.6 s | One-shot: standalone optical closing |

Play one-shots once and clamp their final frame. Completed sequence endpoints match. Blend into Convergence when interrupting arbitrary idle motion, keeping the beam inhibited. Never infer firing permission from an open iris alone. Suppress the beam before Recovery or pass expiry.

The viewer's automatic demonstration lasts 4 + 10 + 5 seconds, then returns to idle. The consuming game must retain its 180-second pass interval, 20-second overhead period and ten-second energy budget while enforcing the new alignment gate. Start the bounded ten-second firing window on first burn after convergence; release suppresses the beam without restarting that window. Game-controller migration remains pending in the consuming repository.

## Review and reproduction

The sol88/ viewer offers all three tiers, plain/decoded Meshopt, full materials/wireframe, clip selection, timeline scrubbing, pass demonstration, tracking controls, emissive controls and orbit/aperture/flight/top/lens cameras. The optional clearance guide is viewer-only and is not an exported beam.

Run node tools/asset-pipeline/build-sol88.mjs and node tools/asset-pipeline/validate-sol88.mjs from the repository root. Geometry and choreography are authored in tools/asset-pipeline/sol88-syzygy.mjs. Run blender -b --python-exit-code 1 --python tools/blender/render_sol88.py to refresh the editable detailed review scene and poster. The Blender file retains the rig and six actions for manual editing; plain GLBs remain the runtime source of truth.

Validation covers all plain and decoded Meshopt tiers, Khronos validation on plain files, names, hashes, bounds, material vocabulary, clip durations and loop seams. The game-tier firing corridor is sampled with 3,321 rays per encoding across 41 phases, nine aiming combinations and a 0.75 m radius beam-clearance disk. This is sampled geometric evidence, not a physics simulation or proof of arbitrary steering beyond the declared limits.

The received docs/SOL-82-BRIEF.md remains the original SOL-82 contract; docs/SOL-88-SYZYGY.md defines this independent model. The original SOL-82 satellite remains active under assets/sol82/ and sol82/. Its historical archive is retained under source/archive/sol82-satellite-v1/. Hand off this commit plus assets/sol88/; the consuming game pins plain file hashes from manifest.json. Laser-lab cameras, final thresholds and reference-phone acceptance remain pending.

Model by jelaludo.
