"""Render the three game-tier scoreboards for Workshop catalog and visual QA.
blender --background --python-exit-code 1 --python tools/blender/render_planet_scoreboards.py
"""
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for name,x in [('beacon',-8),('flipdot',0),('splitflap',8)]:
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'assets/planet-scoreboards/{name}_scoreboard_d0_lod1.glb'))
    for obj in set(bpy.data.objects)-before:
        if obj.parent is None:obj.location.x+=x
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.render.resolution_x=1500;scene.render.resolution_y=760;scene.render.resolution_percentage=100;scene.world.color=(.09,.13,.16)
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Review orthographic camera');camera=bpy.data.objects.new('Review camera',camera_data);scene.collection.objects.link(camera);camera.location=(11,-29,15);aim(camera,(0,0,1.9));camera_data.type='ORTHO';camera_data.ortho_scale=26;scene.camera=camera
for name,loc,power,size,color in [('Key',(-12,-9,18),3000,12,(1,.9,.73)),('Fill',(12,7,14),2600,12,(.55,.82,1)),('Front',(0,-14,11),1400,10,(.85,1,1))]:
    data=bpy.data.lights.new(name,'AREA');obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;aim(obj,(0,0,1));data.energy=power;data.shape='DISK';data.size=size;data.color=color
ground=bpy.data.meshes.new('Ground');ground.from_pydata([(-100,-100,-.04),(100,-100,-.04),(100,100,-.04),(-100,100,-.04)],[],[(0,1,2,3)]);obj=bpy.data.objects.new('Ground',ground);scene.collection.objects.link(obj);mat=bpy.data.materials.new('Slate background');mat.diffuse_color=(.026,.055,.065,1);ground.materials.append(mat)
scene.view_settings.view_transform='AgX';scene.render.filepath=str(ROOT/'assets/workshop/planet-scoreboards.png');bpy.ops.render.render(write_still=True)
