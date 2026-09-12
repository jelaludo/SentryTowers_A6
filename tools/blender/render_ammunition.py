"""Render the ammunition library thumbnail from the actual display meshes."""
from pathlib import Path
import bpy,math,json
from mathutils import Vector
P=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(P/'source/blender/ammunition-library.blend'))
scene=bpy.context.scene
for o in scene.objects:o.hide_render=True
families=json.loads((P/'assets/ammunition/manifest.json').read_text())['families'][:18]
for i,f in enumerate(families):
 v=next(v for v in f['variants'] if v['tier']=='display' and v['form']==('round' if f['shape'] in ['cartridge','dart','arrow'] else 'projectile'))
 root=next(o for o in scene.objects if o.get('asset_id')==v['id'] or (o.parent is None and o.get('family')==f['id'] and o.get('form')==v['form'] and v['id'] in o.name))
 # Collection membership uniquely identifies the selected asset even if root naming changes.
 for col in root.users_collection:
  for o in col.objects:o.hide_render=False
 root.scale=(2.6/v['length_m'],)*3;root.rotation_euler.x=-math.pi/2;root.location=((i%9)*1.12,(i//9)*2.8,0)
mat=bpy.data.materials.new('Preview ground');mat.diffuse_color=(.075,.105,.12,1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025));bpy.context.object.data.materials.append(mat)
world=bpy.data.worlds.new('Preview studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.35,.43,.5,1);world.node_tree.nodes['Background'].inputs[1].default_value=.7;scene.world=world
for loc,power,size in [((0,-4,9),2300,8),((8,3,8),2800,7),((4,7,5),2000,6)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((4,1,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(11,-14,11));cam=bpy.context.object;cam.rotation_euler=(Vector((4.5,1.5,1.2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=12.4;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1500;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath='/tmp/ammunition-preview.png';bpy.ops.render.render(write_still=True)
