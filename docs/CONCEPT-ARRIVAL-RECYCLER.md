# Arrival recycler / first ISAO build

**Status:** first panel-to-barrel vertical slice delivered as a contract candidate; complete SH02 dismantling stages and game-side acceptance remain pending.

## Story purpose

The first machine ISAO-Birudorōn builds after landing is a compact salvage foundry. It dismantles the SH02 arrival rocket and converts the useful fraction into standardized construction feedstock for Stålheart. Stålheart then consumes that feedstock to build the Terraformer, and the Terraformer ultimately prints the MÖRK wireframe. The machinery therefore explains where the early base mass comes from instead of making construction material appear from nowhere.

Working name: **AFR-01 Seed Foundry** (`arrival_foundry`). “Arrival recycler” remains the plain descriptive name until the game designer approves a final designation.

The process should remain materially plausible without becoming a chemistry simulation. The rocket supplies structural metals, carbon and reusable mechanisms. The foundry sorts that salvage and combines it with local silicate/regolith plus carried binder or alloying additives. The barrels contain a cooled powder, pellet or slurry precursor—not an unexplained barrel of molten metal. The game-facing product name can remain **ferroceramic feedstock**.

## Reuse before new geometry

| Role | Existing source of truth | Current measured cost | Treatment |
| --- | --- | ---: | --- |
| Dismantling arm | `assets/assembly-line/robotic_arm_d0.glb` | 3,280 triangles, 24 draws, 255,168 bytes, `Assembly_Cycle` 8.0 s | Reuse the articulated hierarchy. Author a derived cutter tool and tool-tip socket; do not duplicate the full assembly-line scene. Consolidate fixed materials for the composite game tier. |
| Arrival rocket | `assets/sh-rocket/sh_rocket.glb` | 23,502 triangles, 107 draws, 1,587,456 bytes, five clips | Preserve the approach original. Author explicit removable salvage sections or a derived dismantling proxy; do not misuse LOD or damage identifiers as salvage progress. |
| Output vessels | `assets/warehouse-props/fuel_barrel_d0.glb` | 2,412 triangles, 12 draws, 142,304 bytes | Reuse the barrel geometry by instance, but give the construction-feed version a removable collar, cap connector and unambiguous label/material. It is not fuel and should not inherit a false gameplay role. |

The game designer referred to the Logistics Cargo barrels; the reusable barrel family currently lives under `warehouse-props`. That path discrepancy should be resolved through manifest role metadata, not by silently duplicating the files.

## Minimum new machine

The Seed Foundry is a small, squat device that can credibly be assembled by ISAO before heavy infrastructure exists. It needs only the forms that communicate the process:

- a scrap input chute aligned with the service arm;
- a shielded blue induction/plasma chamber;
- a separator or crusher drum with a readable slow mechanical cycle;
- a small hopper for local mineral feed;
- an output manifold and short fill hose for barrel instances;
- visible power and status indicators in the MÖRK/KORP/ISAO graphite, teal, white, cyan and amber language.

Proposed stable engine names:

`ARRIVAL_FOUNDRY_ROOT`, `INPUT_CHUTE`, `INDUCTION_CHAMBER`, `SEPARATOR_DRUM`, `OUTPUT_MANIFOLD`, `SOCKET_SCRAP_INPUT`, `SOCKET_REGOLITH_INPUT`, `SOCKET_POWER`, `SOCKET_BARREL_FILL`, `SOCKET_STALHEART_FEED`.

The reused arm composite additionally needs `SOCKET_CUTTER_TIP` parented to its wrist/tool control. Spark target points belong to each authored rocket salvage section, for example `SOCKET_SALVAGE_TARGET_00`. Names must remain unique, meaningful and dot-free.

## Diegetic animation language

The preferred first vertical slice is one readable panel-to-barrel cycle:

1. ISAO places the Seed Foundry and one empty feedstock barrel.
2. The service arm aligns its cutter with one rocket panel.
3. A tight blue-white arc connects tool tip to the selected panel; small cyan sparks fall away from the cut rather than spraying across the whole scene.
4. The detached panel moves into the input chute. The source rocket section becomes absent only after the transfer is visually complete.
5. The induction chamber pulses cyan; the separator turns; a brief warmer amber glow communicates processed material rather than another electrical effect.
6. The output hose couples to the barrel and the fill indicator rises from empty to full.
7. The sealed barrel becomes available to Stålheart and the arm selects the next rocket section.

The sequence should compose short clips and game events rather than one monolithic movie:

| Clip or event | Type | Proposed duration | Responsibility |
| --- | --- | ---: | --- |
| `Arm_Dismantle_Cycle` | loop/segment | 8.0 s | Base, shoulder, elbow, wrist and cutter alignment. |
| `Rocket_Salvage_Section` | one-shot per section | 6.0 s | Releases one explicitly named rocket panel or module. |
| `Foundry_Process_Cycle` | loop | 4.0 s | Chamber pulse and separator motion. |
| `Barrel_Fill` | one-shot | 3.0 s | Hose coupling and readable fill state. |
| `CUTTER_ARC_ON`, `CUTTER_ARC_OFF`, `SCRAP_ACCEPTED`, `BARREL_READY` | engine cues | event times | VFX, sound and gameplay inventory changes. |

Blue sparks should be an engine VFX emitted between named sockets, not thousands of baked mesh particles. Close sparks, chamber glow, arm movement, material audio and the barrel indicator form one cause-and-effect chain. At distance, the machine reads through arm silhouette, a restrained cyan pulse and barrel accumulation; sparks and small indicators can be disabled.

## State model

Salvage progress is neither damage nor LOD. Use a separate sequence variable such as `salvage_stage: 0..N` and explicitly named removable sections. The untouched SH02 remains the arrival/landing source. If SH02 damage states are authored later, they remain `d0`–`d3` and do not replace salvage stages.

Suggested gameplay state:

- `rocket_salvage_stage`: next removable section;
- `foundry_input_mass`: recovered rocket fraction waiting to process;
- `local_mineral_mass`: regolith/silicate contribution;
- `feedstock_mass`: ferroceramic precursor ready for barrels;
- `barrel_fill`: normalized 0–1;
- `construction_inventory`: sealed barrels available to Stålheart.

This supports interruption and save/resume without requiring an animation to be the authority for resource accounting.

## Asset tiers and acceptance target

Treat the complete close/game composition as a small landmark because the player can approach it and because several reused modules are visible together. Start with the collaboration-contract landmark target: no more than 8,000 triangles, 10 draws and 400 KB plain for the game tier; no more than 3,000 triangles, one draw and 250 KB plain for a static distance tier. These are targets to validate, not claims about a model that does not exist yet.

The detailed master may retain richer cutter, hose, chamber and section-release motion for recordings. The game tier must preserve arm, cutter, separator, fill-hose and removable-section pivots. The static distance tier may merge the machine, arm and staged barrel silhouettes; it must document that no articulation survives. Repeated barrels should remain instancing-friendly rather than being baked into every progress state.

The first review should show three game-camera moments: untouched rocket and empty system, active cut/process flow, and a visibly diminished rocket beside accumulated full barrels. Reference-phone measurements and swap thresholds are required before Reviewed runtime status.

## Production order

1. **Delivered:** blockout silhouette, AFR-01 working name and SH02 viewer composition.
2. **Delivered:** cutter/tool socket, reused detailed service arm, articulated game proxy and `SALVAGE_PANEL_00`.
3. **Delivered:** sixteen-second Seed Foundry vertical slice through one filled barrel, plus a four-second processor loop and static distance tier.
4. Confirm the sequence reads without UI from the intended game camera and measure it on the reference phone.
5. Extend the rocket section map, gameplay resource events and sound package only after that slice is approved.

This ordering tests the central fantasy—ISAO turns the vehicle that delivered him into the factory that enables everything after it—before investing in a complete rocket disassembly.
