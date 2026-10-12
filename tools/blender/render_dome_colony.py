"""Compose the exported LOD0 blockout with canonical unit references, save editable review scene, render thumbnail."""
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def load(path,prefix,position,hide=()):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/path))
    objects=set(bpy.data.objects)-before
    for obj in objects:
        original=obj.name.split('.')[0]
        if original in hide:obj.hide_render=True;obj.hide_viewport=True
        if obj.parent is None:obj.location+=Vector(position)
        if prefix=='MORK' and original=='HOVER_RIG':obj.location.z+=.55
        obj.name=prefix+'_'+original
    return objects
load('assets/dome-colony/biosphere_d0_lod0.glb','BIO',(-24,0,0),('PORT_CAP_E',))
load('assets/dome-colony/fabrication_d0_lod0.glb','FAB',(24,0,0),('PORT_CAP_W',))
load('assets/dome-colony/bridge_d0_lod0.glb','LINK',(0,0,0))
load('assets/hover-tank/mork_hover_tank_low_d0.glb','MORK',(0,-8,0))
load('assets/sentries/lod1/railgun_t3_d0.glb','SENTRY',(24,0,13.78))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1440;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.world.color=(.18,.21,.25)
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('REVIEW_CAMERA');camera=bpy.data.objects.new('REVIEW_CAMERA',data);scene.collection.objects.link(camera);camera.location=(52,-74,47);aim(camera,(0,0,5));data.type='ORTHO';data.ortho_scale=95;scene.camera=camera
for name,loc,power,size,color in [('KEY',(-25,-25,60),65000,35,(1,.92,.79)),('FILL',(35,15,45),45000,30,(.68,.84,1))]:
    data=bpy.data.lights.new(name,'AREA');obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;aim(obj,(0,0,0));data.energy=power;data.shape='DISK';data.size=size;data.color=color
bpy.ops.mesh.primitive_plane_add(size=1000,location=(0,0,-.06));ground=bpy.context.object;ground.name='REVIEW_GROUND';mat=bpy.data.materials.new('REVIEW_GROUND_MATERIAL');mat.diffuse_color=(.11,.15,.18,1);ground.data.materials.append(mat)
scene.view_settings.view_transform='AgX';scene.render.filepath=str(ROOT/'assets/dome-colony/preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'source/blender/dome-colony-blockout.blend'))
bpy.ops.render.render(write_still=True)
