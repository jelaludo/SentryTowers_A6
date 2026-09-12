# A6 ammunition library

Models by jelaludo. 18 new stylized families plus DART, NEEDLE and TALON referenced from the existing missile kit. External visual game assets, with artistic proportions; class names are visual associations rather than manufacturing dimensions.

Open `../../ammunition/` through the site for an orbit viewer, equipment/category filters, detail/form controls, wireframe and normalized or relative-size lineups. Legacy flight clips remain in the motion lab.

## Asset forms

- `round`: complete ammunition prop, including casing. Use for magazines, racks and displays.
- `projectile`: the part to move during a firing animation. Use this for flight, not the complete round.
- `case`: separate empty casing with cosmetic mouth recess, for ejection or ground dressing.

The five cartridge families and two tank families have all three forms. Mortars, heavy shells and missiles are standalone projectiles. Each new form has `game` and `display` versions. No automatic companion mounting or new firing animations are added to sentries.

## Budgets

| Game flight projectile | Triangles | Draw calls |
| --- | ---: | ---: |
| Rotor light / heavy | 22 | 1 |
| Needle .50-style / 20 / 30-class | 30 | 1 |
| MÖRK arrowhead / long-rod dart | 62 / 94 | 1 |
| Mortars | 126 | 1 |
| Heavy shells | 110 | 1 |
| SCOUT / KESTREL / MONOLITH | 142 | 1 |
| SKIMMER cruise | 158 | 1 |

Game meshes use one vertex-color material per asset, no textures, and no bevel modifiers. Share geometry and materials and use GPU instancing for repeated projectiles. Shadow casting can be disabled on tiny moving bullets. These are mesh budgets, not measured frame-rate claims. Display versions use higher radial resolution and separate metal/paint materials. Gold, steel, bronze and copper finishes combine with yellow, blue, green and dark tips.

## Coordinates and reuse

New exports are in meters, +Y up, +Z forward. The origin is the center of the rear/base face. `TIP_SOCKET` and missile `EXHAUST_SOCKET` empty nodes provide attachment positions (Blender may append numeric name suffixes). Models are static and launcher-independent. Animate the root in your engine, or add these assets to motion-lab experiments later. The library displays them upright by applying a viewer-only rotation. Equal-height comparison rescales each item independently; relative-size view preserves exported proportions.

`manifest.json` lists family, suggested equipment associations, form, detail tier, relative file path, size, triangle/draw budgets and file size. Companion suggestions are metadata, not physical fit guarantees. Legacy entries retain their existing motion root and animation clips and reference `../missile-kit/`; their geometry and files are unchanged.

The ZIP preserves `ammunition/` and `missile-kit/` sibling folders, including the referenced legacy files. Editable source: `source/blender/ammunition-library.blend` in the repository. The Blender source gallery is normalized for editing; individual GLBs keep their manifest dimensions. Rebuild with `tools/blender/build_ammunition.py`; validate with `node tools/asset-pipeline/validate-ammunition.mjs` after installing pipeline dependencies.
