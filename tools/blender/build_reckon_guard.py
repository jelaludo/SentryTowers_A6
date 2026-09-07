"""Original Reckon-Guard ducted-rotor drone. Blender -Y forward, Z up."""
import sys,math,json,struct
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,empty
out=k.PROJECT/'assets/reckon-guard';out.mkdir(parents=True,exist_ok=True)
k.M['armor']=k.material('Midnight teal ceramic',(.055,.16,.19),.5,.38)
k.M['glass']=k.material('Recon optics',(.025,.45,.55),.6,.22,1.2)
e=k.begin('reckon_guard','Reckon-Guard','Intact',[4,4],'Low-poly twin ducted rotor reconnaissance and ground-defense drone.')
def box(n,l,s,m='armor',p=None,r=(0,0,0)):return k.box(n,l,s,m,0,p,r)
def mesh(n,v,f,m,p=None):
 d=bpy.data.meshes.new(n);d.from_pydata(v,[],f);d.update();o=bpy.data.objects.new(n,d);k.active_collection.objects.link(o);o.parent=p or k.active_root;d.materials.append(k.M[m]);return o
def hull(n,stations,m):
 v=[]
 for y,w,z,h in stations:v.extend([(-w,y,z),(0,y,z+h),(w,y,z),(0,y,z-h*.65)])
 f=[(3,2,1,0),(len(v)-4,len(v)-3,len(v)-2,len(v)-1)]
 for j in range(len(stations)-1):
  for i in range(4):a=j*4+i;b=j*4+(i+1)%4;f.append((a,b,b+4,a+4))
 return mesh(n,v,f,m)
hull('Faceted lifting fuselage',[(-1.55,.10,.12,.10),(-.85,.48,.20,.25),(.4,.46,.16,.27),(1.23,.15,.14,.12)],'armor')
hull('Dorsal ceramic spine',[(-1.05,.075,.38,.035),(.2,.17,.43,.055),(.9,.07,.30,.035)],'white')
box('Belly avionics',(0,-.15,-.06),(.52,1.05,.22),'edge')
for sign in [-1,1]:
 side='L' if sign<0 else 'R';x=sign*1.12
 mesh('Swept rotor pylon '+side,[(sign*.28,-.5,.1),(x,-.36,.09),(x,.36,.09),(sign*.3,.64,.1),(sign*.28,-.5,.23),(x,-.36,.22),(x,.36,.22),(sign*.3,.64,.23)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'frame')
 # Hollow polygonal duct: the opening remains real geometry, never a solid disk.
 v=[];segments=16
 for z,r in [(-.03,.78),(.28,.78),(-.03,.66),(.28,.66)]:
  for i in range(segments):a=math.tau*i/segments;v.append((x+r*math.cos(a),r*math.sin(a),z))
 f=[]
 for i in range(segments):j=(i+1)%segments;f.extend([(i,j,j+16,i+16),(i+32,i+48,j+48,j+32),(i+16,j+16,j+48,i+48),(i,i+32,j+32,j)])
 mesh('Armored open fan duct '+side,v,f,'armor')
 rotor=empty('ROTOR_'+side,(x,0,.12));rotor['axis']='local +Y in glTF';rotor['spin_sign']=sign
 for i in range(5):
  a=math.tau*i/5
  blade=mesh('Swept fan blade '+side+str(i),[(.12,-.045,0),(.58,-.10,0),(.62,.025,.018),(.19,.08,.018)],[(0,1,2,3)],'edge',rotor);blade.rotation_euler.z=a
 k.cylinder('Motor hub '+side,(0,0,0),.14,.2,'frame',parent=rotor,vertices=10)
 for angle in [0,math.pi]:
  a=(x+.16*math.cos(angle),.16*math.sin(angle),-.035);b=(x+.65*math.cos(angle),.65*math.sin(angle),-.035);k.beam('Lower motor brace '+side,a,b,.022,'frame')
 box('Navigation lamp '+side,(x+sign*.76,0,.17),(.045,.18,.055),'signal' if sign<0 else 'fault')
 mesh('Canted tail fin '+side,[(sign*.16,.66,.26),(sign*.48,1.19,.55),(sign*.43,1.48,.51),(sign*.14,1.14,.17)],[(0,1,2,3),(3,2,1,0)],'armor')
 for y in [-.65,.65]:k.beam('Landing strut '+side,(sign*.32,y,-.04),(sign*.5,y,-.48),.035,'frame')
 box('Landing skid '+side,(sign*.5,0,-.49),(.07,1.8,.065),'edge')
 for y in [.3,.43,.56]:box('Cooling louver '+side,(sign*.32,y,.34),(.15,.045,.025),'dark')
box('Forward sensor mask',(0,-1.24,.13),(.27,.075,.13),'dark')
for x in [-.075,.075]:k.cylinder('Recon camera lens',(x,-1.29,.14),.043,.025,'glass',axis='Y',vertices=10)
k.beam('Dorsal antenna',(0,.65,.35),(0,.75,.67),.018,'edge')
gimbal=empty('GIMBAL',(0,-.65,-.17));gimbal.rotation_euler.x=math.radians(55);gimbal['barrel_forward']='local +Z in glTF';gimbal['pitch_limits_degrees']=[20,85]
k.cylinder('Gimbal trunnion',(0,0,0),.13,.34,'frame',axis='X',parent=gimbal,vertices=10)
recoil=empty('RECOIL',(0,0,0),gimbal)
box('Pulse cannon receiver',(0,-.17,0),(.22,.35,.19),'edge',recoil)
for x in [-.105,.105]:box('Induction rail',(x,-.46,0),(.055,.44,.07),'white',recoil)
k.cylinder('Projectile barrel',(0,-.46,0),.056,.52,'frame',axis='Y',parent=recoil,vertices=10)
k.cylinder('Dark muzzle bore',(0,-.725,0),.043,.012,'dark',axis='Y',parent=recoil,vertices=10)
muzzle=empty('MUZZLE_00',(0,-.74,0),recoil);muzzle['forward']='local +Z in glTF';muzzle['purpose']='runtime projectile spawn'
for name,sign in [('ROTOR_L',-1),('ROTOR_R',1)]:
 o=bpy.data.objects[name]
 for frame,angle in [(0,0),(30,sign*math.tau)]:o.rotation_euler.z=angle;o.keyframe_insert(data_path='rotation_euler',frame=frame)
 o.animation_data.action.name='RotorSpin'
 for layer in o.animation_data.action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for curve in bag.fcurves:
     for p in curve.keyframe_points:p.interpolation='LINEAR'
bpy.context.scene.render.fps=30;bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=30;bpy.context.scene.frame_set(0)
# Merge fixed geometry per parent and material to limit draw calls while preserving articulation.
groups={}
for o in list(k.active_collection.objects):
 if o.type=='MESH':groups.setdefault((o.parent,o.data.materials[0].name),[]).append(o)
for group in groups.values():
 bpy.ops.object.select_all(action='DESELECT')
 for o in group:o.select_set(True)
 bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join()
import bmesh
for o in k.active_collection.objects:
 if o.type=='MESH':
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
bpy.ops.object.select_all(action='SELECT')
p=out/'reckon_guard.glb';bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_force_sampling=True)
d=p.read_bytes();n=struct.unpack_from('<I',d,12)[0];doc=json.loads(d[20:20+n])
for a in doc.get('animations',[]):a['name']='RotorSpin'
payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*(-len(payload)%4);chunks=d[20+n:];p.write_bytes(struct.pack('<III',0x46546c67,2,20+len(payload)+len(chunks))+struct.pack('<II',len(payload),0x4e4f534a)+payload+chunks)
e.update(bytes=p.stat().st_size,triangles=sum(doc['accessors'][q['indices']]['count']//3 for m in doc['meshes'] for q in m['primitives']),animations=[a['name'] for a in doc.get('animations',[])],articulation=['ROTOR_L','ROTOR_R','GIMBAL','RECOIL','MUZZLE_00'])
(out/'manifest.json').write_text(json.dumps(dict(units='meters',up='+Y',forward='+Z',assets=[e]),indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-reckon-guard.blend'));print('RECKON_GUARD_COMPLETE',e['triangles'],e['bytes'],e['animations'],flush=True)
