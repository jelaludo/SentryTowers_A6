# Installed Blender tooling

Verified on this Mac on 2026-09-06:

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
