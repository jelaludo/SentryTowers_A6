"""Launcher-independent stylized game ordnance, three mesh budgets, three flight clips."""
import sys,json,math
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,Vector
OUT=k.PROJECT/'assets/missile-kit';OUT.mkdir(exist_ok=True)
flights=json.loads((OUT/'flight-samples.json').read_text())['clips']
k.M['shell']=k.material('Ordnance / ceramic slate',(.30,.40,.42),.65,.3)
k.M['light']=k.material('Ordnance / cyan ID',(.02,.7,1),.3,.3,2)
k.M['flame']=k.material('Rocket / hot core',(1,.35,.07),.1,.3,4)

def lathe(name,rings,n,mat,parent):
    verts=[(r*math.cos(i*math.tau/n),-z,r*math.sin(i*math.tau/n)) for z,r in rings for i in range(n)]
    faces=[tuple(range(n-1,-1,-1)),tuple(range((len(rings)-1)*n,len(rings)*n))]
    for j in range(len(rings)-1):
        for i in range(n):q=(i+1)%n;faces.append((j*n+i,j*n+q,(j+1)*n+q,(j+1)*n+i))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);k.active_collection.objects.link(o);o.parent=parent;mesh.materials.append(k.M[mat]);return o

for ident,title,n,detail in [('dart','DART / swarm round',6,0),('needle','NEEDLE / sentry round',10,1),('talon','TALON / special round',20,2)]:
    e=k.begin(ident,title,'Ready',[1,2],'Reusable projectile; launcher excluded. Local +Z forward, meters.');motion=k.empty('MISSILE_MOTION');motion['role']='Reusable projectile motion root'
    lathe('Tapered missile shell',[(-.65,.10),(-.50,.145),(.36,.145),(.60,.09),(.78,.008)],n,'shell',motion)
    lathe('Exhaust nozzle',[(-.69,.08),(-.64,.115),(-.57,.115)],n,'edge',motion)
    for j in range(4):
        angle=j*math.pi/2
        vs=[]
        for thickness in [-.012,.012]:
            for radius,z in [(.11,-.55),(.34,-.62),(.30,-.30),(.12,-.08)]:
                vs.append((radius*math.cos(angle)-thickness*math.sin(angle),-z,radius*math.sin(angle)+thickness*math.cos(angle)))
        mesh=bpy.data.meshes.new('Swept tail fin');mesh.from_pydata(vs,[],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.update();o=bpy.data.objects.new('Swept tail fin',mesh);k.active_collection.objects.link(o);o.parent=motion;mesh.materials.append(k.M['edge'])
    lathe('Cyan identification band',[(.28,.146),(.32,.146)],n,'light',motion)
    if detail:
        for z in [-.47,-.05,.35]:lathe('Casing collar',[(z-.018,.149),(z+.018,.149)],n,'frame',motion)
        lathe('Dark nose cap',[(.59,.094),(.69,.053),(.795,.005)],n,'dark',motion)
    if detail==2:
        for j in range(8):
            a=j*math.tau/8
            k.box('Body service strip',(.146*math.cos(a),-.03,.146*math.sin(a)),(.018,.35,.015),'white',bevel=0,parent=motion,rot=(0,-a,0))
        for z in [-.5,.0,.38]:lathe('Collar edge bevel',[(z-.015,.146),(z,.157),(z+.015,.146)],n,'edge',motion)
    socket=k.empty('EXHAUST_SOCKET',(0,.70,0),motion);socket['role']='Trail and exhaust attachment'
    tip=k.empty('TIP_SOCKET',(0,-.80,0),motion);tip['role']='Visual projectile tip'
    fx=k.empty('EXHAUST_FX',parent=socket);fx['role']='Optional exhaust mesh; hide when using engine particles'
    lathe('Exhaust core',[(0,.067),(-.28,.052),(-.8,0)],n,'flame',fx)
    scene=bpy.context.scene;scene.render.fps=60;scene.frame_start=0;scene.frame_end=240
    for clip in flights:
        for obj in [motion,fx]:obj.animation_data_create();obj.animation_data.action=bpy.data.actions.new(ident+'_'+clip['id']+'_'+obj.name)
        motion.rotation_mode='QUATERNION'
        for frame in clip['frames']:
            x,y,z=frame['position'];dx,dy,dz=frame['direction'];motion.location=(x,-z,y);motion.rotation_quaternion=Vector((dx,-dz,dy)).to_track_quat('-Y','Z')
            motion.keyframe_insert('location',frame=frame['time']*60);motion.keyframe_insert('rotation_quaternion',frame=frame['time']*60)
            fx.scale=(1,1,1) if frame['ignition'] else (.001,.001,.001);fx.keyframe_insert('scale',frame=frame['time']*60)
        for obj in [motion,fx]:
            act=obj.animation_data.action;obj.animation_data.action=None;track=obj.animation_data.nla_tracks.new();track.name='Flight_'+clip['id'];strip=track.strips.new(track.name,0,act);strip.extrapolation='NOTHING';track.mute=True
    motion.location=(0,0,0);motion.rotation_quaternion=(1,0,0,0);fx.scale=(.001,.001,.001)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in k.active_collection.objects:obj.select_set(True)
    for obj in [motion,fx]:
        for track in obj.animation_data.nla_tracks:track.mute=False
    bpy.context.view_layer.objects.active=k.active_root;scene.frame_set(0)
    bpy.ops.export_scene.gltf(filepath=str(OUT/e['file']),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_cameras=False,export_lights=False)
    e.update(animations=['Flight_'+c['id'] for c in flights],length_m=1.49,role=['Rapid-fire / distant','General sentry','Special tank round'][detail])
    for obj in [motion,fx]:
        for track in obj.animation_data.nla_tracks:track.mute=True
    motion.location=(0,0,0);motion.rotation_quaternion=(1,0,0,0)
    k.active_root.location.x=detail*1.5
(OUT/'manifest.json').write_text(json.dumps(dict(assets=k.manifest,profiles=[{key:value for key,value in c.items() if key!='frames'} for c in flights]),indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-missile-kit.blend'))
print('MISSILE_KIT_COMPLETE')
