# Workshop practices

Local working notes from building the asset families. These are our own tricks and limits, not part of the received game developer contract above, which stays verbatim.

## Procedural geometry in Blender

- Author in metres, Z up, −Y forward in Blender; the glTF exporter turns that into the contract's +Y up, +Z forward. Keep the origin on the ground under the standing hip centre in every tier.
- Build each tier from one `shape(lod)` function with `if lod<2` and `if lod==0` gates. Measure triangles after every change; the knuckle and tip spheres on a glove are the usual budget surprise (dropping them from 32×16 to 6×3 segments at the game tier saved a quarter of the whole character).
- Closed sub-meshes only, then `bmesh.ops.recalc_face_normals` once on the merged mesh. Plates are rings of a chamfered outline swept through a bevel profile (back, bevel, face, groove, face), so one helper gives bevels, chamfered corners, an inset panel line and bolt positions.
- Flat-shade end caps and faceted shells; smooth-shade sleeves. Cut faces out of a shell wherever glass sits over it, or the shell shows through the glass.
- Soft limbs: a tube whose radius is modulated by a few summed sines with amplitude rising toward each end reads as fabric bunching at the joints at no texture cost.
- Hoses: sample a Catmull-Rom curve, alternate the segment radius for ribs, add a steel coupling at each end.
- Asymmetry has to be designed in (holster on one hip, wrist panel on one arm, buckles at different heights); mirrored loops produce toys.

## Rigid rigs and authored motion

- Keep one joint table per family and reuse the IK routines; the biped walk, cautious walk, survey, crouch and halt carried over to a 1.35× wider rig unchanged.
- Bone orientations passed to the pose solver are absolute, so a waist lean and a chest lean do not add. Set the chest to the lean you want.
- Turn a leg out with a twist about the bone's own axis, not a world yaw, or the thigh skin leaves the knee. Pivot the boot about the same composite rotation you give the ankle so the toe socket stays on the floor.
- Validate what the brief asked for as numbers: shoulder span, helmet half width against chest half width, support length, knee flexion difference, heel rise, torso lean, elbow range, left/right hand depth difference.

## Runtime materials over palette-only GLBs

- The contract forbids textures in the file unless agreed, so wear lives in the viewer: three 512² tileable noise textures (weave normal, quilt plus wrinkle normal, grime/scratch/brush/dust pack), per-vertex masks from the loaded geometry (part height by skin index, edge curvature from co-located normal divergence, a cheap neighbour cavity term) and a triplanar `onBeforeCompile` patch.
- Map triplanar coordinates in bind-pose space (`position` and `normal` before skinning) and carry `normalMatrix * mat3(skinMatrix)` to the fragment stage, or the detail swims as the character moves.
- Scale check: a weave cell of about 2.5 mm and quilting diamonds of about 3 cm read right at review distance; at 7 mm and 6 cm the suit looked like a basket and a duvet.
- Scratches need anisotropic noise (long cells one way, short the other); isotropic thresholds give blotches.
- Keep the palette inside the saturation rule and let metalness and the environment carry warmth; a "brass" under 15% saturation is a warm grey that only reads as brass in reflection.
- Shader gotchas: append a newline after any prepended header or three's first `#define` lands mid-line and the material renders nothing; `patch`, `sample` and `filter` are reserved in GLSL ES 3.

## Review and measurement

- Under `EffectComposer`, `renderer.info.render.calls` only counts the last pass unless `autoReset` is off and `reset()` runs once per frame.
- Headless SwiftShader returns from `gl.finish()` immediately; sync a timing probe with a 1×1 `readPixels`, take the best of several rounds, and repeat the whole run before quoting a ratio: the same v1 page measured 74 to 131 ms on four runs. Report the result as a relative CPU-rasterizer cost of two render paths, never as a frame rate.
- Full-resolution GTAO doubled the software frame cost; half resolution with six samples and a denoise pass brought it inside the untextured v1 viewer's own run-to-run spread.
- Review images of runtime materials must come from the browser; Blender renders only show the palette.

## Where this approach runs out

Primitive assembly gives clean budgets, stable node names and repeatable tiers, but it struggles with the organic parts of a suit: the fabric between arm and torso, armpits, the way plates sit over soft volumes. EVA-K8 needed two passes to close the gap under the pauldrons: moving the arm joints inward was not enough, the garment itself had to become the wide part (chest half width out to the sleeve, a large quilted underarm volume on the shoulder bone, zero abduction at rest) with the plates widened to sit on it, and the result is still a set of overlapping shells. For the next character family the better pipeline is probably to scan or sculpt each limb and the torso independently, clean and decimate those meshes, and assemble them on the same joint table and node names, keeping the procedural tools for plates, hardware, hoses and the static distance tier.
