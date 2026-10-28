"""Review-only lighting/cameras; not part of the authored asset."""
import bpy,sys
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parents[2];OUT=P/'assets/b-rek43'
bpy.ops.wm.open_mainfile(filepath=str(P/'source/blender/a6-b-rek43.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1200;s.render.resolution_y=1100;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX'
s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.15,.17,.19,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.55

def aim(o,p):o.rotation_euler=(Vector(p)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size,color in [('Key',(3,-4,5),800,4,(1,.92,.80)),('Fill',(-3,-2,3),550,4,(.74,.86,1)),('Rim',(1,3,4),950,3,(1,.94,.82))]:
 d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;d.color=color;aim(o,(0,0,1.2))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.002));floor=bpy.context.object;floor.name='REVIEW_GROUND';m=bpy.data.materials.new('Studio_floor');m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.09,.10,.105,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8;floor.data.materials.append(m)
d=bpy.data.cameras.new('REVIEW_CAMERA');cam=bpy.data.objects.new('REVIEW_CAMERA',d);s.collection.objects.link(cam);d.type='ORTHO';s.camera=cam;arm=bpy.data.objects['BREK43_RIG']
poses=[('preview', 'Recon_Idle', 0, 'hero'), ('hands-detail', 'Recon_Idle', 0, 'hands'), ('signal', 'Signal_Halt', 2.4, 'hero'), ('scan', 'Survey_Scan', 1.8, 'hero'), ('front', 'Recon_Idle', 0, 'front'), ('rear', 'Recon_Idle', 0, 'rear'), ('head-detail', 'Recon_Idle', 0, 'head'), ('walk', 'Patrol_Walk_Cycle', 0.56, 'hero'), ('stealth', 'Stealth_Walk_Cycle', 0.76, 'hero'), ('crouch', 'Crouch_Observe', 2.4, 'hero'), ('hips-detail', 'Recon_Idle', 0, 'hips'), ('hooves-detail', 'Recon_Idle', 0, 'hooves')]
if '--hero' in sys.argv:poses=[p for p in poses if p[0]=='preview']
if '--pose' in sys.argv:poses=[p for p in poses if p[0]==sys.argv[sys.argv.index('--pose')+1]]
if '--gait-study' in sys.argv:poses=[('step-'+str(i),'Patrol_Walk_Cycle',t,'side') for i,t in enumerate([0,.12,.375,.75,.975,1.125])]
for file,clip,t,view in poses:
 for tr in arm.animation_data.nla_tracks:tr.mute=tr.name!=clip
 s.frame_set(int(t*s.render.fps),subframe=t*s.render.fps%1)
 cam.location=Vector({'hero':(3,-5,2.9),'front':(0,-6,1.5),'rear':(-3,5,2.8),'head':(1.6,-3,2.54),'side':(5,-.15,1.5),'hands':(1.4,-3,1.56),'hips':(2,-4,1.92),'hooves':(2,-4,1.05)}[view]);target,scale={'head':((0,-.055,2.47),.68),'hands':((.46,-.06,1.31),.59),'hips':((0,0,1.74),.81),'hooves':((0,-.02,.15),.94)}.get(view,((0,0,1.35),3.32));aim(cam,target);d.ortho_scale=scale
 s.render.filepath=str(OUT/(file+'.png'));bpy.ops.render.render(write_still=True)
print('BREK43_REVIEW_COMPLETE',flush=True)
