RED WITNESS / ACTION SHOWCASE / FOR JELALUDO
Version 1 - 13 November 2026

This is a display package for the Red Witness page on SentryTowers_A6.
It contains the textured Red Witness game model, its rig and ten named clips
inside one self-contained GLB. No Kimodo install, model inference, game
controller, collision solver, foot IK or muscle update module is required.

QUICK PREVIEW

Serve this folder over HTTP, then open index.html. For example:
  python -m http.server 8810 --bind 127.0.0.1 --directory .
  http://127.0.0.1:8810/

Use the Movement selector for one clip or Play all for the repeating sequence.
Walk/Jog/Run repeat; Jump and ukemi play once and hold their final pose.
T-pose holds horizontal arms. Crouch lowers, holds and stands again.
Movement changes use direct cuts between independent demonstrations; blending
unrelated floor-contact poses would require a separate contact solve.
Show travel reveals the baked horizontal motion. The preview camera follows.
The bundled Three.js 0.180.0 files make the preview independent of CDNs.
Opening index.html with file:// will not load ES modules/GLB reliably; use HTTP.

FILES

red-witness-showcase.glb  - model + skeleton + all ten animations + PBR images
red-witness-showcase.js   - small AnimationMixer adapter; uses your Three instance
manifest.json            - exact clip names, durations, source takes and credits
index.html               - working standalone preview and integration example
LICENSE.md / ATTRIBUTIONS.md - retain with redistributed model/derivatives
vendor/                  - Three.js 0.180.0 for this preview, with MIT license
validation/              - structural, re-import and browser-check evidence
CHECKSUMS.sha256          - package file hashes

CLIP NAMES (case-sensitive)

T_Pose       : authored T-pose, 2 second hold
Crouch       : authored crouch / hold / stand, 2.8 seconds
Walk         : forward walk, complete cycles
Jog          : forward jog, complete cycles
Run          : forward run, complete cycles
Jump         : standing jump, baked vertical arc and pose
Ukemi_Front  : forward roll / recovery
Ukemi_Left   : left sideways roll / recovery
Ukemi_Right  : right sideways roll / recovery
Ukemi_Back   : backward roll / recovery

The JSON manifest is the source of truth for durations and underlying take IDs.
Each clip includes all required transforms; there are no external animation or
texture files. Model units are metres, +Y up, +Z forward, anatomical left +X.
Native Red Witness proportions/crown height about 2.08m are retained.
Both side directions are included even though the request listed side ukemi once.

ADD IT TO SENTRYTOWERS_A6

1. Copy this folder to assets/red-witness-action-showcase/ in the repository.
   Keep red-witness-showcase.glb, manifest.json, red-witness-showcase.js and the
   attribution/license files together. index.html and vendor/ are optional if
   you only need the model on the existing Red Witness page.

2. Reuse the page's existing Three.js 0.180.0 import map. Do not add a second
   copy of Three to viewer.js. The existing map already defines "three" and
   "three/addons/". Add this import near the top of red-witness/viewer.js:

   import {loadRedWitnessShowcase} from
     '../assets/red-witness-action-showcase/red-witness-showcase.js';

3. Load the animated model into your existing scene:

   const actions = await loadRedWitnessShowcase(
     new URL('../assets/red-witness-action-showcase/', import.meta.url),
     {centered: true}
   );
   scene.add(actions.root);
   actions.playSequence();

   centered:true keeps the actor in the inspection stage horizontally while
   retaining the jump height and floor-support motion. This is useful with the
   current fixed orthographic cameras. Set centered:false to show baked travel;
   then follow the MOTION joint with the camera/OrbitControls target as index.html
   demonstrates. No additional horizontal movement should be applied.

4. Add update(deltaSeconds) to the EXISTING renderer animation loop. The current
   viewer renders through renderer.setAnimationLoop; extend that same callback:

   let previous = performance.now();
   renderer.setAnimationLoop(now => {
     const dt = Math.min(0.05, (now - previous) / 1000);
     previous = now;
     actions.update(dt);
     controls.update();
     renderer.render(scene, camera);
   });

   Keep one render loop. The adapter does not create its own renderer or loop.

5. A movement selector can use these exact calls:

   actions.play('T_Pose');
   actions.play('Crouch');
   actions.play('Walk');
   actions.play('Jog');
   actions.play('Run');
   actions.play('Jump');
   actions.play('Ukemi_Front');
   actions.play('Ukemi_Left');
   actions.play('Ukemi_Right');
   actions.play('Ukemi_Back');
   actions.playSequence();             // all clips, repeating sequence
   actions.setPaused(true);            // pause animation
   actions.setPaused(false);           // resume
   actions.play('Jump', {loop:true});  // optional repeated demonstration
   actions.dispose();                 // when unloading the animated model

CURRENT RED WITNESS VIEWER: AVOID TWO POSE DRIVERS

The existing page loads a plain unskinned GLB and calls createRig(model), then
rig.pose({headYaw, armLift}) from update(). The animated GLB here contains a
derived skin and its own keyed transforms. In animation mode, display
actions.root, hide the original inspection model, and skip rig.pose() for that
animated instance. Keep the original model available separately if you still
want the head/arm inspection sliders, master LOD and static distance tier.

For an animation-only mode, replace the original model load with the adapter
above. Disable the head/arm inspection sliders and the static-distance LOD
selector in that mode; they do not drive this animation pack. Point the download
link at red-witness-showcase.glb and adjust the metrics caption: this is the
21,032-triangle textured game model with 17 skinned rigid part submissions.
Your current wire/clay traversal can still act on actions.root's mesh materials.
Do not call Skeleton.pose(), the old reset/pose function, or another animation
mixer on this hierarchy while these clips are playing. When switching modes,
restore/show the separate inspection model rather than resetting this rig.

DIRECT GLTFLoader OPTION (WITHOUT THE ADAPTER)

   const g = await new GLTFLoader().loadAsync(
     '../assets/red-witness-action-showcase/red-witness-showcase.glb'
   );
   scene.add(g.scene);
   const mixer = new T.AnimationMixer(g.scene);
   const clip = T.AnimationClip.findByName(g.animations, 'Walk');
   mixer.clipAction(clip).play();
   // In your existing render loop: mixer.update(dt);

This direct version shows baked root travel. For a fixed stage, use the adapter
with centered:true instead, or cancel only horizontal MOTION translation.
Do not cancel vertical MOTION movement: it contains jump height/floor support.

WHAT IS BAKED

Gaits reuse existing processed Kimodo takes on this rig. Forward travel follows
their measured speed. Jump includes a 0.8m display arc. Ukemi includes authored
2m directional travel and whole-posed-surface floor support. Crouch is an
authored fixed-length leg-IK display motion; T-pose is an authored reference.
These are visual demonstrations, not gameplay controller assets. The receiving
page only needs an AnimationMixer. Do not add another jump arc or root-motion
controller. The 17 parts and muscle bundles remain rigid; digits remain fixed.
No new inferred animation or automatic favorite/Keep decisions were introduced.

SOURCE / CREDIT

Red Witness models and adaptations by Jelaludo.
https://jelaludo.github.io/SentryTowers_A6/red-witness/
Credit Jelaludo and retain LICENSE.md / ATTRIBUTIONS.md with derivatives.
The source LOD1 geometry, normals/UVs/tangents and all seven embedded texture
images are retained. The rig and showcase animation are derived locally from
the imported model and existing Kimodo takes; provenance is in manifest.json.
Three.js in vendor/ is 0.180.0, MIT; see vendor/LICENSE. It is for the portable
preview. The production Sentry page should continue using its own import map.
