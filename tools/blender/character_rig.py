"""Shared original humanoid rig and animation helpers for workshop characters."""
import bpy, math
from mathutils import Vector, Matrix, Euler
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
