"""Derive editable Blender review scene and preview renders for the MX-06 six-legged mech."""
from pathlib import Path
import bpy
import sys
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
DAMAGE = int(sys.argv[sys.argv.index("--damage")+1]) if "--damage" in sys.argv else 0


def setup_scene(name, bg_color=(0.07, 0.10, 0.13)):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.name = name
    scene['derived_review_assembly'] = True
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 28
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 810
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    world = scene.world
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (*bg_color, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 0.85
    return scene


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()


def add_light(scene, name, loc, target, energy, size, color):
    data = bpy.data.lights.new(name, 'AREA')
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    aim(obj, target)
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    data.color = color
    return obj


scene = setup_scene('FEIDS26_Derived_Review', (0.045, 0.065, 0.085))
bpy.ops.import_scene.gltf(filepath='/tmp/feids-review.glb')
for obj in bpy.data.objects:
    if obj.animation_data: obj.animation_data_clear()
add_light(scene, 'KEY', (-12,-12,18), (0,0,4), 4500, 10, (1,.9,.74))
add_light(scene, 'FILL', (10,-5,10), (0,0,4), 3500, 8, (.65,.8,1))
add_light(scene, 'RIM', (0,12,16), (0,0,4), 5000, 8, (1,.7,.4))
cam_data=bpy.data.cameras.new('REVIEW_CAMERA')
cam=bpy.data.objects.new('REVIEW_CAMERA',cam_data)
scene.collection.objects.link(cam)
cam.location=(-18,-23,17)
aim(cam,(0,0,3.8))
cam_data.type='ORTHO'
cam_data.ortho_scale=34
scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/feids26-review.blend'))
scene.render.filepath=str(ROOT/'assets/feids26/preview.png')
bpy.ops.render.render(write_still=True)
# Separate ground-camera proof frame, using the actual final landing pose.
scene=setup_scene('FEIDS26_Ground_Camera_Review', (.12,.16,.20))
bpy.ops.import_scene.gltf(filepath='/tmp/feids-impact-review.glb')
add_light(scene,'GROUND_KEY',(-12,-8,18),(7,-5,1),2400,8,(1,.88,.72))
add_light(scene,'GROUND_FILL',(10,5,12),(7,-5,1),2000,8,(.7,.85,1))
bpy.ops.mesh.primitive_plane_add(size=180,location=(0,0,-.015))
mat=bpy.data.materials.new('GROUND');mat.diffuse_color=(.19,.20,.21,1);bpy.context.object.data.materials.append(mat)
cam_data=bpy.data.cameras.new('ANT_CAMERA');cam=bpy.data.objects.new('ANT_CAMERA',cam_data);scene.collection.objects.link(cam)
cam.location=(9.75,-7,.2);aim(cam,(7.6,-5.5,.65));cam_data.sensor_fit='VERTICAL';cam_data.sensor_height=24;cam_data.lens=18.1;cam_data.clip_start=.1;scene.camera=cam
scene.render.filepath=str(ROOT/'assets/feids26/landing-preview.png')
bpy.ops.render.render(write_still=True)
