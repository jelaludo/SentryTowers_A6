"""Blender authoring pipeline for the first modular base kit.
Run: blender --background --python-exit-code 1 --python tools/blender/build_wall_kit.py
Blender uses Z up; glTF exporter converts to +Y up, +Z forward (-Y in Blender).
"""
import bpy, bmesh, math, json, random, sys
GAME = '--game' in sys.argv
from pathlib import Path
from mathutils import Vector

PROJECT=Path(__file__).resolve().parents[2]
OUT=PROJECT/('assets/base-kit-game' if GAME else 'assets/base-kit');SOURCE=PROJECT/'source/blender'
OUT.mkdir(parents=True,exist_ok=True);SOURCE.mkdir(parents=True,exist_ok=True)
# Background build only: do not replace an artist's live scene.
if not bpy.app.background:raise RuntimeError('Run this builder in background mode.')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name!='Collection' and c.users==0:bpy.data.collections.remove(c)

def material(name,color,metal=.0,rough=.5,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    if emission:bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
    return m
M={
 'armor':material('Ceramic armor / limestone',(.48,.54,.51),.38,.43),
 'edge':material('Edge metal / graphite',(.075,.11,.13),.72,.35),
 'frame':material('Structural frame / blue steel',(.16,.23,.26),.7,.45),
 'dark':material('Recess / carbon',(.017,.027,.03),.3,.7),
 'concrete':material('Fractured geopolymer',(.27,.29,.27),.0,.88),
 'raw':material('Fresh fracture / mineral',(.43,.40,.32),.0,.94),
 'rust':material('Oxidized reinforcement',(.32,.16,.075),.65,.68),
 'yellow':material('Caution / amber',(.95,.51,.065),.25,.45),
 'signal':material('Status / mint',(.12,.9,.68),.25,.28,2.1),
 'fault':material('Fault / amber',(.95,.17,.025),.1,.4,1.5),
 'white':material('Stencil / ivory',(.78,.84,.77),.0,.55),
}
active_root=None;active_collection=None;manifest=[];roots=[]
def register(obj,name,mat=None,parent=None):
    obj.name=name
    for c in list(obj.users_collection):c.objects.unlink(obj)
    active_collection.objects.link(obj)
    obj.parent=parent or active_root
    if mat:obj.data.materials.append(M[mat])
    return obj
def empty(name,loc=(0,0,0),parent=None):
    obj=bpy.data.objects.new(name,None);active_collection.objects.link(obj);obj.parent=parent or active_root;obj.location=loc;obj.empty_display_size=.18
    return obj
def finish(obj,bevel):
    if bevel and not GAME:
        mod=obj.modifiers.new('Manufactured edge bevel','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj
def box(name,loc,size,mat='armor',bevel=.025,parent=None,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,0));o=register(bpy.context.object,name,mat,parent);o.location=loc;o.dimensions=size
    bpy.context.view_layer.objects.active=o;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(o,min(bevel,min(size)*.2));o.rotation_euler=rot;return o
def cylinder(name,loc,radius,depth,mat='frame',axis='Z',parent=None,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=min(vertices,6) if GAME else vertices,radius=radius,depth=depth,location=(0,0,0));o=register(bpy.context.object,name,mat,parent);o.location=loc
    if axis=='Y':o.rotation_euler[0]=math.pi/2
    elif axis=='X':o.rotation_euler[1]=math.pi/2
    return finish(o,.009)
def prism(name,outline,y0,y1,mat='armor',parent=None,bevel=.015):
    # Extrude a counterclockwise X/Z polygon through the wall's depth.
    count=len(outline);verts=[(x,y,z) for y in (y0,y1) for x,z in outline]
    faces=[tuple(range(count)),tuple(range(count*2-1,count-1,-1))]
    faces += [(i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count)]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);active_collection.objects.link(obj);obj.parent=parent or active_root;mesh.materials.append(M[mat]);return finish(obj,bevel)
def beam(name,a,b,radius=.025,mat='rust',parent=None):
    delta=Vector(b)-Vector(a);o=cylinder(name,(Vector(a)+Vector(b))/2,radius,delta.length,mat,parent=parent,vertices=8);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o
def text(name,value,loc,size=.14,mat='white',parent=None):
    if GAME:return None
    curve=bpy.data.curves.new(name,'FONT');curve.body=value;curve.size=size;curve.align_x='CENTER';curve.extrude=.001
    o=bpy.data.objects.new(name,curve);active_collection.objects.link(o);o.parent=parent or active_root;o.location=loc;o.rotation_euler=(math.pi/2,0,0);curve.materials.append(M[mat]);return o
def begin(id,title,state,plot,description):
    global active_root,active_collection
    active_collection=bpy.data.collections.new(id);bpy.context.scene.collection.children.link(active_collection)
    active_root=bpy.data.objects.new('ROOT',None);active_collection.objects.link(active_root);active_root['asset_id']=id;active_root['damage_state']=state
    active_root['up']='+Y in GLB';active_root['forward']='+Z in GLB';active_root['meters']=True
    entry=dict(id=id,name=title,state=state,file=id+'.glb',plot_m=plot,description=description,sockets=[],colliders=[],clearance=[],animations=[])
    roots.append((active_root,active_collection,entry));manifest.append(entry);return entry
def socket(entry,id,kind,position,normal,available=True,width=None):
    x,y,z=position;o=empty('SOCKET_'+id,(x,-z,y));o['kind']=kind;o['available']=available
    # Empty local +Z points outward in GLB after the export coordinate conversion.
    direction=Vector((normal[0],-normal[2],normal[1]));o.rotation_euler=direction.to_track_quat('-Y','Z').to_euler()
    entry['sockets'].append(dict(id=id,kind=kind,position_m=position,normal=normal,available=available,width_m=width))
def collider(entry,name,center,size,condition='always'):
    entry['colliders'].append(dict(id=name,center_m=center,size_m=size,condition=condition))
def bolts(length=4,parent=None):
    if GAME:return
    for x in [-length/2+.18,length/2-.18]:
        for z in [.55,1.6,2.65]:
            for y in [-.57,.57]:cylinder('Captive fastener',(x,y,z),.055,.035,'edge','Y',parent)
def wall_geometry(length=4,parent=None,mark=True):
    box('Geopolymer core',(0,0,1.67),(length-.12,.56,2.83),'concrete',.045,parent)
    box('Load-spreading footing',(0,0,.12),(length,1.05,.24),'frame',.03,parent)
    box('Footing top',(0,0,.30),(length-.08,.83,.14),'edge',.02,parent)
    box('Cap rail',(0,0,3.12),(length,.83,.16),'frame',.025,parent)
    # Chamfered replaceable panels on both sides.
    parts=2 if length>2.5 else 1;panel_width=(length-.6)/parts
    for i in range(parts):
        center=-length/2+.3+panel_width*(i+.5);left=center-panel_width/2+.035;right=center+panel_width/2-.035
        profile=[(left,.47),(right-.15,.47),(right,.63),(right,2.73),(right-.15,2.91),(left+.13,2.91),(left,2.76)]
        prism('Replaceable armor panel',profile,-.52,-.31,'armor',parent,.022)
        prism('Rear armor panel',profile,.31,.52,'armor',parent,.022)
        for front in [-1,1]:
            box('Panel recessed spine',(center,front*.532,1.68),(.10,.025,1.92),'edge',.005,parent)
            box('Panel lower reinforcement',(center,front*.548,.79),(panel_width-.20,.04,.10),'frame',.007,parent)
    for x in [-length/2+.16,length/2-.16]:
        profile=[(x-.14,.31),(x+.14,.31),(x+.14,2.86),(x+.09,3.04),(x-.09,3.04),(x-.14,2.86)]
        prism('End structural rib',profile,-.60,.60,'frame',parent,.018)
    box('Upper recessed service channel',(0,-.554,2.99),(length-.65,.045,.07),'dark',.008,parent)
    for i in range(parts):
        x=-length/2+.48+(length-.96)*(i+.5)/parts
        box('Status strip',(x,-.582,2.99),(.36,.015,.025),'signal',.004,parent)
    bolts(length,parent)
    if mark:
        box('Identification plate',(-.60,-.563,2.42),(.98,.035,.30),'edge',.015,parent)
        text('Unit stencil','A6 / 04',(-.60,-.588,2.365),.15,parent=parent)
    for i in range(4):box('Caution stripe',(-.42+i*.25,-.548,.46),(.12,.02,.055),'yellow',.004,parent,rot=(0,-.42,0))
def cut_breach(objects):
    outline=[(-.83,-.2),(.83,-.2),(.83,.55),(1.13,.87),(.91,1.2),(1.02,1.63),(.72,1.82),(.90,2.18),(.64,2.59),(.21,2.49),(-.10,2.7),(-.47,2.52),(-.64,2.58),(-.98,2.14),(-.84,1.85),(-1.1,1.52),(-.89,1.19),(-1.03,.81),(-.83,.52)]
    cutter=prism('Breach cutter',outline,-1.5,1.5,'raw',bevel=0)
    for o in objects:
        if o.type!='MESH':continue
        mod=o.modifiers.new('Impact breach','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
def scars(parent=None):
    paths=[[(.24,2.52),(.48,2.30),(.35,2.10),(.65,1.83),(.55,1.52)],[(.48,2.3),(.8,2.33),(1.03,2.16)],[(.65,1.83),(1.0,1.72),(1.18,1.39)], [(-1.05,.89),(-.85,1.13),(-1.04,1.43),(-.88,1.62)]]
    for path in paths:
        for (x,z),(xx,zz) in zip(path,path[1:]):beam('Armor crack',(x,-.553,z),(xx,-.553,zz),.016,'dark',parent)
    for x,z,radius in [(.6,2.01,.19),(-.77,1.11,.13),(1.2,.8,.08)]:
        cylinder('Impact scoring',(x,-.554,z),radius,.016,'edge','Y',parent,vertices=9)
        cylinder('Impact center',(x,-.566,z),radius*.45,.017,'dark','Y',parent,vertices=8)
def debris(seed,amount=12):
    rng=random.Random(seed)
    for i in range(amount):
        sign=-1 if i%2 else 1;x=sign*rng.uniform(1.12,1.65);y=rng.uniform(-1.35,1.35);h=rng.uniform(.08,.28)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1);o=register(bpy.context.object,'Fractured core debris','raw' if i%3==0 else 'concrete');o.location=(x,y,h*.55);o.scale=(rng.uniform(.12,.26),rng.uniform(.12,.29),h*.6);o.rotation_euler[2]=rng.random()*6.28

for state in range(4):
    entry=begin('wall_standard_d'+str(state),'Armored wall',['Intact','Damaged','Breached','Destroyed'][state],[4,4],['Layered armor with replaceable panels and service rail.','Scored armor, cracks and fault indicator; wall still blocks.','Central breach with exposed core; 1.2 m pedestrian clearance.','Broken end footings and bounded rubble; central pedestrian passage.'][state])
    if state<3:
        wall_geometry()
        if state==1:
            scars()
            for o in active_collection.objects:
                if o.type=='MESH' and o.name.startswith('Status strip'):o.data.materials.clear();o.data.materials.append(M['fault'])
        if state==2:
            cut_breach(list(active_collection.objects))
            # Remove floating decorative labels in the destroyed panel area.
            for o in list(active_collection.objects):
                if o.type=='FONT' or o.name.startswith('Identification plate'):bpy.data.objects.remove(o,do_unlink=True)
            debris(32,10)
            for side in [-1,1]:
                for height in [.65,1.15,1.72,2.1]:beam('Exposed reinforcement',(side*1.24,.08,height),(side*.90,.13,height+.10),.025)
            beam('Hanging service cable',(-.5,-.23,2.93),(-.3,-.3,2.70),.025,'dark')
    else:
        for side in [-1,1]:
            box('Surviving end footing',(side*1.42,0,.13),(1.16,1.03,.26),'frame',.035)
            prism('Broken core stump',[(side*1.98,.26),(side*.86,.26),(side*.94,.48),(side*1.18,.41),(side*1.37,.77),(side*1.62,.54),(side*1.98,.85)] if side==1 else list(reversed([(side*1.98,.26),(side*.86,.26),(side*.94,.48),(side*1.18,.41),(side*1.37,.77),(side*1.62,.54),(side*1.98,.85)])),-.30,.30,'concrete',bevel=.008)
            box('Buckled armor fragment',(side*1.48,-.73,.18),(.65,.90,.09),'armor',.025,rot=(.16,side*.20,side*.24))
            box('Fallen cap fragment',(side*1.32,.86,.13),(.90,.45,.14),'frame',.025,rot=(0,.1,side*.35))
            beam('Bent exposed rebar',(side*1.4,0,.38),(side*1.62,.15,.95),.026)
        debris(91,18)
    for side,label in [(-1,'W'),(1,'E')]:socket(entry,'WALL_'+label,'wall',[side*2,0,0],[side,0,0],state<3,.8)
    if state<2:collider(entry,'wall',[0,1.60,0],[4,3.2,1.2])
    else:
        for side in [-1,1]:collider(entry,'remnant_'+str(side),[side*1.4,1.6 if state==2 else .5,0],[1.2,3.2 if state==2 else 1.,1.2])
        if state==2:collider(entry,'lintel',[0,2.97,0],[1.6,.46,1.2])
        for side in [-1,1]:collider(entry,'rubble_'+str(side),[side*1.4,.2,.85],[1.1,.4,1.3])
        entry['clearance'].append(dict(kind='walk',center_m=[0,1.2,0],size_m=[1.2,2.4,4],condition='always'))

entry=begin('wall_corner_d0','Armored corner','Intact',[4,4],'Two matching half sections turn the wall boundary by 90 degrees.')
for label,pos,angle in [('E',(1,0,0),0),('N',(0,-1,0),-math.pi/2)]:
    group=empty('STRUCTURE_'+label,pos);group.rotation_euler[2]=angle;wall_geometry(2,group,False)
box('Corner seam tower',(0,0,1.64),(.66,.66,3.14),'frame',.065)
box('Corner identification',(0,-.35,2.5),(.49,.04,.35),'edge',.02)
text('Corner stencil','C-90',(0,-.38,2.44),.13)
socket(entry,'WALL_E','wall',[2,0,0],[1,0,0],True,.8);socket(entry,'WALL_N','wall',[0,0,2],[0,0,1],True,.8)
collider(entry,'east_leg',[1,1.6,0],[2,3.2,1.2]);collider(entry,'north_leg',[0,1.6,1],[1.2,3.2,2])

entry=begin('gate_vehicle_d0','Telescopic vehicle gate','Intact',[12,8],'Four armored slats telescope into the header, leaving an 8 m-wide vehicle opening.')
for side in [-1,1]:
    g=empty('WALL_ADAPTER_'+str(side),(side*5.5,0,0));wall_geometry(1,g,False)
    box('Gate tower footing',(side*4.65,0,.16),(1.3,1.75,.32),'frame',.06)
    box('Gate tower',(side*4.68,0,2.62),(1.23,1.38,5.24),'frame',.065)
    box('Gate tower front armor',(side*4.68,-.78,2.57),(.99,.19,4.9),'armor',.07)
    box('Door guide rail',(side*4.1,0,2.26),(.12,.5,4.35),'edge',.025)
    box('Gate status recess',(side*4.68,-.893,3.05),(.16,.04,1.80),'dark',.01)
    box('Gate status bar',(side*4.68,-.92,3.05),(.065,.02,1.64),'signal',.009)
    for j in range(5):box('Tower caution marking',(side*4.68-.32+j*.16,-.894,.73),(.09,.025,.16),'yellow',.005,rot=(0,-.3,0))
box('Overhead cassette',(0,.22,4.95),(8.9,1.65,1.15),'frame',.055)
box('Header front armor',(0,-.66,5.05),(8.4,.16,.72),'armor',.04)
text('Gate designation','A6  //  SERVICE GATE 01',(0,-.758,4.95),.26)
for x in [-3.5,3.5]:box('Header marker',(x,-.76,4.98),(.42,.035,.10),'yellow',.01)
for i in range(4):
    slat=empty('GATE_SLAT_%02d'%i,(0,0,.54+i*.98));slat['component']='gate_leaf'
    box('Armored gate slat',(0,0,0),(8,.34,.96),'armor',.04,slat)
    box('Slat lower lock',(0,-.22,-.36),(7.96,.14,.18),'edge',.015,slat)
    for x in [-2.8,0,2.8]:box('Slat brace',(x,-.20,.02),(.16,.08,.72),'frame',.012,slat)
    for x in [-3.75,3.75]:cylinder('Guide carriage',(x,0,0),.17,.50,'edge','Y',slat)
    slat.keyframe_insert(data_path='location',frame=1)
    slat.location=(0,.16+i*.28,4.75+i*.035);slat.keyframe_insert(data_path='location',frame=49)
    if slat.animation_data and slat.animation_data.action:slat.animation_data.action.name='Gate_Open'
    slat.location=(0,0,.54+i*.98)
entry['animations']=['Gate_Open'];bpy.context.scene.frame_set(1)
for side,label in [(-1,'W'),(1,'E')]:socket(entry,'WALL_'+label,'wall',[side*6,0,0],[side,0,0],True,.8)
for side,label in [(-1,'S'),(1,'N')]:socket(entry,'ROAD_'+label,'road',[0,0,side*4],[0,0,side],True,8)
for side in [-1,1]:collider(entry,'tower_'+str(side),[side*4.75,2.75,0],[1.5,5.5,1.8])
collider(entry,'header',[0,4.95,-.22],[8.9,1.15,1.65]);collider(entry,'closed_slats',[0,2,0],[8,4,.55],'gate_closed')
entry['clearance'].append(dict(kind='vehicle',center_m=[0,1.9,0],size_m=[8,3.8,8],condition='gate_open'))

entry=begin('foundation_flat_d0','Armored foundation slab','Intact',[4,4],'4 m foundation tile; origin and support plane at the top surface.')
box('Foundation geopolymer',(0,0,-.24),(4,4,.28),'concrete',.035)
box('Foundation perimeter',(0,0,-.09),(3.98,3.98,.10),'frame',.02)
for x in [-.985,.985]:
    for y in [-.985,.985]:
        box('Service deck panel',(x,y,-.019),(1.91,1.91,.038),'armor',.022)
        for off in ([] if GAME else [-.68,.68]):cylinder('Deck captive bolt',(x+off,y+.70,.003),.045,.008,'edge')
for x in [-1.82,1.82]:
    for y in [-1.82,1.82]:box('Corner locating socket',(x,y,.001),(.17,.17,.012),'dark',.008)
for label,pos,normal in [('N',[0,0,2],[0,0,1]),('E',[2,0,0],[1,0,0]),('S',[0,0,-2],[0,0,-1]),('W',[-2,0,0],[-1,0,0])]:socket(entry,'FOUNDATION_'+label,'foundation',pos,normal,True,4)
socket(entry,'SUPPORT','support',[0,0,0],[0,1,0],True,4);collider(entry,'slab',[0,-.19,0],[4,.38,4])

# One vertex-color material and one mesh per rigid assembly in the game tier.
# Keep root/socket empties and the four gate slat pivots intact.
if GAME:
    shared=material('BASE_KIT_GAME / vertex palette', (1,1,1), .15, .76)
    nodes=shared.node_tree.nodes
    color=nodes.new('ShaderNodeVertexColor');color.layer_name='Color'
    shared.node_tree.links.new(color.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
    for root,collection,entry in roots:
        groups={}
        for o in list(collection.objects):
            if o.type!='MESH':continue
            colors=o.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
            for face in o.data.polygons:
                mat=o.data.materials[face.material_index]
                rgba=mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value
                for loop in face.loop_indices:colors.data[loop].color=rgba
                face.material_index=0
            o.data.materials.clear();o.data.materials.append(shared)
            parent=o.parent
            while parent and parent!=root and not parent.name.startswith('GATE_SLAT_'):parent=parent.parent
            groups.setdefault(parent or root,[]).append(o)
        for parent,objects in groups.items():
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            active=objects[0];bpy.context.view_layer.objects.active=active
            bpy.ops.object.join()
            world=active.matrix_world.copy();active.parent=parent;active.matrix_world=world
            active.name='GAME_MESH_'+('STATIC' if parent==root else parent.name.split('.')[0])
        # Empty authoring groups are redundant after baking their transforms.
        for o in list(collection.objects):
            if o.type=='EMPTY' and o!=root and not o.children and not o.name.startswith(('SOCKET_','GATE_SLAT_')):
                bpy.data.objects.remove(o,do_unlink=True)

# Export at origin, while retaining one readable, editable gallery in the .blend.
bpy.context.scene.render.fps=30;bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=49
for root,collection,entry in roots:
    bpy.ops.object.select_all(action='DESELECT')
    for o in collection.objects:
        o.select_set(True)
        if o.type=='MESH':
            bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
    bpy.context.view_layer.objects.active=root
    # Exact common name in each exported scene; Blender source names may have suffixes.
    old=root.name;root.name='ROOT'
    bpy.ops.export_scene.gltf(filepath=str(OUT/entry['file']),export_format='GLB',use_selection=True,export_extras=True,export_animations=bool(entry['animations']),export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True,export_yup=True,export_cameras=False,export_lights=False)
    root.name=old
    print('EXPORTED',entry['file'],flush=True)

# Normalize root/socket naming, expose gate clip, count triangles and preserve metadata.
import struct
for entry in manifest:
    path=OUT/entry['file'];data=path.read_bytes();jn=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+jn]);blob=data[28+jn:]
    for node in doc['nodes']:
        if node.get('extras',{}).get('asset_id')==entry['id']:node['name']='ROOT'
        if node.get('name','').startswith('SOCKET_'):
            node['name']=node['name'].split('.')[0]
        if node.get('name','').startswith('GATE_SLAT_'):node['name']=node['name'].split('.')[0]
    if doc.get('animations'):
        merged=dict(name='Gate_Open',channels=[],samplers=[])
        for animation in doc['animations']:
            offset=len(merged['samplers']);merged['samplers'].extend(animation['samplers'])
            for channel in animation['channels']:
                channel['sampler']+=offset;merged['channels'].append(channel)
        doc['animations']=[merged]
    entry['triangles']=sum(doc['accessors'][p['indices']]['count']//3 for m in doc.get('meshes',[]) for p in m['primitives'])
    payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob)
    entry['bytes']=path.stat().st_size
    entry['draw_calls']=sum(len(m['primitives']) for m in doc.get('meshes',[]))
    entry['materials']=len(doc.get('materials',[]))
    if GAME:
        original=next(a for a in json.loads((PROJECT/'assets/base-kit/manifest.json').read_text())['assets'] if a['id']==entry['id'])
        entry['source_triangles']=original['triangles']
        source_data=(PROJECT/'assets/base-kit'/entry['file']).read_bytes()
        source_doc=json.loads(source_data[20:20+struct.unpack_from('<I',source_data,12)[0]])
        entry['source_draw_calls']=sum(len(m['primitives']) for m in source_doc.get('meshes',[]))
        entry['source_bytes']=original['bytes']
        entry['tier']='game'
        entry['description']+=' Game tier: flat bevel-free geometry, vertex palette, merged rigid assemblies.'
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=manifest),indent=2)+'\n')

gallery=[(-7,0,0),(-2,0,0),(3,0,0),(8,0,0),(-7,7,0),(3,9,0),(-7,-6,.38)]
for (root,collection,entry),position in zip(roots,gallery):root.location=position
scene=bpy.context.scene;scene.name='A6 / Wall kit research'
scene.world.color=(.18,.18,.18)
# Set a useful material viewport and camera without exporting gallery furniture.
active_collection=bpy.data.collections.new('GALLERY');scene.collection.children.link(active_collection);active_root=None
bpy.ops.object.camera_add(location=(18,-24,22));camera=bpy.context.object;camera.name='Review camera';camera.rotation_euler=(Vector((0,3,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=28;scene.camera=camera
for loc,power,size in [((2,-8,16),2400,10),((-12,3,10),1800,9)]:
    bpy.ops.object.light_add(type='AREA',location=loc);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,3,0))-light.location).to_track_quat('-Z','Y').to_euler()
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=25;area.spaces.active.region_3d.view_location=(0,2,1)
bpy.ops.object.select_all(action='DESELECT')
for o in roots[0][1].objects:o.select_set(True)
bpy.context.view_layer.objects.active=roots[0][0]
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('a6-wall-kit-game.blend' if GAME else 'a6-wall-kit.blend')))
print('WALL_KIT_COMPLETE',len(manifest),'exports',flush=True)
