# KORP / GS01 heavy gunship

Models by jelaludo. Original external visual game asset, authored through Blender MCP. Petrol/slate armor, angular nacelles, cyan recessed lights and yellow service accents share MÖRK's manufacturer identity.

## Export contract

Self-contained plain GLBs are the source of truth. No textures or external buffers. Meters, +Y up, +Z forward. `KORP_ROOT` is at ground level and the 30 × 32 m plot center. The landing pads reach Y=0 in the default deployed rest pose. All tiers use the same origin and engine-facing empty-node names without dots. Only the intact D0 state is authored; D1–D3 are not supplied or implied.

| Tier | Triangles | Draw calls | Use |
| --- | ---: | ---: | --- |
| LOD0 | 5,228 | 50 | Detailed presentation, multiple metal/paint/emissive materials |
| LOD1 | 2,472 | 16 | Game unit, one shared vertex-color material, separate moving assemblies |
| LOD2 | 1,218 | 1 | Optional static parked/map/loading proxy |

LOD1 is below the developer's 25k unit target. Its 16 draws preserve independent mechanical assemblies; the landmark ten-draw target does not apply to this articulated unit. LOD2 retains named empty nodes for integration, but its mesh is fully merged: rotating an empty cannot articulate that tier. It represents a parked/rest configuration, not a match for an in-flight animated pose. Do not automatically swap an animated close-up into this proxy without accepting the pose change. The game may instead retain LOD1, as its unit policy recommends.

The optional `MARKING_GS01` group contains GS01 text geometry in LOD0/1. Hide the group to remove the marking, or replace its child mesh to use another identifier. The distance tier omits lettering. The editable Blender file contains only the KORP scenes, not the unrelated project open during authoring.

## Engine-driven nodes (not baked into clips)

- `GUN_L_YAW`, `GUN_R_YAW`, `GUN_HEAVY_YAW`: local Y rotation, viewer limits ±12°.
- `GUN_L_PITCH`, `GUN_R_PITCH`: local X from 0° forward to +70° downward.
- `GUN_HEAVY_PITCH`: local X from 0° to +60° downward.
- `ENGINE_FL_PITCH`, `ENGINE_FR_PITCH`, `ENGINE_RL_PITCH`, `ENGINE_RR_PITCH`: local X from 0° cruise to −90° hover. Mounts move independently. This is stylized visual articulation, not an aerodynamic simulation.

Aim weapons downward while airborne. Exported coordinates describe a landed rest pose; the viewer raises the whole ship for flight. Muzzle-ray clearance against the hull is checked at forward/intermediate/maximum pitches and lateral limits. The checks do not constitute a complete physical collision model for every moving part.

`SOCKET_MUZZLE_L`, `SOCKET_MUZZLE_R`, `SOCKET_MUZZLE_HEAVY` provide +Z projectile origins. Exhaust sockets are at the rear of each engine; their outward direction is local −Z. `SOCKET_CARGO`, `SOCKET_CENTER_OF_MASS`, `SOCKET_NOSE` are attachment/reference points. Manifest socket positions are measured in the rest pose; query animated nodes at runtime. The rear opening is a service bay, not a certified MÖRK tank/container fit.

## Animation clips

| Clip | Duration | Meaning |
| --- | ---: | --- |
| `Rotary_Cycle` | 1 s, loop | Both six-barrel assemblies rotate |
| `Rotary_Fire` | 0.6 s, one-shot | Rotary mount recoil and return |
| `Heavy_Fire` | 0.6 s, one-shot | Heavy barrel recoil and return |
| `Gear_Retract` | 2 s, one-shot | Three landing supports fold into flight position |
| `Gear_Deploy` | 2 s, one-shot | Return to deployed landing supports |
| `Ramp_Open` | 2 s, one-shot | Rear service ramp lowers 75° |
| `Ramp_Close` | 2 s, one-shot | Rear service ramp returns upright |

LOD0 and LOD1 have matching named clips and engine pivots. LOD2 has no clips. Clamp one-shots at the end if the pose must remain. Aiming, engine tilt, ship motion, muzzle particles and projectile spawning are engine responsibilities. Viewer presets are not extra exported flight clips.

## Hand-off and reproduction

Pin the published commit plus folder `assets/korp/`. `manifest.json` records bytes, triangles, draw calls, LOD, damage, plot, sockets, clip durations and credit. The ZIP contains all plain GLBs, manifest and this README. The game can apply its normal `gltfpack -cc -kn -km -ke` release compression.

Editable source: `source/blender/korp-gunship.blend`. Authoring script: `tools/blender/build_korp.py`. In Blender MCP execute the script into an isolated namespace, call `build(0)`, `build(1)`, `build(2)`, then `export_all()`. It creates new scenes and restricts GLB export to the active scene. Do not repeatedly rebuild without disposing your previous generated KORP scenes. Validate using `node tools/asset-pipeline/validate-korp.mjs`.

Roof-panel revision: front glazing and applique plates follow the hull slopes; rear hatches sit on the appropriate roof surface. Shallow spine chamfers are limited by section height to prevent folded faces.
