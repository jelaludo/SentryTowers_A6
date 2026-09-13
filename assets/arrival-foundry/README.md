# AFR-01 Seed Foundry

AFR-01 is ISAO-Birudorōn's first construction after the SH02 lands. It uses a reused articulated service arm to remove rocket structure, sorts and processes that recovered fraction with local silicate/regolith and carried additives, then fills a repurposed cargo-barrel form with ferroceramic construction feedstock for Stålheart.

## Delivered vertical slice

The first authored sequence is intentionally one panel-to-barrel cycle. It proves the diegetic chain before a complete SH02 dismantling map is produced:

1. `SALVAGE_ARM_*` aims the cutter at `SALVAGE_PANEL_00`.
2. `CUTTER_SPARKS` previews the socket-driven blue cutting arc.
3. The panel transfers into `SOCKET_SCRAP_INPUT`.
4. `INDUCTION_CHAMBER` pulses and `SEPARATOR_DRUM` rotates.
5. `BARREL_FILL_INDICATOR` rises until the feedstock barrel is ready.

`rocket_salvage_stage` is separate from damage level and LOD. SH02 remains a separate preserved asset and is not embedded in these files. The Workshop viewer composes it as context at the documented site transform.

## Tiers

| Tier | File | Triangles | Draws | Plain bytes | Meshopt bytes | Motion |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Detailed master | `afr_01_seed_foundry_d0_lod0.glb` | 6,788 | 41 | 439,772 | 176,428 | Two clips; exact source arm and relabeled barrel structure |
| Game | `afr_01_seed_foundry_d0_lod1.glb` | 1,660 | 8 | 92,728 | 42,504 | Two clips; rigid-weighted service-arm proxy |
| Static distance | `afr_01_seed_foundry_d0_lod2.glb` | 1,228 | 1 | 52,224 | 19,336 | No animation or skin |

The game and distance files meet the collaboration-contract landmark targets. This is measured export cost for AFR-01 only; the separately loaded SH02 context must be included when profiling the complete scene. No FPS improvement is claimed.

The detailed tier reuses the exact articulated geometry from `assets/assembly-line/robotic_arm_d0.glb`. It reuses the structural barrel geometry from `assets/warehouse-props/fuel_barrel_d0.glb`, omits the misleading fuel placard and applies an AFR cyan collar/material treatment. The game and distance tiers are derived proxies. Source hashes and roles are recorded in `manifest.json`.

## Clips and events

| Clip | Duration | Loop | Purpose |
| --- | ---: | --- | --- |
| `Recycle_Panel_To_Barrel` | 16.0 s | no | Complete cutter, transfer, processing and fill demonstration |
| `Foundry_Process_Cycle` | 4.0 s | yes | Separator rotation and chamber pulse while material remains queued |

Runtime event cues are `CUTTER_ARC_ON` at 2.0 s, `CUTTER_ARC_OFF` at 5.1 s, `SCRAP_ACCEPTED` at 10.0 s and `BARREL_READY` at 15.0 s. The preview spark geometry communicates timing, but the game should replace it with VFX emitted from `SOCKET_CUTTER_TIP` toward the active rocket salvage target.

## Integration

- Metres, +Y up, +Z forward. `ARRIVAL_FOUNDRY_ROOT` is at ground level in the centre of a 16 × 12 m module plot.
- Move the complete root. Preserve `SALVAGE_ARM_WAIST`, `SALVAGE_ARM_SHOULDER`, `SALVAGE_ARM_ELBOW`, `SALVAGE_ARM_WRIST` and `SEPARATOR_DRUM` pivots in LOD0/LOD1.
- LOD2 contains stable lookup nodes but its one merged geometry does not articulate.
- Keep barrels instanced by gameplay rather than baking accumulated inventory into each salvage state.
- The Workshop context places the SH02 root at `[-6.8, 0, 0]`. Confirm that transform in the actual landing composition before pinning it.
- Only D0 is authored. Future damage states remain distinct from `rocket_salvage_stage`.
- Plain GLB is source of truth. Meshopt files are optional decoded-validation derivatives.

Rebuild and validate:

```sh
node tools/asset-pipeline/build-arrival-foundry.mjs
node tools/asset-pipeline/validate-arrival-foundry.mjs
```

Production source: `tools/asset-pipeline/build-arrival-foundry.mjs`. Game-camera composition, reference-phone performance, sound the complete SH02 section map, sound package and D1–D3 remain pending.
