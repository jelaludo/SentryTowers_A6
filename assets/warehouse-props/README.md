# A6 logistics warehouse props

Six families, each with D0 intact, D1 bent, D2 crushed and D3 destroyed states: stackable cargo crate, reinforced secure case, hazard fuel barrel, armored expedition container, loaded cargo pallet, and a shelf warehouse scene.

The warehouse has two braced shelf aisles, three shelf levels, stacked cargo, a loading dock and ramp, skylight, end-wall light strips, and a marked logistics bay. D3 keeps a collapsed shelf deck, original cargo pile, broken skylight, and fallen dock light.

Prop ruins preserve original parts. Crates retain corner posts, lid slats, placards, tie bands, exposed contents and bent panels. Secure cases retain reinforced lids and locks. Barrels retain rims, hazard rings, bung, placard, shell and fuel spill. Containers retain ISO castings, corrugated ribs, door slabs, latches and ID plates. Pallets retain deck boards, runners, wrap and shifted crates.

All assets use meters, +Y up, +Z forward, and the reserved plot origin at foundation height. GLBs are uncompressed first-pass exports. Sockets and collision boxes are planning metadata; engine physics, stack stability, swept vehicle damage, inventory transfer and runtime fracture remain integration work.

Preview: `warehouse-props/`. Editable source: `source/blender/a6-warehouse-props.blend`. Rebuild: `blender --background --python-exit-code 1 --python tools/blender/build_warehouse_props.py`. Validate: `node tools/asset-pipeline/validate-warehouse-props.mjs`.
