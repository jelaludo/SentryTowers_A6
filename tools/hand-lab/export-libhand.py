"""CC BY 3.0 LibHand inspection derivative; original .blend stays untouched.
Run: blender --background --disable-autoexec assets/hand-lab/references/libhand/source/hand.blend --python tools/hand-lab/export-libhand.py
"""
import bpy,json
from pathlib import Path
bpy.ops.object.select_all(action='DESELECT')
arm=bpy.data.objects['Armature'];mesh=bpy.data.objects['hand_mesh']
mapping={}
for b in arm.data.bones:
 old=b.name;b.name='LIBHAND_'+old.upper().replace('.','_');mapping[old]=b.name
for p in arm.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=(1,0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
for i,m in enumerate(mesh.data.materials):
 mat=bpy.data.materials.new('LIBHAND_REFERENCE_'+str(i));mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.29,.39,.43,1) if i==0 else (.025,.035,.04,1);bsdf.inputs['Roughness'].default_value=.55;bsdf.inputs['Metallic'].default_value=.1;mesh.data.materials[i]=mat
arm.select_set(True);mesh.select_set(True)
bpy.ops.export_scene.gltf(filepath='/tmp/hand-lab-libhand.glb',export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_yup=True,export_extras=True)
Path('/tmp/hand-lab-libhand-bones.json').write_text(json.dumps(mapping,indent=2))
