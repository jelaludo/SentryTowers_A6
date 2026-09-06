"""Create a provisional humanoid skin and eight animation clips for Shelly.
No dependencies. Source texture data and attribution are retained verbatim.
"""
import json,math,struct
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
raw=(ROOT/'imports/shelly-original.glb').read_bytes()
length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length])
binary=bytearray(raw[28+length:]);binary=binary[:doc['buffers'][0]['byteLength']]
def read(index):
    a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];width={'VEC3':3,'VEC4':4,'VEC2':2,'SCALAR':1}[a['type']]
    return [struct.unpack_from('<'+'f'*width,binary,v.get('byteOffset',0)+a.get('byteOffset',0)+i*v.get('byteStride',width*4)) for i in range(a['count'])]
def append(values,kind,component=5126):
    while len(binary)%4:binary.append(0)
    offset=len(binary);flat=[x for row in values for x in row];fmt='f' if component==5126 else 'H'
    binary.extend(struct.pack('<'+fmt*len(flat),*flat));view=len(doc['bufferViews']);doc['bufferViews'].append(dict(buffer=0,byteOffset=offset,byteLength=len(binary)-offset))
    accessor=dict(bufferView=view,componentType=component,count=len(values),type=kind)
    if kind in ('SCALAR','VEC3'):accessor.update(min=[min(v[i] for v in values) for i in range(len(values[0]))],max=[max(v[i] for v in values) for i in range(len(values[0]))])
    index=len(doc['accessors']);doc['accessors'].append(accessor);return index

positions=read(0);min_y=min(p[1] for p in positions);scale=2/(max(p[1] for p in positions)-min_y)
positions=[[x*scale,(y-min_y)*scale,z*scale] for x,y,z in positions]
nodes=[dict(name='ROOT',children=[1,2]),dict(name='Shelly',mesh=0,skin=0),dict(name='Pelvis',translation=[0,1.12,0])]
bones=['Pelvis'];world=[[0,1.12,0]];parents=[None]
def bone(name,parent,p):
    idx=len(bones);pi=bones.index(parent);bones.append(name);world.append(p);parents.append(pi)
    nodes.append(dict(name=name,translation=[p[j]-world[pi][j] for j in range(3)]));nodes[pi+2].setdefault('children',[]).append(idx+2)
bone('Spine','Pelvis',[0,1.32,0]);bone('Chest','Spine',[0,1.56,0]);bone('Neck','Chest',[0,1.73,0]);bone('Head','Neck',[0,1.82,0])
for side,s in [('L',1),('R',-1)]:
    bone(side+'_UpperArm','Chest',[s*.175,1.63,0]);bone(side+'_Forearm',side+'_UpperArm',[s*.265,1.39,0]);bone(side+'_Hand',side+'_Forearm',[s*.40,1.13,.015])
    bone(side+'_Thigh','Pelvis',[s*.09,1.12,0]);bone(side+'_Shin',side+'_Thigh',[s*.09,.69,0]);bone(side+'_Foot',side+'_Shin',[s*.07,.11,0])
def smooth(a,b,v):
    u=max(0,min(1,(v-a)/(b-a)));return u*u*(3-2*u)
def blend(a,b,u):return {a:1-u,b:u}
joints=[];weights=[]
for x,y,z in positions:
    candidates=[]
    for i,name in enumerate(bones):
        start=world[i]
        if name in ('Pelvis','Spine','Chest','Neck'):
            end=world[i+1];radius={'Pelvis':.19,'Spine':.18,'Chest':.19,'Neck':.07}[name]
        elif name=='Head':end=[0,1.96,0];radius=.115
        elif name.endswith('UpperArm'):end=world[i+1];radius=.075
        elif name.endswith('Forearm'):end=world[i+1];radius=.065
        elif name.endswith('Hand'):end=[start[0]*1.06,.99,.02];radius=.065
        elif name.endswith('Thigh'):end=world[i+1];radius=.10
        elif name.endswith('Shin'):end=world[i+1];radius=.065
        else:end=[start[0],.035,.10];radius=.075
        delta=[end[j]-start[j] for j in range(3)]
        u=max(0,min(1,sum(([x,y,z][j]-start[j])*delta[j] for j in range(3))/sum(v*v for v in delta)))
        distance=sum(([x,y,z][j]-start[j]-u*delta[j])**2 for j in range(3))/radius**2
        # Keep the narrow gap between the thighs from coupling opposite legs.
        if name.startswith(('L_','R_')) and x*(1 if name.startswith('L_') else -1)<0:distance+=12
        candidates.append((i,math.exp(-3*distance)))
    entries=sorted(candidates,key=lambda item:item[1],reverse=True)[:4];total=sum(v for i,v in entries)
    joints.append([i for i,v in entries]);weights.append([v/total for i,v in entries])
primitive=doc['meshes'][0]['primitives'][0];primitive['attributes'].update(POSITION=append(positions,'VEC3'),JOINTS_0=append(joints,'VEC4',5123),WEIGHTS_0=append(weights,'VEC4'))
matrices=[]
for x,y,z in world:matrices.append([1,0,0,0,0,1,0,0,0,0,1,0,-x,-y,-z,1])
doc['skins']=[dict(name='Shelly provisional humanoid rig',joints=list(range(2,len(nodes))),skeleton=2,inverseBindMatrices=append(matrices,'MAT4'))]
doc['nodes']=nodes;doc['scenes']=[dict(nodes=[0])];doc['scene']=0;doc['animations']=[]
nodes[0]['extras']={'heightMeters':2,'forward':'+Z','rig':'procedural provisional weights','source':doc['asset'].get('extras',{})}
def quat(x=0,y=0,z=0):
    a,b,c=math.sin(x/2),math.sin(y/2),math.sin(z/2);d,e,f=math.cos(x/2),math.cos(y/2),math.cos(z/2)
    return [a*e*f+d*b*c,d*b*f-a*e*c,d*e*c+a*b*f,d*e*f-a*b*c]
def leg_ik(height,z,lift):
    down=height-.11-lift;distance=min(1.009,max(.10,math.hypot(down,z)))
    thigh=-(math.atan2(z,down)+math.acos(max(-1,min(1,(.43**2+distance**2-.58**2)/(.86*distance)))))
    knee=math.acos(max(-1,min(1,(distance**2-.43**2-.58**2)/(2*.43*.58))))
    return thigh,knee,-thigh-knee

for name,duration,loop in [('Idle',3,True),('Walk',1.2,True),('Run',.72,True),('Crouch',1,False),('Crouch_Walk',1.6,True),('Hide',1.2,False),('Look_Around',3.6,True),('Jump',1.4,False)]:
    count=61;times=[[duration*k/(count-1)] for k in range(count)];time=append(times,'SCALAR');tracks={i:[] for i in range(len(bones))};hips=[]
    for k in range(count):
        u=k/(count-1);phase=u*2*math.pi;ease=smooth(0,1,u);rot={i:[0,0,0] for i in range(len(bones))};drop=.015;rise=0
        if name in ('Crouch','Hide'):drop=(.35 if name=='Crouch' else .48)*ease+.015
        if name=='Crouch_Walk':drop=.35
        if name=='Run':drop=.10+.025*math.cos(phase*2)
        if name=='Walk':drop=.025+.008*math.cos(phase*2)
        if name=='Idle':drop=.015+.004*math.sin(phase)
        if name=='Jump':
            drop=.28*math.sin(math.pi*min(1,u/.25)) if u<.25 else .15*math.sin(math.pi*(u-.75)/.25) if u>.75 else .03
            rise=.40*max(0,math.sin(math.pi*(u-.25)/.5)) if .25<u<.75 else 0
        for side,s in [('L',1),('R',-1)]:
            p=phase+(0 if s==1 else math.pi);z=0;lift=0
            if name in ('Walk','Run','Crouch_Walk'):
                # +Z is forward: the lifted foot advances, the planted foot retreats.
                stride={'Walk':.16,'Run':.32,'Crouch_Walk':.11}[name];z=-stride*math.cos(p);lift=(.16 if name=='Run' else .08)*max(0,math.sin(p))
            angles=leg_ik(1.12-drop,z,lift)
            for joint,a in zip(['Thigh','Shin','Foot'],angles):rot[bones.index(side+'_'+joint)][0]=a
            upper=bones.index(side+'_UpperArm');fore=bones.index(side+'_Forearm')
            rot[upper]=[0,0,-s*.32];rot[fore]=[-.12,0,0]
            if name in ('Walk','Run','Crouch_Walk'):
                rot[upper][0]=-(.7 if name=='Run' else .35)*math.cos(p);rot[fore][0]=-.9 if name=='Run' else -.25
            if name in ('Hide','Crouch','Crouch_Walk'):
                amount=ease if name in ('Hide','Crouch') else 1
                rot[upper]=[-(1.6 if name=='Hide' else .45)*amount,0,-s*.45];rot[fore]=[-(1.2 if name=='Hide' else .6)*amount,0,0]
            if name=='Jump':rot[upper][0]=-1.8*max(0,math.sin(math.pi*u))
        lean=(.5 if name=='Hide' else .25 if name in ('Crouch','Crouch_Walk') else .12 if name=='Run' else 0)
        if name in ('Hide','Crouch'):lean*=ease
        rot[bones.index('Spine')][0]=lean;rot[bones.index('Head')][0]=.3*ease if name=='Hide' else -lean*.5
        if name=='Look_Around':rot[bones.index('Head')][1]=.65*math.sin(phase);rot[bones.index('Chest')][1]=.12*math.sin(phase)
        for i in tracks:tracks[i].append(quat(*rot[i]))
        hips.append([0,1.12-drop+rise,0])
    samplers=[];channels=[]
    for i,values in tracks.items():
        channels.append(dict(sampler=len(samplers),target=dict(node=i+2,path='rotation')));samplers.append(dict(input=time,output=append(values,'VEC4'),interpolation='LINEAR'))
    channels.append(dict(sampler=len(samplers),target=dict(node=2,path='translation')));samplers.append(dict(input=time,output=append(hips,'VEC3'),interpolation='LINEAR'))
    doc['animations'].append(dict(name=name,channels=channels,samplers=samplers,extras={'loop':loop}))
doc['buffers']=[dict(byteLength=len(binary))];text=json.dumps(doc,separators=(',',':')).encode();text+=b' '*((-len(text))%4);binary+=b'\0'*((-len(binary))%4)
output=ROOT/'animation-tests/shelly-animated.glb';output.write_bytes(struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary)
print('Created',output,'with',len(bones),'bones and',len(doc['animations']),'clips')
