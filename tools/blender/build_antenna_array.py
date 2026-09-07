"""SKYWARD: one 18 m radio dish, three detail levels, four states and synchronized array."""
import sys,math,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,Vector
OUT=k.PROJECT/'assets/antenna-array';OUT.mkdir(exist_ok=True)
k.M['dish']=k.material('Reflector / warm ceramic',(.68,.73,.69),.42,.38)
k.M['panel']=k.material('Reflector / alternate panel',(.51,.61,.60),.55,.40)
k.M['scar']=k.material('Impact / scorched ceramic',(.07,.075,.065),.2,.88)
k.M['cyan']=k.material('Control / cyan',(.02,.6,.8),.25,.3,2)
TAU=math.tau

def mesh(name,verts,faces,mat,parent):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);k.active_collection.objects.link(o);o.parent=parent;data.materials.append(k.M[mat]);return o

def tube(name,a,b,r,mat,parent,n=8):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized();side=axis.cross(Vector((0,0,1)))
    if side.length<.01:side=axis.cross(Vector((0,1,0)))
    side.normalize();up=axis.cross(side)
    verts=[tuple(p+r*(side*math.cos(i*TAU/n)+up*math.sin(i*TAU/n))) for p in [a,b] for i in range(n)]
    faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    return mesh(name,verts,faces,mat,parent)

def bowl(r,a):return Vector((r*math.cos(a),r*math.sin(a),1.2+r*r/26))
def box(name,loc,size,mat,parent):return k.box(name,loc,size,mat,.035,parent)
def slew(yaw,pitch):
    # Two deliberate moves and a return, with time to settle at each bearing.
    keys=[(0,-28,38),(4,-28,38),(15,38,66),(20,38,66),(31,-16,26),(35,-16,26),(44,-28,38)]
    for o,axis,values in [(yaw,2,[(t,math.radians(y)) for t,y,e in keys]),(pitch,0,[(t,math.radians(90-e)) for t,y,e in keys])]:
        o.animation_data_create();o.animation_data.action=bpy.data.actions.new('Slew_'+o.name)
        for j in range(len(values)-1):
            t0,a=values[j];t1,b=values[j+1]
            for frame in range(round(t0*30),round(t1*30)+1):
                t=(frame/30-t0)/(t1-t0);smooth=t*t*t*(t*(t*6-15)+10)
                o.rotation_euler[axis]=a+(b-a)*smooth;o.keyframe_insert('rotation_euler',frame=frame)
        action=o.animation_data.action;o.animation_data.action=None;track=o.animation_data.nla_tracks.new();track.name='Array_Slew';strip=track.strips.new('Array_Slew',0,action);strip.extrapolation='NOTHING'

for detail,n,rings,ribs in [('low',24,4,8),('medium',48,8,12),('high',96,14,24)]:
 for damage in range(4):
    e=k.begin(f'skyward_{detail}_d{damage}','SKYWARD / 18 m antenna',['Intact','Damaged','Critical','Destroyed'][damage],[36,36],'')
    e.update(detail=detail,damage_level=damage,functional=damage<2,diameter_m=18,kind='antenna',animations=['Array_Slew'] if damage<2 else [])
    root=k.active_root;root['role']='antenna';root['damage_level']=damage
    box('Concrete octagonal pad',(0,0,.22),(8,8,.44),'concrete',root)
    tube('Foundation bearing',(0,0,.44),(0,0,1.3),2.7,'edge',root,24 if detail=='low' else 48)
    box('Pedestal',(0,0,2.7),(3.6,3.6,3.0),'armor',root)
    box('Control cabinet',(2.4,0,1.55),(1.0,2.1,2.0),'frame',root)
    box('Monitoring screen',(2.92,-.25,1.9),(.035,.75,.46),'cyan' if damage<2 else 'dark',root)
    for x in [-2.9,2.9]:
        for y in [-2.9,2.9]:tube('Foundation anchor',(x,y,.44),(x,y,.62),.16,'frame',root,6)
    yaw=k.empty('AZIMUTH',(0,0,4.1),root);yaw['control']='azimuth'
    tube('Azimuth race',(0,0,-.22),(0,0,.28),2.5,'frame',yaw,24 if detail=='low' else 48)
    for x in [-3.8,3.8]:
        box('Fork tower',(x,0,1.7 if damage==3 else 3.8),(.85,2.8,3.4 if damage==3 else 7.6),'armor',yaw)
        tube('Fork lower brace',(x,0,1.2),(math.copysign(1.6,x),0,.1),.32,'frame',yaw)
        tube('Elevation bearing',(x-.6,0,3.4 if damage==3 else 7.7),(x+.6,0,3.4 if damage==3 else 7.7),.85,'frame',yaw,12 if detail=='low' else 32)
    box('Fork crossmember',(0,0,.55),(8.5,2.7,1.1),'armor',yaw)
    pitch=k.empty('ELEVATION',(0,0,7.7),yaw);pitch['control']='elevation';pitch['elevation_limits_deg']=[15,85]
    if damage==3:
        pitch.parent=root;pitch.location=(5.7,-1,3);pitch.rotation_euler=(math.radians(76),.16,.28)
    else:pitch.rotation_euler.x=math.radians(52 if damage<2 else 68)
    tube('Receiver rear housing',(0,0,-.8),(0,0,1.1),1.1,'frame',pitch,12 if detail=='low' else 32)
    tube('Trunnion shaft',(-4.3,0,0),(4.3,0,0),.35,'edge',pitch)
    # Individually bounded solid reflector panels; gaps read at medium/high detail.
    for ring in range(rings):
        r0=max(.12,9*ring/rings);r1=9*(ring+1)/rings
        for j in range(n):
            missing=(damage==1 and ring==rings-1 and j in [2,3]) or (damage>=2 and j<n//4 and ring>rings//3)
            if missing:continue
            gap=.001 if detail=='low' else .004
            a=j*TAU/n+gap;b=(j+1)*TAU/n-gap
            points=[bowl(r0,a),bowl(r1,a),bowl(r1,b),bowl(r0,b)]
            if damage>=2 and j>n*.75 and ring==rings-1:
                points=[v+Vector((0,0,-.6*(i%2))) for i,v in enumerate(points)]
            verts=[tuple(v+Vector((0,0,d))) for d in [0,-.13] for v in points]
            mat='scar' if damage and j in [4,5,6] and ring>rings//2 else ('dish' if (ring+j)%3 else 'panel')
            mesh('Reflector panel',verts,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],mat,pitch)
    for j in range(n):
        if damage>=2 and j<n//4:continue
        a=bowl(9,j*TAU/n);b=bowl(9,(j+1)*TAU/n);tube('Rim box beam',a,b,.11,'frame',pitch,6 if detail=='low' else 8)
    for j in range(ribs):
        a=j*TAU/ribs
        for r0,r1 in [(1,3),(3,6),(6,9)]:
            tube('Rear radial rib',bowl(r0,a)-Vector((0,0,.45)),bowl(r1,a)-Vector((0,0,.45)),.13,'frame',pitch,6 if detail=='low' else 10)
        if detail!='low':tube('Rear truss diagonal',(0,0,-.5),bowl(7.5,a)-Vector((0,0,.35)),.07,'edge',pitch)
    for j in range(4):
        if damage>=2 and j==0:continue
        a=TAU*j/4+math.pi/4;tube('Feed support',bowl(7.5,a),(0,0,7.4 if damage<2 else 5.8),.13 if detail=='low' else .10,'frame',pitch)
    tube('Secondary reflector',(0,0,7.1 if damage<2 else 5.5),(0,0,7.5 if damage<2 else 5.9),.65,'edge',pitch,12 if detail=='low' else 32)
    if detail!='low':
        for z in [1+i*.35 for i in range(20)]:tube('Access ladder rung',(-4.3,-1.5,z),(-3.3,-1.5,z),.035,'edge',yaw,6)
        for x in [-4.3,-3.3]:tube('Access ladder rail',(x,-1.5,1),(x,-1.5,7.8),.055,'frame',yaw)
        for x in [-1,1]:
            box('Drive motor',(x*2.1,1.7,.25),(.9,1.0,.75),'frame',yaw)
    if damage>=2:
        for j in range(3):box('Detached reflector fragment',(-5+j*1.1,-4,.58),(1,.8,.22),'dish',root)
    if damage==3:
        bpy.context.view_layer.update()
        lowest=min((o.matrix_world@v.co).z for o in pitch.children_recursive if o.type=='MESH' for v in o.data.vertices)
        pitch.location.z+=.12-lowest
    if damage<2:slew(yaw,pitch)
    else:yaw.rotation_euler.z=-.2
    e['description']=f'18 m segmented reflector with a heavy fork mount, rear radial bracing, feed supports and separate azimuth/elevation pivots. {detail.capitalize()} detail; '+('44-second synchronized slew loop.' if damage<2 else 'Disabled damaged assembly.' )
    print('AUTHORED',e['id'],flush=True)
    if detail=='low' and damage==0:template=(root,k.active_collection)

# Seven copies share mesh data and the same phased motion, preserving each mount.
e=k.begin('skyward_array','SKYWARD / Seven-dish array','Intact',[190,190],'Seven synchronized low-detail dishes on a compact Y layout with service tracks and a control hut.')
e.update(kind='array',detail='low',damage_level=0,functional=True,animations=['Array_Slew'],antenna_count=7)
arrayroot=k.active_root
positions=[(0,0)]+[(r*math.cos(a),r*math.sin(a)) for a in [math.pi/2,7*math.pi/6,11*math.pi/6] for r in [40,80]]
for index,(x,y) in enumerate(positions):
    source,col=template;mapping={}
    for original in col.objects:
        copy=original.copy();copy.name=f'A{index:02d}_'+original.name.split('.')[0];k.active_collection.objects.link(copy);mapping[original]=copy
    for original,copy in mapping.items():copy.parent=mapping.get(original.parent,arrayroot)
    mapping[source].location=(x,y,0);mapping[source]['array_index']=index
    if index:
        length=math.hypot(x,y);tube('Buried service route',(0,0,.02),(x,y,.02),.10,'frame',arrayroot,6)
for a in [math.pi/2,7*math.pi/6,11*math.pi/6]:
    for r in [20,60]:
        marker=box('Service lane',(r*math.cos(a),r*math.sin(a),-.03),(4.5,40,.06),'concrete',arrayroot);marker.rotation_euler.z=a-math.pi/2
box('Array operations shelter',(17,10,1.8),(7,5,3.6),'frame',arrayroot)
box('Operations door',(17,7.46,1.5),(1.6,.08,2.8),'edge',arrayroot)
box('Operations status strip',(19,7.43,2.3),(1.5,.04,.3),'cyan',arrayroot)
# Batch static pieces within each moving assembly before animation export.
# This keeps the reflector tessellation while avoiding thousands of evaluated objects.
for root,col,entry in k.roots:
    groups={}
    for obj in list(col.objects):
        if obj.type=='MESH':groups.setdefault((obj.parent,obj.active_material),[]).append(obj)
    for (parent,material),objects in groups.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        objects[0].data=objects[0].data.copy()
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
        objects[0].name='Geometry_'+parent.name+'_'+material.name
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=1320
for root,col,entry in k.roots:
    bpy.ops.object.select_all(action='DESELECT');scene.frame_set(0)
    for o in col.objects:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(OUT/entry['file']),export_format='GLB',use_selection=True,export_extras=True,export_animations=bool(entry['animations']),export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_cameras=False,export_lights=False)
(OUT/'manifest.json').write_text(json.dumps(dict(assets=k.manifest,diameter_m=18,cycle_s=44),indent=2)+'\n')
for i,(root,col,entry) in enumerate(k.roots[:-1]):root.location=((i%4)*40,140+(i//4)*40,0)
scene.name='SKYWARD / Antenna array and detail studies';scene.frame_set(330)
for root,col,entry in k.roots[:-1]:col.hide_viewport=True
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active;sp.region_3d.view_location=(0,0,8);sp.region_3d.view_distance=245
            sp.region_3d.view_rotation=Vector((3,-5,4)).to_track_quat('Z','Y');sp.shading.color_type='MATERIAL'
            sp.overlay.show_relationship_lines=False;sp.overlay.show_extras=False
bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-antenna-array.blend'))
print('SKYWARD_COMPLETE',flush=True)
