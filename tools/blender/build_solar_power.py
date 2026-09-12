"""Solar power kit: 4 families × D0–D3. Authored equipment-specific ruins.
blender --background --python-exit-code 1 --python tools/blender/build_solar_power.py
"""
import sys,math,json,struct
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,bmesh,Vector,empty,cylinder,beam,socket,collider
LOD=int(sys.argv[sys.argv.index('--lod')+1]) if '--lod' in sys.argv else 0
if LOD not in [0,1,2]:raise ValueError('LOD must be 0, 1 or 2')
if LOD:
    k.finish=lambda obj,bevel:obj
    k.text=lambda *args,**kwargs:None
OUT=k.PROJECT/('assets/solar-power' if not LOD else f'assets/solar-power/lod{LOD}');OUT.mkdir(parents=True,exist_ok=True)
k.M['pv']=k.material('Photovoltaic / cobalt silicon',(.018,.055,.20),.65,.26)
k.M['pv_alt']=k.material('Photovoltaic / indigo silicon',(.045,.075,.29),.6,.25)
k.M['copper']=k.material('Exposed copper windings',(.65,.25,.075),.8,.3)
k.M['cable']=k.material('Power insulation / orange',(.86,.24,.04),.2,.48)
k.M['glass']=k.material('Telemetry screen',(.01,.1,.14),.5,.28)
STATES=['Intact','Damaged','Critical','Destroyed']
def box(name,loc,size,mat='armor',parent=None,rot=(0,0,0)):
    if LOD and any(v in name.lower() for v in ['anchor','conductor','telemetry bar','latch','identity','impact score','terminal']):return None
    if LOD==2 and any(v in name.lower() for v in ['cooling fin','inset','screen','ground clamp','junction state','mounting rail']):return None
    return k.box(name,loc,size,mat,.012 if not LOD else 0,parent,rot)
def coil(name,loc,radius,mat='copper',parent=None,rot=(0,0,0)):
    if LOD:
        if LOD==2:return None
        return cylinder(name,loc,radius,.10,mat,parent=parent,vertices=8)
    bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,major_radius=radius,minor_radius=.045,location=(0,0,0))
    o=k.register(bpy.context.object,name,mat,parent);o.location=loc;o.rotation_euler=rot;return o

def panel(parent,loc=(0,0,0),broken=False,pattern=0,rot=(0,0,0)):
    root=empty('FRACTURED_PANEL' if broken else 'PV_PANEL',loc,parent);root.rotation_euler=rot;root['component']='fractured_solar_panel' if broken else 'solar_panel'
    w=2.35;d=1.45
    if not broken:box('PV backing',(0,0,0),(w,d,.085),'edge',root)
    else:
        outline=[(-1.17,-.72),(.45,-.72),(.25,-.36),(.72,-.13),(.30,.06),(.54,.28),(.12,.48),(.40,.72),(-1.17,.72)]
        vertices=[(x,y,z) for z in [-.045,.045] for x,y in outline];n=len(outline)
        faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        mesh=bpy.data.meshes.new('Jagged PV backing');mesh.from_pydata(vertices,[],faces);mesh.update();o=bpy.data.objects.new('Jagged PV backing',mesh);k.active_collection.objects.link(o);o.parent=root;mesh.materials.append(k.M['edge'])
    if LOD:
        if not broken:
            box('Continuous photovoltaic surface',(0,0,.06),(2.28,1.38,.025),'pv',root)
        else:
            box('Surviving photovoltaic surface',(-.63,0,.06),(.92,1.34,.025),'pv',root)
        if LOD==1:
            for x in [-1.19,1.19]:
                if not broken or x<0:box('Panel side frame',(x,0,.035),(.065,1.53,.12),'armor',root)
        return root
    for ix in range(4):
        for iy in range(3):
            if broken and (ix>=2 or ix==1 and iy==(pattern%3)):continue
            x=-.87+ix*.58;y=-.46+iy*.46
            box('Surviving photovoltaic cell' if broken else 'Photovoltaic cell',(x,y,.06),(.53,.41,.025),'pv_alt' if (ix+iy)%2 else 'pv',root)
            for offset in [-.14,.14]:box('Silver cell conductor',(x+offset,y,.075),(.012,.37,.007),'white',root)
    for x in [-1.19,1.19]:
        if broken and x>0:continue
        box('Panel aluminum side frame',(x,0,.035),(.065,1.53,.12),'armor',root)
    for y in [-.755,.755]:
        if broken:
            box('Torn aluminum frame',(-.48,y,.035),(1.42,.065,.12),'armor',root,rot=(0,0,.055*(1 if y>0 else -1)))
        else:box('Panel aluminum end frame',(0,y,.035),(2.4,.065,.12),'armor',root)
    if broken:
        beam('Exposed panel busbar',(.22,-.55,.08),(.62,-.37,.12),.018,'copper',root)
        beam('Cracked cell seam',(-.96,-.54,.09),(-.24,.44,.09),.012,'dark',root)
    return root

def rack(state,loc=(0,0,0),index=0):
    root=empty(f'SOLAR_RACK_{index:02d}',loc);root['component']='solar_rack';root['persistent_id']=f'rack_{index:02d}'
    for x in [-1.5,1.5]:
        box('Rack anchor footing',(x,0,.09),(.8,.85,.18),'frame',root)
        for y in [-.29,.29]:cylinder('Footing anchor',(x,y,.2),.055,.05,'yellow',parent=root)
        h=1.35 if state<3 else .5+(index%2)*.25
        box('Tracking support mast',(x,0,h/2),(.19,.23,h),'frame',root,rot=(0,.1 if state==3 else 0,0))
    if state<3:
        beam('Tracking axle',(-2,0,1.4),(2,0,1.4),.10,'edge',root)
        cylinder('Tracking drive',(-1.5,0,1.35),.25,.4,'frame','X',root)
        beam('Tilt actuator',(-1.5,.55,.25),(-1.5,.30,1.30),.075,'edge',root)
        wing=empty('TRACKER_TILT',(0,0,1.55),root);wing.rotation_euler[0]=math.radians(25 if state<2 else 38)
        for x in [-1.22,1.22]:
            for y in [-.79,.79]:
                if state==2 and x>0 and y>0:continue
                panel(wing,(x,y,0),broken=(state==2 and x>0) or(state==1 and x>0 and y>0),pattern=index)
        for x in [-1.5,1.5]:box('Rear mounting rail',(x,0,-.11),(.12,3.25,.14),'frame',wing)
        if state==2:beam('Hanging panel lead',(2.1,.7,.1),(2.1,.3,-.45),.03,'cable',wing)
        if state==1:box('Impact score',(-1.5,0,.9),(.205,.05,.14),'dark',root)
    else:
        # Destroyed layout retains the original panel topology and tracking hardware.
        beam('Snapped tracking axle',(-1.9,0,.62),(.2,.1,.48),.10,'edge',root)
        cylinder('Detached tracking drive',(1.45,.2,.3),.25,.4,'frame','X',root)
        for j,(x,y,a) in enumerate([(-1.25,-.7,-.18),(1.15,.55,.22)]):
            panel(root,(x,y,.22+.08*(index%2)),True,index+j,rot=(.10+index*.025,a,.10*(index%3-1)))
        panel(root,(-.55,.55,.70),True,index+2,rot=(.52,.06,-.14))
        beam('Bent rear mounting rail',(-2,-.65,.18),(-.25,-.4,.35),.06,'frame',root)
        beam('Bent rail return',(-.25,-.4,.35),(.35,-.7,.24),.06,'frame',root)
        beam('Severed copper panel lead',(1.4,-.7,.15),(1.8,-.95,.08),.025,'copper',root)
    box('Rack junction box',(0,0,.25),(.55,.38,.4),'edge',root)
    if state<3:box('Junction state lamp',(0,-.21,.29),(.24,.025,.035),'signal' if state<2 else 'fault',root)
    return root

def station(state,loc=(0,0,0)):
    root=empty('POWER_STATION',loc);root['component']='power_station'
    box('Power station foundation',(0,0,-.12),(5.4,3.6,.24),'frame',root)
    box('Inverter chassis',(0,0,.22),(3.7,2.6,.44),'edge',root)
    # Windings, battery modules and cooling hardware persist visibly in the ruin.
    for x in ([-.95,.95] if not LOD or state>=2 else []):
        h=1.6 if state<3 else .78
        cylinder('Transformer core',(x,.2,.4+h/2),.23,h,'edge',parent=root)
        for j in range(6 if state<3 else 4):coil('Exposed transformer winding',(x,.2,.55+j*.18),.36,parent=root,rot=(.05 if state==3 else 0,0,0))
    for x in ([-1.3,0,1.3] if not LOD or state>=2 else []):
        box('Battery module',(x,.82,.72),(.58,.6,.85),'frame',root,rot=(0,.18 if state==3 else 0,0))
        box('Battery terminal',(x,.82,1.18 if state<3 else 1.05),(.22,.32,.07),'copper',root)
    if state<3:
        for x in [-1.95,1.95]:
            box('Inverter armored side',(x,0,1.35),(.13,2.6,2.25),'armor',root)
            for j in range(8):box('Cooling fin',(x+(1 if x>0 else -1)*.14,-.8+j*.22,1.2),(.22,.055,1.5),'edge',root)
        box('Inverter rear armor',(0,1.3,1.35),(3.9,.12,2.25),'armor',root)
        if state<2:
            box('Inverter roof',(0,0,2.53),(4.1,2.8,.18),'frame',root)
            for x in [-.96,.96]:
                box('Inverter access door',(x,-1.34,1.35),(1.83,.12,2.20),'armor',root)
                box('Door inset',(x,-1.41,1.25),(1.55,.035,1.6),'edge',root)
                box('Telemetry screen',(x,-1.44,1.6),(.95,.025,.42),'glass',root)
                for j in range(5):box('Power telemetry bar',(x-.3+j*.15,-1.46,1.55),(.08,.015,.10+j*.035),'signal' if state==0 else 'fault',root)
                box('Door latch',(x+.65,-1.44,1),(.08,.07,.32),'white',root)
        else:
            box('Sheared roof remnant',(-1.1,0,2.48),(1.7,2.7,.14),'frame',root,rot=(0,.12,0))
            box('Hinged torn door',(-1.95,-1.7,1.35),(1.75,.1,2.1),'armor',root,rot=(0,0,-.65))
            beam('Severed upper busbar',(-.95,.2,1.8),(-.5,-.2,2),.045,'copper',root)
    else:
        # A peeled cabinet, its original door and cooling bank, not generic rubble.
        box('Surviving cabinet back',(0,1.25,.95),(3.9,.12,1.7),'armor',root,rot=(.14,0,0))
        box('Buckled inverter door',(-1,-1.4,.3),(1.83,.12,2.1),'armor',root,rot=(1.33,.10,-.13))
        box('Door inset wreck',(-1,-1.38,.33),(1.5,.06,1.6),'edge',root,rot=(1.33,.10,-.13))
        box('Fallen cooling bank',(2.0,0,.43),(.14,2.2,.7),'frame',root,rot=(0,-.8,0))
        for j in range(7):box('Surviving bent cooling fin',(2.10,-.66+j*.22,.4),(.42,.06,.65),'edge',root,rot=(0,-.55,0))
        beam('Broken output busbar',(.95,.2,1.22),(1.15,-.45,.7),.055,'copper',root)
        box('Broken telemetry frame',(.9,-1.3,.18),(.95,.45,.08),'edge',root,rot=(0,0,.25))
    for sign in [-1,1]:
        beam('Power connector cable',(0,sign*1.3,.15),(0,sign*2,.15),.065,'cable',root)
        if state==3:beam('Exposed cable strands',(.06,sign*1.8,.16),(.25,sign*1.95,.15),.022,'copper',root)
    box('Station identity plate',(0,-1.36,.38),(1.3,.025,.24),'edge',root)
    k.text('Station stencil','A6 / SOLAR GRID',(0,-1.39,.33),.12,parent=root)
    return root

def array(state):
    index=0
    for y in [0,5]:
        for x in [-6,0,6]:rack(state,(x,y,0),index);index+=1
    for x in [-6,0,6]:
        beam('Array collection cable',(x,5,.10),(x,-4,.10),.045,'cable')
        for y in [-3,2]:box('Cable ground clamp',(x,y,.085),(.25,.16,.17),'frame')
    beam('Collection cable trunk',(-6,-4,.10),(6,-4,.10),.065,'cable')
    if state<3:beam('Station supply cable',(0,-4,.10),(0,-6,.15),.065,'cable')
    else:
        beam('Severed supply cable',(0,-4,.1),(.28,-4.9,.12),.065,'cable')
        beam('Supply copper strands',(.28,-4.9,.12),(.47,-5.15,.08),.022,'copper')
    box('Array combiner box',(0,-4,.25),(.8,.6,.5),'edge')

SPECS=[('solar_power_complex','Solar array and power station',[24,24]),('solar_array','Six-rack photovoltaic array',[24,16]),('solar_panel_rack','Articulated photovoltaic rack',[6,6]),('solar_power_station','Solar grid power station',[8,8])]
for number,(family,title,plot) in enumerate(SPECS):
    for state in range(4):
        e=k.begin(f'{family}_d{state}',title,STATES[state],plot,'')
        e.update(family=family,damage_level=state,zone='utilities',functional=state<3,animations=[],collision_quality='conservative blockout',damage_ruin_signature=['fractured photovoltaic grids','tracking axle and tilt drive','bent support rails'] if number<3 else ['copper transformer windings','battery modules','peeled cabinet door','cooling fin bank'])
        if number<2:
            array(state)
            if number==0:station(state,(0,-8,0))
            socket(e,'POWER_OUT','power',[0,.15,10 if number==0 else 6],[0,0,1],state<3)
            e['panel_racks']=6;e['description']='Six tracking racks with 24 framed photovoltaic panels, grounded collection cables and '+('a connected inverter/battery power station.' if number==0 else 'a central combiner.')
            for y in [0,-5]:
                for x in [-6,0,6]:collider(e,f'rack_{x}_{y}',[x,1.2 if state<3 else .65,y],[5.1,2.4 if state<3 else 1.3,3.5])
        elif number==2:
            rack(state);socket(e,'POWER_OUT','power',[0,.15,0],[0,0,1],state<3);collider(e,'rack',[0,1.2 if state<3 else .65,0],[5.1,2.4 if state<3 else 1.3,3.5]);e['description']='Four framed photovoltaic panels on an axle, tilt actuator, two anchored supports and junction box.'
        else:
            station(state)
            socket(e,'ARRAY_IN','power',[0,.15,-2],[0,0,-1],state<3);socket(e,'POWER_OUT','power',[0,.15,2],[0,0,1],state<3)
            collider(e,'station',[0,1.4,0],[5.4,2.8,4.5]);e['description']='Armored inverter cabinet, copper transformer windings, battery modules, cooling fins, telemetry and input/output cables.'
        e['output_capacity']=[180,120,60,0][state] if number<2 else ([30,20,10,0][state] if number==2 else [180,140,80,0][state])
        e['power_radius_m']=28 if number in [0,3] else None
        if state==3:e['description']+=' D3 retains identifiable equipment: '+', '.join(e['damage_ruin_signature'])+'. No functioning power output.'
        print(f'AUTHORED {number*4+state+1}/16 {e["id"]}',flush=True)

if LOD:
    palette=k.material('Solar game / vertex palette',(1,1,1),.25,.6)
    color=palette.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='Color'
    palette.node_tree.links.new(color.outputs['Color'],palette.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    for root,collection,e in k.roots:
        groups={}
        for obj in list(collection.objects):
            if obj.type!='MESH':continue
            attr=obj.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
            for face in obj.data.polygons:
                rgba=obj.data.materials[face.material_index].diffuse_color
                for loop in face.loop_indices:attr.data[loop].color=rgba
                face.material_index=0
            obj.data.materials.clear();obj.data.materials.append(palette)
            target=root
            if LOD==1:
                a=obj.parent
                while a and a!=root:
                    if a.name.startswith('TRACKER_TILT'):target=a;break
                    a=a.parent
            groups.setdefault(target,[]).append(obj)
        for target,objects in groups.items():
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:obj.select_set(True)
            bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
            obj=objects[0];world=obj.matrix_world.copy();obj.parent=target;obj.matrix_world=world;obj.name='SOLAR_GAME_MESH'
        e['lod']=LOD;e['detail']='game' if LOD==1 else 'distance';e['tracking_pivots']=LOD==1
for index,(root,collection,e) in enumerate(k.roots):
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(collection.objects):
        o.select_set(True)
        if o.type=='FONT':bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
        if o.type=='MESH':
            bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
    bpy.context.view_layer.objects.active=root;p=OUT/e['file']
    bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_yup=True,export_cameras=False,export_lights=False)
    data=p.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);blob=data[28+n:]
    for node in doc['nodes']:
        if node.get('extras',{}).get('asset_id')==e['id']:node['name']='ROOT'
        if node.get('name','').startswith('SOCKET_'):node['name']=node['name'].split('.')[0]
    payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4)
    data=struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob;p.write_bytes(data)
    e['draw_calls']=sum(len(m['primitives']) for m in doc.get('meshes',[]))
    e['bytes']=len(data);e['triangles']=sum(doc['accessors'][q['indices']]['count']//3 for m in doc.get('meshes',[]) for q in m['primitives'])
    print(f'EXPORTED {index+1}/16 {e["id"]}',flush=True)
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
for i,(root,collection,e) in enumerate(k.roots):root.location=((i%4)*30,(i//4)*30,0)
scene=bpy.context.scene;scene.name='A6 / Solar power and authored ruins';scene.world.color=(.16,.16,.16)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':area.spaces.active.shading.type='MATERIAL';area.spaces.active.region_3d.view_distance=28;area.spaces.active.region_3d.view_location=(0,0,1)
bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/('a6-solar-power.blend' if not LOD else f'a6-solar-power-lod{LOD}.blend')))
print('SOLAR_POWER_COMPLETE 4 families / 16 exports',flush=True)
