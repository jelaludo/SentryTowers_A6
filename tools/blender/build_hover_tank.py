"""A6 MÖRK / heavy hover tank. Four states, independent NLA operating clips."""
import sys,math,json,struct,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from hover_tank_callouts import export_callouts
from asset_common import bpy,Vector,box,cylinder,beam,empty,text
from mathutils import Matrix
OUT=k.PROJECT/'assets/hover-tank';OUT.mkdir(parents=True,exist_ok=True)
k.M['hull']=k.material('Mork armor / midnight petrol',(.055,.105,.12),.65,.38)
k.M['plate']=k.material('Mork edge armor / slate',(.19,.28,.29),.6,.4)
k.M['cyan']=k.material('Lift field / cyan',(.015,.72,1),.25,.22,4)
k.M['ammo']=k.material('Ammunition ready / amber',(.98,.48,.045),.25,.3,2)
k.M['glass']=k.material('Optics / black glass',(.015,.045,.055),.6,.18)

def hull_roof(y):
    return 1.55-.45*max(0,(-y-1.8)/2.65)-.16*max(0,(y-2)/1.65)

def pod_roof(y):
    return 1.20-.35*max(0,(-y-2.4)/1.75)-.22*max(0,(y-2)/1.55)

def pod_width(y):
    stations=[(-4.15,.28),(-3.05,.84),(-1.9,.94),(2.3,.9),(3.55,.32)]
    for (a,wa),(b,wb) in zip(stations,stations[1:]):
        if a<=y<=b:return wa+(wb-wa)*(y-a)/(b-a)
    return .28 if y<0 else .32

def pod_side(y,z):
    return pod_width(y)*(1-.17*max(0,min(1,(z-.3)/(pod_roof(y)-.3))))

def surface_plate(name,outline,height,parent,mat='plate'):
    if name=='Tapered nacelle shield':outline=[(x*min(1,pod_width(y)*.83*.9/.66),y) for x,y in outline]
    n=len(outline);verts=[(x,y,height(y)+dz) for dz in [0,.045] for x,y in outline]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);k.active_collection.objects.link(o);o.parent=parent;mesh.materials.append(k.M[mat]);return k.finish(o,.015)

def reshape(o,deform,stop=()):
    # Bake the new proportions into geometry while keeping articulation axes orthogonal.
    rotation_scale=o.matrix_basis.to_3x3().copy()
    o.location=deform@o.location
    if o in stop:return
    local=rotation_scale.inverted()@deform@rotation_scale
    if o.type=='MESH':o.data.transform(local.to_4x4())
    elif o.type=='FONT':o.scale=Vector((o.scale.x*deform[0][0],o.scale.y*deform[1][1],o.scale.z*deform[2][2]))
    for child in list(o.children):reshape(child,local,stop)

def hull(name,outline,z0,z1,mat='hull',parent=None,inset=.9):
    n=len(outline);v=[(x,y,z0) for x,y in outline]+[(x*inset,y if name in ['Low armored main hull','Armored hover nacelle'] else y*inset,(hull_roof(y) if name=='Low armored main hull' else pod_roof(y) if name=='Armored hover nacelle' else z1)) for x,y in outline]
    f=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(v,[],f);mesh.update();o=bpy.data.objects.new(name,mesh);k.active_collection.objects.link(o);o.parent=parent or k.active_root;mesh.materials.append(k.M[mat]);return k.finish(o,.045)

def ring(name,loc,r1,r2,depth,mat='edge',parent=None,axis='Z',n=20):
    vs=[];fs=[]
    for z,r in [(-depth/2,r1),(depth/2,r1),(-depth/2,r2),(depth/2,r2)]:
        for j in range(n):a=j*math.tau/n;vs.append((r*math.cos(a),r*math.sin(a),z))
    for j in range(n):
        q=(j+1)%n;fs += [(j,q,q+n,j+n),(j+n,q+n,q+3*n,j+3*n),(j+2*n,j+3*n,q+3*n,q+2*n),(j,j+2*n,q+2*n,q)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.update();o=bpy.data.objects.new(name,mesh);k.active_collection.objects.link(o);o.parent=parent or k.active_root;mesh.materials.append(k.M[mat]);o.location=loc
    if axis=='Y':o.rotation_euler.x=math.pi/2
    return o

def pipe(name,points,r=.035,mat='dark',parent=None):
    for a,b in zip(points,points[1:]):beam(name,a,b,r,mat,parent)

def anim(o,clip,spec):
    o.animation_data_create()
    for track in o.animation_data.nla_tracks:track.mute=True
    o.animation_data.action=bpy.data.actions.new(k.active_root['asset_id']+'_'+clip+'_'+o.name)
    for prop,keys in spec.items():
        for t,value in keys:setattr(o,prop,value);o.keyframe_insert(data_path=prop,frame=t*30)
    action=o.animation_data.action
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for fc in bag.fcurves:
                    for p in fc.keyframe_points:p.interpolation='LINEAR'
    o.animation_data.action=None;track=o.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,0,action);strip.extrapolation='NOTHING';track.mute=True

clips=[dict(name='Power_On',duration_s=2,loop=False),dict(name='Power_Off',duration_s=1.2,loop=False),dict(name='Fire_Heavy',duration_s=1.4,loop=False),dict(name='Turret_Aim',duration_s=8,loop=True),dict(name='Plasma_Sweep',duration_s=4,loop=True),dict(name='Hover_Idle',duration_s=3,loop=True)]
for state in range(4):
    e=k.begin('mork_hover_tank_d'+str(state),'MÖRK / Heavy hover tank',['Intact','Damaged','Critical','Destroyed'][state],[18,18],'')
    e.update(family='mork_hover_tank',damage_level=state,functional=state<2,animations=[c['name'] for c in clips] if state<2 else [],clips=clips if state<2 else [],shell_capacity=27,ammo_ports=9,shells_per_port=3,hover_lift_m=.55,recoil_travel_m=.82,turret_yaw_deg=[-180,180],turret_elevation_deg=[-5,25],plasma_yaw_deg=[-12,12],collision_quality='blockout')
    hover=empty('HOVER_RIG');hover['powered_height_m']=.55
    body=empty('HULL_SUSPENSION',parent=hover)
    # Extremely broad, low glacis with a narrow turret above it.
    outline=[(-1.15,-4.45),(1.15,-4.45),(1.95,-3.4),(2.35,-1.8),(2.28,2.3),(1.65,3.65),(-1.65,3.65),(-2.28,2.3),(-2.35,-1.8),(-1.95,-3.4)]
    hull('Low armored main hull',outline,.53,1.55,'hull',body,.88)
    hull('Lower blast keel',[(-1.55,-3.65),(1.55,-3.65),(1.95,-2.8),(1.95,2.7),(-1.95,2.7),(-1.95,-2.8)],.34,.68,'edge',body,.98)
    # Broad overlapping glacis panels make the body read as armored mass.
    for sign in [-1,1]:
        panel=[(sign*x,y) for x,y in [(.18,-3.98),(.92,-3.98),(1.63,-3.12),(1.76,-1.32),(.25,-1.32)]]
        if sign<0:panel.reverse()
        surface_plate('Swept glacis armor',panel,lambda y:hull_roof(y)+.025,body)
        for y in [-3.4,-2.5]:cylinder('Glacis captive bolt',(sign*.8,y,hull_roof(y)+.10),.055,.035,'edge',parent=body)
        pipe('Glacis cyan seam',[(sign*.96,-3.88,hull_roof(-3.88)+.09),(sign*1.58,-3.1,hull_roof(-3.1)+.09),(sign*1.7,-1.5,hull_roof(-1.5)+.09)],.013,'cyan' if state<2 else 'dark',body)
    box('Forward sensor brow',(0,-4.45,.9),(1.1,.18,.18),'edge',parent=body)
    for x in [-.3,.3]:cylinder('Forward ranging lens',(x,-4.57,.9),.10,.06,'cyan' if state<2 else 'glass','Y',body,16)
    for x in [-1.15,1.15]:
        box('Engine heat exchanger',(x,2.4,1.53),(1.3,1.65,.1),'edge',parent=body)
        for j in range(10):box('Engine cooling louver',(x,1.7+j*.15,1.61),(1.18,.075,.06),'frame',parent=body)
    # Twin hydraulic nacelles with four open lift cups each; no wheels or tracks.
    emitters=[]
    for sign in [-1,1]:
        label='L' if sign<0 else 'R';pod=empty('NACELLE_'+label,(sign*2.62,0,0),hover)
        if state==3 and sign==1:pod.location=(4.5,.7,0);pod.rotation_euler.z=.3
        hull('Armored hover nacelle',[(-.28,-4.15),(.28,-4.15),(.84,-3.05),(.94,-1.9),(.9,2.3),(.32,3.55),(-.32,3.55),(-.9,2.3),(-.94,-1.9),(-.84,-3.05)],.3,1.35,'hull',pod,.83)
        for xx in [-.82,.82]:box('Ground contact skid',(xx,0,.105),(.12,5.4,.21),'edge',parent=pod)
        for y in [-2.7,-.9,.9,2.7]:
            ring('Recessed lift nozzle',(sign*.18,y,.285),.58,.44,.21,'frame',pod)
            disk=empty('LIFT_EMITTER_'+label+'_'+str(len(emitters)),(sign*.18,y,.164),pod)
            cylinder('Cyan lift field',(0,0,0),.435,.035,'cyan',parent=disk,vertices=24);emitters.append(disk)
            # Outboard slots let the cyan field read from normal low camera angles.
            box('Lift vent recess',(sign*(pod_side(y,.58)+.025),y,.58),(.045,.92,.3),'dark',parent=pod)
            box('Lift field edge window',(sign*(pod_side(y,.58)+.052-.18),0,.416),(.02,.76,.11),'cyan' if state<2 else 'dark',parent=disk)
            surface_plate('Tapered nacelle shield',[(-.42,y-.61),(.42,y-.61),(.66,y-.28),(.58,y+.45),(.35,y+.61),(-.35,y+.61),(-.58,y+.45),(-.66,y-.28)],lambda yy:pod_roof(yy)+.02,pod)
        for y in [-3.1,3.1]:box('Nacelle hazard band',(sign*(pod_side(y,.97)+.025),y,.97),(.04,.55,.13),'yellow',parent=pod)
    # Compact rear-deck magazine: nine single lenses, four color states per lens.
    box('Rear deck magazine bezel',(0,2.78,1.55),(1.9,1.65,.14),'edge',parent=body)
    for port in range(9):
        row,col=divmod(port,3);x=(col-1)*.57;y=2.23+row*.55
        slot=empty('AMMO_PORT_%02d'%port,(x,y,1.66),body);slot['shell_capacity']=3
        ring('Magazine lens surround',(0,0,0),.205,.155,.09,'frame',slot,'Z',16)
        lamp=empty('AMMO_PORT_LIGHT_%02d'%port,parent=slot)
        lamp['remaining_shells']=3 if state<2 else 0
        lamp['color_states']='3: cyan; 2: amber; 1: red; 0: black'
        cylinder('Magazine status lens',(0,0,.015),.15,.07,'cyan' if state<2 else 'glass',parent=lamp,vertices=16)
    for x in [-1.28,1.28]:
        ring('Rear towing eye',(x,3.55,.65),.15,.09,.12,'frame',body,'Y',16)
        box('Rear running lamp',(x,3.4,1.26),(.24,.05,.08),'fault',parent=body)
    # Main ring is above the two front plasma mounts through the whole elevation envelope.
    yaw=empty('TURRET_YAW',(0,.35,1.66),body);yaw['axis']='Y in GLB';yaw['yaw_limits_deg']=[-180,180]
    cylinder('Turret azimuth bearing',(0,0,.04),1.12,.22,'edge',parent=yaw,vertices=32)
    if state<3:
        hull('Lean turret wedge',[(-.52,-1.65),(.52,-1.65),(1.12,-.72),(1.32,.35),(.72,1.65),(-.72,1.65),(-1.32,.35),(-1.12,-.72)],.16,.83,'hull',yaw,.79)
        for x in [-.9,.9]:box('Turret cheek armor',(x,-.1,.7),(.34,1.5,.22),'plate',parent=yaw,rot=(0,math.copysign(.18,x),0))
        cylinder('Commander flush hatch',(0,.6,.9),.5,.09,'frame',parent=yaw,vertices=16)
        box('Turret optical slit',(.5,-.66,.91),(.48,.35,.11),'glass',parent=yaw)
        box('Turret rangefinder',(.5,-.85,.91),(.35,.025,.07),'cyan' if state<2 else 'dark',parent=yaw)
        beam('Whip antenna',(-.7,1.05,.85),(-.78,1.25,1.65),.025,'edge',yaw)
        pitch=empty('GUN_PITCH',(0,-.65,.84),yaw);pitch['elevation_limits_deg']=[-5,25]
        cylinder('Gun trunnion',(0,0,0),.34,1.18,'frame','X',pitch,20)
        recoil=empty('GUN_RECOIL',parent=pitch);recoil['recoil_travel_m']=.82
        box('Armored cannon breech',(0,-.3,0),(.59,1.65,.46),'plate',parent=recoil)
        length=6.6 if state<2 else 2.0
        cylinder('Long cannon barrel',(0,-1.0-length/2,0),.15,length,'frame','Y',recoil,24)
        for y in [-1.2,-2,-2.8] if state<2 else [-1.2,-2]:cylinder('Barrel stiffener',(0,y,0),.21,.25,'edge','Y',recoil,20)
        ring('Open cannon muzzle',(0,-1-length,0),.26,.15,.42,'edge',recoil,'Y',24)
        for x in [-.29,.29]:box('Muzzle brake vane',(x,-1-length,.03),(.08,.5,.22),'plate',parent=recoil)
        empty('MUZZLE_00',(0,-1.25-length,0),recoil)
        txt=text('Tank designation','MÖRK / 09',(0,1.45,.51),.19,'white',yaw);txt.rotation_euler.z=math.pi
    else:
        fallen=empty('FALLEN_TURRET',(0,-.8,1.05),body);fallen.rotation_euler=(.25,.18,.6)
        hull('Detached turret armor',[(-1,-1),(1,-1),(1.2,.5),(.7,1.4),(-.7,1.4),(-1.2,.5)],0,.6,'hull',fallen,.8)
        cylinder('Sheared cannon',(0,-1.9,.3),.15,2.5,'frame','Y',fallen,16)
        ring('Broken turret race',(0,0,.23),1.25,.95,.13,'rust',yaw,n=24)
    plasma=[]
    for sign in [-1,1]:
        side='L' if sign<0 else 'R';mount=empty('PLASMA_YAW_'+side,(sign*2.08,-3.48,1.06),body);mount['yaw_limits_deg']=[-12,12];plasma.append(mount)
        cylinder('Plasma lateral bearing',(0,0,-.03),.32,.22,'edge',parent=mount,vertices=20)
        box('Low plasma projector',(0,-.45,.11),(.57,1.04,.42),'plate',parent=mount)
        for x in [-.2,.2]:cylinder('Plasma pressure cartridge',(x,.1,.13),.095,.48,'frame','Y',mount,12)
        ring('Plasma open throat',(0,-1.03,.1),.25,.17,.38,'edge',mount,'Y',20)
        cylinder('Plasma ignition core',(0,-.97,.1),.15,.035,'cyan' if state<2 else 'dark','Y',mount,16)
        for x in [-.24,.24]:box('Plasma heat shield',(x,-.76,.1),(.08,.9,.38),'hull',parent=mount)
        empty('PLASMA_MUZZLE_'+side,(0,-1.26,.1),mount)
        if state==3:mount.rotation_euler=(.3,0,sign*.65)
    if state:
        rng=random.Random(900+state)
        for j in range(6 if state==1 else 16):
            x=rng.uniform(-1.7,1.7);y=rng.uniform(-3,2.8);box('Armor impact gouge',(x,y,1.56),(.25+rng.random()*.35,.07,.03),'dark',parent=body,rot=(0,0,rng.random()*3))
        if state==2:
            ring('Scorched hull penetration',(-.8,-2.3,1.58),.43,.3,.05,'rust',body,n=16)
            pipe('Severed turret service line',[(1,.8,1.8),(1.7,1.1,1.5),(2.1,1.4,1.1)],.04,'dark',body)
        if state==3:
            for j in range(14):box('Detached armor fragment',(rng.uniform(-3.7,3.7),rng.uniform(-4.2,3.8),.13),(.3+rng.random()*.4,.35,.14),'plate',rot=(.05,.1,rng.random()*6))
    # Longer, narrower running body; resize turret separately so yaw stays circular.
    body_shape=Matrix.Diagonal(Vector((.82,1.27,1.0)))
    for child in list(hover.children):reshape(child,body_shape,(yaw,*plasma))
    yaw.location.y=.05
    turret_shape=Matrix.Diagonal(Vector((.84,1.3,.82)))
    bearing=next(o for o in yaw.children if o.name.startswith('Turret azimuth bearing'))
    for child in list(yaw.children):reshape(child,turret_shape,((pitch,bearing) if state<3 else (bearing,)))
    if state<3:pitch.location.z=.84
    if state<2:
        anim(hover,'Power_On',{'location':[(0,(0,0,0)),(.3,(0,0,0)),(.8,(0,0,.23)),(1.35,(0,0,.60)),(2,(0,0,.55))]})
        anim(hover,'Power_Off',{'location':[(0,(0,0,.55)),(.35,(0,0,.52)),(.6,(0,0,.16)),(.7,(0,0,0)),(.79,(0,0,.035)),(1.2,(0,0,0))]})
        anim(body,'Power_Off',{'location':[(0,(0,0,0)),(.6,(0,0,0)),(.7,(0,0,-.10)),(.82,(0,0,.025)),(1.2,(0,0,0))]})
        anim(hover,'Hover_Idle',{'location':[(i/10,(0,0,.55+.012*math.sin(i/30*math.tau))) for i in range(31)]})
        anim(recoil,'Fire_Heavy',{'location':[(0,(0,0,0)),(.067,(0,.82,0)),(.18,(0,.78,0)),(.45,(0,.48,0)),(1.15,(0,0,0)),(1.4,(0,0,0))]})
        anim(body,'Fire_Heavy',{'location':[(0,(0,0,0)),(.067,(0,.08,-.075)),(.2,(0,.025,-.03)),(.42,(0,-.01,.018)),(1.4,(0,0,0))],'rotation_euler':[(0,(0,0,0)),(.067,(.018,0,0)),(.3,(-.006,0,0)),(1.4,(0,0,0))]})
        anim(yaw,'Turret_Aim',{'rotation_euler':[(0,(0,0,0)),(2,(0,0,math.radians(75))),(5,(0,0,math.radians(-75))),(8,(0,0,0))]})
        anim(pitch,'Turret_Aim',{'rotation_euler':[(0,(0,0,0)),(2,(math.radians(-25),0,0)),(5,(math.radians(5),0,0)),(8,(0,0,0))]})
        for sign,o in zip([-1,1],plasma):anim(o,'Plasma_Sweep',{'rotation_euler':[(0,(0,0,0)),(1,(0,0,sign*math.radians(12))),(3,(0,0,-sign*math.radians(12))),(4,(0,0,0))]})
        for o in emitters:
            anim(o,'Power_On',{'scale':[(0,(.001,.001,.001)),(.25,(.15,.15,1)),(.8,(1,1,1)),(2,(1,1,1))]})
            anim(o,'Power_Off',{'scale':[(0,(1,1,1)),(.4,(.65,.65,1)),(.65,(.001,.001,.001)),(1.2,(.001,.001,.001))]})
    # Set an explicit grounded rest pose; NLA tracks carry all powered positions.
    hover.location=(0,0,0);body.location=(0,0,0);body.rotation_euler=(0,0,0);yaw.rotation_euler=(0,0,0)
    if state<3:pitch.rotation_euler=(0,0,0);recoil.location=(0,0,0)
    for o in plasma:
        if state<3:o.rotation_euler=(0,0,0)
    for o in emitters:o.scale=(.001,.001,.001)
    e['description']=['Lean, elongated hover tank: long recoiling cannon, lean traversing turret, two low front plasma projectors, streamlined nacelles, cyan lift fields and nine rear-deck ammunition lenses with four color states each.','Operational damage with gouged armor. All weapons, lift/settle clips and the 27-shell magazine display remain usable.','Disabled critical state: shortened damaged cannon, scorched hull penetration and severed service line. Emitters and ammunition display are dark.','Destroyed state: fallen turret, sheared cannon, detached right nacelle, damaged plasma mounts and scattered armor.'][state]
    k.collider(e,'hull',[0,1.1,.5],[6.1,2.2,10.6]);k.socket(e,'SERVICE','service',[0,.8,-4.7],[0,0,-1],state<2)
    print('AUTHORED MORK D'+str(state),flush=True)

scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=240
for root,col,e in k.roots:
    # Convert lettering before estimating the rendered triangle budget.
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(col.objects):
        if o.type=='FONT':o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');o.select_set(False)
    meshes=[o for o in col.objects if o.type=='MESH']
    triangles=sum(len(o.data.polygons) for o in meshes)
    for o in meshes:o.data.calc_loop_triangles()
    count=sum(len(o.data.loop_triangles) for o in meshes)
    if count>40500:
        ratio=39500/count
        for o in meshes:
            m=o.modifiers.new('Game mesh reduction','DECIMATE');m.ratio=ratio;m.use_collapse_triangulate=True
        dg=bpy.context.evaluated_depsgraph_get();replacements=[(o,bpy.data.meshes.new_from_object(o.evaluated_get(dg),preserve_all_data_layers=True,depsgraph=dg)) for o in meshes]
        for o,mesh in replacements:o.modifiers.clear();o.data=mesh
    for o in col.objects:
        if o.animation_data:
            for track in o.animation_data.nla_tracks:track.mute=False
    scene.frame_set(0);bpy.context.view_layer.update()
    export_callouts(col,OUT/(e['id']+'-callouts.json'))
    bpy.ops.object.select_all(action='DESELECT')
    for o in col.objects:o.select_set(True)
    bpy.context.view_layer.objects.active=root;path=OUT/e['file']
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=bool(e['animations']),export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_cameras=False,export_lights=False)
    data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n])
    for node in doc.get('nodes',[]):
        if node.get('extras',{}).get('asset_id'):node['name']='ROOT'
        if node.get('name','').startswith(('HOVER_RIG','HULL_SUSPENSION','NACELLE_','LIFT_EMITTER_','AMMO_PORT_','AMMO_ROUND_','TURRET_YAW','GUN_PITCH','GUN_RECOIL','MUZZLE_','PLASMA_','FALLEN_','SOCKET_')):node['name']=node['name'].split('.')[0]
    payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4);chunks=data[20+n:];path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(payload)+len(chunks))+struct.pack('<II',len(payload),0x4e4f534a)+payload+chunks)
    e['bytes']=path.stat().st_size;e['triangles']=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives'])
    e['exported_clips']=[a['name'] for a in doc.get('animations',[])];print('EXPORTED',e['id'],e['triangles'],e['exported_clips'],flush=True)
    for o in col.objects:
        if o.animation_data:
            for track in o.animation_data.nla_tracks:track.mute=track.name!='Hover_Idle'
    # Full fields in the Blender hero pose; exported rest remains powered off.
    for o in col.objects:
        if o.name.startswith('LIFT_EMITTER_'):o.scale=(1,1,1) if e['damage_level']<2 else (.001,.001,.001)
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
for i,(root,col,e) in enumerate(k.roots):root.location.x=i*18
scene.name='MÖRK / Heavy hover tank / D0–D3';scene.frame_set(0)
pres=bpy.data.collections.new('PRESENTATION');scene.collection.children.link(pres);k.active_collection=pres;k.active_root=None
box('Presentation ground',(0,0,-.10),(80,80,.18),'dark')
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.16,.21,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,loc,power,size,color in [('Key',(-9,-12,15),4500,9,(1,.88,.72)),('Rim',(8,7,12),6000,8,(.5,.78,1)),('Fill',(8,-8,5),2200,6,(.5,.95,1))]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);pres.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
for x in [-2.15,2.15]:
    d=bpy.data.lights.new('Lift spill','AREA');d.energy=90;d.color=(.02,.65,1);d.size=3;o=bpy.data.objects.new('Lift spill',d);pres.objects.link(o);o.location=(x,0,.42)
d=bpy.data.cameras.new('Hero');cam=bpy.data.objects.new('Hero',d);pres.objects.link(cam);cam.location=(12,-19,9);cam.rotation_euler=(Vector((0,-.8,1.2))-cam.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=16;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=1500;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
for root,col,e in k.roots[1:]:col.hide_render=True
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active;sp.region_3d.view_location=(0,0,1);sp.region_3d.view_distance=16;sp.region_3d.view_rotation=cam.rotation_euler.to_quaternion();sp.shading.color_type='MATERIAL';sp.overlay.show_relationship_lines=False;sp.overlay.show_extras=False
bpy.ops.object.select_all(action='DESELECT');bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-hover-tank.blend'))
scene.render.filepath=str(OUT/'mork-preview.png');bpy.ops.render.render(write_still=True)
print('MORK_COMPLETE',flush=True)
