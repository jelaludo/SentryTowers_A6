# MÖRK / Armored transport containers

Models by **jelaludo**. Reuse terms: `../../../ASSET-LICENSE.md`.

Three self-contained 3D add-ons, each in original and game-ready detail, are available in the existing **hover-tank/** viewer under **Transport containers**:

- `mork_container_empty.glb`: empty carrier, doors and ramp open. Independent `Doors_Open` and `Doors_Close` clips, 2.4 seconds each.
- `mork_container_loaded.glb`: the same carrier with a complete, unscaled low-poly MÖRK inside, cannon forward. Doors and ramp open by default; the same door clips are included.
- `mork_container_diorama.glb`: a three-bay military deployment scene. **01** is sealed, **02** is open with a tank fully parked inside, **03** is open with another tank partially exiting. `Tank_Roll_Out` is an 8-second one-shot clip affecting only tank 03. The default presentation pose is 3.36 seconds into the rollout; playback can restart with the tank fully inside. The sealed unit omits hidden tank geometry.

The containers have olive armor, graphite external ribs, locking shoes, roof loading rails, cyan interior guide strips, amber ramp markings, double armored doors, and original angular military stencil numerals. The underside of the roof and backs of the doors are fully modeled. The viewer includes a roof cutaway, wireframe, front/perspective views and animation scrubbing.

## Game-ready tier and floor correction

The viewer defaults to **Low poly / game-ready**; use **Original detail** for the existing appearance. All variants retain the same bay dimensions, numbered stencils, tank placement and animation timings.

| Scene | Original triangles / draws | Game triangles / draws |
| --- | ---: | ---: |
| Empty container | 5,480 / 21 | 1,264 / 5 |
| Loaded container | 12,312 / 31 | 8,096 / 6 |
| Three-bay diorama | 30,260 / 85 | 17,612 / 18 |

Game files are `mork_container_low_empty.glb`, `mork_container_low_loaded.glb`, and `mork_container_low_diorama.glb`, listed in `manifest-low.json`. Small bevels, handles and fine lettering are omitted; the large unit numbers remain. Colors are baked into vertex colors using one opaque palette material, with one mesh per rigid/moving assembly. Preserve vertex colors in the consuming engine. The bundled tanks retain the existing low-detail silhouette, and their materials are combined into that palette; emission/metalness differences are simplified. The empty game carrier is the reusable asset for placing independently controllable tanks.

The original base deck and interior deck previously had coplanar top faces at Y=0.26, producing z-fighting visible as moiré on the floor. The structural deck now ends at Y=0.23, beneath the interior deck. The visible support surface remains Y=0.26. This geometry fix is in **both** tiers; the validation includes a ray test requiring exactly one exposed floor hit at that height.

## Fit and motion

Metres, +Y up, +Z forward in glTF. Each container has a **6.6 m wide × 14.2 m long** clear bay. Deck height is **0.26 m**. Minimum opening height is **3.29 m above the deck** at the front header; the ceiling is 3.61 m above the deck. MÖRK's neutral envelope, including the full cannon, is approximately **5.83 × 13.28 × 3.02 m**. Side clearance is approximately 0.39 m each; fore/aft clearance is 0.46 m each. Header clearance above the tank is approximately 0.27 m; roof clearance is approximately 0.59 m.

The tank's original root is shifted longitudinally by −2.00475 m in glTF to center the complete cannon-to-rear envelope in the bay. Included tanks are the original low-detail MÖRK geometry in a fixed, grounded transport pose, batched by material. Turret/weapon animations are not included in these staged scenes; the full controllable tank is still available in the Tank tab.

Door pivots swing outward 110°. The ramp folds upright when sealed. `ROOF_*` nodes can be hidden for inspection; `VEHICLE_*` nodes identify each tank. The deployment motion translates the hover tank straight forward and lowers it from the deck only after its rear clears the container. It is an authored movement, not a physics or wheel simulation. Use a one-shot action and hold the final frame. Closing the doors or traversing the turret during deployment is the game's responsibility.

The diorama has a hardstand; the empty and loaded standalone exports contain only the carrier and optional tank. Geometry is merged by material inside each rigid or animated assembly. Exported meshes use standard glTF materials without texture dependencies.

## Rebuild and checks

Editable source: `../../../source/blender/mork-containers.blend`. The game source is `../../../source/blender/mork-containers-low.blend`. The three scene collections are arranged separately in a gallery; animation tracks are muted for the editable default poses.

```sh
blender -b --python-exit-code 1 --python tools/blender/build_mork_containers.py
blender -b --python-exit-code 1 --python tools/blender/build_mork_containers.py -- --low
node tools/asset-pipeline/validate-mork-containers.mjs
```

The checks verify valid GLBs, scene inventory, the tank's complete neutral fit, open-door clearance, straight rollout, ground clearance and a stationary parked tank. All six files passed with zero glTF validator warnings. Use the viewer's cutaway to inspect the fit directly.
