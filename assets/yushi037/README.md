# Yūshi037 / Bio-Dome

有機性資源コンテナ 第037型 — organic-resource container, version 037. Display spelling uses the long vowel **ū**; ASCII filenames, URLs and engine identifiers use `yushi037`. A separate second biomass-container design, not a replacement or LOD of Yūshi045.

## Purpose and design

ISAO mixes this container's dense organic binder concentrate with local regolith and mineral aggregate to make foundations, walls and repair material on remote planets. Yūshi037 is a low half-ellipsoidal tank on an octagonal skid for prepared construction yards. It trades the Bio-Pearl's rough-terrain tripod and gravity-fed outlet for a broad support base and a pumped extraction cassette.

The pale dome, four protective straps, low maintenance hatch and dark skid form the main silhouette. Eight shoulder segments show capacity from an elevated game camera; a narrow recessed sight well shows olive-green slurry behind optional glass. There is no fully transparent tank, hidden fluid volume, refraction, texture, particle system or fluid simulation. Pumping adds only subtle shader motion. No technology chronology or gameplay superiority is implied by the model numbers.

## Measured exports

| Tier | Triangles | Opaque draws | Optional glass draw | Plain bytes | Meshopt bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Detailed / LOD0 | 6,506 | 2 | 1 | 238,664 | 73,480 |
| Game / LOD1 | 1,134 | 2 | 1 | 53,484 | 22,696 |
| Static distance / LOD2 | 386 | 1 | 0 | 23,720 | 10,636 |

All tiers have the same approximately 3.66 × 1.9425 × 3.9025 m bounds. Reserve a 4.4 × 4.4 m plot including fittings. The shell itself is 3.30 m wide and 1.35 m high above its 0.40 m base plane. Game geometry meets the 1,500-triangle kit-piece target. Distance is separately authored static geometry, not a lossy derived simplification. Plain self-contained GLBs are the source of truth; Meshopt copies are derived compression previews validated after decoding. D0 only; no damage variants or baked clips.

## Engine contract

Metres, +Y up, +Z toward the sight well and outlet, ROOT at ground level and plot centre. Node names and sockets remain stable across tiers. YUSHI_BODY is the merged opaque body. Optional YUSHI_GLASS becomes a lookup-only node at distance. DISPENSE_VALVE rotates around local +Z from 0 to π/2 when dispensing; VALVE_HANDLE is separate in LOD0/1 and merged into the static body in LOD2. Do not animate distance lookup nodes.

| Node | Position metres | Outward normal | Purpose |
| --- | --- | --- | --- |
| SOCKET_DISPENSE | 0, 0.48, 2.0725 | +Z | Pumped extraction connection |
| SOCKET_FILL | -1.805, 0.57, 0 | -X | Supply inlet |
| SOCKET_SERVICE | 0, 1.8725, 0 | +Y | Top maintenance hatch |
| SOCKET_ISAO_APPROACH | 0, 0.65, 2.6 | -Z | External approach marker, outside plot |
| LEVEL_READOUT | 0, 1.7, 1.1 | — | Capacity-label anchor |

The approach marker is not a collision-checked docking trajectory. Actual ISAO clearance, hose routing, inventory and material recipes belong to the consuming game. These socket coordinates differ from Yūshi045; do not reuse its docking transform.

## Live capacity

Import this family's `createYushiController` from `runtime.js`, passing the game's Three.js instance and loaded scene:

```js
const tank = createYushiController(THREE, gltf.scene, {
  fill: inventoryFraction, state: 'ready', glass: true
});
tank.setFill(inventoryFraction); // finite fraction, clamped to [0,1]
tank.setState('dispensing');     // empty / filling / ready / dispensing
tank.update(elapsedSeconds);    // visual only; never consumes inventory
// Carry fraction/state into the next tier's controller. Dispose on removal.
tank.dispose();
```

Capacity is volume, not linear height: for the upper half-ellipsoid, `fraction = 1.5t − 0.5t³`, where t is the normalized height above the base plane. Half capacity is about 34.73% of the internal height. The adapter inverts that relationship; **do not substitute the full-ellipsoid Yūshi045 adapter**. The shoulder gauge spans all inventory values. The sight well's upper end is below the hatch and its lower end partly protected by the outlet cassette, so use the gauge as the full-range authoritative readout. Plain GLBs without the adapter show an explicit 50% reference pose.

Preserve the custom `_YUSHI` attribute (Three.js `_yushi`): role, normalized height/gauge coordinate, window-local x. Missing attributes are rejected. Meshopt previews preserve it; game release gltfpack preservation and Three.js r160 shader integration remain to be verified. The Workshop uses r180. Glass is a small alpha-blended cover with no transmission, disabled for the instanced yard and omitted at distance.

## Viewer and integration review

The viewer offers empty/half/full presets, a continuous capacity slider, filling/dispensing demonstration and pause, glass/wireframe switches, three tiers, plain/Meshopt selection, four cameras and a 25-container yard. The yard shares capacity across all instances and uses two opaque instanced meshes in the game tier; independent per-instance capacity needs an additional game shader attribute. No FPS claim is made.

LOD2 loads first, with provisional approach at 150 m and 20 m hysteresis. LOD0 is for close shots and recordings; LOD1 retains valve articulation; LOD2 retains shader-driven capacity but fixed geometry. Confirm camera thresholds, actual game release output, docking and reference-phone performance before treating this as game-reviewed.

## Reproduction and hand-off

Run `node tools/asset-pipeline/build-yushi037.mjs`, then `node tools/asset-pipeline/validate-yushi037.mjs`. Geometry is authored in `tools/asset-pipeline/yushi037-shape.mjs`. Run `blender -b --python-exit-code 1 --python tools/blender/render_yushi037.py` for the editable detailed master and Workshop poster. Blender shows the static 50% reference pose.

Hand off the containing commit plus `assets/yushi037/` including runtime and manifest. Editable master: `source/blender/yushi037-bio-dome.blend`. Credit: Model by jelaludo.
