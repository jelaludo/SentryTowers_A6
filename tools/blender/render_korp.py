import bpy,math
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(P/'assets/korp/korp_d0_lod0.glb'))
for o in bpy.context.scene.objects:
 if o.animation_data:o.animation_data_clear()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.04));m=bpy.data.materials.new('Ground');m.diffuse_color=(.075,.11,.13,1);bpy.context.object.data.materials.append(m)
sc=bpy.context.scene;sc.world.color=(.3,.3,.3)
for loc,power,size in [((0,-20,30),16000,20),((-18,8,20),18000,18),((20,12,16),14000,12)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(30,-38,26));o=bpy.context.object;o.rotation_euler=(Vector((0,0,4))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=41;sc.camera=o
sc.render.engine='CYCLES';sc.cycles.samples=24;sc.render.resolution_x=1400;sc.render.resolution_y=1000;sc.render.resolution_percentage=100;sc.render.filepath='/tmp/korp-preview.png';bpy.ops.render.render(write_still=True)
