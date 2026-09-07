# SKYWARD / Radio antenna array

An original 18 m steerable reflector antenna with a segmented bowl, rear radial bracing, secondary reflector and feed supports, a heavy fork mount, an azimuth race, a control cabinet and an anchored concrete pad. The low, medium and high versions share the silhouette and articulation axes. Higher detail adds panel subdivisions, rear truss diagonals, ladder hardware and drive motors.

| Intact mesh | Triangles | Material batches |
|---|---:|---:|
| Low / game | 3,504 | 11 |
| Medium | 10,160 | 12 |
| High | 24,656 | 12 |
| Seven-dish scene | 25,620 | 81 |

There are twelve standalone exports: three detail levels × four destruction states. D0 is intact; D1 has missing/scorched outer panels but remains operational; D2 has a torn reflector sector, a damaged feed structure and fixed disabled pointing; D3 has a grounded detached dish and shortened broken fork towers. Each GLB includes its own geometry; these are selectable detail tiers, not an engine-managed LOD chain. Exact triangle counts and file sizes are in `manifest.json`.

The separate `skyward_array.glb` contains seven low-detail antennas on a compact Y layout, a small operations shelter and service routes. Adjacent pads are at least 40 m apart. It is a deliberately compact game diorama; it does not reproduce an observatory's physical layout or operating parameters.

## Motion and integration

Working antennas contain one **Array_Slew** clip, 44 seconds long. The loop holds its starting bearing, eases through two deliberate repositioning moves, pauses to settle, and returns smoothly to its starting pose. All seven array mounts use the same time and orientation. D2/D3 have no operating animation.

GLB uses meters and +Y up. The `control: azimuth` node rotates about local Y. Its child with `control: elevation` rotates the dish around local X; zero tilt points to zenith, and the authored tilt is 90° minus the desired elevation. The nominal working elevation range is 15–85°. Stop the clip before driving the two controls directly. Each antenna root has `role: antenna`; array copies also carry `array_index`. The base stays fixed while the fork and reflector move independently.

The array export shares repeated mesh data where possible. Clone or instance the low-detail assembly in your engine for larger populations, while retaining per-mount transforms for articulation. The workshop loads the low-detail scene by default; select **Single antenna** to compare all detail/damage combinations. Runtime collision, signal simulation and LOD switching belong to the consuming game.

## References and reuse

Visual references: [NRAO's VLA dish](https://public.nrao.edu/gallery/vla-dish-dipped-in-the-barn/) and [ALMA antenna assemblies](https://www.almaobservatory.org/en/about-alma/how-alma-works/technologies/antennas/). SKYWARD is an original workshop design. Reuse with attribution to **jelaludo**, as described in [the model reuse notice](../../ASSET-LICENSE.md).

## Rebuild

```sh
blender --background --python-exit-code 1 --python tools/blender/build_antenna_array.py
node tools/asset-pipeline/pack-antenna-array.mjs
node tools/asset-pipeline/validate-antenna-array.mjs
```

Editable source: `source/blender/a6-antenna-array.blend`. The array sits at the origin; standalone detail/damage studies are spaced behind it in initially hidden collections. Enable their viewport visibility in the Outliner to inspect them. Static geometry is combined by material within each moving assembly for efficient export. The Blender timeline runs at 30 fps over frames 0–1320.
