"""Derive editable review assembly and preview renders from ARC/SEED detailed GLBs."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def load(name):
    old=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'assets/heptapod-extractor/lod0/{name}_d0_lod0.glb'))
    return next(o for o in set(bpy.data.objects)-old if o.parent is None)
launcher=load('extractor')
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/hover-tank/mork_hover_tank_low_d0.glb'))
tank=bpy.context.selected_objects[0]
while tank.parent: tank=tank.parent
tank.name='MORK_SCALE_REFERENCE_NOT_EXPORTED'
tank.location.y=2
for name in ['LASER_BEAM','GROUND_EFFECT','RESOURCE_STREAM']:
    o=bpy.data.objects.get(name)
    if o:
        o.hide_render=True
        for c in o.children_recursive:c.hide_render=True
scene=bpy.context.scene
scene.name='HEX-06 detailed review assembly'
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
target=Vector((0,0,6))
for name,pos,power,size,color in [('KEY',(10,-12,25),7500,12,(.8,.93,1)),('RIM',(-14,10,20),10000,10,(.5,.76,1)),('FILL',(16,12,18),6500,10,(1,.83,.61))]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    light=bpy.context.object
    light.name=name
    light.data.energy=power
    light.data.shape='DISK'
    light.data.size=size
    light.data.color=color
    light.rotation_euler=(target-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(24,-30,20))
cam=bpy.context.object
cam.name='ARC_REVIEW_CAMERA'
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO'
cam.data.ortho_scale=27
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
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/heptapod-extractor.blend'))
out=ROOT/'assets/heptapod-extractor/previews'
out.mkdir(parents=True,exist_ok=True)
scene.render.filepath=str(ROOT/'assets/workshop/heptapod-extractor.jpg')
bpy.ops.render.render(write_still=True)
tank.hide_render=True
for c in tank.children_recursive:c.hide_render=True
for name in ['LASER_BEAM','GROUND_EFFECT','RESOURCE_STREAM']:
    o=bpy.data.objects.get(name)
    if o:
        o.hide_render=False
        for c in o.children_recursive:c.hide_render=False
target=Vector((0,0,6))
cam.location=(23,-28,15)
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.ortho_scale=25
scene.render.filepath=str(out/'mining.jpg')
bpy.ops.render.render(write_still=True)
