"""Editable assembly from original procedural GLBs and consistent review renders."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.name = 'Frontier industry / detailed assembly'
def load(family, position, suffix=''):
    previous = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT / f'assets/settlement-industry/lod0/{family}_d0_lod0.glb'))
    new = set(bpy.data.objects) - previous
    root = next(o for o in new if o.parent is None)
    root.location = (position[0], -position[2], position[1])
    for o in new:
        o.name = o.name + suffix
    return root, new
load('drill', (-7, 0, 0))
load('hauler', (-4.4, 0, 4.8))
load('cassette', (-4.4, .12, 0))
load('furnace', (5, 0, 7.8))
receiver = Vector((5, -6.60, 3.24))
sun = Vector((-.35, .3, 1)).normalized()
for i, (x, z) in enumerate([(3,-4),(7,-4),(11,-4),(3,0),(7,0),(11,0),(11,4)]):
    _, objects = load('mirror', (x, 0, z), f'_ARRAY_{i+1:02}')
    pitch = next(o for o in objects if o.name.startswith('MIRROR_PITCH'))
    target = (sun + (receiver - Vector((x,-z,2.2))).normalized()).normalized()
    bpy.context.view_layer.update()
    normal_local = pitch.parent.matrix_world.to_quaternion().inverted() @ target
    pitch.rotation_mode = 'QUATERNION'
    pitch.rotation_quaternion = Vector((0,-1,0)).rotation_difference(normal_local)
world=scene.world or bpy.data.worlds.new('Industry studio')
scene.world=world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.25,.28,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.mesh.primitive_plane_add(size=200, location=(0,0,-.025))
ground=bpy.context.object
ground.name='REVIEW_GROUND_NOT_EXPORTED'
m=bpy.data.materials.new('Basalt dust')
m.diffuse_color=(.075,.095,.105,1)
m.use_nodes=True
m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.075,.095,.105,1)
m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.88
ground.data.materials.append(m)
target=Vector((1,-3,1.4))
for name,pos,power,size,color in [('KEY',(-8,-10,22),6500,13,(.82,.93,1)),('RIM',(12,12,16),8500,10,(.55,.78,1)),('FILL',(3,-18,10),4300,10,(1,.86,.67))]:
    bpy.ops.object.light_add(type='AREA',location=pos)
    o=bpy.context.object
    o.name=name
    o.data.energy=power
    o.data.shape='DISK'
    o.data.size=size
    o.data.color=color
    o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(26,-33,26))
camera=bpy.context.object
camera.name='INDUSTRY_REVIEW_CAMERA'
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'
camera.data.ortho_scale=31
scene.camera=camera
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.render.resolution_x=1600
scene.render.resolution_y=1100
scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/settlement-industry.blend'))
scene.render.image_settings.file_format='PNG'
scene.render.filepath='/tmp/settlement-industry-review.png'
bpy.ops.render.render(write_still=True)

scene.render.image_settings.file_format='JPEG'
scene.render.image_settings.quality=94
scene.render.filepath=str(ROOT/'assets/workshop/settlement-industry.jpg')
bpy.ops.render.render(write_still=True)

# Individual close-shot reviews; the saved editable master remains the complete rest scene.
preview_dir = ROOT/'assets/settlement-industry/previews'
preview_dir.mkdir(parents=True, exist_ok=True)
roots = [o for o in scene.objects if o.parent is None and o.type == 'EMPTY']
def show_roots(names):
    for root in roots:
        visible = root.name in names
        root.hide_render = not visible
        for o in root.children_recursive:
            o.hide_render = not visible
for family,names,centre,span in [
    ('drill',['BOR_ROOT','CAS_ROOT'],(-6.4,0,3.1),10.2),
    ('hauler',['TRK_ROOT'],(-4.4,-4.8,1.5),10.8),
    ('mirror',['HEL_ROOT_ARRAY_01'],(3,4,1.7),5.5),
    ('furnace',['CRU_ROOT'],(5,-7.8,1.9),6.6),
]:
    show_roots(names)
    target=Vector(centre)
    offset=Vector((8,-10,6)) if family!='furnace' else Vector((7,10,6))
    camera.location=target+offset
    camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=span
    scene.render.resolution_x=1100
    scene.render.resolution_y=900
    scene.render.filepath=str(preview_dir/f'{family}.jpg')
    bpy.ops.render.render(write_still=True)
# Review the same carrier at the end of the loading stroke.
show_roots(['BOR_ROOT','TRK_ROOT','CAS_ROOT'])
bpy.data.objects['CARGO_SLIDE'].location.y=1.05
bpy.data.objects['CARGO_LIFT'].location.z=1.72
bpy.data.objects['LIFT_TELESCOPE'].location.z=1.72
bpy.data.objects['LIFT_TELESCOPE'].scale.z=(1.8-1.72)/1.8
bpy.data.objects['CAS_ROOT'].location=(-4.4,-3.75,1.84)
bpy.data.objects['CASSETTE_LEVEL'].scale.z=1
chute=bpy.data.objects['ORE_CHUTE_SWING']
chute.rotation_mode='XYZ'
chute.rotation_euler.z=-1.4
target=Vector((-5.5,-1.9,2.0))
camera.location=target+Vector((10,-12,9))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=13.4
scene.render.filepath=str(preview_dir/'cargo-stowed.jpg')
bpy.ops.render.render(write_still=True)
