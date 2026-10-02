"""Render an illustrative pair; text stands in for the runtime instanced face."""
from pathlib import Path
import bpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for kind,offset,owner,scores,color,face in [('beacon',-4.5,'PLAYER',['37','500','0'],(.91,.75,.29,1),.61),('splitflap',4.5,'ISAO',['0','0','500'],(.49,1,.69,1),.69)]:
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/f'assets/planet-scoreboards/{kind}_rivalry_d0_lod1.glb'))
    for obj in set(bpy.data.objects)-before:
        if obj.parent is None:obj.location.x+=offset
    mat=bpy.data.materials.new(owner+' runtime preview');mat.diffuse_color=color;mat.use_nodes=True
    nodes=mat.node_tree.nodes;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');em=nodes.new('ShaderNodeEmission');em.inputs['Color'].default_value=color;em.inputs['Strength'].default_value=1.4;mat.node_tree.links.new(em.outputs[0],out.inputs['Surface'])
    def label(text,x,z,size):
        curve=bpy.data.curves.new(owner+' '+text,'FONT');curve.body=text;curve.size=size;curve.align_x='CENTER';curve.align_y='CENTER';obj=bpy.data.objects.new(owner+' '+text,curve);bpy.context.collection.objects.link(obj);obj.location=(offset+x,-face-.105,z);obj.rotation_euler.x=1.57079632679;obj.data.materials.append(mat)
    label(owner,0,3.74,.27)
    for name,value,z in zip(['KILLS','GATHERED','USED'],scores,[3.12,2.39,1.66]):
        label(name,-2.52,z,.18)
        label(value,.93,z,.41)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1400;scene.render.resolution_y=730;scene.render.resolution_percentage=100;scene.world.color=(.08,.12,.15)
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Review camera');camera=bpy.data.objects.new('Review camera',camera_data);scene.collection.objects.link(camera);camera.location=(8,-26,12);aim(camera,(0,0,2));camera_data.type='ORTHO';camera_data.ortho_scale=17.5;scene.camera=camera
for name,loc,power,size,color in [('Key',(-9,-12,17),2700,12,(1,.9,.73)),('Fill',(10,5,15),2000,12,(.55,.82,1)),('Front',(0,-10,9),1100,10,(.85,1,1))]:
    data=bpy.data.lights.new(name,'AREA');obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;aim(obj,(0,0,1));data.energy=power;data.shape='DISK';data.size=size;data.color=color
ground=bpy.data.meshes.new('Ground');ground.from_pydata([(-100,-100,-.04),(100,-100,-.04),(100,100,-.04),(-100,100,-.04)],[],[(0,1,2,3)]);obj=bpy.data.objects.new('Ground',ground);scene.collection.objects.link(obj);mat=bpy.data.materials.new('Slate background');mat.diffuse_color=(.026,.055,.065,1);ground.materials.append(mat)
scene.view_settings.view_transform='AgX';scene.render.filepath=str(ROOT/'assets/workshop/scoreboard-rivalry.png');bpy.ops.render.render(write_still=True)
