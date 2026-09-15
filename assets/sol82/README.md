# SOL-82 orbital laser platform

SOL-82 is the gunship's higher-orbit laser platform. The owner named it as an homage to SOL-740 and 1982. It is primarily presented as cyan wireframe telemetry in the game, but the same topology also carries a complete carbon, gunmetal, cyan and warning-amber material treatment for arrival, firing and cooldown cut-ins.

The received game-design requirements are preserved in `docs/SOL-82-BRIEF.md`.

## How it works

SOL-82 is a stored-energy weapon, not a solar panel producing 120 MW directly. A shielded continuous-power core inside `ENERGY_SPINE` charges a 1.2 GJ pulse store between passes. The 52.55 m tracking wings support the spacecraft bus, cryocoolers and optical controls. During a firing opportunity, the pulse store drives a continuous 1.064 µm Nd:YAG optical train at the fictional 120 MW output specified by the game.

Phase-change heat sinks absorb the ten-second burn. Paired radiator vanes unfold and reject the accumulated heat while the platform leaves the firing window. Unused charge is dumped when the pass ends because retaining a hot, partially charged pulse store would destabilize the next thermal cycle. The armored octagonal bus, capacitor drums, guarded sensor prow and separated thruster pods give the platform its deliberate combat silhouette.

The platform is not visible in its own downward-looking scope. The game renders the beam, footprint, aim marker, ground glow, scorch, embers, smoke and HUD; none are modeled here.

## Delivered tiers

| Tier | File | Triangles | Draws | Plain bytes | Meshopt bytes | Motion |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Detailed master | `lod0/sol82_platform_detailed.glb` | 9,436 | 7 | 447,372 | 100,504 | Four clips; recording and close-up detail |
| Game | `lod1/sol82_platform_game.glb` | 4,940 | 7 | 264,808 | 69,912 | Four clips; arrival, departure and close orbit |
| Static distance | `lod2/sol82_platform_distance.glb` | 2,700 | 1 | 78,936 | 24,272 | No articulation; deployed sky silhouette |

LOD1 and LOD2 meet the collaboration-contract landmark budgets. The distance tier is one merged vertex-colour material and retains stable lookup nodes, but those nodes do not articulate its merged geometry. Swap to LOD1 before arrays, radiators, iris motion, emissive response or optics tracking must read. No FPS improvement is claimed until the game measures the candidate on the reference phone.

## Runtime contract

- Metres, +Y up, +Z direction of flight.
- `ROOT` is exactly at the centre of the beam exit aperture, not on an invented ground plane.
- `APERTURE` is also at `[0, 0, 0]`; its local and default world `-Y` axis points toward the planet.
- The engine may drive `OPTICS_YAW` and `OPTICS_PITCH`. No delivered clip keys either pivot.
- `ARRAY_L` and `ARRAY_R` are sun-tracking hinges. `RADIATOR_L` and `RADIATOR_R` are thermal-deployment hinges.
- Bloom intensity is engine-driven through `M_Radiator_Glow`, `M_Aperture_Glow` and `M_Nav_Light`.
- The full-material and primary wireframe presentations share the same model; no duplicate wireframe GLB is shipped.
- D0 only. Damage levels D1–D3 are intentionally absent because SOL-82 cannot currently be damaged.

## Clips

| Clip | Duration | Loop | Purpose |
| --- | ---: | --- | --- |
| `Arrays_Deploy` | 2.5 s | no | Solar wings and thermal radiators unfold on arrival. |
| `Aperture_Open` | 0.6 s | no | The ventral iris retracts before the first burn. |
| `Aperture_Close` | 0.6 s | no | The iris closes after energy exhaustion or pass departure. |
| `Idle_Cycle` | 8.0 s | yes | Slow tracking creep and a restrained navigation-light rhythm. |

Play one-shots once and clamp their last frame. The iris clips are inverse states. Runtime optics tracking can continue while array, aperture or idle motion plays because the clips never bind `OPTICS_YAW` or `OPTICS_PITCH`.

## Materials

The articulated tiers contain exactly seven named material primitives: `M_Hull_Carbon`, `M_Hull_Gunmetal`, `M_Ours_Cyan`, `M_Warning_Amber`, `M_Radiator_Glow`, `M_Aperture_Glow` and `M_Nav_Light`. There are no textures or external files. LOD2 intentionally consolidates these into `M_SOL82_DISTANCE_VERTEX_PALETTE`.

Plain GLB is source of truth. Meshopt copies are optional derived release previews and are decoded during validation. Production source is `tools/asset-pipeline/build-sol82.mjs`; `source/blender/sol82-orbital-laser.blend` is the editable review/recording scene.

Rebuild and validate:

```sh
node tools/asset-pipeline/build-sol82.mjs
node tools/asset-pipeline/validate-sol82.mjs
blender -b --python-exit-code 1 --python tools/blender/render_sol82.py
```
