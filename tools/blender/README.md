# Installed Blender tooling

## Current-version audit / 13 November 2026

The installed application and community MCP connection work, but they are **not current and not yet validated on Blender 5.3**. This audit did not upgrade the application, server, add-on or global configuration.

| Component | Installed and verified | Current upstream reference |
| --- | --- | --- |
| Blender application and CLI | 5.2.1 LTS, build `9e2066aef7ef` | Blender 5.3.0 stable, released 10 November 2026; Homebrew also lists 5.3.0 |
| Community MCP server | `blender-mcp` 1.9.1, uv-managed Python 3.12.14 | Renamed package `mcp-for-blender` 2.2.8, released 12 November 2026 |
| Community Blender add-on | Add-on version 1.6, protocol 5; exact match to the installed 1.9.1 package's bundled add-on | Upstream source advertises add-on 2.0 / protocol 16; server and matching bundled add-on must be upgraded together |
| Blender skill | No Blender-specific SKILL.md found in the active local skill folders or current session skill catalog | Current upstream supplies bpy, animation, rigging, materials, retopology, scene and level-design guides; these are not a locally installed 5.3 skill |

The initial MCP connection failed because Blender was closed. Opening `/Applications/Blender.app` started the saved add-on automatically. A read-only MCP probe then confirmed Blender 5.2.1 LTS, the expected application path, glTF exporter availability and three default scene objects. `get_addon_status` returned matching protocol 5 with telemetry disabled. Its `up_to_date: true` checks compatibility with the **installed server**, not the newest PyPI release. No model or scene object was changed.

The maintained community integration now includes richer visual inspection, consolidated asset tools, guides and a Codex plugin with an inline viewport and scene mentions. These are upstream capabilities, not claims about the installed 1.9.1 server. Upstream source inspected at commit `578360f8007ce6818b1a3c8b2cfe731f9283ed45`; plugin wrapper metadata and Python package versions have independent numbering.

There is also a separate Blender Lab MCP implementation from the Blender project. Its documentation targets Blender 5.1 or newer and emphasizes Python/API documentation and scene inspection. It is not the `blender-mcp` package installed here. Neither alternative has been benchmarked against this repository, so “SOTA” is not established by its name, tool count or release date.

Recommended migration, pending implementation:

1. Preserve the current application/configuration for rollback, then install the official Blender 5.3.0 stable build and verify both the CLI and live MCP report 5.3.0.
2. Move to a pinned `mcp-for-blender==2.2.8` server and its bundled add-on in Blender's 5.3 profile. Keep the existing loopback-only connection and disabled telemetry. Reconnect the client and verify the newly advertised tools and matching protocol.
3. Use versioned Blender 5.3 API references and RNA inspection rather than assuming node socket names, enum values or operator context. New color-space interoperability IDs are useful for texture import; older name-based API remains supported. Preserve the Workshop's axes, sockets, named pivots, tier and attribution contract.
4. Validate a scratch scene through live inspection, viewport capture, deterministic CLI export, GLB decode and representative material/rig/animation checks. Rebuild comparison assets into a temporary folder and compare geometry, sockets and motion before replacing production outputs. Keep 5.3 compatibility explicitly unverified until those checks pass.

Primary references:

- https://www.blender.org/releases/5-3/
- https://developer.blender.org/docs/release_notes/5.3/python_api/
- https://pypi.org/project/mcp-for-blender/2.2.8/
- https://github.com/ahujasid/mcp-for-blender
- https://www.blender.org/lab/mcp-server/
- https://projects.blender.org/lab/blender_mcp

## Existing installation / verified 6 September 2026, rechecked 13 November

- Blender **5.2.1 LTS**, installed with Homebrew at `/Applications/Blender.app`.
- CLI wrapper: `/opt/homebrew/bin/blender`.
- Blender MCP **1.9.1**, installed with `uv tool install blender-mcp --python 3.12`.
- MCP executable: `/Users/jela/.local/bin/blender-mcp`.
- Blender add-on: `~/Library/Application Support/Blender/5.2/scripts/addons/blender_mcp.py`, enabled in saved preferences.
- Codex server name: `blender`, registered in the user's global configuration.
- Connection: loopback `127.0.0.1:9876`. Telemetry is disabled in both server environment and Blender add-on preferences. Optional asset-provider integrations were not enabled.

Blender's application and CLI are the same installation. Use CLI for repeatable background generation/export:

```sh
blender --background --python-exit-code 1 --python /path/to/build_asset.py
```

MCP requires a running Blender GUI. Open Blender normally; this installed add-on enables its auto-start behavior. If needed, use the viewport sidebar's MCP for Blender tab to start the connection. The upstream button may say “Connect to Claude”; it starts the same bridge used by Codex. Avoid multiple Blender instances competing for port 9876.

Codex configuration can be checked with `codex mcp get blender`. A running Codex session may need to reconnect or restart before its tool list includes the new server. Do not launch a second MCP stdio server manually for normal use; Codex starts it.

Validation completed: background CLI GLB export, MCP initialization and discovery of 28 tools, scene inspection, and creation/removal of a temporary mesh object through MCP. The Blender scene was left with its original default objects. No project asset was modified by the connection test.

References: [Blender MCP installation and telemetry options](https://github.com/ahujasid/blender-mcp), [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

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
