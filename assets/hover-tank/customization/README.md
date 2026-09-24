# MÖRK livery customization

Workshop candidate, 25 September 2026. Models and original livery art by jelaludo. Hand-off: the commit containing this README plus `assets/hover-tank/customization/`. Game integration is pending.

Open `hover-tank/customize/` from an HTTP server at the repository root. Select Bunny Overdrive (pink rabbit chaos), Night Circuit (dark cyan circuitry), Field Notes (camouflage and brush lettering), or Factory. Edit three paints, finish, pattern, name, number, message and three marking zones. Orbit/zoom, camera shortcuts, factory comparison, damage, LOD, encoding, wireframe, turret elevation/yaw, power and fire/reload expose compatibility. Apply saves locally; Cancel restores the equipped design; Undo restores the previous edit. Change the design label to keep another copy. JSON import/export transfers recipes; PNG exports the current view. Browser local storage is not a game account save.

## Files and source of truth

- `models/lod0/`: detailed D0–D3, for close shots and recordings. Existing source geometry and animation retained.
- `models/lod1/`: game D0–D3, same articulated interfaces and clips as original game assets.
- `models/lod2/mork_d0.glb`: newly reduced, static intact distance/loading preview. One material, vertex colors and explicit `_PAINT_ROLE` data (loaded by Three as `_paint_role`). No animated aiming or fine decals. D1–D3 distance variants are not supplied; retain game tier for damaged units.
- `manifest.json`: measured metrics, bounds, sockets, clip durations, interface names, LOD policy, original hashes and output hashes. Original tank GLBs are untouched. Root placement, metre scale, +Y up and +Z forward remain inherited from MÖRK.
- `presets/`, `appearance.schema.json`, `art.js`, `runtime.js`: portable recipes and original procedural SVG artwork, no external font/image dependencies.
- `derived/meshopt/`: optional compressed copies. Plain package GLBs remain authoritative; game release compression remains game-owned.
- `derived/examples/`: three self-contained textured game D0 examples, including animation clips. `examples.json` measures these derivatives. They are demonstrations, not replacements for the plain base and recipe system.
- `decals/` and `previews/`: generated SVG/PNG art and Blender renders.

## Appearance contract

Primary armor, secondary edge armor and ivory stencil/accent materials are editable. All other materials, including ammo, power/lift, optics, fault and warning indicators, remain game-owned. Each appearance context clones its mutable materials and geometry; independently dressed tanks can share source geometry/materials safely. Dispose the context before disposing its base scene.

Patterns use deterministic box UV projection, not a bespoke artist unwrap. The user's requested patterns and lettering introduce optional textures to this package; this is an intentional extension of the usual texture-free export preference, not a change to `docs/ASSET-COLLABORATION.md`. Patterned examples use two 512×512 paint textures and one 1024×1024 alpha-tested marking atlas: 6 MiB RGBA8 base storage, approximately 8 MiB including mipmaps. Current contexts generate their own textures; a consuming game should cache immutable textures by normalized recipe and manage reference counts.

Three bounded zones: turret identification, left glacis badge and right glacis message. Projection clips to armor surfaces and is merged per moving parent. Turret marks follow `TURRET_YAW`; glacis marks follow `HULL_SUSPENSION`. D0/D1 retain all zones, D2 retains turret identification, D3 omits markings. Distance retains broad colors/pattern approximation only. Zone coordinates and state availability are in the manifest. Scale is 0.2–1.5, rotation ±180 degrees, with horizontal/vertical placement ±0.4 panel widths. Turret numbers also have an independent 0.4–1.6 scale. Atlas cells clip oversized/offset artwork to their own panel. Live input, numeric readouts, a selected-mark preview and close-up camera make edits visible while dragging. Selecting `none` hides that zone, including its text.

Recipes use schema version 1 and family `mork_hover_tank`. Names allow 18 characters, numbers 3, messages 24; supported uppercase stroke glyphs are A–Z, digits, spaces and `/!?-`. Runtime validation normalizes unsupported glyphs away and returns only known fields; the JSON Schema is stricter for authoring. Unknown versions/patterns/finishes or invalid paints/placements fail. `preset_id: factory` is reserved for exact restoration; edited recipes use `custom`. Store a normalized recipe beside the game vehicle ID and pinned asset revision; keep health, ammunition, loadout and motion separate. Optional `wear` (0–1) adds deterministic paint scratches, grime, roughness and faded/chipped marking ink. Distance uses broad muted paint only; wear does not affect health or protected functional indicators. Optional decal `offset_x`, `offset_y` default to 0 and `number_scale` defaults to 1. Older v1 recipes remain valid and default to clean paint. No arbitrary image uploads, attachments or gameplay effects are implemented.

## Runtime use

Use one context per loaded tank root; pass add-ons from the same Three version as your renderer:

```js
import { createAppearance, browserTexture } from './runtime.js';
// T = THREE; DecalGeometry and mergeGeometries are Three add-ons.
const appearance = createAppearance(T, gltf.scene, {
  lod: 1, damage: 0, DecalGeometry, mergeGeometries,
  textureFactory: (svg, options) => browserTexture(T, svg, options),
});
await appearance.apply(recipe);
// Engine continues driving original pivots and protected indicators.
// On state/tier replacement, create a new context with the same recipe.
appearance.dispose();
```

Await apply before equipping a recipe. The runtime rejects stale asynchronous texture work. Save/network serialization, ownership, unlocks and server validation are consuming-game responsibilities. On unsupported recipe versions, retain the last valid equipped recipe or explicitly select Factory; do not silently interpret a future schema.

## Measured cost and acceptance

| Export | Triangles | Rendered draws | Plain bytes |
| --- | ---: | ---: | ---: |
| Detailed D0 | 23,980 | 69 | 1,008,028 |
| Game D0 base | 6,742 | 69 | 459,436 |
| Each themed game D0 | 6,774 | 71 | 593,980–676,888 |
| Static D0 distance | 2,072 | 1 | 81,340 |

The three zones add 32 triangles and two draws in D0. The old 43-primitive count counts shared definitions; 69 is the actual rendered mesh count. This expansion does not consolidate the legacy tank's draws. All game damage states remain under the 25k unit triangle target; distance is optional for previews/loading because the current collaboration contract keeps units on a single runtime tier. Manifest thresholds are review metadata, not measured game recommendations.

Build from the repository root:

```sh
node tools/asset-pipeline/build-mork-customization.mjs
node tools/asset-pipeline/build-mork-livery-examples.mjs
node tools/asset-pipeline/validate-mork-customization.mjs
node tools/asset-pipeline/test-mork-customization-viewer.mjs
node tools/asset-pipeline/test-mork-marking-controls.mjs
python3 tools/build-workshop-docs.py
```

Render with Blender using `tools/blender/render_mork_liveries.py`. Validation covers original hashes, all plain/decoded exports, all recipes and supported states/tiers, protected indicators, independent tanks, factory restore, distance roles and asynchronous races. The viewer test uses real model data with a mocked renderer. All three presets have also been visually reviewed in desktop Safari and rendered previews. Three r180 is used here; consuming-game r160 compatibility, release gltfpack retention of `_PAINT_ROLE`, mobile behavior, in-game save/network wiring, game cameras and reference-phone performance remain pending. No FPS improvement is claimed.
