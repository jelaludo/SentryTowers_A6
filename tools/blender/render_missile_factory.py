"""Render the intact factory game tier for the Workshop catalog and visual QA.
blender --background --python-exit-code 1 --python tools/blender/render_missile_factory.py
"""
import math
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/missile-factory/missile_factory_d0_lod1.glb'))
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=48
scene.render.resolution_x=1200;scene.render.resolution_y=760;scene.render.resolution_percentage=100
scene.world.color=(.09,.13,.16)
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Review orthographic camera');camera=bpy.data.objects.new('Review camera',camera_data);scene.collection.objects.link(camera);camera.location=(17,-23,17);aim(camera,(0,0,1.15));camera_data.type='ORTHO';camera_data.ortho_scale=24;scene.camera=camera
for name,loc,power,size,color in [('Key',(-9,-4,16),2400,12,(1,.87,.7)),('Fill',(10,7,11),1900,10,(.53,.82,1)),('Rim',(0,10,15),1500,8,(.7,1,.9))]:
    data=bpy.data.lights.new(name,'AREA');obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;aim(obj,(0,0,0));data.energy=power;data.shape='DISK';data.size=size;data.color=color
ground=bpy.data.meshes.new('Ground');ground.from_pydata([(-100,-100,-.04),(100,-100,-.04),(100,100,-.04),(-100,100,-.04)],[],[(0,1,2,3)]);obj=bpy.data.objects.new('Ground',ground);scene.collection.objects.link(obj);mat=bpy.data.materials.new('Slate background');mat.diffuse_color=(.026,.055,.065,1);ground.materials.append(mat)
scene.view_settings.view_transform='AgX'
scene.render.filepath=str(ROOT/'assets/workshop/missile-factory.png')
bpy.ops.render.render(write_still=True)
