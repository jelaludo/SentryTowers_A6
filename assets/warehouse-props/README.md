# A6 logistics warehouse props

Six families, each with D0 intact, D1 bent, D2 crushed and D3 destroyed states: stackable cargo crate, reinforced secure case, hazard fuel barrel, armored expedition container, loaded cargo pallet, and a roofless loading-bay diorama.

The 14 × 12 m diorama reuses all five standalone prop families: one expedition container, one loaded pallet, one parts crate, one secure case and two fuel barrels. A full-depth rack supports the parts crate, a packing bench holds the secure case, and a containment tray supports the barrels. Low rear/side walls frame the open loading aisle; there is no roof or skylight.

Each instance records its source family and support height. The build positions its actual lowest geometry on that support, including damaged variants. The shared crates now have solid shells/lids, and pallet deck/load layers meet without hovering gaps. D1–D3 reuse the matching prop damage state, with bent dock edges and collapsed wall remnants.

Prop ruins preserve original parts. Crates retain corner posts, lid slats, placards, tie bands, exposed contents and bent panels. Secure cases retain reinforced lids and locks. Barrels retain rims, hazard rings, bung, placard, shell and fuel spill. Containers retain ISO castings, corrugated ribs, door slabs, latches and ID plates. Pallets retain deck boards, runners, wrap and shifted crates.

All assets use meters, +Y up, +Z forward, and the reserved plot origin at foundation height. GLBs are uncompressed first-pass exports. Sockets and collision boxes are planning metadata; engine physics, stack stability, swept vehicle damage, inventory transfer and runtime fracture remain integration work.

Preview: `warehouse-props/`. Editable source: `source/blender/a6-warehouse-props.blend`. Rebuild: `blender --background --python-exit-code 1 --python tools/blender/build_warehouse_props.py`. Validate: `node tools/asset-pipeline/validate-warehouse-props.mjs`.
