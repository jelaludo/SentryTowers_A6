"""Derive editable Blender review scene and preview renders for the XB-12 four-wheel rover."""
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


scene = setup_scene('XB12_Review_Derived', (0.07, 0.10, 0.13))
bpy.ops.import_scene.gltf(filepath=str(ROOT / f'assets/xb12/xb12_d{DAMAGE}_lod0.glb'))

bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.01))
ground = bpy.context.object
ground.name = 'REVIEW_GROUND_NOT_EXPORTED'
mat = bpy.data.materials.new('BasaltTestPad')
mat.diffuse_color = (0.09, 0.12, 0.15, 1)
ground.data.materials.append(mat)

add_light(scene, 'KEY_SUN_WARM', (-4.8, -5.4, 5.2), (0, 0, 0.7), 980, 3.8, (1.0, 0.95, 0.88))
add_light(scene, 'FILL_STEEL_COOL', (5.0, -3.6, 3.6), (0, 0, 0.7), 640, 3.5, (0.72, 0.88, 1.0))
add_light(scene, 'RIM_BACK', (2.6, 5.8, 4.4), (0, 0, 0.8), 880, 3.2, (0.85, 0.94, 1.0))
add_light(scene, 'UNDERCAB_THRUSTER_GLOW', (-1.8, -2.0, 0.22), (0, 0, 0.55), 320, 1.8, (0.42, 0.88, 1.0))

cam_data = bpy.data.cameras.new('REVIEW_CAMERA')
cam = bpy.data.objects.new('REVIEW_CAMERA', cam_data)
scene.collection.objects.link(cam)
cam.location = (-4.8, -5.3, 3.1)
aim(cam, (0.0, 0.0, 1.0))
cam_data.lens = 37
scene.camera = cam

(ROOT / 'source/blender').mkdir(parents=True, exist_ok=True)
if DAMAGE == 0:
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'source/blender/xb12.blend'))
scene.render.filepath = str(ROOT / ('assets/xb12/preview.png' if DAMAGE == 0 else f'assets/xb12/damage-d{DAMAGE}.png'))
bpy.ops.render.render(write_still=True)
