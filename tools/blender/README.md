# Installed Blender tooling

## Verified upgrade / 13 November 2026

Blender and the community MCP are upgraded to the current stable releases checked on this date. The application, CLI and a fresh MCP connection agree. This is a tested 5.3 workflow; release dates and feature counts alone do not establish “SOTA” superiority.

| Component | Installed and verified |
| --- | --- |
| Blender application and CLI | 5.3.0, build `02f0899d78e3`; Homebrew at `/Applications/Blender.app`, CLI `/opt/homebrew/bin/blender` |
| Community MCP server | `mcp-for-blender==2.2.8`, uv-managed Python 3.12; `/Users/jela/.local/bin/mcp-for-blender` |
| Blender add-on | Bundled add-on 2.0 / protocol 16 in the 5.3 profile; live server expects protocol 16 |
| Connection | `127.0.0.1:9876`; telemetry disabled in both server environment and add-on preferences |
| Workflow skill | `tools/blender/skills/blender-workshop/`, linked into `~/.codex/skills/blender-workshop` |

The new package name replaces `blender-mcp`. The global Codex `blender` server now points to the new executable; unrelated configuration is preserved. Blender's enabled add-on starts the bridge on GUI launch. Optional asset/generation providers remain off.

**Restart Codex to refresh this conversation's cached tools and load the new skill.** A fresh MCP client already initialized the new server, discovered ten tools including `look`, and verified status, code execution, multi-angle capture and a material-shaded animation strip. The old conversation still advertises its original tool metadata. The optional Codex plugin wrapper and inline viewport app were not installed or certified by this upgrade.

Open Blender normally for MCP. Use a separate background process for repeatable exports; avoid multiple GUI instances competing for port 9876. `get_addon_status.up_to_date` checks compatibility with the installed server, not PyPI freshness.

### Repeatable workflow checks

```sh
blender --background --factory-startup --python-exit-code 1 \
  --python tools/blender/skills/blender-workshop/scripts/check_workflow.py \
  -- --out /tmp/blender53-check
node tools/asset-pipeline/validate-blender-workflow.mjs /tmp/blender53-check/workflow-probe.glb
```

Use an empty output folder. The Node validator uses dependencies in `tools/asset-pipeline/`. The skill covers live RNA inspection, current material/color-space APIs, slotted actions, operator context, tangents, zero-based clip timing, named engine pivots, sockets, detail tiers and the received asset contract.

Verified evidence is recorded in `toolchain-check-2026-11-13.json`:

- The scratch probe exports 24 triangles, one draw, seven named nodes, a two-joint skin, two embedded textures and a two-second `Probe_Cycle`. Plain GLB: 9,488 bytes. Both sRGB color and data-map interoperability IDs survive re-import. Socket position and unkeyed engine pivot survive; sampled Blender vertex error is below 0.000000060 m.
- Plain GLB and decoded derived Meshopt payload pass the glTF validator with zero errors/warnings. The 8,424-byte derived probe retains names, joints, timings and socket transforms. Three.js samples at 0, 1 and 1.999 seconds differ from the plain model by at most 0.0000417 m after quantization. This uses glTF Transform Meshopt; it does not replace the game's gltfpack release validation.
- MCP multi-angle and material animation captures were inspected. The original live scene was restored with Cube, Light and Camera.
- Red Witness game humanoid and helmet import with unchanged triangle counts, names, world transforms and bounds. Temporary re-exports preserve all node matrices, material factors and embedded texture image bytes. The helmet re-export validates with zero errors/warnings.
- **Direct humanoid re-export is not approved:** Blender 5.3 generates two zero-length tangent vectors, at mesh primitive indices 10 and 13. The temporary file fails `ACCESSOR_VECTOR3_NON_UNIT`. Repair UV/tangent generation and validate a comparison before replacing it. Both original game GLBs remain byte-identical and validate with zero errors/warnings.

The scratch skin intentionally keeps its mesh at scene root for glTF skin semantics; Blender emits an armature-parent warning. Its single, non-instanced armature binding and sampled deformation are checked. This small test does not certify instanced armatures, every production builder, rendering performance or all older assets. No production model was regenerated into the library.

### Rollback and references

The previous Blender 5.2.1 application, 5.2 profile and private Codex configuration backup are preserved outside Git at `~/Library/Application Support/Blender/toolchain-backups/2026-11-13-pre-5.3/`. The older `blender-mcp` 1.9.1 uv environment remains available. To roll back, close Blender, restore the saved application/profile, and restore only the Blender MCP command to the older executable; preserve unrelated Codex settings. Restart the client and confirm matching protocol 5. Private configuration backups are never part of the repository handoff.

The previous audit and installation are recorded in Git at `4984586`. The separate Blender Lab implementation was reviewed during that audit but is not the community integration installed here.

- https://www.blender.org/releases/5-3/
- https://developer.blender.org/docs/release_notes/5.3/python_api/
- https://pypi.org/project/mcp-for-blender/2.2.8/
- https://github.com/ahujasid/mcp-for-blender
- https://learn.chatgpt.com/docs/extend/mcp

## Alien research outpost builder

`build_research_outpost.py` authors 12 families in four structural states and writes a separate manifest and editable Blender gallery. It uses `asset_common.py` for the shared material and mesh helpers. Run with `blender --background --python-exit-code 1 --python tools/blender/build_research_outpost.py`. See `assets/research-outpost/README.md` for integration limits.

## Robotic assembly line builder

`build_assembly_line.py` builds six families / 24 variants, including the assembled eight-robot line. D0/D1 line, robot and conveyor models export an eight-second `Assembly_Cycle`. Source: `source/blender/a6-assembly-line.blend`; integration notes: `assets/assembly-line/README.md`.

## Warehouse prop builder

`build_warehouse_props.py` creates six cargo families and an authored shelf warehouse scene in four impact states. Source: `source/blender/a6-warehouse-props.blend`; preview: `warehouse-props/`.

## Open micro-reactor builder

`build_micro_reactor.py` builds five exposed reactor families and four authored destruction states. Source: `source/blender/a6-micro-reactor.blend`; preview: `micro-reactor/`.

## Terraformer 3000 / Stålheart

`build_terraformer.py` authors a 36 m rail-mounted planetary printer with six articulated arm joints and D0–D3 destruction variants. Run `blender --background --python-exit-code 1 --python tools/blender/build_terraformer.py`. Outputs: `source/blender/a6-terraformer.blend`, four GLBs, manifest and hero render under `assets/terraformer/`. Preview: `terraformer/`.

### MCP and background Blender diagnosis (2026-09-07)

The restricted session failed in Metal GPU detection (`supports_barycentric_whitelist → strstr`) before executing Python. The same Blender binary started successfully in Terminal and after resuming with unrestricted execution. This isolates the failure to the restricted execution context; the precise underlying Metal/device-string failure is not established.

MCP separately had no GUI server listening on port 9876. Opening Blender started the installed add-on automatically; `get_addon_status` reported matching protocol 5, and `execute_blender_code` returned the live scene successfully. No add-on reinstall was required. Telemetry remained disabled.

The message “cannot start server in background mode” is expected from the enabled MCP add-on in CLI builds. It does not prevent a `--python` builder from running. Use background Blender for deterministic builds and the running GUI/MCP connection for live inspection. They are complementary workflows.

## HUGIN launch and recovery builder

`build_launchpad.py` builds a reusable entry vehicle with three flat landing feet, launcher, cargo-catching arm and D0–D3 destruction states. D0/D1 contain the 20-second `Cargo_Recovery_Cycle`. Source: `source/blender/a6-launchpad.blend`; preview: `launchpad/`; validation: `node tools/asset-pipeline/validate-launchpad.mjs`.

## Landmark LOD geometry for HUGIN and Stålheart

`node tools/asset-pipeline/build-landmark-lods.mjs` derives current-contract LOD1 and static LOD2 files from the preserved detailed plain GLBs, across D0–D3. `node tools/asset-pipeline/validate-landmark-lods.mjs` checks plain and decoded Meshopt copies, measured budgets, names, transforms, silhouette bounds and sampled primary motion. Outputs and manifests stay beside the detailed families in `assets/launchpad/` and `assets/terraformer/`; the combined comparison workshop is `game-assets/`. The older `build_game_lods.py` pipeline and `assets/game-ready/` outputs are retained as legacy 40k comparisons.

## MÖRK heavy hover tank

`build_hover_tank.py` authors the low-wide hover tank, nine three-shell ammo ports and D0–D3, with six operating NLA clips on D0/D1. Follow with `node tools/asset-pipeline/pack-hover-tank.mjs` and `node tools/asset-pipeline/validate-hover-tank.mjs`. Source: `source/blender/a6-hover-tank.blend`; preview: `hover-tank/`.

## Missile kit

Run `node tools/asset-pipeline/sample-missile-flight.mjs`, then `blender --background --python-exit-code 1 --python tools/blender/build_missile_kit.py`, followed by `node tools/asset-pipeline/pack-missile-kit.mjs` and `node tools/asset-pipeline/validate-missile-kit.mjs`. The shared sampler in `missile-lab/flight.mjs` drives both baked Blender clips and the workshop.

## SKYWARD antenna array

`build_antenna_array.py` builds three mesh-detail levels × four destruction states and a seven-dish low-detail scene. Follow with `node tools/asset-pipeline/pack-antenna-array.mjs` and `node tools/asset-pipeline/validate-antenna-array.mjs`. Source: `source/blender/a6-antenna-array.blend`; viewer: `antenna-array/`.

## KESTREL original astronaut

`build_kestrel.py` authors the detailed original EVA character, wear textures and seven skinned clips. It uses the original humanoid helpers in `character_rig.py`. Validate with `node tools/asset-pipeline/validate-kestrel.mjs`. Source: `source/blender/a6-kestrel.blend`; viewer: `animation-tests/`.

## RECKON K9 mechanical canine

`build_reckon_k9.py` creates the 36-joint detailed master, reduced game skin and static distance silhouette with eight canine clips. `pack-reckon-k9.mjs` writes measured hashes and optional derived Meshopt copies; `validate-reckon-k9.mjs` verifies decoded geometry, paw contacts, loops, rigid limb lengths and fetch events. `render_reckon_k9.py` renders eight review poses; `render-reckon-review.mjs` assembles the contact sheet. Source: `source/blender/a6-reckon-k9.blend`; viewer: `reckon-k9/`; integration: `assets/reckon-k9/README.md`.
