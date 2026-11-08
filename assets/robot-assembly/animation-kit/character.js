import {createRig} from '../runtime.js';
import {createMuscleRig} from '../muscles/runtime.js';

// Pass the loaded scene of a combined animation-kit GLB.
export function createCharacter(scene) {
  const host = scene.getObjectByName('AUREL_HOST');
  const layer = scene.getObjectByName('AUREL_MUSCLES');
  const root = scene.getObjectByName('AUREL_CHARACTER');
  if (!host || !layer || !root) throw new Error('Expected an AUREL-03 animation-kit GLB');
  const rig = createRig(host);
  const muscles = createMuscleRig(layer, host);
  const sync = () => { scene.updateWorldMatrix(true, true); scene.traverse(n => { if (n.isSkinnedMesh) n.skeleton.update(); }); };
  return {
    root, host, layer, nodes: rig.nodes,
    // Demo only. Do not call this after an external AnimationMixer/retargeter.
    studyPose(options = {}) { rig.pose(options); muscles.update({spread: options.spread || 0}); sync(); },
    // Retargeter/mixer writes the host pose FIRST. This method never resets it.
    updateAfterAnimation() {
      scene.updateWorldMatrix(true, true);
      const result = muscles.update(); sync(); return result;
    },
    setLayers(mode = 'both') {
      if (!['both', 'skeleton', 'muscles'].includes(mode)) throw new Error('Unknown layer mode');
      scene.traverse(n => {
        if (n.isMesh && n.userData.aurel_layer) n.visible = mode === 'both' || n.userData.aurel_layer === mode;
      });
    }
  };
}
