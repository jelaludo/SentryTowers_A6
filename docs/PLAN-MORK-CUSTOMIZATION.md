# MÖRK customization expansion

Planning proposal · 25 September 2026 · Workshop candidate implemented; game integration pending.

Implementation: `hover-tank/customize/` and `assets/hover-tank/customization/README.md`. Factory, Bunny Overdrive, Night Circuit and Field Notes are available with paints, patterns, markings, identity, local saves and portable recipes. The following describes the wider expansion; equipment, uploads, game persistence/networking and performance acceptance remain future work.

Make each MÖRK recognizable as its owner's vehicle while preserving its manufacturer identity, combat readability, animation hierarchy and performance. Start with cosmetic customization; equipment upgrades and attachments are a separate expansion.

## Player-facing result

An in-game garage shows the player's tank at full scale with five appearance panels: Paint, Pattern, Markings, Identity and Presets. Selecting a panel highlights editable regions on the tank. Changes preview immediately; Apply saves the livery, Cancel restores the equipped appearance. Front, side, rear and turret camera shortcuts make placement easy.

Example: an ivory hull, charcoal edge armor, ochre recognition stripe, a black moth on the turret, a small hull-side squadron badge, vehicle number 06 and the name DUST MOTH. The same identity remains recognizable when the turret turns, the tank takes damage, or the camera moves to map distance.

| Control | Initial scope | Boundaries |
| --- | --- | --- |
| Paint | Primary armor, secondary armor, selected trim/accent | Metal internals, optics, warning marks and combat indicators retain authored meanings. |
| Finish | Matte, satin, factory finish | Bounded material presets; no unrestricted reflectivity/emission slider. |
| Pattern | Solid first; broad two-tone bands and a simple camouflage pattern next | Patterns follow author-controlled masks, never cover lenses, vents or ammunition indicators. |
| Decals | Curated badges, emblems, stripes and unit marks | Fixed supported zones; bounded position/scale/rotation within each zone. No arbitrary whole-tank projection in v1. |
| Identity | Short vehicle name, number and squadron badge | Player identity belongs to the game save, not a renamed engine node. Text bounds and fallback glyphs are explicit. |
| Wear | Fresh, field-used, veteran visual presets | Cosmetic wear does not repair or conceal structural damage. Start with authored finishes; surface wear masks are a later step. |
| Presets | Factory, curated liveries and saved player designs | Reset to Factory, duplicate, rename, import/export a versioned appearance recipe. |

Proposed decal zones: left/right turret cheeks, front glacis, left/right nacelle outer panels and rear hull identification plate. The first delivery should choose three particularly readable zones, then extend coverage after movement and damage checks. Left/right mirroring is optional and does not reverse lettering.

## What exists today

The game D0 export has 43 mesh primitives and 10 materials, including separate `Mork armor / midnight petrol` and `Mork edge armor / slate`. D1 has 44 primitives. Some meshes have UVs, but that does not establish a coherent decal-ready atlas. Material batching means callout labels are not independently paintable meshes.

The intact distance export is 1,706 triangles, one material and one draw, with baked vertex colors. Detailed/game D0–D3 exist; distance D1–D3 do not. Preserve that distinction rather than promising customized damaged distance models.

The current viewer shares materials between meshes and independently clones ammunition-lens materials. A livery adapter must own per-tank material instances or correctly keyed shared appearance materials so painting one tank cannot repaint another or overwrite live ammunition state.

## Inside this repository

Keep current GLBs and their source intact during the prototype. Add a versioned customization package under the existing family, rather than exporting a GLB for every possible color combination.

```text
assets/hover-tank/customization/
  manifest.json             # Compatibility, paint roles, decal zones, defaults
  appearance.schema.json    # Portable player-appearance recipe
  presets/                  # Factory and curated livery recipes
  decals/                   # Licensed original decal sources; optional atlas
  runtime.js                # Apply/reset appearance; no inventory or combat state
  README.md                 # Integration and fallback rules
hover-tank/customize/       # Workshop authoring and QA viewer
```

Add paint-role metadata at source/export time: primary, secondary, accent and protected. Map existing materials explicitly; do not guess roles from their current colors or broad name substrings. Splitting selected accent surfaces must be measured rather than multiplying material batches indiscriminately.

Author decal-zone transforms, bounds and matching surface geometry in the appropriate moving assembly. A turret mark follows `TURRET_YAW`; a recoil/barrel mark, if later offered, follows its actual weapon part; a nacelle mark follows the relevant nacelle. Preserve all existing pivot, socket and clip identifiers.

The workshop editor is a QA/authoring tool: swatches, presets, decal placement, typography, undo/reset, two independently customized tanks, reference lighting, damage/LOD toggles, aim/recoil/power tests and a plain/decoded export comparison. It exports an appearance JSON recipe and preview image. A separately requested baked GLB would be labeled a derivative, never the authoritative source.

The shared navigation should be added to this nested viewer through the documentation builder, extending its route discovery if necessary. The current builder scans only one-level asset routes.

## Rendering and LOD strategy

1. **Paint:** recolor explicit armor roles without changing geometry. Preserve shading, surface detail and damage materials. Adapt the distance build to retain semantic paint regions instead of relying solely on baked colors. Prototype the region-data format and validate release compression before fixing it as a contract.
2. **Decals:** prototype small fitted surface patches on supported panels. Attach and batch them by moving assembly, not as one mesh per sticker. Check surface offset at grazing angles and after compression. Target at most two additional game draws for the first three zones; measure before promising that budget.
3. **Patterns/expanded markings:** move toward a shared UV/mask and decal atlas when the prototype proves the authoring layout. An optional small texture atlas extends the present texture-free workflow; document that capability and ship a factory fallback. Keep detailed/game placement aligned. Prebaked or shader-composited markings may ultimately avoid overlay draws, at the cost of texture/shader complexity.
4. **Distance:** retain primary/secondary colors and broad recognition marks in one material/draw. Drop small lettering and fine decals. Do not create one mesh/material per player or one new GLB per livery. Many unique skins need an explicit batching policy: instance colors where supported, share materials for identical recipes, and budget atlas memory for unique markings.
5. **Damage:** reapply the recipe to surviving panels of D1–D3. Broken-off parts retain their paint where authored; destroyed panels do not leave floating decals. Scorch, exposed metal and structural breaks take precedence over cosmetic paint. Unsupported zones are omitted predictably, with no change to saved appearance.

## Inside a game

The asset package owns paint roles, decal definitions, compatibility and rendering. The game owns vehicle/player IDs, unlocks if desired, names, persistence, network replication and resource/combat state.

Save a small recipe referencing the MÖRK asset version, customization schema version, colors, finish/pattern IDs, decal IDs and transforms, and vehicle identity. Do not save a duplicated model or GPU textures in each vehicle record. Treat preset definitions as versioned data so updates do not silently alter an equipped design.

On spawn or damage/LOD swap: load the correct model, restore gameplay pose/state, apply the appearance recipe through the shared adapter, then apply authoritative team/combat indicators. A missing decal or newer unsupported option falls back gracefully to the factory appearance or supported fields. Reapplying appearance must not reset ammo, power, recoil or aim.

For multiplayer, replicate the validated recipe and identifiers; peers reuse local assets. Curated decals keep the first version straightforward. User-uploaded imagery is a later feature requiring its own storage, dimensions, moderation, cache and distribution design. Team recognition remains legible independently of the chosen livery.

## Delivery sequence and acceptance

1. **Paint proof:** two independently colored D0 tanks, factory restore, recipe import/export, protected indicators and persistence through viewer reload. Confirm compatibility with the consuming renderer before altering authoritative exports.
2. **Livery workshop:** three decal zones, curated emblems, number/name, a few finishes and curated presets; exercise turret motion, recoil, power and damage swaps. Publish measured draw/byte/texture costs.
3. **Production family:** author consistent roles/zones across detailed/game D0–D3, implement intact distance-color fallback and validate all plain/decoded exports. Preserve existing files until the new candidate is reviewed and pinned by commit plus folder.
4. **Game garage:** wire save/load, preview/apply/cancel, spawn/respawn, network appearance and game-owned team indicators. Review in garage, third-person and map cameras on the reference phone.
5. **Later options:** patterns, wear masks, custom uploaded decals and cosmetic attachments. Attachments require socket/clearance/LOD work and must preserve the verified tank dimensions or explicitly revise them.

Acceptance includes two different tanks without material cross-talk, correct marks on moving/broken parts, no decal z-fighting, preserved ammo/status colors, visual continuity through LOD/state changes, recipe-version fallback, decoded compression validation and measured game performance. No FPS improvement is assumed. The existing D0 game export's 43 shared primitive definitions (69 rendered mesh draws) are a baseline, not a claim that MÖRK already has a low draw count.

Recommended first slice: three paint roles, three decal zones, a vehicle number/name and four saved presets, demonstrated in the workshop before game UI integration.
