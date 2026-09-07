"""A6 HUGIN reusable entry vehicle / launch and cargo recovery complex.
Run in background Blender; authored D0–D3 and a 20-second cargo handling loop.
"""
import sys,math,json,struct,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,Vector,box,cylinder,beam,empty,text
OUT=k.PROJECT/'assets/launchpad';OUT.mkdir(parents=True,exist_ok=True)
k.M['hull']=k.material('Flight ceramic / warm ivory',(.72,.74,.67),.38,.36)
k.M['orange']=k.material('Recovery hardware / burnt orange',(.8,.24,.055),.5,.4)
k.M['glass']=k.material('Flight sensor / midnight blue',(.02,.085,.11),.65,.23)

def cone(name,loc,r1,r2,depth,mat='hull',parent=None):
    bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r1,radius2=r2,depth=depth)
    o=k.register(bpy.context.object,name,mat,parent);o.location=loc;return o

def tube(name,loc,outer,inner,depth,mat='edge',parent=None,sector=math.tau):
    verts=[];faces=[];n=40
    for j in range(n+1):
        a=j/n*sector
        for r,z in [(outer,-depth/2),(outer,depth/2),(inner,depth/2),(inner,-depth/2)]:verts.append((r*math.cos(a),r*math.sin(a),z))
    for j in range(n):
        for q in range(4):faces.append((j*4+q,(j+1)*4+q,(j+1)*4+(q+1)%4,j*4+(q+1)%4))
    faces += [(0,1,2,3),(n*4+3,n*4+2,n*4+1,n*4)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);k.active_collection.objects.link(o);o.parent=parent or k.active_root;o.location=loc;mesh.materials.append(k.M[mat]);return o

def pipe(name,points,r=.07,mat='dark',parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=1;s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,v in zip(s.bezier_points,points):p.co=v;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);k.active_collection.objects.link(o);o.parent=parent or k.active_root;c.materials.append(k.M[mat]);return o

def rail(a,b,parent=None):
    a=Vector(a);b=Vector(b);d=b-a
    for z in [.5,1]:beam('Platform handrail',a+Vector((0,0,z)),b+Vector((0,0,z)),.045,'yellow',parent)
    for j in range(max(2,int(d.length/1.5)+1)):
        p=a+d*j/(max(2,int(d.length/1.5)+1)-1);beam('Handrail post',p,p+Vector((0,0,1)),.04,'frame',parent)

def keys(o,prop,values):
    for frame,value in values:setattr(o,prop,value);o.keyframe_insert(data_path=prop,frame=frame)
    for layer in o.animation_data.action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    for p in fc.keyframe_points:p.interpolation='LINEAR'

def cargo(parent,state):
    p=empty('CARGO_CAPSULE',(-2.6,0,-1.9),parent);p['component']='detachable cargo portion';p['grip_height_m']=1.9
    tube('Cargo capture collar',(0,0,1.9),2.06,1.85,.42,'orange',p)
    cylinder('Cargo pressure hull',(0,0,2.1),1.85,3.5,'hull',parent=p,vertices=32)
    cone('Cargo ogive shoulder',(0,0,4.25),1.85,.9,.9,parent=p)
    cone('Cargo nose',(0,0,5.1),.9,.12,.8,parent=p)
    cylinder('Cargo separation ring',(0,0,.25),1.93,.35,'edge',parent=p,vertices=32)
    for a in [0,math.pi/2,math.pi,math.pi*1.5]:
        r=empty('Cargo quadrant',(0,0,0),p);r.rotation_euler.z=a
        box('Cargo hatch',(0,-1.84,2.9),(1.15,.16,1.6),'frame',parent=r)
        box('Hatch inset',(0,-1.94,2.9),(.93,.08,1.37),'hull',parent=r)
        box('Optical ranging window',(0,-1.99,3.2),(.63,.04,.3),'glass',parent=r)
        for x in [-.44,.44]:box('Hatch latch',(x,-2.01,2.65),(.1,.08,.32),'orange',parent=r)
    text('Cargo stencil','HUGIN / CARGO',(0,-2.03,1.15),.25,'edge',p)
    text('Cargo serial','07',(0,-2.04,2.65),.45,'white',p)
    empty('CARGO_CAPTURE_SOCKET',(0,0,1.9),p)
    return p

STATES=['Intact','Damaged','Critical','Destroyed']
for state in range(4):
    e=k.begin('hugin_launchpad_d'+str(state),'HUGIN / Reusable launch & recovery',STATES[state],[40,40],'')
    e.update(family='hugin_launchpad',damage_level=state,functional=state<2,animations=['Cargo_Recovery_Cycle'] if state<2 else [],landing_leg_count=3,collision_quality='blockout')
    pad=empty('LAUNCH_PLATFORM')
    # Octagonal pad and a real central flame opening with a deflector below it.
    cylinder('Octagonal launch foundation',(-3,0,.6),8.7,1.2,'concrete',parent=pad,vertices=8)
    tube('Raised launch deck',(-3,0,2),7.8,2.5,.7,'frame',pad)
    tube('Ceramic exhaust lip',(-3,0,2.4),2.8,2.5,.18,'raw',pad)
    for a in [j*math.tau/8 for j in range(8)]:
        x=-3+6.9*math.cos(a);y=6.9*math.sin(a)
        o=box('Deck sector armor',(x,y,2.42),(2.7,1.3,.13),'armor',parent=pad,rot=(0,0,a+math.pi/2))
        box('Perimeter caution strip',(-3+7.45*math.cos(a),7.45*math.sin(a),2.5),(1.7,.15,.035),'yellow',parent=pad,rot=(0,0,a+math.pi/2))
        cylinder('Pad status light',(-3+8*math.cos(a),8*math.sin(a),1.27),.14,.16,'signal' if state==0 else 'fault',parent=pad)
    box('Flame trench floor',(-3,7.5,.75),(4.5,9,.25),'dark')
    for x in [-5.5,-.5]:box('Flame trench wall',(x,8,1.6),(.5,8,1.8),'concrete')
    for j in range(8):box('Exhaust deflector baffle',(-3,4+j*.8,1.15),(4,.32,.5),'edge',rot=(.35,0,0))
    text('Launch designation','HUGIN / 07',(-3,-8.1,1.15),.55)
    # Dedicated receiving deck, separate from the hot launch platform.
    box('Cargo receiving deck',(2,-9,1.15),(8,6,2.3),'frame')
    box('Receiving deck surface',(2,-9,2.36),(8.1,6.1,.12),'armor')
    cylinder('Cargo receiving pedestal',(2,-9,2.92),2.15,1,'edge',vertices=24)
    tube('Receiving seat',(2,-9,3.46),2.22,1.8,.12,'orange')
    for y in [-12,-6]:rail((-2,y,2.45),(6,y,2.45))
    for i in range(10):box('Access stair',(7+i*.3,-10,2.3-i*.23),(.32,2,.23),'frame')
    rail((7,-11,2.4),(9.7,-11,.33));rail((7,-9,2.4),(9.7,-9,.33))
    text('Cargo apron stencil','CARGO / RECOVERY',(2,-12.03,1.4),.35)
    # Service tower is the launcher and the vertical recovery carriage guide.
    tower=empty('LAUNCHER_TOWER',(9,3,0))
    box('Tower raft',(0,0,.45),(5.6,6,.9),'concrete',parent=tower)
    height=28 if state<3 else 7
    for x in [-1.8,1.8]:
        for y in [-1.8,1.8]:box('Tower main chord',(x,y,height/2+1),(.55,.55,height),'frame',parent=tower)
    for z in range(2,height+1,4):
        for y in [-1.8,1.8]:
            box('Tower cross beam',(0,y,z),(4.2,.4,.35),'edge',parent=tower)
            beam('Tower diagonal',(-1.8,y,z),(1.8,y,min(z+4,height+1)),.15,'armor',tower)
        for x in [-1.8,1.8]:beam('Tower side diagonal',(x,-1.8,z),(x,1.8,min(z+4,height+1)),.15,'armor',tower)
    if state<3:
        for y in [-.7,.7]:box('Cargo elevator rail',(-2.3,y,15),(.23,.18,26),'armor',parent=tower)
        for z in [5,13,25,29]:
            box('Tower service balcony',(0,0,z),(4,5,.18),'frame',parent=tower)
            rail((-2.5,2.5,z),(2.5,2.5,z),tower);rail((2.5,-2.5,z),(2.5,2.5,z),tower)
        for y in [-.5,.5]:beam('Tower ladder stile',(2.25,y,1),(2.25,y,29),.06,'yellow',tower)
        for j in range(70):beam('Tower ladder rung',(2.25,-.5,1+j*.4),(2.25,.5,1+j*.4),.045,'frame',tower)
        box('Tower crown',(0,0,29.4),(4.8,4.8,.65),'armor',parent=tower)
        text('Tower name','HUGIN',(0,-2.44,29.2),.8,'edge',tower)
        beam('Lightning mast',(0,0,29.8),(0,0,33),.07,'frame',tower)
        cylinder('Tower beacon',(0,0,33),.15,.2,'signal' if state==0 else 'fault',parent=tower)
        for x in [-1,1]:pipe('Launcher fuel riser',[(x,2.2,.7),(x,2.2,15),(x,-.5,15)],.18,'orange',tower)
    # Exposed service module, plumbing and monitoring cabin.
    for x in [9,13]:
        cylinder('Service pressure tank',(x,11,3.2),1.35,4.8,'armor',vertices=24)
        cone('Pressure tank roof',(x,11,5.85),1.35,.5,.5,'frame')
        for z in [1.2,4.8]:cylinder('Tank strap',(x,11,z),1.39,.15,'edge',vertices=24)
        pipe('Pad fuel main',[(x,11,.8),(x,8,.8),(6,6,.8),(3,3,2)],.13,'orange')
    box('Launch control shelter',(-11,9,1.7),(5,4,3.4),'armor')
    box('Control shelter roof',(-11,9,3.55),(5.5,4.5,.2),'edge')
    for x in [-12.4,-11,-9.6]:
        box('Control screen bezel',(x,6.96,2.2),(1.1,.12,.8),'edge')
        box('Control screen',(x,6.87,2.2),(.95,.03,.64),'glass')
        if state<2:
            for j in range(5):box('Flight telemetry',(x-.35+j*.17,6.84,2.15),(.08,.02,.13+j*.065),'signal' if state==0 else 'fault')
    text('Control label','FLIGHT / RECOVERY',(-11,6.85,1.2),.27,'edge')
    # Reusable booster and its three unmistakable flat landing feet.
    rocket=empty('REUSABLE_BOOSTER',(-3,0,0));rocket['landing_legs']=3
    if state<3:
        if state==2:
            tube('Ruptured booster pressure hull',(0,0,11.5),2,1.82,12.7,'hull',rocket,math.tau*.82)
            for z in [8,11,14]:beam('Exposed booster rib',(1.7,-.9,z),(2.4,-1.4,z+.8),.06,'rust',rocket)
        else:cylinder('Booster propellant hull',(0,0,11.5),2,12.7,'hull',parent=rocket,vertices=40)
        cone('Booster engine skirt',(0,0,5.0),1.75,2,1.1,'edge',rocket)
        for z in [5.8,9.5,14,17.7]:cylinder('Booster reinforcement ring',(0,0,z),2.05,.18,'frame',parent=rocket,vertices=40)
        cylinder('Cargo mating collar',(0,0,18.1),1.92,.5,'edge',parent=rocket,vertices=32)
        for j in range(3):
            a=j*math.tau/3-math.pi/2
            leg=empty('LANDING_LEG_%02d'%(j+1),(0,0,0),rocket);leg.rotation_euler.z=a;leg['foot_type']='broad flat landing pad'
            cylinder('Landing leg hinge',(1.86,0,7),.38,.9,'orange','Y',leg,20)
            beam('Landing main strut',(1.86,0,7),(4.7,0,2.76),.23,'armor',leg)
            beam('Landing hydraulic barrel',(1.95,.22,6.3),(3.6,.22,4.25),.18,'edge',leg)
            beam('Landing polished piston',(3.6,.22,4.25),(4.7,.22,2.86),.1,'armor',leg)
            beam('Landing drag brace',(1.8,0,4.9),(4.7,0,2.8),.13,'frame',leg)
            foot=box('FLAT_LANDING_FOOT_%02d'%(j+1),(4.7,0,2.66),(2.3,1.65,.32),'edge',parent=leg)
            box('Foot upper plate',(4.7,0,2.85),(1.65,1.2,.12),'orange',parent=leg)
            for dx in [-.7,.7]:cylinder('Foot anchor bolt',(4.7+dx,0,2.94),.09,.07,'white',parent=leg)
            # Three swept body fins match the tripod radial spacing.
            fin=k.prism('Thermal descent fin',[(1.8,5.7),(2.75,6),(2.5,9.2),(1.85,10)],-.13,.13,'frame',leg)
        for j in range(3):
            a=j*math.tau/3;x=.78*math.cos(a);y=.78*math.sin(a)
            tube('Open engine bell',(x,y,4.48),.59,.46,.8,'dark',rocket)
            cylinder('Engine throat',(x,y,4.96),.28,.24,'orange',parent=rocket)
        text('Booster name','HUGIN',(0,-2.03,13.4),.67,'edge',rocket)
        text('Booster registration','A6 / REUSABLE\nENTRY VEHICLE 07',(0,-2.04,11.3),.24,'edge',rocket)
        for z in [6.5,7,7.5]:box('Booster caution tab',(0,-2.06,z),(.75,.04,.18),'orange',parent=rocket)
        # Launcher jaws hold a separate structural ring above the engine cluster.
        for j in range(3):
            a=j*math.tau/3+math.pi/2;hold=empty('LAUNCH_HOLD_%02d'%j,(-3,0,0));hold.rotation_euler.z=a
            box('Hold-down pedestal',(2.8,0,3.3),(.7,.9,1.5),'frame',parent=hold)
            beam('Launch clamp',(2.8,0,4),(1.75,0,4.6),.17,'orange',hold)
        if state<2:
            pipe('Retractable fueling umbilical',[(7,3,15),(5,3,15),(1,2,13.5),(-1.1,0,13.5)],.12,'dark')
    else:
        tube('Ruptured booster stump',(0,0,5),2.02,1.8,2.8,'hull',rocket,math.tau*.78)
        broken=empty('FALLEN_BOOSTER',(-7,-3,3.7));broken.rotation_euler=(0,math.pi/2,-.6)
        tube('Fallen open pressure hull',(0,0,0),2,1.82,8,'hull',broken,math.tau*.86)
        for z in [-3,0,3]:tube('Fallen hull ring',(0,0,z),2.07,1.8,.2,'frame',broken)
        for j in range(3):
            a=j*math.tau/3
            box('Detached flat landing foot',(-3+6*math.cos(a),6*math.sin(a),2.68),(2.3,1.65,.32),'edge',rot=(0,0,a))
    # Planar articulated catcher with elevator and opposing C-shaped fingers.
    if state<3:
        lift=empty('CATCHER_LIFT',(6.4,3,20.3));lift['component']='vertical cargo elevator'
        box('Elevator carriage',(0,0,0),(1.1,3,3.3),'orange',parent=lift)
        shoulder=empty('CATCHER_SHOULDER',(0,0,0),lift)
        def arm_link(p,length,width):
            cylinder('Recovery rotary bearing',(0,0,0),width,.8,'edge',parent=p,vertices=24)
            cylinder('Recovery bearing cap',(0,0,.5),width*.7,.2,'orange',parent=p,vertices=24)
            for z in [-.35,.35]:box('Recovery arm chord',(length/2,0,z),(length,.55,.25),'frame',parent=p)
            for j in range(int(length)):
                beam('Recovery arm diagonal',(j,0,-.35),(j+1,0,.35),.11,'armor',p)
            pipe('Arm hydraulic line',[(.2,.42,0),(length/2,.42,0),(length-.2,.42,0)],.07,'orange',p)
        arm_link(shoulder,7,.85)
        elbow=empty('CATCHER_ELBOW',(7,0,0),shoulder);arm_link(elbow,6,.7)
        wrist=empty('CATCHER_WRIST',(6,0,0),elbow)
        cylinder('Capture wrist',(0,0,0),.55,1,'orange',parent=wrist,vertices=24)
        jaws=[]
        for sign in [-1,1]:
            jaw=empty('CAPTURE_JAW_'+('L' if sign<0 else 'R'),(0,sign*.45,0),wrist);jaws.append(jaw)
            beam('Capture fork shoulder',(-.1,0,0),(-.8,sign*1.7,0),.15,'orange',jaw)
            beam('Capture fork rail',(-.8,sign*1.7,0),(-3,sign*1.7,0),.15,'orange',jaw)
            beam('Capture finger',(-3,sign*1.7,0),(-4.2,sign*1.2,0),.15,'orange',jaw)
            box('Capture contact pad',(-2.6,sign*1.52,0),(1,.25,.6),'dark',parent=jaw)
        pod=cargo(wrist,state)
        # Cargo remains parented to the wrist; it rests on the booster at both ends.
        def pose(cx,cy,bottom):
            dx=cx+2.6-6.4;dy=cy-3;d2=dx*dx+dy*dy
            q2=math.acos(max(-1,min(1,(d2-49-36)/84)))
            q1=math.atan2(dy,dx)-math.atan2(6*math.sin(q2),7+6*math.cos(q2))
            return q1,q2,-q1-q2,bottom+1.9
        # x/y cargo target positions, bottom height, jaw spread in meters.
        way=[(0,-3,0,18.4,.8),(2,-3,0,18.4,0),(4,-3,0,21,0),(7,2,-9,21,0),(10,2,-9,3.5,0),(12,2,-9,3.5,0),(15,2,-9,21,0),(18,-3,0,21,0),(20,-3,0,18.4,.8)]
        # Tower-to-receiving-seat reach must remain inside the 13 m arm envelope.
        if state<2:
            tracks={o:[] for o in [lift,shoulder,elbow,wrist,*jaws]}
            for frame in range(1,602,3):
                t=(frame-1)/30
                a,b=next(((a,b) for a,b in zip(way,way[1:]) if a[0]<=t<=b[0]),(way[-2],way[-1]))
                u=(t-a[0])/(b[0]-a[0]);u=u*u*(3-2*u)
                cx,cy,z,spread=[a[j]+(b[j]-a[j])*u for j in range(1,5)]
                q1,q2,q3,zz=pose(cx,cy,z)
                tracks[lift].append((frame,(6.4,3,zz)))
                for o,q in [(shoulder,q1),(elbow,q2),(wrist,q3)]:tracks[o].append((frame,(0,0,q)))
                for sign,jaw in zip([-1,1],jaws):tracks[jaw].append((frame,(0,sign*(.45+spread),0)))
            for o,values in tracks.items():keys(o,'location' if o in [lift,*jaws] else 'rotation_euler',values)
        else:
            q1,q2,q3,zz=pose(2,-9,8);lift.location.z=zz
            shoulder.rotation_euler.z=q1;elbow.rotation_euler.z=q2;wrist.rotation_euler.z=q3
            pod.rotation_euler.x=.18
            tube('Cargo hull impact break',(-2.6,0,1.9),1.92,1.7,.35,'rust',wrist,4.5)
            pipe('Severed recovery cable',[(0,0,-.2),(1,-.3,-2),(.5,-1,-4)],.09,'dark',wrist)
            for o in list(k.active_collection.objects):
                if o.name.startswith('Capture finger') and o.parent==jaws[0]:bpy.data.objects.remove(o,do_unlink=True)
    else:
        fallen=empty('FALLEN_RECOVERY_ARM',(5,-3,1.4));fallen.rotation_euler.z=-.3
        for z in [0,.6]:box('Fallen catcher boom',(0,0,z),(10,.55,.25),'frame',parent=fallen)
        for j in range(9):beam('Broken catcher truss',(-4.5+j,0,0),(-3.5+j,0,.6),.11,'armor',fallen)
        cylinder('Detached catch servo',(-4,0,.5),.85,.7,'orange',parent=fallen)
        podparent=empty('FALLEN_CARGO',(1,-14.5,2.1));podparent.rotation_euler.y=math.pi/2
        pod=cargo(podparent,state);pod.location=(0,0,0)
        for x in [7.2,10.8]:pipe('Torn tower conduit',[(x,3,7),(x+1,2,3),(x+2,0,.3)],.1,'dark')
    if state:
        rng=random.Random(700+state)
        for j in range(10 if state==1 else 30):
            x=rng.uniform(-10,12);y=rng.uniform(-5,5)
            surface=2.6 if math.hypot(x+3,y)<7.8 else (.98 if 6.2<x<11.8 and 0<y<6 else .17)
            box('Impact debris',(x,y,surface),(rng.uniform(.2,.9),rng.uniform(.2,.6),.14),'hull' if j%2 else 'edge',rot=(.1,.1,rng.random()*6))
        if state<3:
            for z in [8,10,12,15]:box('Booster heat scar',(-3,-2.03,z),(.65,.07,.17),'dark',rot=(0,.25,0))
    k.socket(e,'FUEL','fuel',[13,.8,-12],[0,0,-1],state<2)
    k.collider(e,'launch_pad',[-3,1.3,0],[17.4,2.6,17.4])
    k.collider(e,'tower',[9,15,-3],[5.6,30,6],condition='D0_D1_D2')
    e['description']=[
        'Reusable booster with three broad flat landing feet, open engine bells, launch hold-downs and flame trench. The tower catcher grips the upper cargo capsule, lifts it clear, swings to the receiving deck, lowers it and returns it in a 20-second loop.',
        'Operational damage: heat-scarred booster, impact fragments and fault telemetry. The complete cargo-recovery sequence remains active.',
        'Disabled recovery system: ruptured booster hull, stalled low catcher, damaged finger, tilted cargo capsule and torn service cable; booster and launcher remain recognizable.',
        'Collapsed recovery complex: open broken booster shell, detached flat landing feet, fallen catcher boom, cargo capsule wreck and severed tower conduits.'
    ][state]
    bpy.context.scene.frame_set(1)
    print('AUTHORED HUGIN D'+str(state),flush=True)

scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=601;scene.frame_set(1)
for root,col,e in k.roots:
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(col.objects):
        o.select_set(True)
        if o.type in ['FONT','CURVE']:bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    bpy.context.view_layer.objects.active=root;path=OUT/e['file']
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=bool(e['animations']),export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=False,export_anim_slide_to_zero=True,export_cameras=False,export_lights=False)
    data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);blob=data[28+n:]
    for node in doc.get('nodes',[]):
        if node.get('extras',{}).get('asset_id'):node['name']='ROOT'
        if node.get('name','').startswith(('CATCHER_','CAPTURE_JAW_','CARGO_CAPSULE','CARGO_CAPTURE_SOCKET','REUSABLE_BOOSTER','LANDING_LEG_','FLAT_LANDING_FOOT_','SOCKET_','FALLEN_')):node['name']=node['name'].split('.')[0]
    if doc.get('animations'):
        merged=dict(name='Cargo_Recovery_Cycle',channels=[],samplers=[])
        for a in doc['animations']:
            offset=len(merged['samplers']);merged['samplers']+=a['samplers']
            for c in a['channels']:c['sampler']+=offset;merged['channels'].append(c)
        doc['animations']=[merged]
    payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob)
    e['bytes']=path.stat().st_size;e['triangles']=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives'])
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
for i,(root,col,e) in enumerate(k.roots):root.location.x=i*46
scene.name='HUGIN / Launch and recovery / D0–D3'
pres=bpy.data.collections.new('PRESENTATION');scene.collection.children.link(pres);k.active_collection=pres;k.active_root=None
box('Presentation ground',(0,0,-.18),(100,100,.3),'dark')
h=empty('SCALE_WORKER_1.8m',(-11,-8,0));box('Worker suit',(0,0,1.16),(.46,.28,.58),'orange',parent=h);cylinder('Worker helmet',(0,0,1.65),.2,.3,'white',parent=h)
for x in [-.15,.15]:beam('Worker leg',(x,0,.9),(x,0,.15),.09,'armor',h);beam('Worker arm',(x*1.8,0,1.4),(x*2,0,.85),.075,'armor',h)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.18,.23,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,loc,power,size in [('Key',(-25,-35,45),65000,20),('Rim',(15,20,40),80000,20),('Fill',(30,-20,20),22000,15)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);pres.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,14))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('Hero');cam=bpy.data.objects.new('Hero',d);pres.objects.link(cam);cam.location=(43,-62,39);cam.rotation_euler=(Vector((0,0,14))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=49;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1400;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
for root,col,e in k.roots[1:]:col.hide_render=True
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active;sp.region_3d.view_location=(0,0,14);sp.region_3d.view_distance=52;sp.region_3d.view_rotation=cam.rotation_euler.to_quaternion();sp.clip_end=1000;sp.shading.color_type='MATERIAL';sp.overlay.show_relationship_lines=False;sp.overlay.show_extras=False
bpy.ops.object.select_all(action='DESELECT');bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-launchpad.blend'))
scene.render.filepath=str(OUT/'hugin-preview.png');bpy.ops.render.render(write_still=True)
print('HUGIN_COMPLETE',flush=True)
