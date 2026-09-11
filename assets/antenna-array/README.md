# SKYWARD / Radio antenna array

An original 18 m steerable reflector antenna with a continuous paraboloid shell, rear radial bracing, secondary reflector and feed supports, a heavy fork mount, an azimuth race, a control cabinet and an anchored concrete pad. The low, medium and high versions share the silhouette and articulation axes. All tiers use one connected, smooth-shaded dish shell with a closed back and sealed boundary edges. Higher detail increases tessellation and adds rear truss diagonals, ladder hardware and drive motors; it does not add separate dish panels.

| Intact mesh | Triangles | Material batches |
|---|---:|---:|
| Low / game | 1,632 | 10 |
| Medium | 6,512 | 11 |
| High | 12,752 | 11 |
| Seven-dish scene | 11,652 | 74 |

There are twelve standalone exports: three detail levels × four destruction states. D0 is intact; D1 has a missing outer rim section but remains operational; D2 has a torn reflector sector, a damaged feed structure and fixed disabled pointing; D3 has a grounded detached dish and shortened broken fork towers. Each GLB includes its own geometry; these are selectable detail tiers, not an engine-managed LOD chain. Exact triangle counts and file sizes are in `manifest.json`. The seven-dish scene is 54.5% smaller in triangle count than the previous 25,620-triangle version; the high-detail antenna is down from 24,656 to 12,752 triangles.

The separate `skyward_array.glb` contains seven low-detail antennas on a compact Y layout, a small operations shelter and service routes. Adjacent pads are at least 40 m apart. It is a deliberately compact game diorama; it does not reproduce an observatory's physical layout or operating parameters.

## Continuous dish geometry

Each `continuous_reflector` component is one connected mesh with one material. The surface follows `z = 1.2 + r² / 26` in the Blender authoring frame, with a 9 m radius and 0.13 m shell thickness. A shared central fan and concentric rings replace the individual solid panel blocks. Only the actual perimeter and damage openings have sidewalls; there are no internal tile sidewalls or panel gaps. Smooth surface normals preserve a curved appearance. The outer support rail is also a continuous mesh.

| Shell tier | Radial segments | Rings | Front triangles | Complete shell triangles |
| --- | ---: | ---: | ---: | ---: |
| Low | 24 | 6 | 264 | 576 |
| Medium | 48 | 8 | 720 | 1,536 |
| High | 96 | 14 | 2,592 | 5,376 |

Low-tier bases omit small bevels and use simpler rear ribs. Medium/high retain the detailed mounts and hardware. D1–D3 are cut from the shared shell topology, with sealed exposed boundaries; the damaged surface remains one connected shell. The `component: continuous_reflector` marker is preserved for inspection and the shell stays separate from other mount geometry. The viewer's **Show mesh edges** option exposes the tessellation.

This reduces geometry rather than eliminating triangle rasterization or promising a frame rate. The previous exporter already batched panel draws; the main savings here are fewer vertices, faces and internal walls.

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
node tools/asset-pipeline/validate-reflector-shells.mjs
```

Editable source: `source/blender/a6-antenna-array.blend`. The array sits at the origin; standalone detail/damage studies are spaced behind it in initially hidden collections. Enable their viewport visibility in the Outliner to inspect them. Static geometry is combined by material within each moving assembly for efficient export. The Blender timeline runs at 30 fps over frames 0–1320.
