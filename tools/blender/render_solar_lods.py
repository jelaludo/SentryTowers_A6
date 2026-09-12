"""Render actual Solar game and distance exports side-by-side."""
from pathlib import Path
import bpy
from mathutils import Vector
P=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for lod,x in [(1,-14),(2,14)]:
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(P/f'assets/solar-power/lod{lod}/solar_power_complex_d0.glb'))
 for o in set(bpy.data.objects)-before:
  if o.parent is None:o.location.x+=x
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.41));mat=bpy.data.materials.new('Ground');mat.diffuse_color=(.09,.13,.15,1);bpy.context.object.data.materials.append(mat)
scene=bpy.context.scene;scene.world.color=(.25,.25,.25)
for loc,power,size in [((0,-10,30),12000,25),((12,20,25),10000,20)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(30,-45,42));o=bpy.context.object;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=62;scene.camera=o
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1500;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.render.filepath='/tmp/solar-lods.png';bpy.ops.render.render(write_still=True)
