"""Standalone SH rocket with baked independent mechanical animation clips.
blender -b --python-exit-code 1 --python tools/blender/build_sh_rocket.py -- --label SH03
"""
import sys, math, json, argparse
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy, Vector, empty, box, cylinder, beam, text
args=argparse.ArgumentParser();args.add_argument('--label',default='SH02');args.add_argument('--no-label',action='store_true')
opt=args.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
P=k.PROJECT;OUT=P/'assets/sh-rocket';OUT.mkdir(exist_ok=True)
bpy.ops.import_scene.gltf(filepath=str(P/'assets/launchpad/hugin_launchpad_d0.glb'))
booster=bpy.data.objects['REUSABLE_BOOSTER'];cap=bpy.data.objects['CARGO_CAPSULE']
keep={booster,cap,*booster.children_recursive,*cap.children_recursive}
for o in list(bpy.data.objects):
    if o not in keep:bpy.data.objects.remove(o,do_unlink=True)
for o in keep:o.animation_data_clear()
booster.parent=None;booster.location=(0,0,-2.5);booster.rotation_euler=(0,0,0);booster.scale=(1,1,1)
cap.parent=booster;cap.location=(0,0,18.4);cap.rotation_euler=(0,0,0);cap.scale=(1,1,1)
k.active_collection=bpy.context.scene.collection
root=empty('SH_ROCKET');k.active_root=root;booster.parent=root
root['credit']='Model by jelaludo';root['designation']=opt.label;root['designation_visible']=not opt.no_label
root['units']='metres';root['origin']='Deployed ground plane; glTF +Y up'
for o in list(keep):
    if o.name.startswith(('Booster name','Cargo stencil','Cargo serial','Booster registration')):
        bpy.data.objects.remove(o,do_unlink=True)
mark=empty('MARKINGS',parent=booster);mark['text']=opt.label;mark['optional']=True
if not opt.no_label:
    text('MARKING_BODY',opt.label,(0,-2.06,13.4),.67,'edge',mark)
    text('MARKING_CARGO',opt.label,(0,-2.06,19.55),.32,'edge',mark)
# Replace the rigid original struts with an articulated two-link mechanism.
legs=[];moving=[booster];L1=2.8;L2=2.7
for leg in [o for o in bpy.data.objects if o.name.startswith('LANDING_LEG_')]:
    for o in list(leg.children_recursive):
        if not o.name.startswith(('Thermal descent fin','Landing leg hinge')):bpy.data.objects.remove(o,do_unlink=True)
    hip=empty(leg.name+'_HIP',(1.86,0,7),leg)
    upper=beam('Upper swing arm',(0,0,0),(0,0,-L1),.23,'armor',hip)
    knee=empty(leg.name+'_KNEE',(0,0,-L1),hip)
    cylinder('Knee pivot',(0,0,0),.31,.72,'yellow','Y',knee,20)
    beam('Lower swing arm',(0,0,0),(0,0,-L2),.19,'frame',knee)
    ankle=empty(leg.name+'_ANKLE',(0,0,-L2),knee)
    box('Flat landing pad',(0,0,-.2),(2.3,1.65,.32),'edge',parent=ankle)
    box('Foot upper plate',(0,0,-.01),(1.65,1.2,.12),'yellow',parent=ankle)
    cylinder('Ankle pivot',(0,0,.08),.22,.8,'armor','Y',ankle)
    barrel=cylinder(leg.name+'_DAMPER_BARREL',(0,0,0),.15,1,'edge',parent=leg)
    piston=cylinder(leg.name+'_DAMPER_PISTON',(0,0,0),.085,1,'white',parent=leg)
    moving += [hip,knee,ankle,barrel,piston];legs.append((hip,knee,ankle,barrel,piston))
# Hinged upper nose/shoulder, with a recessed dark well and visible rim.
door=empty('TOP_DOOR_HINGE',(0,1.78,3.8),cap);moving.append(door)
for o in list(cap.children):
    if o.name.startswith(('Cargo ogive shoulder','Cargo nose')):
        o.parent=door;o.location-=door.location
# Remove the pressure cylinder's top face so opening the lid reveals an actual well.
hull=next(o for o in cap.children if o.name.startswith('Cargo pressure hull'))
import bmesh
bm=bmesh.new();bm.from_mesh(hull.data);top=max(v.co.z for v in bm.verts)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if all(abs(v.co.z-top)<.001 for v in f.verts)],context='FACES');bm.to_mesh(hull.data);bm.free()
cylinder('Cargo well floor',(0,0,3.05),1.78,.08,'dark',parent=cap,vertices=40)
for j in range(32):
    a=j*math.tau/32;b=(j+1)*math.tau/32
    beam('Door sealing rim',(1.8*math.cos(a),1.8*math.sin(a),3.82),(1.8*math.cos(b),1.8*math.sin(b),3.82),.07,'edge',cap)
cylinder('Top door hinge axle',(0,1.78,3.8),.16,1.5,'yellow','X',cap,20)
def pose(deploy=1,drop=0,opening=0):
    booster.location.z=-2.5-drop
    door.rotation_euler.x=-math.radians(112)*opening
    for hip,knee,ankle,barrel,piston in legs:
        dx,dz=2.84,-4.14+drop
        distance=math.hypot(dx,dz);theta=math.atan2(dz,dx)
        # Stow above the hinge, extending almost straight alongside the hull.
        distance=5.48*(1-deploy)+distance*deploy;theta=math.radians(80)*(1-deploy)+theta*deploy
        dx,dz=distance*math.cos(theta),distance*math.sin(theta)
        along=(L1*L1-L2*L2+distance*distance)/(2*distance);off=math.sqrt(max(0,L1*L1-along*along))
        kx=dx/distance*along-dz/distance*off;kz=dz/distance*along+dx/distance*off
        a=math.atan2(-kx,-kz);b=math.atan2(-(dx-kx),-(dz-kz))
        hip.rotation_euler.y=a;knee.rotation_euler.y=b-a;ankle.rotation_euler.y=-b+math.radians(80)*(1-deploy)
        # Telescoping damper connects fixed hip bracket to the lower arm.
        start=Vector((1.86,.42,6.65));end=Vector((1.86+kx+(dx-kx)*.55,.42,7+kz+(dz-kz)*.55));delta=end-start
        middle=start+delta*.58
        for obj,p,q in [(barrel,start,middle),(piston,middle,end)]:
            obj.location=(p+q)/2;obj.rotation_euler=(q-p).to_track_quat('Z','Y').to_euler();obj.scale.z=(q-p).length
    bpy.context.view_layer.update()
def smooth(x):return x*x*(3-2*x)
clips=[('Legs_Deploy',2.4),('Legs_Retract',2.4),('Landing_Shock',2.0),('Top_Door_Open',1.8),('Top_Door_Close',1.8)]
scene=bpy.context.scene;scene.render.fps=30
for name,duration in clips:
    targets=[door] if name.startswith('Top') else [o for o in moving if o!=door]
    for o in moving:
        if o.animation_data:o.animation_data.action=None
    count=round(duration*30)
    for f in range(count+1):
        t=f/count;dep=1;drop=0;opening=0
        if name=='Legs_Deploy':dep=smooth(t)
        elif name=='Legs_Retract':dep=1-smooth(t)
        elif name=='Landing_Shock':
            # Feet remain on the ground: a fast 1.1 m compression, rebound, settle.
            stops=[(0,0),(.16,1.1),(.43,.12),(.62,.34),(.80,.035),(1,0)]
            for (u,a),(v,b) in zip(stops,stops[1:]):
                if u<=t<=v:drop=a+(b-a)*smooth((t-u)/(v-u));break
        elif name=='Top_Door_Open':opening=smooth(t)
        else:opening=1-smooth(t)
        pose(dep,drop,opening)
        for o in targets:
            for prop in ['location','rotation_euler','scale']:o.keyframe_insert(data_path=prop,frame=f)
    for o in targets:
        action=o.animation_data.action;action.name=name+'__'+o.name
        track=o.animation_data.nla_tracks.new();track.name=name
        strip=track.strips.new(name,0,action);strip.extrapolation='NOTHING';o.animation_data.action=None;track.mute=True
pose()
# Export named NLA tracks as five independent glTF clips.
for o in moving:
    if o.animation_data:
        for track in o.animation_data.nla_tracks:track.mute=False
scene.frame_start=0;scene.frame_end=72;scene.frame_set(0)
# All tracks are disabled in the editable default pose; export temporarily unmutes them.
bpy.ops.export_scene.gltf(filepath=str(OUT/'sh_rocket.glb'),export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_extras=True,export_force_sampling=True,export_frame_range=False)
for o in moving:
    if o.animation_data:
        for track in o.animation_data.nla_tracks:track.mute=True
pose()
# Render a review sheet's four poses with a fixed studio camera.
scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=560;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.world.color=(.22,.22,.22);scene.render.image_settings.file_format='PNG'
camdata=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',camdata);scene.collection.objects.link(cam)
cam.location=(31,-52,29);target=Vector((0,0,10.5));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=28;scene.camera=cam
for name,loc,power,size in [('Key',(8,-16,28),5000,12),('Fill',(-14,-4,18),3300,10),('Rim',(4,12,24),6000,9)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/sh-rocket.blend'))
for name,dep,drop,opening in [('stowed',0,0,0),('deployed',1,0,0),('shock',1,1.1,0),('door-open',1,0,1)]:
    pose(dep,drop,opening);scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
(OUT/'manifest.json').write_text(json.dumps({'asset':'sh_rocket.glb','designation':opt.label,'markings_node':'MARKINGS','credit':'Model by jelaludo','clips':dict(clips),'landing_compression_m':1.1,'units':'metres','up':'+Y'},indent=2)+'\n')
