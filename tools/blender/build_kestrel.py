"""Original detailed EVA character: lean functional suit, opaque visor, authored wear."""
import bpy,sys,math,json,struct,random
from pathlib import Path
from mathutils import Vector
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
import character_rig as rig
P=Path(__file__).resolve().parents[2];OUT=P/'assets/kestrel';OUT.mkdir(exist_ok=True)
if not bpy.app.background:raise RuntimeError('Build in background mode.')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for side,sign in [('L',1),('R',-1)]:
    for bone,x in [('upper_arm',.285),('forearm',.32),('hand',.335),('index',.36),('thigh',.12),('shin',.12),('foot',.12)]:rig.HEADS[bone+'_'+side].x=sign*x
body=rig.MeshBuilder();proxy=rig.MeshBuilder()
# Each component's actual bounds provide a small conservative grounding proxy.
def sphere(c,r,mat,bone,segments=64,rings=32):
    body.ellipsoid(c,r,mat,bone,segments,rings);proxy.box(c,tuple(v*2 for v in r),mat,bone)
def box(c,size,mat,bone):body.box(c,size,mat,bone);proxy.box(c,size,mat,bone)
def limb(a,b,rx,ry,mat,bone):
    a,b=Vector(a),Vector(b);center=(a+b)/2;q=(b-a).to_track_quat('Z','Y');start=len(body.v)
    body.ellipsoid((0,0,0),(rx,ry,(b-a).length/2+.035),mat,bone,64,32)
    for i in range(start,len(body.v)):body.v[i]=center+q@Vector(body.v[i])
    points=body.v[start:];lo=[min(v[j] for v in points) for j in range(3)];hi=[max(v[j] for v in points) for j in range(3)];proxy.box(tuple((lo[j]+hi[j])/2 for j in range(3)),tuple(hi[j]-lo[j] for j in range(3)),mat,bone)
def ring(c,rx,ry,t,mat,bone):
    verts=[];n=64;m=8
    for i in range(n):
        a=i*math.tau/n
        for j in range(m):
            b=j*math.tau/m;verts.append((c[0]+(rx+t*math.cos(b))*math.cos(a),c[1]+(ry+t*math.cos(b))*math.sin(a),c[2]+t*math.sin(b)))
    faces=[(i*m+j,((i+1)%n)*m+j,((i+1)%n)*m+(j+1)%m,i*m+(j+1)%m) for i in range(n) for j in range(m)];body.add(verts,faces,mat,bone)
# Material slots: technical textile, joint seals, ceramic plates, opaque visor,
# status cyan, ochre ID marks, titanium, abraded edge.
sphere((0,0,1.015),(.18,.115,.16),0,'hips')
sphere((0,0,1.23),(.185,.115,.21),0,'spine')
sphere((0,0,1.46),(.218,.135,.215),0,'chest')
sphere((0,-.095,1.49),(.177,.071,.156),2,'chest')
for x in [-.105,.105]:box((x,-.142,1.385),(.065,.018,.15),6,'chest')
box((0,-.17,1.49),(.10,.026,.09),6,'chest');box((-.025,-.186,1.511),(.031,.008,.025),4,'chest')
for x in [.017,.042]:box((x,-.186,1.478),(.012,.008,.02),5,'chest')
for z in [1.64+i*.014 for i in range(6)]:ring((0,0,z),.105,.097,.009,1,'neck')
sphere((0,0,1.845),(.205,.183,.245),2,'head',96,48)
# A continuous black faceplate: no face or transparent material behind it.
verts=[];segments=96;rows=40
for j in range(rows+1):
    lat=math.radians(-28+65*j/rows)
    for i in range(segments+1):
        a=math.radians(-76+152*i/segments);verts.append((.209*math.sin(a)*math.cos(lat),-.190*math.cos(a)*math.cos(lat),1.86+.232*math.sin(lat)))
body.add(verts,[(j*(segments+1)+i,j*(segments+1)+i+1,(j+1)*(segments+1)+i+1,(j+1)*(segments+1)+i) for j in range(rows) for i in range(segments)],3,'head')
for sign in [-1,1]:
    sphere((sign*.194,.005,1.86),(.028,.075,.088),6,'head',48,24)
    box((sign*.102,-.128,2.036),(.063,.035,.035),6,'head');box((sign*.102,-.15,2.037),(.038,.008,.017),4,'head')
ring((0,0,1.66),.137,.125,.016,6,'chest')
# Close-fitting pack, removable cartridges and protected side umbilicals.
box((0,.176,1.43),(.285,.12,.36),6,'chest')
sphere((0,.20,1.46),(.128,.071,.175),2,'chest',64,32)
for sign in [-1,1]:
    limb((sign*.123,.22,1.28),(sign*.123,.22,1.60),.037,.04,6,'chest')
    for z in [1.29,1.58]:ring((sign*.123,.22,z),.037,.04,.008,5,'chest')
    for j in range(10):box((sign*.055,.271,1.35+j*.017),(.075,.012,.006),1,'chest')
for z in [1.08,1.105]:ring((0,0,z),.186,.12,.012,6,'hips')
box((0,-.134,1.10),(.072,.022,.06),6,'hips')
for side,sign in [('L',1),('R',-1)]:
    u=rig.HEADS['upper_arm_'+side];el=rig.HEADS['forearm_'+side];wr=rig.HEADS['hand_'+side];hip=rig.HEADS['thigh_'+side];kn=rig.HEADS['shin_'+side];an=rig.HEADS['foot_'+side]
    sphere(u,(.094,.095,.095),1,'upper_arm_'+side,48,24)
    limb(u,el,.079,.080,0,'upper_arm_'+side);sphere((u.x,0,1.585),(.095,.10,.098),2,'upper_arm_'+side)
    sphere(el,(.072,.074,.080),1,'forearm_'+side,48,24);limb(el,wr,.074,.074,0,'forearm_'+side)
    sphere((el.x,-.05,1.17),(.065,.032,.102),2,'forearm_'+side)
    for z in [1.24+i*.016 for i in range(5)]:ring((el.x,0,z),.071,.071,.007,1,'forearm_'+side)
    for z in [1.025,1.055]:ring((wr.x,0,z),.074,.074,.009,6,'hand_'+side)
    sphere((wr.x,-.006,.955),(.062,.045,.085),1,'hand_'+side)
    for j in range(4):limb((wr.x+sign*(j-1.5)*.022,-.018,.925),(wr.x+sign*(j-1.5)*.022,-.035,.865),.009,.012,1,'hand_'+side)
    limb((wr.x-sign*.053,-.018,.975),(wr.x-sign*.082,-.045,.928),.018,.018,1,'hand_'+side)
    limb(hip,kn,.097,.098,0,'thigh_'+side)
    sphere((hip.x,-.065,.78),(.078,.032,.155),2,'thigh_'+side)
    sphere(kn,(.083,.083,.081),1,'shin_'+side,48,24);limb(kn,an,.075,.081,0,'shin_'+side)
    sphere((kn.x,-.072,.555),(.074,.036,.084),2,'shin_'+side)
    sphere((an.x,-.055,.35),(.063,.029,.137),2,'shin_'+side)
    for z in [.49+i*.016 for i in range(5)]:ring((kn.x,0,z),.079,.079,.007,1,'shin_'+side)
    for z in [.13,.155,.18]:ring((an.x,0,z),.077,.077,.008,1,'foot_'+side)
    sphere((an.x,-.060,.08),(.083,.145,.078),1,'foot_'+side)
    box((an.x,-.059,.018),(.165,.264,.032),6,'foot_'+side)
    for y in [-.17,-.12,-.07,-.02,.03]:box((an.x,y,.006),(.17,.025,.012),1,'foot_'+side)
    sphere((an.x,-.132,.077),(.079,.070,.048),2,'foot_'+side)
    box((sign*.198,.018,1.03),(.071,.10,.15),6,'hips')
    box((sign*.238,-.005,1.03),(.016,.067,.065),5,'hips')
# Small attached ID strips and seam stitching give close views useful surface detail.
for sign in [-1,1]:
    box((sign*.10,-.164,1.60),(.06,.012,.027),5,'chest')
    for j in range(22):
        z=1.28+j*.012;x=sign*(.15+.014*math.sin(j*.14));box((x,-.111,z),(.012,.005,.003),7,'spine' if z<1.40 else 'chest')
    for j in range(16):box((sign*.165,-.075,.65+j*.016),(.006,.006,.003),7,'thigh_'+('L' if sign>0 else 'R'))
# Original texture fields: fine textile variation, accumulated grime and sparse scuffs.
rng=np.random.default_rng(614);size=1024
noise=rng.random((size,size)).astype(np.float32);wear=np.zeros((size,size),dtype=np.float32)
for _ in range(850):
    x=int(rng.integers(0,size-30));y=int(rng.integers(0,size-4));length=int(rng.integers(2,24));wear[y:y+int(rng.integers(1,3)),x:x+length]=rng.uniform(.15,.55)
y,x=np.mgrid[0:size,0:size];grime=(np.sin(x*.023)*np.cos(y*.017)+np.sin(y*.041+x*.011))*.035
colors=[(.13,.19,.20),(.022,.031,.035),(.58,.64,.60),(.012,.026,.031),(.03,.65,.82),(.75,.38,.075),(.12,.18,.19),(.49,.52,.45)]
mats=[]
for i,color in enumerate(colors):
    m=rig.material('KESTREL / '+['technical weave','joint seals','weathered ceramic','opaque visor','status cyan','ochre ID','titanium fittings','worn seams'][i],color,.65 if i in [3,6] else .24 if i==2 else .12,.13 if i==3 else .62,1.5 if i==4 else 0)
    if i in [0,2,5,6]:
        pixels=np.ones((size,size,4),dtype=np.float32)
        for c in range(3):pixels[:,:,c]=np.clip(color[c]*(.86+noise*.09+grime)+wear*.34,0,1)
        img=bpy.data.images.new('Kestrel authored wear '+str(i),size,size,alpha=True);img.pixels.foreach_set(pixels.ravel());img.pack();tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;m.node_tree.links.new(tex.outputs['Color'],m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    mats.append(m)
col=bpy.data.collections.new('KESTREL');bpy.context.scene.collection.children.link(col);arm=rig.create_rig(col,'kestrel');arm['author']='jelaludo'
data=bpy.data.meshes.new('Kestrel tailored suit');data.from_pydata(body.v,[],body.faces);data.update();skin=bpy.data.objects.new('KESTREL_SKIN',data);col.objects.link(skin)
for m in mats:data.materials.append(m)
for poly,slot in zip(data.polygons,body.materials):poly.material_index=slot;poly.use_smooth=len(poly.vertices)==4 and slot not in [5,7]
uv=data.uv_layers.new(name='Suit wear UV')
for poly in data.polygons:
    for li in poly.loop_indices:
        v=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=((v.x+.55)/1.1,v.z/2.15)
for n in rig.HEADS:
    group=skin.vertex_groups.new(name=n);indices=[i for i,b in enumerate(body.bones) if b==n]
    if indices:group.add(indices,1,'REPLACE')
mod=skin.modifiers.new('Original shared humanoid rig','ARMATURE');mod.object=arm
skin['author']='jelaludo';skin['deformation']='Rigid weighted tailored suit components with overlapping flexible joint seals'
for name,duration,loop,speed in rig.CLIPS:
    rig.author_action(arm,name,duration,proxy);print('ANIMATED',name,flush=True)
for track in arm.animation_data.nla_tracks:track.mute=False
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=120;scene.frame_set(0)
bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);skin.select_set(True);bpy.context.view_layer.objects.active=arm
path=OUT/'kestrel_eva.glb';bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n]);triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives'])
entry=dict(id='kestrel',name='KESTREL / Frontier EVA',file=path.name,triangles=triangles,bytes=len(b),joints=len(rig.HEADS),author='jelaludo',animations=[dict(name=n,duration_s=d,loop=l,preview_speed_mps=s) for n,d,l,s in rig.CLIPS],description='Original detailed EVA astronaut: lean layered suit, opaque visor, compact life support, utility fittings and authored surface wear.')
(OUT/'manifest.json').write_text(json.dumps(dict(assets=[entry]),indent=2)+'\n')
for track in arm.animation_data.nla_tracks:track.mute=track.name!='Idle'
scene.frame_set(0);scene.name='KESTREL / Original frontier EVA'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            sp=area.spaces.active;sp.region_3d.view_location=(0,0,1);sp.region_3d.view_distance=3.5;sp.region_3d.view_rotation=Vector((2,-5,2)).to_track_quat('Z','Y');sp.shading.type='MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-kestrel.blend'));print('KESTREL_COMPLETE',triangles,flush=True)
