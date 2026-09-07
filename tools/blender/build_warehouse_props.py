"""Warehouse cargo props: crates, secure cases, barrels, containers, pallets and a scene."""
import sys, math, json, struct, random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy, bmesh, Vector, empty, box, cylinder, beam, socket, collider
OUT=k.PROJECT/'assets/warehouse-props'; OUT.mkdir(parents=True,exist_ok=True)
k.M.update({
 'cargo_blue':k.material('Cargo blue',(.045,.19,.28),.5,.42),
 'cargo_green':k.material('Cargo green',(.12,.28,.20),.4,.5),
 'cargo_red':k.material('Hazard red',(.48,.08,.035),.35,.48),
 'label':k.material('Cargo label',(.88,.66,.2),.1,.5),
 'liquid':k.material('Fuel liquid',(.17,.35,.19),.1,.25),
 'glass':k.material('Warehouse skylight glass',(.03,.16,.2),.2,.22),
})
STATES=['Intact','Bent','Crushed','Destroyed']
def b(name,loc,size,mat='armor',parent=None,rot=(0,0,0)):return k.box(name,loc,size,mat,.018,parent,rot)
def band(name,loc,size,mat='label',parent=None,rot=(0,0,0)):return b(name,loc,size,mat,parent,rot)
def crate(e,state,secure=False):
    w=d=1.8; h=1.6 if not secure else 1.9
    root=empty('SECURE_CASE' if secure else 'CARGO_CRATE');root['component']='secure_case' if secure else 'crate';root['impact_states']=STATES
    if state<3:
        z=h/2;b('Crate shell',(0,0,z),(w-.14,d-.14,h-.12),'cargo_blue' if not secure else 'cargo_green',root)
        b('Solid crate lid',(0,0,h+.025),(w,d,.10),'frame',root)
        for x in [-w/2+.12,w/2-.12]:
            for y in [-d/2+.12,d/2-.12]:b('Corner post',(x,y,z),(.18,.18,h),'frame',root)
        for y in [-d/2,d/2]:
            for x in [-.52,0,.52]:b('Lid slat',(x,y,h+.06),(.47,.12,.12),'cargo_green' if secure else 'cargo_blue',root)
        for x in [-w/2,w/2]:
            for z2 in [.28,h-.2]:band('Vertical tie band',(x,0,z2),(.06,d+.06,.09),'label',root)
        band('Identification placard',(0,-d/2-.03,.82),(.85,.03,.3),'label',root)
        k.text('Cargo stencil','A6 / '+('SECURE' if secure else 'PARTS'),(0,-d/2-.06,.78),.11,parent=root)
        if secure:
            b('Reinforced lid',(0,0,h+.14),(w-.14,d-.14,.16),'frame',root);band('Lock bar',(0,-d/2-.09,h+.14),(.9,.08,.12),'cargo_red',root)
        else:
            for x in [-.42,.42]:b('Lid latch',(x,-d/2-.08,h+.1),(.18,.06,.15),'frame',root)
        if state==1:
            b('Runover dent',(w/2+.01,.15,.65),(.08,.7,.58),'dark',root,rot=(0,.28,.15));b('Peeled lid corner',(-.55,-.48,h+.22),(.65,.18,.06),'cargo_blue',root,rot=(0,.2,.12))
        if state==2:
            # The original shell remains as deformed panels and a visible contents mass.
            b('Compressed front panel',(0,-.78,.65),(1.7,.12,1.2),'cargo_blue' if not secure else 'cargo_green',root,rot=(.18,0,.03))
            b('Buckled lid',(0,.08,h-.08),(1.6,1.25,.12),'frame',root,rot=(0,.22,.1));b('Exposed contents',(0,-.05,.55),(.9,.7,.65),'raw',root,rot=(.15,.1,0))
            beam('Torn corner strap',(-.8,-.7,.3),(-.55,-.45,1.3),.035,'rust',root)
    else:
        b('Crushed crate base',(0,.05,.18),(1.6,1.35,.35),'cargo_blue' if not secure else 'cargo_green',root,rot=(.04,.08,.06))
        b('Collapsed lid',(0,-.22,.55),(1.55,.28,.12),'frame',root,rot=(.62,.1,.18));b('Bent side panel',(.64,.18,.55),(.16,1.2,.8),'cargo_blue' if not secure else 'cargo_green',root,rot=(.1,.5,.04))
        for x in [-.55,.55]:beam('Bent original corner post',(x,-.3,.2),(x+.15,-.55,.85),.07,'frame',root)
        b('Spilled contents',(0,.4,.32),(.8,.5,.3),'raw',root,rot=(.1,.3,.2));band('Detached cargo placard',(-.3,-.62,.28),(.6,.025,.22),'label',root,rot=(.25,0,.25))
    socket(e,'CARGO','cargo',[0,0,0],[0,1,0],state<3,1.8);collider(e,'crate',[0,.7 if state<3 else .3,0],[1.9,1.5 if state<3 else .8,2])
    e['description']=('Reinforced secure case' if secure else 'Stackable parts crate')+' with lid, corner posts, tie bands, placard and contents-specific impact deformation.'
def barrel(e,state):
    root=empty('FUEL_BARREL');root['component']='barrel';r=.65;h=1.5
    if state<3:
        cylinder('Barrel body',(0,0,h/2),r,h,'cargo_red',parent=root,vertices=16)
        for z in [.18,h-.18]:
            cylinder('Barrel rim',(0,0,z),r+.05,.13,'frame',parent=root,vertices=16)
            band('Barrel hazard ring',(0,0,z+.1),(.04,.04,.04),'label',root)
        for z in [.46,.83,1.2]:band('Circumferential hazard band',(0,0,z),(r+.035,.04,.09),'label',root)
        cylinder('Barrel bung',(0,-.33,h-.12),.13,.12,'frame','Y',root)
        cylinder('Bung cap',(0,-.40,h-.12),.08,.06,'label','Y',root)
        band('Fuel placard',(0,-r-.03,.8),(.38,.03,.28),'label',root);k.text('Hazard stencil','FUEL / X-04',(0,-r-.06,.78),.10,parent=root)
        if state==1:b('Runover side dent',(.61,.1,.77),(.12,.55,.62),'dark',root,rot=(0,.35,.18));cylinder('Loose bung',(0,-.47,.55),.1,.08,'frame','Y',root)
        if state==2:
            b('Crushed drum shell',(0,0,.6),(1.2,.9,.62),'cargo_red',root,rot=(0,.2,.1));cylinder('Flattened upper rim',(0,0,1.02),.57,.09,'frame',parent=root,vertices=16);b('Peeled hazard band',(.6,0,.65),(.08,.7,.10),'label',root,rot=(0,.25,.1));cylinder('Spilled fuel puddle',(0,-.18,.04),.65,.025,'liquid',parent=root,vertices=16)
    else:
        cylinder('Collapsed barrel footprint',(0,.12,.18),.68,.3,'cargo_red',parent=root,vertices=16);b('Rolled barrel shell',(0,-.25,.32),(1.2,.35,.3),'cargo_red',root,rot=(.1,.2,.34));cylinder('Detached original rim',(.28,.25,.48),.55,.09,'frame',parent=root,vertices=16);b('Bent hazard placard',(-.3,-.46,.28),(.45,.03,.2),'label',root,rot=(.4,.1,.35));cylinder('Fuel spill',(0,.1,.03),.8,.025,'liquid',parent=root,vertices=16)
    socket(e,'CARGO','cargo',[0,0,0],[0,1,0],state<3,.65);collider(e,'barrel',[0,.75 if state<3 else .3,0],[1.4,1.5 if state<3 else .7,1.4]);e['description']='Hazard fuel barrel with rims, bands, bung, placard and liquid spill retained through crushing.'
def container(e,state):
    root=empty('ARMORED_CONTAINER');root['component']='container';w=5;d=2.3;h=2.5
    if state<3:
        b('Container body',(0,0,h/2),(w,d,h),'cargo_blue',root)
        for x in [-w/2+.22,w/2-.22]:
            for y in [-d/2+.1,d/2-.1]:b('ISO corner casting',(x,y,.3),(.3,.3,.6),'frame',root);b('Vertical corner rail',(x,y,h/2),(.14,.14,h),'frame',root)
        for x in [-1.7,-.85,0,.85,1.7]:b('Corrugated side rib',(x,-d/2-.03,h/2),(.10,.08,h-.25),'frame',root)
        for x in [-1.6,1.6]:
            b('Container door',(x,d/2+.03,h/2),(1.3,.12,h-.25),'cargo_green',root);b('Door latch',(x-.45,d/2+.12,1.3),(.08,.07,.6),'label',root);b('Door latch',(x+.45,d/2+.12,1.3),(.08,.07,.6),'label',root)
        band('Container ID',(0,d/2+.08,1.9),(1.6,.035,.28),'label',root);k.text('Container stencil','A6 / XENO CARGO',(0,d/2+.12,1.86),.16,parent=root)
        if state==1:b('Impact dent',(-1.7,-d/2-.07,1.2),(.55,.08,.8),'dark',root,rot=(0,.35,.1));b('Bent corner',(2.45,.65,1.9),(.18,.8,.3),'frame',root,rot=(0,.25,.08))
        if state==2:
            b('Caved side',(0,-d/2-.02,1.2),(2.4,.13,1.5),'cargo_blue',root,rot=(0,.2,.04));b('Torn roof',(0,0,2.42),(2.2,1.8,.1),'frame',root,rot=(0,.2,.08));b('Exposed cargo',(0,-.1,1.1),(1.3,1.2,1.1),'raw',root);beam('Torn ID rail',(-.8,d/2+.1,1.7),(.3,d/2+.16,1.4),.045,'label',root)
    else:
        b('Container floor wreck',(0,0,.25),(4.5,1.8,.35),'cargo_blue',root,rot=(.04,.1,.03));b('Folded side wall',(0,-.75,.85),(4,.14,1.2),'cargo_blue',root,rot=(.35,.08,.03));b('Door slab',(1.25,1.0,.55),(1.2,.12,1.4),'cargo_green',root,rot=(.1,.3,.5));b('Surviving corner casting',(-2.2,.5,.55),(.35,.35,.65),'frame',root);b('Bent corrugated rib',(0,-.84,.7),(.1,.16,1.1),'frame',root,rot=(0,.35,.05));band('Detached ID plate',(-.5,-.85,.3),(.8,.03,.22),'label',root,rot=(.2,0,.25))
    socket(e,'CARGO','cargo',[0,0,0],[0,1,0],state<3,5);collider(e,'container',[0,1.25 if state<3 else .4,0],[5.2,2.5 if state<3 else .8,2.5]);e['description']='5 m armored expedition container with ISO corners, corrugated ribs, doors, latches and identifiable impact deformation.'
def pallet(e,state):
    root=empty('PALLET_STACK');root['component']='pallet';
    for x in [-.8,0,.8]:b('Pallet deck board',(x,0,.41),(.76,2.1,.22),'frame',root)
    for x in [-.75,.75]:
        for y in [-.65,.65]:b('Pallet block',(x,y,.15),(.35,.35,.3),'edge',root)
    if state<3:
        for x in [-.68,.68]:b('Pallet runner',(x,0,.075),(.28,2,.15),'frame',root)
        for z in [.845,1.495]:
            for x in [-.62,.62]:
                for y in [-.55,.55]:
                    b('Stacked crate',(x,y,z),(1.1,.95,.65),'cargo_blue' if z<1 else 'cargo_green',root)
        band('Load wrap',(0,0,1.2),(1.7,1.7,.06),'label',root);b('Pallet label',(0,-.94,1.2),(1.0,.03,.3),'label',root)
        if state==1:b('Bent deck board',(.8,0,.18),(.6,1.8,.16),'frame',root,rot=(0,.18,.08));b('Shifted load',(-.5,.2,1.62),(1.1,.95,.55),'cargo_green',root,rot=(0,.1,.04))
        if state==2:
            b('Broken deck',(0,0,.12),(1.8,1.5,.16),'frame',root,rot=(0,.12,.08));b('Top crate fallen',(-.45,.25,.8),(1.0,.9,.62),'cargo_green',root,rot=(.25,.08,.2));b('Lower crate crushed',(.4,-.3,.48),(1.2,.8,.5),'cargo_blue',root,rot=(0,.18,.04));band('Torn wrap',(0,0,.9),(1.7,.06,.04),'label',root,rot=(.2,0,.25))
    else:
        b('Split pallet base',(0,0,.1),(1.7,1.3,.2),'frame',root,rot=(0,.18,.1));b('Fallen load',(-.45,.18,.35),(1.2,.9,.3),'cargo_blue',root,rot=(.35,.1,.25));b('Detached green crate',(.62,-.35,.3),(.9,.8,.42),'cargo_green',root,rot=(0,.2,.3));band('Torn load wrap',(-.2,-.65,.23),(1.1,.04,.07),'label',root,rot=(.25,0,.3))
    socket(e,'CARGO','cargo',[0,0,0],[0,1,0],state<3,2);collider(e,'pallet',[0,1 if state<3 else .35,0],[2,2 if state<3 else .8,2]);e['description']='Stackable cargo pallet with deck boards, runners, load wrap and multiple crates that shift and collapse under impact.'
def warehouse(e,state):
    root=empty('WAREHOUSE_SCENE');root['component']='warehouse_scene'
    b('Loading bay slab',(0,0,-.16),(14,12,.32),'concrete',root)
    # Open front and right sides; low perimeter walls, no roof or skylight.
    b('Rear cutaway wall',(0,5.8,.65),(14,.22,1.3),'frame',root)
    b('Left cutaway wall',(-6.8,0,.65),(.22,11.6,1.3),'frame',root)
    for x in [-6.4,6.4]:
        b('Dock bollard',(x,-5.4,.45),(.22,.22,.9),'label',root)
    for x in [-1.15,1.15]:
        for y in [-4.5,-2.5,-.5,1.5]:b('Clear aisle marking',(x,y,.012),(.055,1.2,.015),'label',root)
    b('Loading dock edge',(0,-5.8,.025),(11,.16,.05),'edge',root)
    # One properly supported rack and one packing bench.
    rack=empty('STORAGE_RACK',parent=root)
    for x in [3.0,5.8]:
        for y in [2.55,4.85]:b('Rack upright',(x,y,1.35),(.12,.12,2.7),'frame',rack)
    for z in [.16,2.55]:b('Full depth shelf deck',(4.4,3.7,z),(2.95,2.4,.12),'frame',rack)
    for x in [3.0,5.8]:beam('Rack cross brace',(x,2.55,.15),(x,4.85,2.55),.035,'edge',rack)
    b('Packing bench top',(4.4,.35,.94),(2.9,2.4,.12),'frame',root)
    for x in [3.15,5.65]:
        for y in [-.65,1.35]:b('Packing bench leg',(x,y,.44),(.14,.14,.88),'edge',root)
    b('Fuel containment tray',(4.1,-3.3,.06),(3.4,2.15,.12),'edge',root)
    for x in [2.45,5.75]:b('Spill tray lip',(x,-3.3,.15),(.1,2.15,.18),'label',root)
    for y in [-4.325,-2.275]:b('Spill tray lip',(4.1,y,.15),(3.4,.1,.18),'label',root)
    e['placements']=[]
    def place(ident,family,build,x,y,support=0,angle=0):
        previous=k.active_root
        instance=empty(ident,parent=root);instance['placement_id']=ident;instance['source_family']=family;instance['support_height_m']=support
        k.active_root=instance
        scratch=dict(sockets=[],colliders=[])
        build(scratch,state)
        # Scene instances use the original prop geometry, without duplicate sockets.
        for child in list(instance.children):
            if child.name.startswith('SOCKET_'):bpy.data.objects.remove(child,do_unlink=True)
        k.active_root=previous
        instance.location=(x,y,0);instance.rotation_euler.z=angle;bpy.context.view_layer.update()
        meshes=[o for o in instance.children_recursive if o.type in ['MESH','FONT']]
        lowest=min((o.matrix_world@(v.co if o.type=='MESH' else Vector(v))).z for o in meshes for v in (o.data.vertices if o.type=='MESH' else o.bound_box))
        instance.location.z=support-lowest;bpy.context.view_layer.update()
        e['placements'].append(dict(id=ident,family=family,support_height_m=support))
    place('DISPLAY_CONTAINER','armored_container',container,-3.35,3.55,angle=math.pi)
    place('DISPLAY_PALLET','pallet_stack',pallet,-3.7,-1.6,angle=-.07)
    place('DISPLAY_CRATE','cargo_crate',crate,4.4,3.7,.22)
    place('DISPLAY_SECURE_CASE','secure_case',lambda e,d:crate(e,d,True),4.4,.35,1.0)
    place('DISPLAY_BARREL_A','fuel_barrel',barrel,3.3,-3.3,.12)
    place('DISPLAY_BARREL_B','fuel_barrel',barrel,4.9,-3.3,.12)
    if state:
        b('Bent dock edge',(-2,-5.7,.13),(1.4,.12,.12),'frame',root,rot=(0,.12,.12))
    if state>1:
        b('Collapsed wall panel',(-5.6,4.8,.15),(1.8,.55,.15),'frame',root,rot=(.03,.05,.25))
    socket(e,'ROAD','road',[0,0,6],[0,0,1],state<3,3)
    socket(e,'CARGO','cargo',[0,0,5.5],[0,0,1],state<3,3)
    collider(e,'loading_bay',[0,1.6,0],[14,3.2,12])
    e['description']='Roofless loading-bay diorama: one expedition container, one loaded pallet, a parts crate on a full-depth rack, a secure case on a packing bench, and two fuel barrels in a spill tray. A clear central aisle connects the open dock to storage.'

SPECS=[('warehouse_scene','Logistics loading-bay diorama',[14,12]),('cargo_crate','Stackable cargo crate',[2.4,2.4]),('secure_case','Reinforced secure case',[2.4,2.4]),('fuel_barrel','Hazard fuel barrel',[2,2]),('armored_container','Armored expedition container',[5.4,3.2]),('pallet_stack','Loaded cargo pallet',[2.4,2.4])]
for family,title,plot in SPECS:
  for state in range(4):
    e=k.begin(f'{family}_d{state}',title,STATES[state],plot,'');e.update(family=family,damage_level=state,zone='logistics',functional=state<3,collision_quality='conservative blockout',damage_signature=['intact panels and fittings','specific dents and shifted parts','crushed original pieces','identifiable original components amid collapse'][state])
    if family=='warehouse_scene':warehouse(e,state)
    elif family=='cargo_crate':crate(e,state)
    elif family=='secure_case':crate(e,state,True)
    elif family=='fuel_barrel':barrel(e,state)
    elif family=='armored_container':container(e,state)
    else:pallet(e,state)
    print(f'AUTHORED {len(k.manifest)}/24 {e["id"]}',flush=True)
for index,(root,collection,e) in enumerate(k.roots):
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(collection.objects):
        o.select_set(True)
        if o.type=='FONT':bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
        if o.type=='MESH':
            bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    bpy.context.view_layer.objects.active=root;p=OUT/e['file'];bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_cameras=False,export_lights=False)
    data=p.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);blob=data[28+n:]
    for node in doc['nodes']:
      if node.get('extras',{}).get('asset_id')==e['id']:node['name']='ROOT'
      if node.get('name','').startswith('SOCKET_'):node['name']=node['name'].split('.')[0]
    payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*(-len(payload)%4);p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob);e['bytes']=p.stat().st_size;e['triangles']=sum(doc['accessors'][q['indices']]['count']//3 for m in doc.get('meshes',[]) for q in m['primitives']);print(f'EXPORTED {index+1}/24 {e["file"]}',flush=True)
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
for i,(root,collection,e) in enumerate(k.roots):root.location=((i%4)*30,(i//4)*28,0)
bpy.context.scene.name='A6 / Logistics warehouse props';bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-warehouse-props.blend'));print('WAREHOUSE_PROPS_COMPLETE 6 families / 24 exports',flush=True)
