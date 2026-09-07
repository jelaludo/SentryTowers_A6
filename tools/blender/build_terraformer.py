"""Terraformer 3000 / Stålheart. Background authoring, D0–D3 + articulated GLB."""
import sys, math, json, struct, random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy, Vector, box, cylinder, beam, empty, text
OUT=k.PROJECT/'assets/terraformer';OUT.mkdir(parents=True,exist_ok=True)
k.M['tank']=k.material('Reservoir / warm enamel',(.64,.63,.52),.45,.42)
k.M['screen']=k.material('Telemetry / cyan',(.035,.64,.8),.25,.28,2)

def pipe(name,points,r=.12,mat='dark',parent=None):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);k.active_collection.objects.link(o);o.parent=parent or k.active_root;c.materials.append(k.M[mat]);return o

def rail(a,b,z,parent):
    for h in [0,.55,1.1]:beam('Safety rail',(*a,z+h),(*b,z+h),.045,'yellow',parent)
    d=Vector(b)-Vector(a)
    for i in range(int(d.length/1.8)+1):
        p=Vector(a)+d*i/max(1,int(d.length/1.8));beam('Stanchion',(*p,z),(*p,z+1.1),.045,'frame',parent)

def key(o,prop,vals):
    for f,v in vals:setattr(o,prop,v);o.keyframe_insert(data_path=prop,frame=f)
    o.animation_data.action.name='Terraforming_Cycle'

def tank(x,state,parent,index):
    t=empty('RESERVOIR_%02d'%index,(x,.25,28.4),parent)
    cylinder('Silo pedestal',(0,0,.25),1.8,.5,'edge',parent=t,vertices=24)
    if state==2 and index==2:
        # Open ruptured cylinder: a missing sector exposes interior and jagged lips.
        verts=[];faces=[]
        for j in range(22):
            a=.65+j*(math.tau-1.3)/21
            for z,r in [(0,1.5),(5.7+(j%3)*.25,1.6),(5.7+(j%3)*.25,1.43),(0,1.33)]:verts.append((r*math.sin(a),-r*math.cos(a),z+.5))
        for j in range(21):
            for q in range(4):faces.append((j*4+q,j*4+(q+1)%4,(j+1)*4+(q+1)%4,(j+1)*4+q))
        mesh=bpy.data.meshes.new('Ruptured shell');mesh.from_pydata(verts,[],faces);o=bpy.data.objects.new('Torn reservoir shell',mesh);k.active_collection.objects.link(o);o.parent=t;mesh.materials.append(k.M['tank'])
        for j in range(5):beam('Torn tank ribs',(-.8+j*.4,-1.25,4.6),(-1+j*.5,-1.8,6.4-j*.2),.05,'rust',t)
    else:
        cylinder('Material pressure vessel',(0,0,3.5),1.6,5.8,'tank',parent=t,vertices=32)
        for z in [.6,6.4]:
            bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1);o=k.register(bpy.context.object,'Dished pressure head','tank',t);o.location=(0,0,z);o.scale=(1.6,1.6,.7)
        for z in [1,3.6,6]:cylinder('Silo reinforcing band',(0,0,z),1.66,.16,'frame',parent=t,vertices=32)
        cylinder('Fill neck',(0,0,7.15),.38,.65,'frame',parent=t)
        cylinder('Fill cap',(0,0,7.5),.5,.12,'yellow',parent=t)
        text('Reservoir number','0'+str(index),(0,-1.62,4.6),.8,'edge',t)
        text('Material marking','REGOLITH\nCOMPOSITE',(0,-1.63,2.4),.28,'edge',t)
    for y in [-.9,.9]:beam('Tank saddle',(0,y,0),(0,y,1.5),.16,'frame',t)
    return t

def control(state,x,z,parent,number):
    p=empty('SIDE_CONTROL_%02d'%number,(x,-.4,z),parent)
    box('Service balcony',(0,0,0),(4,4,.25),'frame',parent=p)
    rail((-2,-2),(2,-2),.15,p);rail((2,-2),(2,2),.15,p)
    if state==3:return
    box('Monitoring enclosure',(0,.7,1.15),(2.9,1.9,2.25),'armor',parent=p)
    box('Shelter roof',(0,.6,2.4),(3.35,2.3,.18),'edge',parent=p)
    for xx in [-.85,0,.85]:
        box('Monitor bezel',(xx,-.29,1.48),(.75,.12,.65),'edge',parent=p)
        if state<2:
            box('Telemetry screen',(xx,-.36,1.48),(.62,.025,.5),'dark',parent=p)
            for j in range(4):box('Telemetry bar',(xx-.21+j*.14,-.38,1.42),(.065,.025,.12+j*.065),'screen' if state==0 else 'fault',parent=p)
    box('Console ledge',(0,-.6,.97),(2.8,.75,.15),'edge',parent=p)
    for xx in [-1,-.6,-.2,.2,.6,1]:cylinder('Console button',(xx,-.7,1.08),.065,.07,'yellow',parent=p)
    text('Control identifier','A6 / CONTROL '+str(number),(0,-.27,.5),.17,parent=p)
    for j in range(6):box('Cooling vent',(1.46,.2+j*.18,1),(.025,.09,.7),'edge',parent=p)

states=['Intact','Damaged','Critical','Destroyed']
for state in range(4):
    e=k.begin('terraformer_3000_d'+str(state),'Terraformer 3000 / Stålheart',states[state],[48,56],'')
    e.update(family='terraformer_3000',damage_level=state,functional=state<2,animations=['Terraforming_Cycle'] if state<2 else [],height_m=36.1,collision_quality='blockout',arm_dof=6)
    for x in [-16,16]:
        for y in range(-24,25,2):
            box('Rail sleeper',(x,y,.12),(3.4,.65,.24),'concrete')
            for xx in [-.6,.6]:cylinder('Track fastener',(x+xx,y,.31),.1,.12,'edge')
        box('Rail flange',(x,0,.34),(.8,50,.18),'frame');box('Rail web',(x,0,.58),(.24,50,.4),'edge');box('Rail running head',(x,0,.82),(.48,50,.18),'armor')
        for y in [-25,25]:box('Rail stop',(x,y,1.3),(1.5,.6,1.2),'yellow')
    g=empty('GANTRY_TRAVEL_Y');g['axis']='local Y';g['travel_limits_m']=[-17,17]
    if state<2:key(g,'location',[(1,(0,0,0)),(121,(0,4,0)),(241,(0,0,0)),(361,(0,-4,0)),(481,(0,0,0))])
    for x in [-16,16]:
        box('Rail bogie chassis',(x,0,1.65),(3.8,11,1.25),'edge',parent=g)
        for y in [-4,-2.4,2.4,4]:
            for dx in [-.43,.43]:cylinder('Flanged rail wheel',(x+dx,y,1),.58,.25,'frame','X',g,20)
        for y in [-3.8,0,3.8]:
            box('Bogie armor',(x,y,2.25),(3.9,2.8,.4),'armor',parent=g)
            for j in range(4):box('Bogie hazard stripe',(x-1.97,y-.85+j*.5,1.8),(.025,.22,.5),'yellow',parent=g)
        height=23 if state<3 else (7 if x<0 else 4)
        for yy in [-1.35,1.35]:
            box('Tower structural chord',(x,yy,2.5+height/2),(1.1,.8,height),'frame',parent=g)
            box('Tower outer armor',(x+(.65 if x>0 else -.65),yy,2.5+height/2),(.2,.95,height),'armor',parent=g)
        for zz in range(3,int(height+2),3):
            box('Tower cross tie',(x,0,zz),(1,3.3,.35),'edge',parent=g)
            beam('Tower diagonal',(x,-1.3,zz),(x,1.3,min(zz+3,height+2.4)),.19,'armor',g)
        for yy in [-4.5,4.5]:
            beam('Raking stabilizer',(x,yy,2.2),(x,math.copysign(1.3,yy),min(10,height+2)),.42,'frame',g)
            beam('Brace hydraulic piston',(x-.3,yy,2.5),(x-.3,math.copysign(1.3,yy),min(8,height+1)),.14,'armor',g)
        if state<3:
            for dx in [-.45,.45]:beam('Access ladder stile',(x+dx,-1.95,2.5),(x+dx,-1.95,28.5),.06,'yellow',g)
            for j in range(65):beam('Access ladder rung',(x-.45,-1.95,2.5+j*.4),(x+.45,-1.95,2.5+j*.4),.045,'frame',g)
    if state<3:
        for y in [-1.4,1.4]:
            for z in [25,28]:box('Gantry box chord',(0,y,z),(34, .65,.65),'edge',parent=g)
            for i in range(16):beam('Gantry diagonal web',(-16+i*2,y,25),(-14+i*2,y,28),.19,'frame',g)
        box('Gantry front fascia',(0,-1.8,26.5),(33,.22,2.15),'frame',parent=g)
        for x in range(-15,16,3):box('Fascia stiffener',(x,-1.98,26.5),(.17,.16,2.45),'armor',parent=g)
        for xx in range(-15,16,3):
            for zz in [25.35,27.65]:
                cylinder('Gantry flange bolt',(xx,-2.09,zz),.095,.12,'edge','Y',g)
        for xx in [-16,16]:
            for zz in range(4,24,4):
                box('Column access cover',(xx,-1.81,zz),(.8,.12,1.8),'edge',parent=g)
                box('Column cover inset',(xx,-1.89,zz),(.6,.08,1.5),'armor',parent=g)
            for zz in [4,4.4,4.8]:box('Tower caution band',(xx,-1.97,zz),(.8,.025,.15),'yellow',parent=g)
        text('Machine designation','TERRAFORMER 3000',(-7,-1.94,26.35),.66,parent=g)
        text('Machine name','STÅLHEART',(8,-1.94,26.5),.85,'yellow',g)
        text('Serial','A6 / PLANETARY WORKS',(8,-1.95,25.75),.25,parent=g)
        box('Roof catwalk',(0,0,28.35),(34,4,.24),'frame',parent=g)
        for y in [-2,2]:rail((-17,y),(17,y),28.5,g)
        for z in [25.25,27.65]:box('Carriage linear rail',(0,-2.17,z),(31,.22,.2),'armor',parent=g)
        for xx,i in [(-3.2,1),(1,2)]:tank(xx,state,g,i)
        for j in range(4):pipe('Reservoir feed hose',[(1+j*.4,.8,35),(4+j*.4,1,34),(6+j*.3,1,30),(5+j*.35,.4,28.5)],.14,'dark',g)
        control(state,19,3,g,1);control(state,-19,12,g,2);control(state,19,21,g,3)
        carriage=empty('CARRIAGE_TRAVEL_X',(2,-2.6,25.8),g);carriage['travel_limits_m']=[-11,11];carriage['axis']='local X'
        box('Carriage plate',(0,0,0),(3.6,1.25,4.2),'armor',parent=carriage)
        for x in [-1.4,1.4]:
            box('Carriage guide shoe',(x,.3,0),(.45,1.5,4.6),'edge',parent=carriage)
            cylinder('Lift actuator',(x,-.75,-.9),.2,4,'frame',parent=carriage)
        zslide=empty('TOOL_LIFT_Z',(0,0,-7.4),carriage)
        box('Vertical ram',(0,0,3.5),(1.5,1.1,10),'frame',parent=zslide)
        for xx in [-.86,.86]:cylinder('Telescopic ram guide',(xx,0,3.5),.13,9.5,'armor',parent=zslide)
        yaw=empty('J1_BASE_YAW',(0,0,-1.6),zslide);cylinder('Slew bearing',(0,0,0),1.35,.7,'edge',parent=yaw,vertices=24)
        shoulder=empty('J2_SHOULDER',(0,0,-.7),yaw)
        def link(p,length,width):
            cylinder('Joint drive',(0,0,0),width*.85,width*2,'edge','Y',p,24)
            for y in [-width,width]:cylinder('Joint motor cap',(0,y,0),width*.65,.15,'yellow','Y',p,20)
            box('Articulated link',(0,0,-length/2),(width,width*.95,length),'armor',parent=p)
            for y in [-width*.65,width*.65]:beam('Link actuator',(.35,y,-.4),(.35,y,-length+.4),.14,'frame',p)
            pipe('Link material conduit',[(-width*.7,0,0),(-width,0,-length*.4),(-width*.7,0,-length)],.15,'dark',p)
        link(shoulder,6,1.1)
        elbow=empty('J3_ELBOW',(0,0,-6),shoulder);link(elbow,5,.85)
        roll=empty('J4_FOREARM_ROLL',(0,0,-5),elbow);cylinder('Forearm roll bearing',(0,0,-.2),.7,.6,'frame',parent=roll,vertices=24)
        wrist=empty('J5_WRIST_PITCH',(0,0,-.6),roll);link(wrist,1.7,.55)
        tool=empty('J6_TOOL_ROLL',(0,0,-1.7),wrist)
        cylinder('Extrusion manifold',(0,0,-.35),.6,.7,'frame',parent=tool,vertices=20)
        bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.12,radius2=.48,depth=1.4);o=k.register(bpy.context.object,'Extrusion nozzle','edge',tool);o.location=(0,0,-1.3)
        empty('EXTRUSION_TIP',(0,0,-2),tool)
        joints=[yaw,shoulder,elbow,roll,wrist,tool]
        for o,axis in zip(joints,['Z','Y','Y','Z','Y','Z']):o['rotation_axis']=axis;o['articulation']='independent revolute joint'
        shoulder.rotation_euler.y=.5;elbow.rotation_euler.y=-1.05;wrist.rotation_euler.y=.55
        if state<2:
            key(carriage,'location',[(1,(2,-2.6,25.8)),(241,(-4,-2.6,25.8)),(481,(2,-2.6,25.8))])
            key(zslide,'location',[(1,(0,0,-7.4)),(241,(0,0,-8.2)),(481,(0,0,-7.4))])
            for o,axis,base,amp in [(yaw,2,0,.15),(shoulder,1,.5,.12),(elbow,1,-1.05,.16),(roll,2,0,.3),(wrist,1,.55,.1),(tool,2,0,.4)]:
                vals=[]
                for j in range(17):
                    v=[0,0,0];v[axis]=base+amp*math.sin(j/16*math.tau);vals.append((1+j*30,v))
                key(o,'rotation_euler',vals)
        # Flexible feed lines are articulated mesh segments, exported with the cycle.
        for hose in range(2):
            segments=[cylinder('Flexible carriage material feed',(0,0,0),.13,1,'dark',parent=g,vertices=8) for _ in range(20)]
            for frame in range(1,482,30):
                scene=bpy.context.scene;scene.frame_set(frame)
                cx=carriage.location.x
                p0=Vector((5+ hose*.35,.4,28.5));p1=Vector((9+ hose*.35,-2,31))
                p2=Vector((cx+4,-3.5,28));p3=Vector((cx+.6+hose*.35,-3.3,25.8))
                pts=[]
                for j in range(21):
                    t=j/20;pts.append((1-t)**3*p0+3*(1-t)**2*t*p1+3*(1-t)*t*t*p2+t**3*p3)
                for j,o in enumerate(segments):
                    delta=pts[j+1]-pts[j];o.location=(pts[j]+pts[j+1])/2;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();o.scale.z=delta.length
                    if state<2:
                        for prop in ['location','rotation_euler','scale']:o.keyframe_insert(data_path=prop,frame=frame)
                if state>=2:break
        bpy.context.scene.frame_set(1)
        for xx in [-.9,.9]:
            pipe('Ram supply conduit',[(xx,0,8),(xx,-.7,6),(xx,-.7,1),(xx,0,-1.5)],.13,'dark',zslide)
        if state==2:
            shoulder.rotation_euler.y=.85;elbow.rotation_euler.y=-1.8
            for o in list(k.active_collection.objects):
                if o.parent==tool and o.type=='MESH':o.hide_render=True;o.hide_viewport=True
            pipe('Severed extrusion feed',[(0,0,-.5),(.7,0,-1.2),(.5,0,-2.4)],.1,'rust',tool)
    else:
        fallen=empty('COLLAPSED_BRIDGE',(0,3,3));fallen.rotation_euler=(.12,.12,.18)
        for y in [-1.4,1.4]:
            for z in [0,2.8]:box('Fallen bridge chord',(0,y,z),(29,.65,.65),'frame',parent=fallen)
            for j in range(14):beam('Buckled bridge web',(-14+j*2,y,0),(-12+j*2,y,2.8),.19,'armor',fallen)
        box('Detached nameplate',(2,-1.8,1.3),(17,.2,1.8),'edge',parent=fallen)
        text('Wreck designation','STÅLHEART / 3000',(2,-1.93,1.1),.8,'yellow',fallen)
        for x,y in [(-7,-5),(6,7)]:
            t=tank(0,0,k.active_root,1 if x<0 else 2);t.location=(x,y,2);t.rotation_euler=(0,math.pi/2,.4 if x<0 else -.5)
        for a,b in [((-3,-5,1),(2,-8,1.4)),((2,-8,1.4),(7,-7,.9))]:
            beam('Fallen extrusion arm',a,b,.55,'armor');cylinder('Detached servo',a,.85,1.4,'edge','Y')
        control(3,19,1,k.active_root,1)
        for x in [-16,16]:pipe('Torn tower cabling',[(x,0,6),(x+1,0,3),(x+3,-2,.3)],.13,'dark')
    if state:
        rng=random.Random(3000+state)
        for j in range(12 if state==1 else 35):
            box('Spalled machinery debris',(rng.uniform(-18,18),rng.uniform(-9,9),.25),(rng.uniform(.2,1.4),rng.uniform(.2,.8),.2),'edge' if j%2 else 'tank',rot=(rng.random()*.4,rng.random()*.3,rng.random()*6))
        if state<3:
            for j in range(8 if state==1 else 20):box('Armor impact gouge',(rng.uniform(-15,15),-1.94,rng.uniform(25.6,27.3)),(rng.uniform(.2,.8),.035,.13),'dark',parent=g,rot=(0,rng.uniform(-.6,.6),0))
    e['description']=['36 m tall planetary printer: rail-mounted portal, transverse carriage, vertical ram, six articulated joints, twin pressure silos and three side monitoring balconies. 16-second operating loop.','Operational impact state: scarred armor, fallen fragments and warning telemetry. Rail, carriage and six-joint arm remain animated.','Disabled critical state: ruptured reservoir, exposed tank ribs, broken nozzle feed, folded arm and dead monitors.','Collapsed state: fallen named bridge, detached reservoirs, broken arm segments, tower stumps and torn cabling.'][state]
    k.socket(e,'MATERIAL_INPUT','material',[16,1,-24],[0,0,-1],state<2)
    k.collider(e,'reserved_machine_envelope',[0,18,0],[44,36,22],condition='coarse_only')
    print('AUTHORED D'+str(state),flush=True)

scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=481;scene.frame_set(1)
for root,col,e in k.roots:
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(col.objects):
        if o.hide_render:
            bpy.data.objects.remove(o,do_unlink=True);continue
        o.select_set(True)
        if o.type in ['FONT','CURVE']:bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    bpy.context.view_layer.objects.active=root
    path=OUT/e['file']
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=bool(e['animations']),export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=False,export_anim_slide_to_zero=True,export_cameras=False,export_lights=False)
    data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);blob=data[28+n:]
    for node in doc.get('nodes',[]):
        if node.get('extras',{}).get('asset_id'):node['name']='ROOT'
        if node.get('name','').startswith(('J1_','J2_','J3_','J4_','J5_','J6_','GANTRY_TRAVEL','CARRIAGE_TRAVEL','TOOL_LIFT','EXTRUSION_TIP')):node['name']=node['name'].split('.')[0]
    if doc.get('animations'):
        merged=dict(name='Terraforming_Cycle',channels=[],samplers=[])
        for a in doc['animations']:
            offset=len(merged['samplers']);merged['samplers']+=a['samplers']
            for c in a['channels']:c['sampler']+=offset;merged['channels'].append(c)
        doc['animations']=[merged]
    payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob)
    e['bytes']=path.stat().st_size;e['triangles']=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives'])
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
# All states in an editable comparison gallery; render only intact with scale figure.
for i,(root,col,e) in enumerate(k.roots):root.location.x=i*58
scene.name='Terraformer 3000 / Stålheart / D0–D3'
world=scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.18,.23,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
pres=bpy.data.collections.new('PRESENTATION');scene.collection.children.link(pres);k.active_collection=pres;k.active_root=None
box('Presentation ground',(0,0,-.2),(110,100,.3),'dark')
# A 1.8 m suited maintenance worker provides an explicit scale reference.
h=empty('SCALE_WORKER_1.8m',(-9,-12,0));box('Worker torso',(0,0,1.16),(.46,.28,.58),'yellow',parent=h)
cylinder('Worker helmet',(0,0,1.65),.2,.3,'white',parent=h)
box('Worker visor',(0,-.19,1.67),(.29,.08,.13),'dark',parent=h)
for x in [-.15,.15]:
    beam('Worker leg',(x,0,.9),(x,0,.15),.09,'armor',h);box('Worker boot',(x,-.07,.09),(.2,.35,.18),'edge',parent=h)
    beam('Worker arm',(x*1.8,0,1.4),(x*2,0,.85),.075,'armor',h)
for layer in range(12):
    z=.06+layer*.13
    pipe('Printed regolith course',[(-7,-5,z),(-7,3,z),(-6,4,z),(7,4,z),(8,3,z),(8,-5,z),(7,-6,z),(3,-6,z)],.085,'concrete')
for name,loc,power,size in [('Key',(-25,-35,50),65000,25),('Rim',(20,18,45),85000,20),('Fill',(30,-20,20),30000,20)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);pres.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,17))-o.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Hero');cam=bpy.data.objects.new('Hero',camdata);pres.objects.link(cam);cam.location=(55,-76,43);cam.rotation_euler=(Vector((0,0,17))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=65;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1400;scene.render.resolution_y=1400;scene.render.resolution_percentage=100
for root,col,e in k.roots[1:]:col.hide_render=True
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_location=(0,0,17);area.spaces.active.region_3d.view_distance=65;area.spaces.active.clip_end=1000;area.spaces.active.shading.color_type='MATERIAL';area.spaces.active.overlay.show_relationship_lines=False;area.spaces.active.overlay.show_extras=False;area.spaces.active.region_3d.view_rotation=cam.rotation_euler.to_quaternion()
bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-terraformer.blend'))
scene.render.filepath=str(OUT/'stalheart-preview.png');bpy.ops.render.render(write_still=True)
print('STALHEART_COMPLETE',flush=True)
