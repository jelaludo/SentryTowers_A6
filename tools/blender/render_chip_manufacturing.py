"""Derive editable review assembly and preview renders from ARC/SEED detailed GLBs."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def load(name):
    old=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'assets/chip-manufacturing/lod0/{name}_d0_lod0.glb'))
    return next(o for o in set(bpy.data.objects)-old if o.parent is None)
launcher=load('writer')
scene=bpy.context.scene
scene.name='LIT-01 detailed review assembly'
world=scene.world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.23,.28,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.55
bpy.ops.mesh.primitive_plane_add(size=60,location=(0,0,-.025))
ground=bpy.context.object
ground.name='REVIEW_GROUND_NOT_EXPORTED'
mat=bpy.data.materials.new('Basalt')
mat.diffuse_color=(.07,.10,.12,1)
ground.data.materials.append(mat)
target=Vector((0,0,1.7))
for name,pos,power,size,color in [('KEY',(5,-6,12),1800,8,(.8,.93,1)),('RIM',(-6,5,10),2400,7,(.5,.76,1)),('FILL',(8,6,8),1600,7,(1,.83,.61))]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    light=bpy.context.object
    light.name=name
    light.data.energy=power
    light.data.shape='DISK'
    light.data.size=size
    light.data.color=color
    light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(10,-12,11))
cam=bpy.context.object
cam.name='ARC_REVIEW_CAMERA'
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO'
cam.data.ortho_scale=12
scene.camera=cam
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.render.resolution_x=1600
scene.render.resolution_y=1100
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.image_settings.file_format='JPEG'
scene.render.image_settings.quality=94
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/chip-manufacturing.blend'))
out=ROOT/'assets/chip-manufacturing/previews'
out.mkdir(parents=True,exist_ok=True)
scene.render.filepath=str(ROOT/'assets/workshop/chip-manufacturing.jpg')
bpy.ops.render.render(write_still=True)
target=Vector((.3,0,2.6))
cam.location=(5,-7,10)
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.ortho_scale=7.7
scene.render.filepath=str(out/'optical-bench.jpg')
bpy.ops.render.render(write_still=True)
