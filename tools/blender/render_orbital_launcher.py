"""Derive editable review assembly and preview renders from ARC/SEED detailed GLBs."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def load(name):
    old=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'assets/orbital-launcher/lod0/{name}_d0_lod0.glb'))
    return next(o for o in set(bpy.data.objects)-old if o.parent is None)
launcher=load('launcher')
satellite=load('satellite')
satellite.location=(0,24,3.03)
scene=bpy.context.scene
scene.name='ARC-01 / SEED-01 detailed assembly'
world=scene.world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.23,.28,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.55
bpy.ops.mesh.primitive_plane_add(size=300,location=(0,0,-.025))
ground=bpy.context.object
ground.name='REVIEW_GROUND_NOT_EXPORTED'
mat=bpy.data.materials.new('Basalt')
mat.diffuse_color=(.07,.10,.12,1)
ground.data.materials.append(mat)
target=Vector((0,1,10))
for name,pos,power,size,color in [('KEY',(15,8,55),30000,24,(.8,.93,1)),('RIM',(-24,-20,40),40000,20,(.5,.76,1)),('FILL',(12,40,28),20000,20,(1,.83,.61))]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    light=bpy.context.object
    light.name=name
    light.data.energy=power
    light.data.shape='DISK'
    light.data.size=size
    light.data.color=color
    light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(52,48,42))
cam=bpy.context.object
cam.name='ARC_REVIEW_CAMERA'
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO'
cam.data.ortho_scale=65
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
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/orbital-launcher.blend'))
out=ROOT/'assets/orbital-launcher/previews'
out.mkdir(parents=True,exist_ok=True)
scene.render.filepath=str(ROOT/'assets/workshop/orbital-launcher.jpg')
bpy.ops.render.render(write_still=True)
target=Vector((0,24,3))
cam.location=(13,36,12)
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.ortho_scale=17
scene.render.resolution_x=1200
scene.render.resolution_y=1000
scene.render.filepath=str(out/'loading.jpg')
bpy.ops.render.render(write_still=True)
launcher.hide_render=True
for o in launcher.children_recursive:o.hide_render=True
satellite.location=(0,0,2.1)
for i in range(1,7):
    hinge=bpy.data.objects[f'PETAL_{i}_HINGE']
    hinge.rotation_mode='XYZ'
    hinge.rotation_euler.x=0
target=Vector((0,0,3.2))
cam.location=(6,-9,6)
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.ortho_scale=8.2
scene.render.filepath=str(out/'collector-deployed.jpg')
bpy.ops.render.render(write_still=True)
