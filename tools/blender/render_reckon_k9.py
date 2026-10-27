"""Render the authored K9 source and representative action poses."""
import bpy,sys,math
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[2];OUT=P/'assets/reckon-k9'
bpy.ops.wm.open_mainfile(filepath=str(P/'source/blender/a6-reckon-k9.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=850;s.render.resolution_percentage=100
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.14,.18,.22,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.6
s.view_settings.view_transform='AgX'
def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Key',(1,-2,3),180,2,(1,.91,.78)),('Fill',(-2,-1,1.4),120,2,(.65,.82,1)),('Rim',(0,2,2.3),210,1.4,(.70,.90,1))]:
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;d.color=color;aim(o,(0,0,.4))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.004));floor=bpy.context.object;floor.name='REVIEW_FLOOR';m=bpy.data.materials.new('Studio graphite');m.diffuse_color=(.045,.06,.073,1);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.045,.06,.073,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.72;floor.data.materials.append(m)
d=bpy.data.cameras.new('REVIEW_CAMERA');cam=bpy.data.objects.new('REVIEW_CAMERA',d);s.collection.objects.link(cam);cam.location=(1.55,-2.05,1.25);aim(cam,(0,-.01,.43));d.type='ORTHO';d.ortho_scale=1.95;s.camera=cam
arm=bpy.data.objects['RECKON_RIG']
poses=[('preview','Alert_Idle',0),('walk','Walk_Cycle',.32),('run','Run_Cycle',.2*.5/.7),('sit','Sit_Down',2.4),('roll','Roll_Over',2.2),('hand','Give_Paw',2),('jump','Jump',.855),('fetch','Fetch_Return',2.65)]
if '--hero' in sys.argv:poses=poses[:1]
if '--jump-study' in sys.argv:
 sys.path.insert(0,str(Path(__file__).resolve().parent))
 from quadruped_motion import JUMPS
 poses=[('jump-'+name,'Jump',t) for name,t in JUMPS['k9']['landmarks_s'].items()]

if '--gait-study' in sys.argv:poses=[('gait-walk','Walk_Cycle',.32),('gait-trot','Run_Cycle',.20*.5/.7),('gait-pace','Pace_Cycle',.2),('gait-canter','Canter_Cycle',.2025),('gait-gallop','Gallop_Cycle',.18),('gait-sprint','Sprint_Cycle',.279)]
if '--jump-study' in sys.argv:
 marks=bpy.data.materials.new('Review_distance_marks');marks.diffuse_color=(.18,.30,.36,1)
 for i in range(5):
  bpy.ops.mesh.primitive_cube_add(size=1,location=(0,-2.4*i/4,-.001))
  o=bpy.context.object;o.name='REVIEW_DISTANCE_'+str(i);o.dimensions=(.65 if i%4==0 else .35,.012,.002);o.data.materials.append(marks)
 # Broad lighting covers the fixed takeoff-to-landing frame.
 for o in s.objects:
  if o.type=='LIGHT':o.location.y+=-1.2;o.data.size*=1.5;o.data.energy*=1.5;aim(o,(0,-1.2,.5))

if '--pose' in sys.argv:poses=[p for p in poses if p[0]==sys.argv[sys.argv.index('--pose')+1]]
for file,clip,t in poses:
 for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!=clip
 s.frame_set(int(t*s.render.fps),subframe=t*s.render.fps%1);offset=arm.pose.bones['MOTION'].head.copy();cam.location=Vector((1.55,-2.05,1.25))+offset;aim(cam,offset+Vector((0,-.01,.70 if clip=='Jump' else .53)));
 if '--jump-study' in sys.argv or '--gait-study' in sys.argv:cam.location=Vector((3.2,0,1))+offset;aim(cam,offset+Vector((0,0,.57)));d.ortho_scale=2.0
 if '--jump-study' in sys.argv:cam.location=Vector((5,-1.2,1.1));aim(cam,(0,-1.2,.70));d.ortho_scale=4.5
 s.render.filepath=str(OUT/(file+'.png'));bpy.ops.render.render(write_still=True)
print('RENDER_COMPLETE',flush=True)
