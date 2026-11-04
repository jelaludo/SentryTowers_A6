# Isao biped extremities / integration notes

The AUREL-01 hand and NISOKU-02 foot now have economical articulated and naturally curled static variants, prepared for adaptation to the Workshop's biped robots. They retain their original authoring frames and rigs. This change does not yet attach them to or retarget a complete robot.

## Select the variant by identity and LOD

Load the existing family `manifest.json` and select an entry by both `variant` and `lod`. Legacy entries without `variant` belong to `original`. The new `biped` variant has LOD1 and LOD2; its detailed master is the preserved original LOD0.

| Part | Economical game | Curled static | Motor axes | Required names | Sockets |
| --- | --- | --- | ---: | ---: | ---: |
| Hand | `assets/hand-lab/biped/lod1/aurel01_biped_d0_lod1.glb` | `assets/hand-lab/biped/lod2/aurel01_biped_d0_lod2.glb` | 23 | 59 | 17 |
| Foot | `assets/foot-lab/biped/lod1/nisoku02foot_biped_d0_lod1.glb` | `assets/foot-lab/biped/lod2/nisoku02foot_biped_d0_lod2.glb` | 22 | 53 | 14 |

Plain GLBs are authoritative. Meshopt copies under each family's `derived/meshopt/biped/` are optional derivatives; the game may pack the plain files with gltfpack at release. No textures or external buffers are needed. Both variants are D0 only. Original detailed/game/distance files and third-party reference originals remain intact.

## Frame and mount contract

| Property | AUREL-01 | NISOKU-02 foot |
| --- | --- | --- |
| Units | Metres | Metres |
| Authoring side | Right | Right |
| Axes | +Y along fingers, +Z out of palm | +Y up, +Z toes, -X medial |
| Model root | `AUREL_01_ROOT` at wrist coupling base | `NISOKU_02_FOOT_ROOT` at ground/plot centre |
| Robot connection | `SOCKET_WRIST_ATTACH` | `SOCKET_ANKLE_ATTACH` |
| Neutral socket position | `[0,0,0]` | `[0,0.14,-0.073]` |
| Socket normal | -Y | +Y |
| Reserved plot | 0.32 × 0.32 m | 0.40 × 0.40 m |

Use the full socket matrix, including orientation. The general mounting relation is:

`asset_world = robot_mount_world × inverse(socket_relative_to_asset_root)`

Compute the relative socket matrix after applying the desired local pose. Convert the resulting world matrix into the model parent's local space before assigning the transform. This keeps the hand wrist or foot ankle attached even though their authored roots differ. If the consuming robot is a different size, apply one uniform scale through an outer mount and include that scale when computing the socket relation. The GLBs themselves share the original scale and bone lengths.

The foot's ankle axes rotate its upper coupling relative to the foot. When a robot controller holds that coupling at a leg socket, solving the mounting relation rotates the foot oppositely under the fixed coupling. Choose controller signs accordingly. Its `FOOT_PLACEMENT` bone is for the lab's lift, travel and rocking demonstrations; keep it neutral when locomotion is already driven by the robot's leg/root controller. Drive each pivot from one pose system.

These are right-side assets. A left-side conversion should mirror geometry, winding, socket frames and motor conventions together and record the new handedness. It is a separate retargeting step; selecting the economical variant does not produce a left hand or foot.

## Runtime and static swaps

Use the same family `runtime.js` adapter for original and economical articulated models. Import `BIPED_REST` from the family's `biped.js` for the new resting pose. All original demonstrations remain available: hand pinch/opposition/finger motion, and foot stepping/opposition/pipe capture.

The economical game export retains a neutral bind hierarchy. The static export is baked in `BIPED_REST`; it is not an animated skin. Its bone/socket lookup hierarchy is posed to match the frozen surface. Therefore, local socket offsets, parent names and attachment interfaces stay consistent, while distal world positions intentionally differ from the neutral bind pose. Every static vertex and named transform is validated against LOD1 in `BIPED_REST`.

Before switching from LOD1 to LOD2, settle toward `BIPED_REST` or keep the articulated tier when the current grasp or step must remain readable. When returning to LOD1, start in that same pose. These small parts should follow their parent robot's screen-size/loading policy. The existing 150 m approach and 20 m hysteresis values are provisional; a gameplay robot can remain on LOD1 throughout its motion. Static lookup nodes must not be used as an animated rig.

## Geometry and material budget

| Part | Original game triangles / draws | Economical game triangles / draws | Triangle reduction | Plain game bytes | Plain static bytes |
| --- | --- | --- | ---: | ---: | ---: |
| Hand | 14,392 / 5 | 2,708 / 1 | 81.2% | 157,332 | 97,456 |
| Foot | 12,792 / 5 | 2,496 / 1 | 80.5% | 131,020 | 81,696 |

The budget is spent on bending segments, toe/finger outlines and joint clearance. Short three-section shells, low-sided barrels and simplified tactile surfaces replace many small bearing and surface parts. Hidden links are omitted. One shared vertex-color palette replaces five material primitives; the palette preserves the ivory/graphite/gold/amber colors with a common metalness and roughness, without emissive indicators. The lab disables material-layer visibility for these merged assets; wireframe and named-bone inspection remain available.

The articulated skin uses rigid single-bone weights and preserves every motor and inspection pivot. The static mesh drops skin attributes and merges to one draw. Geometry may be shared between separately posed instances, but each articulated robot part needs its own skeleton/pose state. The named hierarchy is retained for compatibility, so triangle reduction does not imply fewer motor updates or a measured FPS gain.

## Evidence and handoff

Each family has `biped/validation-report.json`, `biped/viewer-validation.json`, a measured parent manifest, integration README and derived review renders. The geometric checks cover all eight new plain/decoded files, zero glTF errors/warnings, original-export hashes, budgets, rigid weighting, all required transforms against the original rigs, inward curl, sampled floor/pipe clearance and frozen/static behavior. Browser checks exercise both selectors, all encoding/tier combinations, poses, demonstrations, JSON downloads and desktop/mobile layouts.

Pass the commit hash plus `assets/hand-lab/` and `assets/foot-lab/`. Include their existing runtime modules and new `biped.js`; do not hand off a loose GLB without its pose and socket contract. Original workshop attribution applies: credit **jelaludo**. Source-reference licenses inside Hand Lab remain separate and are unchanged.

Still pending: specific robot attachment/retargeting, left variants, arbitrary-pose and whole-body collision/force checks, gameplay damage states, consuming-game r160/release gltfpack verification and reference-phone measurements. Finite authored-pose tests are not a physical contact or manufacturing certification. `docs/ASSET-COLLABORATION.md` remains verbatim as received.
