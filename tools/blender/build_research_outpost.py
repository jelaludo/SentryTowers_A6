"""Build 12 modular alien research base assets, each with D0–D3 geometry.
Run with Blender --background --python-exit-code 1 --python this_file.py.
"""
import sys, math, json, random, struct
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy, bmesh, Vector, box, cylinder, beam, text, empty, socket, collider
OUT=k.PROJECT/'assets/research-outpost';OUT.mkdir(exist_ok=True)
for key,color in {'blue':(.10,.47,.9),'teal':(.05,.75,.62),'violet':(.58,.22,.85),'orange':(.95,.33,.055),'glass':(.025,.16,.21),'alien':(.46,.82,.12)}.items():
    k.M[key]=k.material(key,color,.45,.34,1.1 if key in ['blue','teal','violet','alien'] else 0)
STATES=['Intact','Damaged','Critical','Destroyed']
SPECS=[
 ('command_operations','Survey command nexus',[12,12],'command','blue'),
 ('personnel_barracks','Pressure-sealed barracks',[16,12],'personnel','blue'),
 ('personnel_infirmary','Isolation infirmary',[16,12],'medical','teal'),
 ('research_xenobiology','Xenobiology containment lab',[16,12],'research','alien'),
 ('utility_reactor','Toroidal field reactor',[16,16],'utilities','violet'),
 ('command_comms','Deep-space relay',[8,8],'command','blue'),
 ('air_launchpad','Orbital lander pad',[32,32],'flight','orange'),
 ('industry_garage','Pressurized rover garage',[20,16],'industry','yellow'),
 ('logistics_container','Armored expedition container',[12,4],'logistics','yellow'),
 ('research_specimen_crate','Cryogenic specimen vault',[4,4],'research','alien'),
 ('road_straight','Guided transit road',[8,8],'site','white'),
 ('utility_conduit','Service conduit spine',[4,4],'utilities','violet'),
]

def plate(name,loc,size,mat='armor',**kw):return box(name,loc,size,mat,.05,**kw)
def torus(name,loc,major,minor,mat='frame',rot=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,location=loc,major_radius=major,minor_radius=minor)
    o=k.register(bpy.context.object,name,mat);o.rotation_euler=rot;return o

def slab(w,d):
    plate('Foundation',(0,0,-.16),(w,d,.32),'frame')
    for x in [-w/2+.35,w/2-.35]:
        for y in [-d/2+.35,d/2-.35]:plate('Corner locator',(x,y,.018),(.35,.35,.035),'yellow')

def damage(state,w,d,seed):
    rng=random.Random(seed)
    if not state:return
    for i in range(3+state*3):
        x=rng.uniform(-w*.4,w*.4);y=rng.uniform(-d*.4,d*.4)
        plate('Scorched impact',(x,y,.025),(.25+rng.random(),.08,.025),'dark',rot=(0,0,rng.random()*6))
    if state>=2:
        for i in range(8 if state==2 else 18):
            x=rng.uniform(-w*.40,w*.40);y=rng.uniform(-d*.40,d*.40)
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1)
            o=k.register(bpy.context.object,'Bounded fractured debris','raw' if i%3==0 else 'armor');o.location=(x,y,.12);o.scale=(rng.uniform(.12,.45),rng.uniform(.1,.4),rng.uniform(.09,.22));o.rotation_euler[2]=rng.random()*6

def shell(state,w,d,accent,title,height=3.6):
    slab(w,d)
    # Each bay is a separate replaceable panel; critical state exposes the interior.
    for side in [-1,1]:
        for j in range(4):
            y=-d*.36+j*d*.24
            if state==3 and j>0:continue
            if state==2 and side==1 and j<3:continue
            h=height if state<3 else .65+.25*(j%2)
            plate('Side pressure panel',(side*(w/2-.4),y,h/2),(.22,d*.225,h),'armor')
            plate('External armor rib',(side*(w/2-.57),y,h/2),(.25,.18,h+.08),'frame')
            if state<2 or side==-1 and state==2:
                plate('Observation glass',(side*(w/2-.265),y,2.15),(.045,d*.16,.7),'glass')
    for side in [-1,1]:
        if state==3 and side==-1:continue
        h=height if state<3 else .9
        for x in [-w*.31,w*.31]:plate('End bulkhead',(x,side*(d/2-.4),h/2),(w*.34,.22,h),'armor')
        if state<3:plate('Door header',(0,side*(d/2-.4),height-.35),(w*.28,.35,.7),'frame')
        if state<2:plate('Sealed airlock',(0,side*(d/2-.43),1.35),(2,.18,2.7),'edge')
    if state<3:
        for i in range(4):
            if state==2 and i<2:continue
            plate('Removable roof segment',(-w*.36+i*w*.24,0,height+.1),(w*.235,d-.45,.25),'frame')
        plate('Zone identity stripe',(0,-d/2+.25,height-.35),(w*.68,.08,.13),accent if state==0 else 'fault')
        text('Facility stencil',title,(0,-d/2+.18,height-.75),.28)
        for x in [-w*.3,w*.3]:
            if state==2:continue
            plate('Roof heat exchanger',(x,d*.2,height+.42),(1.2,1.8,.45),'edge')
            for j in range(6):plate('Cooling louver',(x,d*.2-.7+j*.28,height+.66),(1.05,.07,.06),'armor')
    if state==1:
        for x in [-w*.30,w*.29]:
            plate('Facade impact scar',(x,-d/2+.27,1.5),(.65,.04,.12),'dark',rot=(0,.4,0))
    if state>=2:
        for x in [-w*.3,w*.3]:beam('Exposed pressure frame',(x,-d*.3,.3),(x+.25,-d*.2,1.8 if state==2 else .85),.055,'rust')

def building(entry,state,kind,w,d,accent):
    bw=w-3;bd=d-3;h=4.6 if kind=='industry_garage' else 3.6
    shell(state,bw,bd,accent,entry['name'].upper(),h)
    if state<3:
        if kind=='personnel_barracks':
            for x in [-3,3]:
                for y in [-1.8,1.8]:
                    for z in [.65,1.7]:plate('Crew bunk',(x,y,z),(2.4,.95,.18),'edge');plate('Sleeping pad',(x,y,z+.14),(2.1,.8,.12),'blue')
        elif kind=='personnel_infirmary':
            for x in [-3,3]:
                plate('Isolation bed base',(x,0,.55),(1,2.4,.7),'frame');plate('Patient capsule',(x,0,1),(1.25,2.6,.2),'white')
                cylinder('Air sterilizer',(x,2.6,1.3),.4,2.6,'teal')
            plate('Medical cross vertical',(-3,-bd/2+.25,2.3),(.2,.06,.8),'teal');plate('Medical cross horizontal',(-3,-bd/2+.21,2.3),(.8,.07,.2),'teal')
        elif kind=='research_xenobiology':
            for x in [-3,0,3]:
                cylinder('Containment pedestal',(x,.8,.4),.8,.8,'edge')
                if state<2 or x<0:
                    cylinder('Opaque pressure vessel',(x,.8,1.6),.66,1.7,'glass',vertices=16)
                    for z in [.8,2.4]:torus('Containment clamp',(x,.8,z),.67,.09,'frame')
                    for a in [0,2.094,4.188]:beam('Status spine',(x+.69*math.cos(a),.8+.69*math.sin(a),1),(x+.69*math.cos(a),.8+.69*math.sin(a),2.2),.035,'alien')
                else:cylinder('Exposed alien sample',(x,.8,1),.25,.6,'alien',vertices=5)
            if state<2:cylinder('Roof quarantine scrubber',(3,0,h+.9),.85,1.5,'frame')
        elif kind=='command_operations':
            cylinder('Tactical console',(0,0,.7),1.5,1.1,'edge',vertices=8)
            cylinder('Map display',(0,0,1.27),1.35,.035,'blue',vertices=8)
            if state<2:
                cylinder('Observation crown',(0,.5,h+.7),2,1.1,'glass',vertices=8)
                cylinder('Crown armor',(0,.5,h+1.35),2.2,.22,'frame',vertices=8)
                beam('Command antenna',(0,.5,h+1.5),(0,.5,h+3),.07,'frame')
        else:
            for x in [-3,3]:plate('Vehicle service rail',(x,0,.14),(.3,bd*.7,.28),'yellow')
            if state<2:
                for x in [-4,4]:plate('Gantry upright',(x,0,2),(.3,.3,4),'frame')
                plate('Service gantry',(0,0,4),(8.4,.45,.4),'yellow')
                cylinder('Suspended service winch',(0,0,3.5),.4,.6,'edge')
    socket(entry,'WALK_FRONT','walk',[0,0,d/2],[0,0,1],state<2,2)
    socket(entry,'POWER_REAR','power',[0,0,-d/2],[0,0,-1],state<2)
    # Conservative collision proxies intentionally do not promise enterable interiors.
    collider(entry,'structure',[0,(h if state<3 else 1)/2,0],[bw,h if state<3 else 1,bd])
    if kind=='industry_garage':socket(entry,'ROAD_REAR','road',[0,0,-d/2],[0,0,-1],False,8)
    entry['clearance'].append(dict(kind='walk',center_m=[0,1.2,d/2-.75],size_m=[2,2.4,1.5],condition='approach_only'))

def machine(entry,state,kind,w,d,accent):
    if kind=='utility_reactor':
        slab(10,10)
        cylinder('Reactor plinth',(0,0,.4),3.6,.8,'frame',vertices=16)
        if state<3:
            cylinder('Central field column',(0,0,2),.85,3.1,'violet' if state==0 else 'dark')
            for z in [1.1,3.2]:torus('Field containment toroid',(0,0,z),2.3,.38,'frame')
            for i in range(8):
                if state==2 and i<3:continue
                a=i*math.pi/4;x=2.5*math.cos(a);y=2.5*math.sin(a)
                plate('Containment fin',(x,y,2.1),(.55,1,3.5),'armor',rot=(0,0,a))
                beam('Field indicator',(x*.96,y*.96,1.2),(x*.96,y*.96,2.8),.06,accent if state==0 else 'fault')
            for x in [-4,4]:cylinder('Coolant reservoir',(x,0,1.2),.65,2.4,'edge')
        else:
            torus('Collapsed containment ring',(0,0,.9),2.3,.38,'frame',(.18,.25,0));cylinder('Inert reactor core',(0,0,.65),.85,.7,'dark')
        collider(entry,'reactor',[0,2 if state<3 else .9,0],[10,4 if state<3 else 1.8,10])
        socket(entry,'POWER','power',[0,0,d/2],[0,0,1],state<2)
    elif kind=='command_comms':
        slab(5,5)
        cylinder('Azimuth pedestal',(0,0,.6),1.3,1.2,'frame')
        if state<3:
            beam('Relay mast',(0,0,.9),(0,0,4.3 if state<2 else 2.6),.23,'frame')
            for x in [-1,1]:beam('Mast stabilizer',(x*1.6,0,.2),(0,0,2.5),.08,'edge')
            # Faceted receiving dish with recessed center and radial ribs.
            if state<2:
                group=empty('DISH_TILT',(0,0,4.3));group.rotation_euler=(.55,0,0)
                cylinder('Dish reflector',(0,0,0),2,.16,'armor',parent=group,vertices=24)
                cylinder('Receiver recess',(0,0,.12),1.65,.06,'dark',parent=group,vertices=24)
                for i in range(8):
                    a=i*math.pi/4;beam('Dish rib',(.2*math.cos(a),.2*math.sin(a),.2),(1.9*math.cos(a),1.9*math.sin(a),.12),.035,'frame',group)
                beam('Feed horn',(0,0,.2),(0,0,1.1),.065,'edge',group)
        else:beam('Fallen mast',(-1.5,-1,.35),(1.5,1,.55),.23,'frame')
        collider(entry,'relay',[0,3 if state<2 else 1.4,0],[5,6 if state<2 else 2.8,5]);socket(entry,'DATA','data',[0,0,d/2],[0,0,1],state<2)
    elif kind=='air_launchpad':
        # Separable surface wedges create an actual missing landing surface in D2/D3.
        for i in range(8):
            if state==2 and i in [0,1] or state==3 and i not in [3,4,6]:continue
            a=i*math.pi/4
            o=cylinder('Landing deck segment',(0,0,-.17),12,.3,'frame',vertices=8) if i==3 else None
            if o and state>=2:bpy.data.objects.remove(o,do_unlink=True)
            x=8*math.cos(a);y=8*math.sin(a)
            plate('Landing armor petal',(x,y,.08),(6,5,.16),'armor',rot=(0,0,a))
            if state<3:
                plate('Guidance chevron',(x,y,.18),(2,.17,.03),'orange',rot=(0,0,a))
                cylinder('Perimeter beacon',(12.5*math.cos(a),12.5*math.sin(a),.25),.18,.5,'orange' if state==0 else 'dark')
        if state<2:
            torus('Touchdown target',(0,0,.02),4.2,.055,'white')
            for x in [-1.5,1.5]:plate('Landing H upright',(x,0,.025),(.22,3,.025),'white')
            plate('Landing H crossbar',(0,0,.025),(3,.22,.025),'white')
        collider(entry,'deck',[0,-.12,0],[24,.3,24])
        socket(entry,'ROAD','road',[0,0,d/2],[0,0,1],state<2,8)
        entry['clearance'].append(dict(kind='landing',center_m=[0,8,0],size_m=[28,16,28],condition='D0_D1_only'))
    elif kind=='logistics_container':
        shell(state,10,3,'yellow','A6 / EXPEDITION CARGO',2.8)
        if state<3:
            for x in range(-4,5):
                for y in [-1.55,1.55]:plate('Container corrugation',(x,y,1.35),(.12,.08,2.5),'frame')
        collider(entry,'cargo',[0,1.5 if state<3 else .55,0],[10,3 if state<3 else 1.1,3])
        socket(entry,'CARGO','cargo',[0,0,0],[0,1,0],state<2)
    elif kind=='research_specimen_crate':
        slab(2.4,2.4)
        plate('Shock cradle',(0,0,.25),(2,2,.5),'edge')
        if state<3:
            cylinder('Cryogenic vessel',(0,0,1.1),.72,1.3,'glass',vertices=12)
            for z in [.5,1.7]:torus('Pressure collar',(0,0,z),.77,.12,'armor')
            for x in [-.9,.9]:
                for y in [-.9,.9]:plate('Impact guard',(x,y,1.0),(.22,.22,1.7),'frame')
            if state<2:plate('Armored lid',(0,0,1.9),(2,2,.25),'armor')
            else:plate('Dislodged lid',(.4,.3,.4),(1.5,1.4,.15),'armor',rot=(.3,.2,.4))
            plate('Specimen indicator',(0,-1.03,1.1),(.7,.08,.15),'alien' if state==0 else 'fault')
        collider(entry,'vault',[0,1.05 if state<3 else .3,0],[2.4,2.1 if state<3 else .6,2.4]);socket(entry,'CARGO','cargo',[0,0,0],[0,1,0],state<2)
    elif kind=='road_straight':
        for i in range(4):
            for j in range(4):
                if state==2 and i==1 and j in [1,2] or state==3 and (i+j)%3==0:continue
                plate('Road panel',(-3+i*2,-3+j*2,-.09),(1.97,1.97,.18),'frame')
                if i in [0,3] and state<3:plate('Road edge marking',(-3.5 if i==0 else 3.5,-3+j*2,.01),(.12,1.5,.02),'white')
        if state<2:
            for y in [-3,-1,1,3]:plate('Center lane marking',(0,y,.015),(.12,1,.025),'yellow')
        for sign,label in [(-1,'S'),(1,'N')]:socket(entry,label,'road',[0,0,sign*4],[0,0,sign],state<2,8)
        collider(entry,'surface',[0,-.12,0],[8,.24,8])
    else:
        for y in [-1.6,0,1.6]:plate('Duct saddle',(0,y,.15),(1.7,.2,.3),'frame')
        for x in [-.5,0,.5]:
            if state<2:beam('Service pipe',(x,-2,.45),(x,2,.45),.17,'violet' if x==0 and state==0 else 'edge')
            else:
                beam('Severed service pipe',(x,-2,.45),(x,-.7,.55),.17,'edge');beam('Bent pipe',(x,.8,.35),(x+.15,1.9,.55),.17,'rust')
        if state<2:
            for y in [-1,1]:plate('Removable conduit cover',(0,y,.72),(1.6,1.9,.13),'armor')
        collider(entry,'conduit',[0,.45,0],[1.9,.9,4])
        for sign,label in [(-1,'S'),(1,'N')]:socket(entry,label,'utility',[0,0,sign*2],[0,0,sign],state<2,1.6)

if '--repair-source' in sys.argv:
    bpy.ops.wm.open_mainfile(filepath=str(k.SOURCE/'a6-research-outpost.blend'))
    k.manifest=json.loads((OUT/'manifest.json').read_text())['assets'];k.roots=[]
    for entry in k.manifest:
        collection=bpy.data.collections[entry['id']]
        root=next(o for o in collection.objects if o.get('asset_id')==entry['id']);root.location=(0,0,0)
        if entry['damage_level']==2:
            for o in list(collection.objects):
                if o.name.startswith(('Roof heat exchanger','Cooling louver')):bpy.data.objects.remove(o,do_unlink=True)
        k.roots.append((root,collection,entry))
else:
    for index,(id,title,plot,zone,accent) in enumerate(SPECS):
        for state in range(4):
            entry=k.begin(id+'_d'+str(state),title,STATES[state],plot,
                f'{title}. '+['Sealed expedition hardware with district accents and modular connections.','Impact scars and fault indicators; main silhouette retained.','Missing components expose the internal structure; service connections disabled.','Inert footing and bounded wreckage; original function removed.'][state])
            entry.update(family=id,zone=zone,damage_level=state,functional=state<2,collision_quality='conservative blockout; engine integration required',debris_envelope_m=plot,services_available=state<2)
            if index<4 or id=='industry_garage':building(entry,state,id,*plot,accent)
            else:machine(entry,state,id,*plot,accent)
            damage(state,min(plot[0]-1,12),min(plot[1]-1,12),index*10+state)
            # Surface losses must not be advertised as usable road/landing surfaces.
            if id in ['air_launchpad','road_straight'] and state>=2:entry['surface_valid']=False
            print(f'AUTHORED {index*4+state+1}/48 {entry["id"]}',flush=True)

for index,(root,collection,entry) in enumerate(k.roots):
    bpy.ops.object.select_all(action='DESELECT')
    for o in collection.objects:
        o.select_set(True)
        if o.type=='FONT':
            bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
        if o.type=='MESH':
            bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    bpy.context.view_layer.objects.active=root
    path=OUT/entry['file']
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_yup=True,export_cameras=False,export_lights=False)
    data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n])
    for node in doc.get('nodes',[]):
        if node.get('extras',{}).get('asset_id')==entry['id']:node['name']='ROOT'
        if node.get('name','').startswith('SOCKET_'):node['name']=node['name'].split('.')[0]
    blob=data[28+n:];payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
    data=struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob
    path.write_bytes(data)
    entry['triangles']=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives'])
    entry['bytes']=len(data)
    print(f'EXPORTED {index+1}/48 {entry["file"]}',flush=True)
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
# A browsable source gallery: asset families in rows, damage progresses across columns.
for i,(root,collection,entry) in enumerate(k.roots):root.location=((i%4)*38,(i//4)*38,0)
scene=bpy.context.scene;scene.name='A6 / Alien research outpost';scene.world.color=(.18,.18,.18)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=30;area.spaces.active.region_3d.view_location=(0,0,2)
bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-research-outpost.blend'))
print('RESEARCH_OUTPOST_COMPLETE 12 families / 48 exports',flush=True)
