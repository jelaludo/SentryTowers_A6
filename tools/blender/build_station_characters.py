"""Author original low-poly crew with one skinned mesh and a shared humanoid rig.
Run Blender --background --python-exit-code 1 --python this_file.py.
Blender -Y forward / Z up becomes glTF +Z forward / Y up.
"""
import bpy, math, json, struct
from pathlib import Path
from mathutils import Vector, Matrix, Euler

PROJECT=Path(__file__).resolve().parents[2]
OUT=PROJECT/'assets/characters-station';OUT.mkdir(parents=True,exist_ok=True)
SOURCE=PROJECT/'source/blender';SOURCE.mkdir(parents=True,exist_ok=True)
if not bpy.app.background:raise RuntimeError('Use background mode to preserve the live scene.')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
FPS=30
ROLES=[('astronaut','EVA / Astronaut',(.72,.77,.72)),('scientist','Xenobiology / Scientist',(.16,.46,.51)),('worker','Engineering / Worker',(.85,.32,.055))]
CLIPS=[('Idle',3.,True,0),('Walk',1.2,True,1.15),('Run',.8,True,3.0),('Kneel',3.,True,0),('Scared',2.,True,0),('Point',3.,True,0),('Lie',4.,True,0)]
HEADS={'root':(0,0,0),'hips':(0,0,1.0),'spine':(0,0,1.13),'chest':(0,0,1.40),'neck':(0,0,1.68),'head':(0,0,1.78)}
PARENTS={'root':None,'hips':'root','spine':'hips','chest':'spine','neck':'chest','head':'neck'}
for side,sign in [('L',1),('R',-1)]:
    names=[('upper_arm',(.34*sign,0,1.57),'chest'),('forearm',(.41*sign,0,1.28),'upper_arm_'+side),('hand',(.44*sign,-.01,1.02),'forearm_'+side),('index',(.47*sign,-.06,.91),'hand_'+side),('thigh',(.145*sign,0,.99),'hips'),('shin',(.145*sign,0,.55),'thigh_'+side),('foot',(.145*sign,0,.11),'shin_'+side)]
    for name,pos,parent in names:HEADS[name+'_'+side]=pos;PARENTS[name+'_'+side]=parent
HEADS={n:Vector(p) for n,p in HEADS.items()}

def material(name,color,metal=0,rough=.6,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Metallic'].default_value=metal;s.inputs['Roughness'].default_value=rough
    s.inputs['Emission Color'].default_value=(*color,1);s.inputs['Emission Strength'].default_value=emission
    return m

class MeshBuilder:
    def __init__(self):self.v=[];self.faces=[];self.materials=[];self.bones=[]
    def add(self,verts,faces,mat,bone):
        offset=len(self.v);self.v.extend(verts);self.bones.extend([bone]*len(verts));self.faces.extend([tuple(i+offset for i in f) for f in faces]);self.materials.extend([mat]*len(faces))
    def box(self,c,size,mat,bone):
        x,y,z=c;w,d,h=[s/2 for s in size]
        self.add([(x+sx*w,y+sy*d,z+sz*h) for sz in [-1,1] for sy in [-1,1] for sx in [-1,1]],[(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)],mat,bone)
    def tube(self,a,b,r0,r1,mat,bone,sides=8):
        a=Vector(a);b=Vector(b);q=(b-a).to_track_quat('Z','Y');verts=[]
        for center,r in [(a,r0),(b,r1)]:
            for i in range(sides):
                angle=math.tau*i/sides;verts.append(center+q@Vector((r[0]*math.cos(angle),r[1]*math.sin(angle),0)))
        self.add(verts,[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]+[(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)],mat,bone)
    def ellipsoid(self,c,r,mat,bone,segments=12,rings=6):
        verts=[]
        for j in range(rings+1):
            lat=-math.pi/2+math.pi*j/rings
            for i in range(segments):
                a=math.tau*i/segments;verts.append((c[0]+r[0]*math.cos(lat)*math.cos(a),c[1]+r[1]*math.cos(lat)*math.sin(a),c[2]+r[2]*math.sin(lat)))
        faces=[(j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i) for j in range(rings) for i in range(segments)]
        self.add(verts,faces,mat,bone)
    def visor(self,c,r,mat,bone):
        v=[]
        for j in range(4):
            lat=math.radians(-25+50*j/3)
            for i in range(9):
                a=math.radians(-65+130*i/8);v.append((c[0]+r[0]*math.sin(a)*math.cos(lat),c[1]-r[1]*math.cos(a)*math.cos(lat),c[2]+r[2]*math.sin(lat)))
        self.add(v,[(j*9+i,j*9+i+1,(j+1)*9+i+1,(j+1)*9+i) for j in range(3) for i in range(8)],mat,bone)

def author_body(role):
    m=MeshBuilder()
    # Material slots: suit, rubber, armor, visor, signal, accent, metal.
    m.tube((0,0,.91),(0,0,1.14),(.22,.145),(.20,.14),0,'hips')
    m.tube((0,0,1.12),(0,0,1.43),(.20,.14),(.27,.18),0,'spine')
    m.tube((0,0,1.40),(0,0,1.64),(.27,.18),(.26,.15),0,'chest')
    m.tube((0,0,1.63),(0,0,1.76),(.13,.12),(.13,.12),1,'neck')
    m.ellipsoid((0,0,1.85),(.27,.245,.265),2,'head')
    m.visor((0,-.014,1.86),(.277,.247,.257),3,'head')
    m.tube((0,0,1.64),(0,0,1.69),(.20,.17),(.20,.17),6,'chest')
    m.box((0,-.184,1.47),(.25,.055,.18),2,'chest')
    m.box((-.065,-.216,1.50),(.08,.012,.04),4,'chest')
    for x in [.025,.07]:m.box((x,-.216,1.46),(.025,.012,.045),5,'chest')
    m.tube((0,0,1.06),(0,0,1.11),(.23,.162),(.23,.162),1,'hips')
    m.box((0,-.17,1.085),(.08,.045,.075),6,'hips')
    for side,sign in [('L',1),('R',-1)]:
        u=HEADS['upper_arm_'+side];el=HEADS['forearm_'+side];wr=HEADS['hand_'+side];hip=HEADS['thigh_'+side];kn=HEADS['shin_'+side];an=HEADS['foot_'+side]
        m.ellipsoid(u,(.14,.14,.14),1,'upper_arm_'+side,8,4)
        m.tube(u,el,(.115,.12),(.09,.10),0,'upper_arm_'+side)
        m.ellipsoid(el,(.105,.105,.105),1,'forearm_'+side,8,4)
        m.tube(el,wr,(.095,.10),(.075,.08),0,'forearm_'+side)
        m.tube(wr+Vector((0,0,.035)),wr-Vector((0,0,.025)),(.095,.1),(.095,.1),5,'hand_'+side)
        m.ellipsoid(wr+Vector((0,-.025,-.065)),(.085,.072,.10),1,'hand_'+side,8,4)
        m.tube(HEADS['index_'+side],HEADS['index_'+side]+Vector((0,0,-.085)),(.025,.026),(.020,.023),2,'index_'+side,6)
        m.tube(hip,kn,(.13,.135),(.105,.11),0,'thigh_'+side)
        m.ellipsoid(kn,(.12,.13,.12),1,'shin_'+side,8,4)
        m.tube(kn,an,(.105,.11),(.085,.085),0,'shin_'+side)
        m.box((sign*.145,-.083,.105),(.215,.36,.17),1,'foot_'+side)
        m.box((sign*.145,-.145,.135),(.20,.22,.1),2,'foot_'+side)
        m.box((sign*.145,-.09,.033),(.225,.37,.045),6,'foot_'+side)
        m.box((sign*.145,-.127,.56),(.17,.055,.17),2,'shin_'+side)
    if role=='astronaut':
        m.box((0,.255,1.43),(.40,.26,.48),2,'chest')
        for x in [-.115,.115]:m.tube((x,.35,1.20),(x,.35,1.64),(.072,.072),(.072,.072),6,'chest')
        for sign,side in [(1,'L'),(-1,'R')]:m.ellipsoid((sign*.32,0,1.62),(.18,.16,.12),2,'upper_arm_'+side,8,4)
        m.box((0,-.18,2.055),(.16,.09,.065),2,'head')
        m.box((0,-.228,2.055),(.09,.012,.025),4,'head')
    elif role=='scientist':
        m.box((0,.215,1.43),(.31,.18,.35),6,'chest')
        for x in [-.095,0,.095]:
            m.tube((x,.32,1.31),(x,.32,1.52),(.032,.032),(.032,.032),4,'chest')
            m.box((x,.32,1.54),(.07,.07,.055),2,'chest')
        m.box((.45,-.12,1.20),(.16,.055,.16),6,'forearm_L');m.box((.45,-.15,1.20),(.12,.01,.105),4,'forearm_L')
        for x in [-.24,.24]:m.box((x,-.01,1.02),(.10,.20,.18),2,'hips')
        m.box((0,-.21,1.37),(.06,.026,.06),4,'chest')
    else:
        m.box((0,.23,1.4),(.33,.19,.34),6,'chest')
        for x in [-.19,.19]:m.box((x,-.179,1.46),(.075,.035,.29),5,'chest')
        m.box((0,-.25,1.99),(.37,.13,.07),5,'head')
        m.box((0,-.318,1.99),(.13,.015,.045),4,'head')
        for sign,side in [(1,'L'),(-1,'R')]:
            m.box((sign*.255,.03,1.025),(.13,.2,.22),6,'hips')
            m.box((sign*.145,-.14,.57),(.20,.065,.22),5,'shin_'+side)
        m.tube((-.31,.1,.88),(-.31,.1,1.15),(.032,.032),(.032,.032),6,'hips')
        m.box((-.31,.1,1.16),(.12,.065,.055),5,'hips')
    return m

def create_rig(collection,role):
    data=bpy.data.armatures.new('Station_shared_v2');arm=bpy.data.objects.new('RIG_'+role,data);collection.objects.link(arm)
    bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for name,head in HEADS.items():
        b=data.edit_bones.new(name);b.head=head
        children=[n for n,p in PARENTS.items() if p==name]
        chosen=next((n for n in children if not n.startswith(('upper_arm','thigh'))),None)
        b.tail=HEADS[chosen] if chosen else head+Vector((0,0,.10))
        if (b.tail-b.head).length<.03:b.tail=head+Vector((0,0,.10))
        if PARENTS[name]:b.parent=data.edit_bones[PARENTS[name]]
        b.use_deform=True
    bpy.ops.object.mode_set(mode='OBJECT');arm.show_in_front=True;arm['role']=role;arm['forward']='+Z in glTF';arm['rig_version']='station_shared_v2'
    return arm

def pose(name,t):
    rotations={n:(0,0,0) for n in HEADS};offsets={n:Vector((0,0,0)) for n in HEADS}
    cycle=math.tau*t
    rotations['index_L']=(-.8,0,0);rotations['index_R']=(-.8,0,0)
    if name=='Idle':
        rotations['spine']=(.013*math.sin(cycle),0,0);rotations['head']=(0,.035*math.sin(cycle),.035*math.sin(cycle));offsets['hips'].z=.006*math.sin(cycle)
    elif name in ['Walk','Run']:
        run=name=='Run';amp=.68 if run else .34
        offsets['hips'].z=(.015 if run else -.015)+( .035 if run else .012)*math.cos(2*cycle)
        rotations['spine']=(.17 if run else .035,0,0)
        for side,phase in [('L',cycle),('R',cycle+math.pi)]:
            swing=math.cos(phase);rotations['thigh_'+side]=(-amp*swing,0,0)
            # Swing travels from back to front while the foot lifts; stance travels back.
            knee=(.42 if run else .15)+(1.05 if run else .72)*max(0,-math.sin(phase))
            rotations['shin_'+side]=(knee,0,0)
            rotations['foot_'+side]=(amp*swing-knee,0,0)
            rotations['upper_arm_'+side]=((.58 if run else .28)*swing,0,0)
            rotations['forearm_'+side]=(-1.0 if run else -.23,0,0)
    elif name in ['Kneel','Scared']:
        scared=name=='Scared';offsets['hips'].z=-.44
        rotations['spine']=(.25 if scared else .07,0,.012*math.sin(2*cycle))
        rotations['head']=(.20 if scared else .035,.025*math.sin(2*cycle),0)
        for side,sign in [('L',1),('R',-1)]:
            rotations['shin_'+side]=(math.pi/2,0,0);rotations['foot_'+side]=(-math.pi/2,0,0)
            rotations['upper_arm_'+side]=((-1.35 if scared else -.30)+(.025*math.sin(3*cycle) if scared else 0),0,-sign*.40 if scared else 0)
            rotations['forearm_'+side]=(-1.60 if scared else -.50,0,0)
    elif name=='Point':
        rotations['upper_arm_R']=(-math.pi/2,0,-.12);rotations['forearm_R']=(-.03,0,0);rotations['index_R']=(0,0,0)
        rotations['head']=(0,-.07,-.07);rotations['spine']=(0,0,.025*math.sin(cycle));rotations['forearm_L']=(-.35,0,0)
    else:
        rotations['root']=(-math.pi/2,0,0);offsets['root'].z=.415
        rotations['upper_arm_L']=(0,-.10,0);rotations['upper_arm_R']=(0,.10,0)
        rotations['spine']=(.003*math.sin(cycle),0,0)
    return rotations,offsets

def author_action(arm,name,duration,body):
    for track in arm.animation_data.nla_tracks if arm.animation_data else []:track.mute=True
    arm.animation_data_create();action=bpy.data.actions.new(arm['role']+'_'+name);arm.animation_data.action=action
    frames=round(duration*FPS)
    for frame in range(frames+1):
        rotations,offsets=pose(name,frame/frames);positions={};orientations={};matrices={}
        for n in HEADS:
            parent=PARENTS[n];r=Euler(rotations[n],'XYZ').to_matrix()
            if parent:
                orientations[n]=orientations[parent]@r;positions[n]=positions[parent]+orientations[parent]@(HEADS[n]-HEADS[parent]+offsets[n])
            else:orientations[n]=r;positions[n]=HEADS[n]+offsets[n]
        # Ground the actual weighted armor, including knee pads and life-support packs.
        lowest=min((positions[n]+orientations[n]@(Vector(v)-HEADS[n])).z for v,n in zip(body.v,body.bones))
        lift=.005-lowest if name in ['Kneel','Scared','Lie'] else max(0,.005-lowest)
        for n in HEADS:positions[n].z+=lift
        for n in HEADS:
            parent=PARENTS[n];bone=arm.data.bones[n];matrix=Matrix.Translation(positions[n])@orientations[n].to_4x4()@bone.matrix_local.to_3x3().to_4x4();matrices[n]=matrix
            args=dict(parent_matrix=matrices[parent],parent_matrix_local=arm.data.bones[parent].matrix_local) if parent else {}
            pb=arm.pose.bones[n];pb.matrix_basis=bone.convert_local_to_pose(matrix,bone.matrix_local,invert=True,**args);pb.rotation_mode='QUATERNION'
            pb.keyframe_insert(data_path='location',frame=frame);pb.keyframe_insert(data_path='rotation_quaternion',frame=frame)
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for point in curve.keyframe_points:point.interpolation='LINEAR'
    arm.animation_data.action=None;track=arm.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True

manifest=[];gallery=[]
for role,title,color in ROLES:
    collection=bpy.data.collections.new(role);bpy.context.scene.collection.children.link(collection);arm=create_rig(collection,role);body=author_body(role)
    mats=[material(role+' / suit',color,.15),material(role+' / seals',(.025,.04,.05),.1),material(role+' / ceramic',(.66,.71,.69),.3),material(role+' / visor',(.06,.16,.18) if role!='astronaut' else (.35,.23,.055),.7,.22),material(role+' / status',(.12,.80,.60),.1,.35,.8),material(role+' / marking',(.92,.62,.12),.2),material(role+' / metal',(.12,.19,.22),.6)]
    data=bpy.data.meshes.new(role+'_skin');data.from_pydata(body.v,[],body.faces);data.update();mesh=bpy.data.objects.new('SKIN_'+role,data);collection.objects.link(mesh)
    for mat in mats:data.materials.append(mat)
    for poly,mat in zip(data.polygons,body.materials):poly.material_index=mat
    for n in HEADS:
        vg=mesh.vertex_groups.new(name=n);indices=[i for i,b in enumerate(body.bones) if b==n]
        if indices:vg.add(indices,1.,'REPLACE')
    modifier=mesh.modifiers.new('Shared humanoid skeleton','ARMATURE');modifier.object=arm
    mesh['deformation']='rigid weighted suit segments with overlapping joint seals';mesh['role']=role
    # Both mesh and rig stay at scene root to avoid non-root skinned-mesh hierarchy warnings.
    for name,duration,loop,speed in CLIPS:author_action(arm,name,duration,body)
    for track in arm.animation_data.nla_tracks:track.mute=False
    bpy.context.scene.render.fps=FPS;bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=120;bpy.context.scene.frame_set(0)
    bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=arm
    path=OUT/(role+'_station.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_yup=True,export_cameras=False,export_lights=False)
    data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives'])
    entry=dict(id=role,name=title,file=path.name,triangles=triangles,bytes=len(data),rig='station_shared_v2',joints=len(HEADS),materials=len(mats),animations=[dict(name=n,duration_s=d,loop=l,preview_speed_mps=s) for n,d,l,s in CLIPS],description={'astronaut':'Broad EVA shoulder armor, gold visor, twin life-support cylinders and helmet lamp.','scientist':'Teal containment suit, specimen canisters, wrist scanner and sample pouches.','worker':'Orange engineering suit, reinforced knee pads, tool belt and helmet work light.'}[role])
    manifest.append(entry);gallery.append((arm,mesh));print('EXPORTED',role,triangles,'triangles',len(doc.get('skins',[])),'skins',[a['name'] for a in doc.get('animations',[])],flush=True)
    # Leave source displaying Idle instead of combining every NLA clip.
    for track in arm.animation_data.nla_tracks:track.mute=track.name!='Idle'
(OUT/'manifest.json').write_text(json.dumps(dict(version=2,units='meters',up='+Y',forward='+Z',assets=manifest),indent=2)+'\n')
for i,(arm,mesh) in enumerate(gallery):arm.location.x=(i-1)*1.5;mesh.location.x=(i-1)*1.5
scene=bpy.context.scene;scene.name='A6 / Low-poly station crew';scene.frame_set(1);scene.world.color=(.18,.18,.18)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=6;area.spaces.active.region_3d.view_location=(0,0,1)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'a6-station-characters.blend'));print('STATION_CHARACTERS_COMPLETE',flush=True)
