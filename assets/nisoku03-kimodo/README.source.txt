NISOKU-03 / KIMODO EXPORT TEST FOR JELALUDO SENTRY-A6

FILES
rig.glb                 Rig + original LOD1 mesh; no animation clips.
moveset.glb             99 default movements, one take per movement.
moveset-variants.glb    All 207 takes, including explicit-review-only takes.
manifest.json           Clip names, seeds, eligibility, sources and joint map.
controller-contract.json  Speeds, jump phases, root ownership and contact rules.
action-profiles.json    Native action windows or documented full-clip fallback.
clips/                  Original per-take in-place animation/contact data.
baked/                  Example recordings of the displayed runtime motion.
runtime/                The lab's contact/IK helpers for an advanced integration.
nisoku-moveset.js        Small Three.js rig + animation loader/player.
example.html            Standalone import test using Sentry-A6's Three.js0.180.
validation/             Independent validation and expected joint samples.

FIRST TEST
Move or rename the extracted folder to assets/nisoku03-kimodo/.
Serve it over HTTP using your normal development server. Open example.html.
The preview loads rig.glb and moveset.glb separately and binds their clips by
native joint names. Add ?variants=1 to load all207clips. The preview's pinned
Three.js CDN needs internet; the GLBs themselves are self-contained.

SENTRY-A6 INTEGRATION
Sentry-A6 currently uses Three.js0.180.0, GLTFLoader and an import map. Reuse that
same Three.js instance; no second engine or plugin is required:

  // From Sentry-A6's nisoku03/viewer.js:
  import {loadNisokuMoveset} from '../assets/nisoku03-kimodo/nisoku-moveset.js';
  const assetURL = new URL('../assets/nisoku03-kimodo/', import.meta.url);
  const kimodo = await loadNisokuMoveset(assetURL);
  scene.add(kimodo.root);
  kimodo.play('game-run-forward');
  // In the existing animation loop:
  kimodo.update(deltaSeconds);

Load with {variants:true} to select another take:
  kimodo.play('game-skip-forward', {seed:2502});

Use this AnimationMixer instead of calling the old createRig().pose() or
sampleMotion() driver on the same instance. Two pose drivers overwrite each
other. Keep the complete hierarchy, especially the unweighted HAND/FOOT mount
nodes. Do not call Skeleton.pose(): that generic reset loses these intermediate
mount frames and disconnects hands/feet. The adapter preserves authored frames.

UNITS / RIG
glTF2.0; metres; +Y up; +Z actor forward. Exported standing height1.9m.
All180skin joints (176original +4unweighted motion/sole helpers), native joint
names, original surfaces, skin weights and AUREL finger/toe articulation remain.
Rig and both moveset packs use the same hierarchy and scale. Moveset files also
include a mesh for direct editor import; the adapter discards that duplicate
mesh and plays their animations on the separate rig.

GAME MOVEMENT
The99default and207variant clips are in-place animation assets. Your controller
owns actor travel, collision, gravity and jump height. Do not add a second root
arc. See controller-contract.json and each take's jump/contact metadata.
Current lab inputs: W normal movement; S turns toward the viewer and runs back;
Ctrl+S backwalks facing away; Ctrl+W skips. Input policy can be changed in Sentry.

The live lab also layers foot/hand IK, ledge grab, superhero landing and planted
side-roll contacts. Static clips do not contain those runtime layers. baked/
contains actual sampled example GLBs including controller travel and contact
poses; those are full root-motion recordings. Do not move their actor a second
time. Their JSON sidecars retain event/seed provenance. Props are not included.
runtime/ contains the actual helper modules; they need the actor/world interfaces
used in the lab and are reference code, not a drop-in Sentry game controller.

CHOOSING TAKES
manifest.json identifies default takes and automatic_eligible. All207includes
rejected-for-automatic-play sprint822 and incomplete backward roll303; keep
those as explicit review candidates. No visual Keep decision is inferred.

SOURCE / CREDIT
NISOKU-03 after revision4 / articulated LOD1, from jelaludo/SentryTowers_A6
commit a92cffad917be69edda47d98c5e78393289b82c1.
Original Isao humanoid chassis and AUREL components by jelaludo / Model Workshop.
Motion generated previously with nvidia/Kimodo-SOMA-RP-v1.2, native
postprocessing enabled. No model weights, credentials or source caches included.
All existing takes are reused; exporting this package performs no new inference.
Contact/style quality remains for visual review in the receiving program.
