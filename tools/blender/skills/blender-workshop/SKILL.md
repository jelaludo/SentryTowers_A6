---
name: blender-workshop
description: Author, inspect, animate and export Blender assets using live MCP inspection and repeatable background builds. Use for Blender modeling, rigging, materials, GLB delivery, or Blender 5.3 workflow checks, especially Workshop assets with named pivots, sockets and detail tiers.
---

# Blender Workshop

## Establish context

Read the project's AGENTS.md and asset/export contract before changing models. In SentryTowers, read `docs/ASSET-COLLABORATION.md`; preserve that received document verbatim. Preserve source assets and build comparisons into a temporary directory before replacing exports.

Check the CLI version and call the connected MCP's `get_addon_status` once. Confirm the live application, bundled add-on and server protocol agree. `up_to_date` means compatible with the installed server, not necessarily the latest release. Discover advertised tools: names and optional UI capabilities vary between clients. Keep existing loopback and telemetry preferences.

Use MCP for live inspection, small edits and visual feedback; use background Blender for deterministic builds. Inspect filepath, dirty state, selection and active scene first. Use a named temporary collection or separate scene for probes. Do not reset a user's live scene to run a test.

## Work with Blender 5.3

- Prefer the data API over context-sensitive operators. Inspect RNA arguments and establish active object, selection and mode for operators. Restore temporary context in `finally` blocks.
- Inspect node types, socket identifiers and enums in the running version. Find Principled nodes by type, not localized display names. Consult installed MCP bpy/material/animation guides when relevant; verify assumptions against RNA.
- Materials use nodes by default in 5.x. Update shader inputs; do not rely on `diffuse_color` for rendered materials or legacy `use_nodes` toggling.
- For texture color spaces in 5.3, use `image.colorspace_settings.interop_id`: `srgb_rec709_display` for ordinary sRGB color and `data` for normal/ORM maps. Inspect availability and the resulting color space. Do not color-transform data maps.
- Insert keys with `keyframe_insert`. For slotted actions, obtain curves with `bpy_extras.anim_utils.action_get_channelbag_for_slot(action, animation_data.action_slot)`. Do not assume legacy `Action.fcurves` exists. Name clips and verify their exported duration.
- Keep engine-driven pivots unkeyed. Apply geometry scale before rigging; preserve joint frames, bind poses, weights and named attachment sockets.
- Export tangents for normal-mapped meshes. Check runtime clip endpoints: a two-second loop at 24 fps spans frames 0–48; a nonzero first timestamp can add a leading pause in a game even when Blender reports a two-second frame range.
- Validate generated tangents, especially around degenerate UVs. A successful Blender export can still contain zero-length tangents. Keep a valid original until UV/tangent repair is verified; do not drop the normal map merely to silence validation. Red Witness's humanoid game GLB has a documented direct-re-export issue in the toolchain report.

## Inspect and verify

The current community MCP's `look` supports angles, frames, camera and viewport views. Inspect informative angles and motion at contact/extreme poses. Use only advertised tools and parameters. Viewport approval alone does not validate exported geometry or motion.

Run the bundled 5.3 smoke check in a separate background process with a new output directory:

```sh
blender --background --factory-startup --python-exit-code 1 \
  --python <skill-directory>/scripts/check_workflow.py -- --out /tmp/blender53-check
```

It creates a two-joint skinned probe, color/data textures, an unkeyed engine pivot and socket, a two-second clip, GLB and editable source. It re-imports the GLB and checks names, skinning, motion, socket transforms and texture color roles. It refuses nonempty output directories. This is a toolchain smoke check, not production certification. The consuming project should additionally validate the decoded GLB, any compressed derivative and representative target assets.

In SentryTowers, run `node tools/asset-pipeline/validate-blender-workflow.mjs /tmp/blender53-check/workflow-probe.glb` to check the actual GLB timings, axes, joints, texture count and measured geometry, then create and decode a separately marked Meshopt probe. This uses the repository's asset-pipeline dependencies; it does not replace the consuming game's gltfpack release checks.

## Deliver Workshop assets

Use metres, exported +Y up / +Z forward and a ground-centred root. Blender -Y forward maps to glTF +Z with Y-up export. Keep roots, dimensions, meaningful dot-free names, sockets, metadata and damage identifiers consistent across tiers. Preserve game pivots; document static distance tiers. Include detailed masters and useful reduced tiers as required by the project.

Plain self-contained GLB is the source of truth. Keep derived compression separate and validate decoded copies when supplied. Measure exported triangles, draws, bytes, bounds and clip durations; check representative poses and runtime loading. Follow project budgets, manifest fields, LOD metadata and integration notes; credit Jelaludo for reuse. Do not infer FPS or readiness from file size or tool versions.

Update the project Devlog with passed checks and limitations. In SentryTowers, run `python3 tools/build-workshop-docs.py` after documentation or route changes. Hand off a commit plus asset folder.

References:

- https://docs.blender.org/api/5.3/
- https://developer.blender.org/docs/release_notes/5.3/python_api/
- https://github.com/ahujasid/mcp-for-blender
