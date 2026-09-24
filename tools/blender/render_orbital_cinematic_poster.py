"""Review poster, derived from the deterministic cinematic at 96 seconds."""
import bpy
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/tmp/orbital-cinematic-review.glb')
scene=bpy.context.scene
scene.camera=next(o for o in bpy.data.objects if o.type=='CAMERA')
scene.world=bpy.data.worlds.new('Space');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.015,.025,.04,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
for pos,power,color in [((300,-400,260),3.5,(1,.91,.77)),((-300,200,100),1.5,(.4,.65,1))]:
    bpy.ops.object.light_add(type='SUN',location=pos);o=bpy.context.object;o.rotation_euler=(Vector((0,0,-140))-o.location).to_track_quat('-Z','Y').to_euler();o.data.energy=power;o.data.color=color;o.data.angle=.1
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='JPEG';scene.render.image_settings.quality=92
scene.render.filepath=str(ROOT/'assets/workshop/orbital-cinematic.jpg')
bpy.ops.render.render(write_still=True)
