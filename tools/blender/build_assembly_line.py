"""A6 robotic assembly line: six reusable families, D0–D3, articulated cycles.
blender --background --python-exit-code 1 --python tools/blender/build_assembly_line.py
"""
import sys, math, json, struct, random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy, bmesh, Vector, empty, cylinder, beam, socket, collider
OUT=k.PROJECT/'assets/assembly-line';OUT.mkdir(parents=True,exist_ok=True)
k.M['blue']=k.material('Display / cyan',(.025,.48,.65),.35,.3,1.5)
k.M['orange']=k.material('Robot / industrial orange',(.82,.22,.035),.45,.4)
k.M['glass']=k.material('Screen / midnight',(.009,.055,.08),.5,.3)
STATES=['Intact','Damaged','Critical','Destroyed'];FPS=30;END=241

def box(name,loc,size,mat='armor',parent=None,rot=(0,0,0)):
    return k.box(name,loc,size,mat,.018,parent,rot)

def animate(obj,prop,keys):
    for frame,value in keys:
        setattr(obj,prop,value);obj.keyframe_insert(data_path=prop,frame=frame)
    obj.animation_data.action.name='Assembly_Cycle'
    # Blender 5 actions store channels in slots; linear keys are useful for conveyors.
    for layer in obj.animation_data.action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for point in curve.keyframe_points:point.interpolation='LINEAR'

def arm(state,loc=(0,0,0),heading=0,index=0,tool='gripper',motion=True):
    root=empty(f'ARM_{index:02d}',loc);root.rotation_euler[2]=heading;root['component']='robot_arm';root['task']=tool
    box('Robot mounting plinth',(0,0,.12),(1.45,1.35,.24),'edge',root)
    for x in [-.55,.55]:
        for y in [-.5,.5]:cylinder('Anchor bolt',(x,y,.265),.07,.035,'yellow',parent=root)
    cylinder('Azimuth bearing',(0,0,.4),.52,.32,'frame',parent=root,vertices=16)
    if state==3:
        box('Broken actuator casing',(.35,0,.43),(.6,.7,.28),'orange',root,rot=(0,.3,.2))
        beam('Fallen robot link',(-.5,.4,.3),(.6,.4,.6),.17,'frame',root)
        return root
    yaw=empty(f'ARM_{index:02d}_WAIST',(0,0,.52),root)
    box('Shoulder housing',(0,0,.3),(.6,.56,.6),'orange',yaw)
    shoulder=empty(f'ARM_{index:02d}_SHOULDER',(0,0,.48),yaw)
    cylinder('Shoulder joint',(0,0,0),.31,.75,'edge','Y',shoulder)
    for y in [-.39,.39]:cylinder('Shoulder motor cover',(0,y,0),.23,.07,'armor','Y',shoulder)
    box('Upper articulated link',(0,0,.8),(.35,.42,1.6),'orange',shoulder)
    box('Upper link inset',(-.185,0,.8),(.035,.28,1.1),'edge',shoulder)
    beam('Upper service line',(-.24,.27,.18),(-.24,.27,1.48),.035,'dark',shoulder)
    elbow=empty(f'ARM_{index:02d}_ELBOW',(0,0,1.6),shoulder)
    cylinder('Elbow drive',(0,0,0),.27,.68,'frame','Y',elbow)
    if state==2:
        box('Severed forearm',(0,0,.23),(.3,.32,.46),'orange',elbow)
        beam('Torn cable',(0,.12,.4),(.18,.15,.7),.035,'rust',elbow)
        shoulder.rotation_euler[1]=.6;elbow.rotation_euler[1]=1.6
        return root
    box('Forearm link',(0,0,.75),(.28,.32,1.5),'armor',elbow)
    box('Forearm orange spine',(-.17,0,.75),(.08,.34,1.3),'orange',elbow)
    beam('Forearm conduit',(.18,.2,.12),(.18,.2,1.36),.025,'dark',elbow)
    wrist=empty(f'ARM_{index:02d}_WRIST',(0,0,1.5),elbow)
    cylinder('Wrist articulation',(0,0,0),.20,.46,'edge','Y',wrist)
    cylinder('Tool coupling',(0,0,.15),.16,.25,'frame',parent=wrist)
    if tool=='gripper':
        box('Gripper palm',(0,0,.3),(.4,.25,.16),'orange',wrist)
        for sign in [-1,1]:
            finger=empty(f'ARM_{index:02d}_FINGER_{sign}',(sign*.18,0,.32),wrist)
            box('Gripper finger',(0,0,.18),(.08,.16,.36),'edge',finger)
            box('Grip pad',(-sign*.05,0,.32),(.12,.17,.09),'dark',finger)
            if motion:animate(finger,'location',[(1,(sign*.18,0,.32)),(61,(sign*.10,0,.32)),(121,(sign*.10,0,.32)),(181,(sign*.18,0,.32)),(241,(sign*.18,0,.32))])
    elif tool=='welder':
        cylinder('Weld torch',(0,0,.38),.10,.4,'orange',parent=wrist)
        cylinder('Torch contact',(0,0,.62),.035,.12,'blue',parent=wrist)
    elif tool=='driver':
        cylinder('Fastener spindle',(0,0,.38),.15,.35,'orange',parent=wrist)
        cylinder('Driver bit',(0,0,.64),.045,.2,'edge',parent=wrist)
    else:
        box('Inspection head',(0,0,.38),(.5,.28,.27),'edge',wrist)
        for x in [-.13,.13]:cylinder('Optical sensor',(x,0,.55),.065,.08,'blue',parent=wrist)
    poses={o:[] for o in [yaw,shoulder,elbow,wrist]}
    for step in range(17):
        t=step/16*math.tau+index*.63
        reach=2.12+.20*math.sin(t);height=1.5+.10*math.cos(t*2)
        dist=math.hypot(reach,height)
        bend=math.acos(max(-1,min(1,(dist*dist-1.6**2-1.5**2)/(2*1.6*1.5))))
        elevation=math.atan2(height,reach)+math.acos(max(-1,min(1,(1.6**2+dist*dist-1.5**2)/(2*1.6*dist))))
        a=math.pi/2-elevation
        poses[yaw].append((1+step*15,(0,0,.07*math.sin(t))))
        poses[shoulder].append((1+step*15,(0,a,0)))
        poses[elbow].append((1+step*15,(0,bend,0)))
        poses[wrist].append((1+step*15,(0,math.pi-a-bend,0)))
    for o,keys in poses.items():
        if motion:animate(o,'rotation_euler',keys)
        else:o.rotation_euler=keys[0][1]
    if state==1:box('Shoulder impact scar',(.31,0,.3),(.03,.22,.12),'dark',yaw)
    return root

def conveyor(state,length=4,loc=(0,0,0),motion=True):
    root=empty('CONVEYOR',loc);root['component']='conveyor'
    for x in [-1.13,1.13]:
        box('Conveyor side rail',(x,0,.96),(.18,length,.32),'frame',root)
        if state<3:box('Caution rail',(x,0,1.15),(.19,length,.055),'yellow',root)
        for y in [-length/2+.4,length/2-.4]:
            box('Conveyor trestle',(x,y,.45),(.2,.25,.9),'edge',root)
            box('Trestle foot',(x,y,.06),(.55,.55,.12),'frame',root)
    if state==3:
        box('Collapsed belt panel',(0,.2,.23),(1.8,min(length-1,2.5),.12),'dark',root,rot=(.1,.13,.16));return
    for y in [-length/2+.24,length/2-.24]:
        roller=empty('DRIVE_ROLLER',(0,y,1.02),root)
        cylinder('Drive drum',(0,0,0),.14,2.06,'edge','X',roller,vertices=16)
        cylinder('Drive hub',(1.28,0,0),.22,.22,'orange','X',roller)
        box('Hub witness stripe',(1.41,0,0),(.025,.31,.045),'white',roller)
        if state<2 and motion:animate(roller,'rotation_euler',[(1,(0,0,0)),(121,(math.pi,0,0)),(241,(math.tau,0,0))])
    # Slats move along a closed racetrack; all remain inside the 4 m module.
    half=length/2-.24;radius=.16;path_length=4*half+2*math.pi*radius
    def path(distance):
        u=distance%path_length
        if u<2*half:return (u-half,1.02+radius,0)
        u-=2*half
        if u<math.pi*radius:
            a=u/radius;return (half+radius*math.sin(a),1.02+radius*math.cos(a),a)
        u-=math.pi*radius
        if u<2*half:return (half-u,1.02-radius,math.pi)
        u-=2*half;a=math.pi+u/radius
        return (-half+radius*math.sin(a),1.02+radius*math.cos(a),a)
    count=round(path_length/.27)
    for i in range(count):
        if state==2 and i%4==0:continue
        y,z,a=path(i*path_length/count)
        tread=box('BELT_TREAD',(0,y,z),(2.05,.22,.055),'dark',root,rot=(-a,0,0))
        # Eight-second loop moves one whole lap, with keys at small intervals.
        if state<2 and motion:
            positions=[];rotations=[];previous_angle=0
            for j in range(65):
                yy,zz,aa=path(i*path_length/count+j/64*path_length)
                while aa<previous_angle-1e-6:aa+=math.tau
                previous_angle=aa
                positions.append((1+j*3.75,(0,yy,zz)))
                # A tread is symmetric under 180 degrees: rotations need no full turns.
                rotations.append((1+j*3.75,(-aa,0,0)))
            animate(tread,'location',positions);animate(tread,'rotation_euler',rotations)
    box('Motor enclosure',(1.5,-length/2+.6,.77),(.55,.7,.6),'orange',root)
    for j in range(4):box('Motor vent',(1.79,-length/2+.35+j*.15,.8),(.025,.065,.35),'edge',root)

def gantry(state,loc=(0,0,0)):
    root=empty('GANTRY',loc);root['component']='gantry'
    for x in [-3.7,3.7]:
        box('Gantry footing',(x,0,.12),(.6,.95,.24),'edge',root)
        h=4.7 if state<3 else .7
        box('Gantry column',(x,0,h/2),(.3,.4,h),'frame',root)
        box('Column armor',(x,-.24,min(h/2,1.5)),(.45,.14,min(2,h)),'armor',root)
        if state<3:
            for z in [.6,1,1.4]:box('Gantry warning band',(x,-.32,z),(.4,.025,.1),'yellow',root)
    if state<2:
        for z in [4.3,4.85]:box('Gantry truss chord',(0,0,z),(7.7,.3,.18),'frame',root)
        for i in range(10):beam('Truss diagonal',(-3.6+i*.72,0,4.3),(-2.88+i*.72,0,4.85),.055,'armor',root)
        box('Cable tray',(0,.32,4.55),(7.2,.25,.2),'edge',root)
        box('Inspection light',(0,0,4.18),(2,.18,.08),'signal',root)
        box('Overhead carriage',(0,0,4.64),(1,.7,.45),'orange',root)
    elif state==2:
        beam('Sheared gantry chord',(-3.7,0,4.3),(-1.4,0,4.0),.13,'frame',root)
        beam('Hanging service wire',(-1.4,0,4),(-1.2,0,3.15),.03,'dark',root)
    else:box('Fallen truss fragment',(0,.25,.24),(4,.32,.24),'frame',root,rot=(0,.03,.12))

def control(state,loc=(0,0,0)):
    root=empty('CONTROL_STATION',loc);root['component']='control_station'
    # Platform front is -Y. Ramp rises 0.8 m over 4 m, with a clear 1.6 m lane.
    box('Operator platform',(0,0,.68),(4,3,.24),'frame',root)
    for x in [-1.7,1.7]:
        for y in [-1.2,1.2]:box('Platform pier',(x,y,.3),(.25,.25,.6),'edge',root)
    ramp=k.prism('Human access ramp',[(-.8,0),(.8,0),(.8,.16),(-.8,.16)],-5.5,-1.5,'frame',root,bevel=0)
    # Explicit wedge mesh: top joins platform at z=.8; low end at z=0.
    mesh=ramp.data
    for v in mesh.vertices:v.co.z=(v.co.y+5.5)/4*.8-(.12 if v.co.z==0 else 0)
    for x in [-.92,.92]:
        beam('Ramp handrail',(x,-5.5,1),(x,-1.5,1.8),.04,'yellow',root)
        for y in [-5.5,-3.5,-1.5]:beam('Ramp rail post',(x,y,(y+5.5)*.2),(x,y,(y+5.5)*.2+1),.04,'frame',root)
    for i in range(12):
        y=-5.35+i*.32;box('Ramp anti-slip strip',(0,y,(y+5.5)*.2+.012),(1.55,.055,.025),'edge',root,rot=(math.atan(.2),0,0))
    for x in [-1.92,1.92]:
        for y in [-1.35,1.35]:beam('Platform rail post',(x,y,.8),(x,y,1.8),.04,'frame',root)
        beam('Platform side rail',(x,-1.35,1.8),(x,1.35,1.8),.04,'yellow',root)
    beam('Platform back rail',(-1.92,1.4,1.8),(1.92,1.4,1.8),.04,'yellow',root)
    if state==3:
        box('Ruined console',(0,.5,1),(2.5,.8,.4),'edge',root);return
    box('Control cabinet',(0,.65,1.3),(2.8,.65,1),'armor',root)
    box('Operator desk',(0,.22,1.68),(3,1,.15),'edge',root)
    for x in [-1.1,0,1.1]:
        if state==2 and x>=0:continue
        beam('Monitor mount',(x,.7,1.7),(x,.7,2.25),.06,'frame',root)
        box('Monitor housing',(x,.56,2.25),(1,.15,.7),'edge',root)
        box('Monitor screen',(x,.47,2.25),(.9,.025,.58),'glass',root)
        for j in range(4):
            box('Screen telemetry',(x-.2+j*.13,.45,2.15+j*.035),(.06,.01,.12+j*.04),'blue' if state==0 else 'fault',root)
        box('Screen title',(x,.45,2.45),(.7,.01,.035),'signal' if state==0 else 'fault',root)
    for i in range(9):box('Keyboard key',(-.6+i*.15,-.05,1.78),(.1,.08,.025),'white',root)
    for x in [-1.15,1.15]:cylinder('Emergency stop',(x,-.08,1.81),.09,.08,'fault',parent=root)
    cylinder('Operator stool',(0,-.7,1.07),.16,.54,'frame',parent=root)
    box('Stool seat',(0,-.7,1.39),(.6,.55,.13),'dark',root)
    k.text('Station stencil','A6 / LINE CONTROL',(0,.305,1.35),.14,parent=root)

def pallet(state,loc=(0,0,0),variant=0):
    root=empty('WORKPIECE',loc);root['component']='workpiece'
    box('Fixture pallet',(0,0,.065),(1.7,1.55,.13),'edge',root)
    if state==3:box('Workpiece fragment',(0,0,.22),(.6,.7,.17),'armor',root,rot=(0,.1,.2));return
    box('Rover chassis',(0,0,.24),(1.25,1.2,.22),'armor',root)
    for x in [-.6,.6]:
        for y in [-.4,.4]:cylinder('Chassis mount',(x,y,.42),.11,.16,'orange',parent=root)
    if state<2:
        cylinder('Core housing',(0,0,.45),.4,.22,'frame',parent=root,vertices=8)
        cylinder('Core status',(0,0,.58),.28,.035,'signal' if state==0 else 'dark',parent=root,vertices=8)

def scars(state,plot,seed):
    if not state:return
    rng=random.Random(seed)
    for i in range(5 if state<3 else 10):
        x=rng.uniform(-plot[0]*.35,plot[0]*.35);y=rng.uniform(-plot[1]*.35,plot[1]*.35)
        box('Debris fragment',(x,y,.07),(.17+rng.random()*.22,.2,.12),'raw' if i%2 else 'edge',rot=(.05,.1,rng.random()*6))

SPECS=[('robotic_assembly_line','A6 / Robotic assembly line',[20,32]),('robotic_arm','Articulated service arm',[8,8]),('conveyor_module','Conveyor belt / 4 m',[4,4]),('control_platform','Triple-monitor control and ramp',[8,12]),('gantry_module','Overhead service gantry',[8,4]),('assembly_pallet','Rover chassis fixture',[4,4])]
if '--repair-treads' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(k.SOURCE/'a6-assembly-line.blend'))
    k.manifest=json.loads((OUT/'manifest.json').read_text())['assets'];k.roots=[]
    for e in k.manifest:
        collection=bpy.data.collections[e['id']];root=next(o for o in collection.objects if o.get('asset_id')==e['id']);root.location=(0,0,0)
        for o in collection.objects:
            if o.name.startswith('Gantry footing'):o.scale.x=.6/.95
            if o.name.startswith('DRIVE_ROLLER'):
                o.location.y=math.copysign(1.76,o.location.y);o.location.z=1.02
            if o.name.startswith('Drive drum'):o.scale.x=.7;o.scale.y=.7
            if o.name.startswith('Drive hub'):o.scale.x=.22/.24;o.scale.y=.22/.24
            if not o.name.startswith('BELT_TREAD'):continue
            if o.animation_data:
                for layer in o.animation_data.action.layers:
                    for strip in layer.strips:
                        for bag in strip.channelbags:
                            for curve in bag.fcurves:
                                if curve.data_path=='rotation_euler' and curve.array_index==0 and max(p.co.y for p in curve.keyframe_points)>0:
                                    previous=0
                                    for point in curve.keyframe_points:
                                        angle=point.co.y
                                        while angle<previous-1e-6:angle+=math.tau
                                        previous=angle;point.co.y=-angle
                                    curve.update()
            else:o.rotation_euler.x=-abs(o.rotation_euler.x)
        if e['family']=='gantry_module':
            for c in e['colliders']:c['size_m'][0]=.6
        k.roots.append((root,collection,e))
else:
    for number,(family,title,plot) in enumerate(SPECS):
        for state in range(4):
            e=k.begin(f'{family}_d{state}',title,STATES[state],plot,'')
            e.update(family=family,damage_level=state,zone='industry',functional=state<2,collision_quality='blockout',animations=['Assembly_Cycle'] if state<2 and number<3 else [])
            if family=='robotic_assembly_line':
                box('Assembly hall deck',(0,0,-.14),(18,28,.28),'frame')
                for y in [-10,-6,-2,2,6,10]:conveyor(state,4,(0,y,0),state<2)
                tasks=['gripper','welder','driver','scanner']
                for side in [-1,1]:
                    for j,y in enumerate([-9,-3,3,9]):
                        arm(state,(side*2.8,y,0),0 if side==-1 else math.pi,j+(4 if side==1 else 0),tasks[(j+(1 if side==1 else 0))%4],state<2)
                for y in [-11,0,11]:gantry(state,(0,y,0))
                control(state,(6,5,0))
                for j,y in enumerate([-9,-3,3,9]):pallet(state,(0,y,1.22),j)
                # Delineate the human service aisle from the moving robot envelope.
                for y in range(-12,13,2):box('Human aisle marking',(4.55,y,.012),(.10,1.3,.02),'yellow')
                for y in [-10,-6,-2]:
                    box('Parts feeder cabinet',(-5.4,y,.65),(1.4,1.6,1.3),'edge')
                    if state<3:box('Feeder lid',(-5.4,y,1.35),(1.5,1.7,.13),'orange')
                k.text('Line designation','A6 / ROBOTIC ASSEMBLY 08',(0,-14.02,.035),.45)
                for sign,label in [(-1,'OUT'),(1,'IN')]:socket(e,'CONVEYOR_'+label,'conveyor',[0,1.18,sign*12],[0,0,sign],state<2,2.05)
                socket(e,'HUMAN_ACCESS','walk',[6,0,.5],[0,0,1],state<3,1.6)
                socket(e,'POWER','power',[-9,0,0],[-1,0,0],state<2)
                e['arm_count']=8;e['tasks']=tasks;e['conveyor_length_m']=24;e['ramp']=dict(rise_m=.8,run_m=4,clear_width_m=1.6)
                collider(e,'conveyor',[0,.65,0],[3.3,1.3,24])
                for side in [-1,1]:collider(e,'robot_sweep_'+str(side),[side*2.5,1.8,0],[3.5,3.6,22])
                e['clearance'].append(dict(kind='walk',center_m=[6,1.4,5.5],size_m=[1.6,2.4,9],condition='ramp_and_approach'))
                e['description']='24 m conveyor, eight articulated arms on opposing sides, four tool types, three service gantries, chassis fixtures, parts feeders, and a triple-monitor station with a 1.6 m-wide access ramp. '+('Eight-second choreographed operating loop.' if state<2 else 'Disabled machinery with structural losses; no operating animation.')
            elif family=='robotic_arm':
                arm(state,tool='gripper',motion=state<2);socket(e,'MOUNT','support',[0,0,0],[0,-1,0],state<3,1.45);collider(e,'sweep',[1.2,1.6,0],[4,3.2,2]);e['description']='Waist, shoulder, elbow, wrist and two gripper fingers in a transform hierarchy. Includes an eight-second articulated loop in D0/D1.'
            elif family=='conveyor_module':
                conveyor(state,motion=state<2)
                for sign,label in [(-1,'OUT'),(1,'IN')]:socket(e,label,'conveyor',[0,1.18,sign*2],[0,0,sign],state<2,2.05)
                collider(e,'belt',[.2,.65,0],[3.3,1.3,4]);e['description']='4 m conveyor section with moving treads on a closed return path, rotating drums, side rails and a drive motor. Six sections form the complete line.'
            elif family=='control_platform':
                control(state);socket(e,'ACCESS','walk',[0,0,5.5],[0,0,1],state<3,1.6);collider(e,'platform',[0,.4,0],[4,.8,3]);e['ramp']=dict(rise_m=.8,run_m=4,clear_width_m=1.6);e['description']='Three telemetry monitors, keyboard, emergency stops, operator stool, raised platform, handrails and continuous access ramp. Ramp collision requires an engine mesh or slope collider.'
            elif family=='gantry_module':
                gantry(state);socket(e,'SUPPORT','support',[0,0,0],[0,-1,0],state<2,8);e['description']='8 m service portal with braced overhead truss, cable tray, task light and suspended carriage.'
                for x in [-3.7,3.7]:collider(e,'column'+str(x),[x,2.4,0],[.6,4.8,.95])
            else:
                pallet(state);socket(e,'CARGO','cargo',[0,0,0],[0,-1,0],state<2,1.7);collider(e,'fixture',[0,.35,0],[1.7,.7,1.55]);e['description']='Palletized rover chassis with mounting fixtures and a central core housing for the four work stations.'
            scars(state,plot,number*10+state)
            print(f'AUTHORED {number*4+state+1}/24 {e["id"]}',flush=True)

scene=bpy.context.scene;scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=END;scene.frame_set(1)
for index,(root,collection,e) in enumerate(k.roots):
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(collection.objects):
        o.select_set(True)
        if o.type=='FONT':bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
        if o.type=='MESH':
            bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    bpy.context.view_layer.objects.active=root
    path=OUT/e['file']
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=bool(e['animations']),export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=False,export_yup=True,export_cameras=False,export_lights=False)
    data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);blob=data[28+n:]
    for node in doc.get('nodes',[]):
        if node.get('extras',{}).get('asset_id')==e['id']:node['name']='ROOT'
        if node.get('name','').startswith(('SOCKET_','ARM_')):node['name']=node['name'].split('.')[0]
    if doc.get('animations'):
        merged=dict(name='Assembly_Cycle',channels=[],samplers=[])
        for animation in doc['animations']:
            offset=len(merged['samplers']);merged['samplers'].extend(animation['samplers'])
            for channel in animation['channels']:channel['sampler']+=offset;merged['channels'].append(channel)
        doc['animations']=[merged]
    payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
    data=struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob;path.write_bytes(data)
    e['bytes']=len(data);e['triangles']=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives'])
    print(f'EXPORTED {index+1}/24 {e["file"]}',flush=True)
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
for i,(root,collection,e) in enumerate(k.roots):root.location=((i%4)*36,(i//4)*40,0)
scene.name='A6 / Robotic assembly line';scene.world.color=(.15,.15,.15)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=32;area.spaces.active.region_3d.view_location=(0,0,2)
bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-assembly-line.blend'))
print('ASSEMBLY_LINE_COMPLETE 6 families / 24 exports',flush=True)
