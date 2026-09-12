"""KORP GS01: authored via Blender MCP. Run build(0), build(1), build(2), then export_all().
Creates separate scenes without deleting the artist's existing scene.
"""
import bpy,math,json,struct
from pathlib import Path
from mathutils import Vector,Matrix,Quaternion
P=Path('/Users/jela/Dev/SentryTowers_A6');OUT=P/'assets/korp';OUT.mkdir(exist_ok=True)
COLORS={'hull':(.055,.105,.12,1),'plate':(.19,.28,.29,1),'edge':(.32,.40,.40,1),'dark':(.018,.030,.035,1),'cyan':(.04,.80,1,1),'yellow':(.92,.57,.10,1),'glass':(.015,.06,.075,1)}
built=[]
def mesh(name,v,f,mat='hull',parent=None):
 me=bpy.data.meshes.new(name);me.from_pydata(v,[],f);me.update();o=bpy.data.objects.new(name,me);col.objects.link(o);o.parent=parent or root;o['export_name']=name;me.materials.append(mats[mat])
 import bmesh
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
 return o

def empty(name,loc=(0,0,0),parent=None):
 o=bpy.data.objects.new(name,None);col.objects.link(o);o.parent=parent or root;o.location=loc;o['export_name']=name;o.empty_display_size=.3;return o

def box(name,loc,size,mat='hull',parent=None,rot=(0,0,0),bevel=False):
 x,y,z=[v/2 for v in size];o=mesh(name,[(-x,-y,-z),(x,-y,-z),(x,y,-z),(-x,y,-z),(-x,-y,z),(x,-y,z),(x,y,z),(-x,y,z)],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat,parent);o.location=loc;o.rotation_euler=rot
 if bevel and lod==0:
  m=o.modifiers.new('Armor edge bevel','BEVEL');m.width=.045;m.segments=2
  bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.modifier_apply(modifier=m.name);o.select_set(False)
 return o

def prism(name,outline,z0,z1,mat='hull',parent=None):
 n=len(outline);return mesh(name,[(x,y,z) for z in [z0,z1] for x,y in outline],[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)],mat,parent)

def loft(name,stations,mat='hull',parent=None,cap=True):
 v=[]
 for y,w,b,t in stations:
  v.extend([(w*.72,y,b),(w,y,b+.3),(w,y,t-.35),(w*.7,y,t),(-w*.7,y,t),(-w,y,t-.35),(-w,y,b+.3),(-w*.72,y,b)])
 f=[tuple(reversed(range(8)))];f +=[(j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i) for j in range(len(stations)-1) for i in range(8)]
 if cap:f.append(tuple(range(len(v)-8,len(v))))
 return mesh(name,v,f,mat,parent)

def cyl(name,loc,r,length,mat='edge',parent=None,n=None,axis='Y'):
 n=n or (16 if lod==0 else 8 if lod==1 else 6);v=[]
 for end in [-length/2,length/2]:
  for i in range(n):
   a=math.tau*i/n;v.append((r*math.cos(a),end,r*math.sin(a)) if axis=='Y' else (r*math.cos(a),r*math.sin(a),end))
 o=mesh(name,v,[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],mat,parent);o.location=loc;return o

def clip(o,name,prop,keys):
 saved=getattr(o,prop).copy();o.animation_data_create();o.animation_data.action=bpy.data.actions.new(name+'_'+o['export_name'])
 for time,value in keys:setattr(o,prop,value);o.keyframe_insert(data_path=prop,frame=time*30)
 action=o.animation_data.action
 for layer in action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for fc in bag.fcurves:
     for key in fc.keyframe_points:key.interpolation='LINEAR'
 o.animation_data.action=None;t=o.animation_data.nla_tracks.new();t.name=name;st=t.strips.new(name,0,action);st.extrapolation='NOTHING';t.mute=True;setattr(o,prop,saved)

def build(level):
 global lod,scene,col,root,mats
 lod=level;scene=bpy.data.scenes.new(f'KORP_LOD{lod}');scene.render.fps=30;bpy.context.window.scene=scene;col=scene.collection
 mats={}
 for key,color in COLORS.items():
  m=bpy.data.materials.new('KORP_'+key);m.diffuse_color=color;m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=color;bs.inputs['Metallic'].default_value=.6;bs.inputs['Roughness'].default_value=.4
  if key=='cyan':bs.inputs['Emission Color'].default_value=color;bs.inputs['Emission Strength'].default_value=2
  mats[key]=m
 root=bpy.data.objects.new('KORP_ROOT',None);col.objects.link(root);root['export_name']='KORP_ROOT';root['credit']='Models by jelaludo';root['asset_id']=f'korp_d0_lod{lod}'
 hull=empty('HULL');loft('Armored fuselage',[(-14,1.1,4.1,5.2),(-11,2.05,3.5,6.2),(-6,3.0,3.5,7.0),(5,2.8,3.5,7.0),(11,2.35,3.5,6.5)],parent=hull,cap=False)
 loft('Dorsal spine',[(-10,.6,5.7,6.2),(-5,1.1,6.8,7.25),(7,1.1,6.8,7.25)],'plate',hull)
 for side,label in [(-1,'L'),(1,'R')]:
  prism('Main wing '+label,[(side*2.4,-2),(side*5.2,-2.2),(side*11.5,1),(side*11.5,4.1),(side*4.0,4.5),(side*2.4,3)],5.05,5.6,'hull',hull)
  prism('Wing armor '+label,[(side*3.4,-1.45),(side*5.1,-1.6),(side*10.2,1.1),(side*10.0,3.3),(side*4.1,3.75)],5.61,5.70,'plate',hull)
  prism('Tailplane '+label,[(side*2.2,7.3),(side*7.1,8.0),(side*7.1,10.8),(side*2.2,10.5)],5.4,5.85,'plate',hull)
  # Twin broad swept fins, with constant thickness and chamfered outline.
  x=side*5.4;mesh('Tail fin '+label,[(x+d,y,z) for d in [-.13,.13] for y,z in [(7.7,5.8),(9.4,10.0),(10.2,10.2),(10.7,5.8)]],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'hull',hull)
  box('Tail fin cap '+label,(x,9.7,10.05),(.3,.8,.16),'yellow',hull)
  for j,y in enumerate([-8,-4,0,4,8]):
   if lod<2:
    w=1.15 if y==-8 else 1.4;box('Roof plate '+label+str(j),(side*1.65,y,6.65 if y==-8 else 7.03),(w,3.25,.10),'plate',hull,bevel=True)
  box('Cockpit glazing '+label,(side*.68,-10.4,6.05),(1.0,1.25,.12),'glass',hull,rot=(.24,side*.08,0))
  box('Cheek armor '+label,(side*2.5,-7,4.95),(.6,3.6,1.15),'plate',hull,bevel=True)
  for j in range(3 if lod<2 else 1):box('Nose sensor '+label+str(j),(side*(.5+j*.25),-13.7,4.8),(.14,.07,.16),'cyan',hull)
  box('Wing service stripe '+label,(side*9.2,2.0,5.78),(.2,1.2,.06),'yellow',hull)
  if lod<2:
   for j in range(10 if lod==0 else 4):box('Wing radiator '+label+str(j),(side*6.7,.0+j*.3,5.79),(2.0,.10,.08),'dark',hull)
   for j in range(6):box('Side applique '+label+str(j),(side*2.96,-3+j*1.5,5.8),(.10,1.05,.65),'plate',hull)
 # Four MORK-shaped, fully named tilting engine pods.
 for label,x,y in [('FL',-11,2),('FR',11,2),('RL',-6.5,9),('RR',6.5,9)]:
  eng=empty('ENGINE_'+label+'_PITCH',(x,y,5.4));loft('Nacelle '+label,[(-2.5,.65,-.6,.65),(-1.5,1.15,-.85,1.1),(1.7,1.1,-.85,1.0),(2.5,.8,-.6,.65)],parent=eng)
  box('Nacelle shield '+label,(0,.1,1.13),(1.65,2.5,.13),'plate',eng,bevel=True)
  box('Intake recess '+label,(0,-2.48,0),(1.05,.07,.85),'dark',eng)
  box('Exhaust surround '+label,(0,2.52,0),(1.4,.16,1.1),'edge',eng)
  box('Exhaust light '+label,(0,2.62,0),(1.0,.06,.76),'cyan',eng)
  empty('SOCKET_EXHAUST_'+label,(0,2.7,0),eng)
  if lod<2:
   for j in [-1,0,1]:box('Intake vane '+label+str(j),(j*.27,-2.54,0),(.07,.06,.65),'edge',eng)
  if lod==0:
   for j in range(5):box('Engine cooling '+label+str(j),(1.12,-.9+j*.4,.2),(.08,.13,.7),'dark',eng)
 # Twin cheek-mounted rotary cannons and lower centerline heavy cannon.
 for label,x,y,z,heavy in [('L',-2.65,-8.2,3.95,False),('R',2.65,-8.2,3.95,False),('HEAVY',0,-8.3,3.0,True)]:
  yaw=empty('GUN_'+label+'_YAW',(x,y,z));pitch=empty('GUN_'+label+'_PITCH',parent=yaw);box('Gun armored cradle '+label,(0,0,0),(1.25 if heavy else 1.05,1.65,.95),'plate',pitch,bevel=True)
  recoil=empty('GUN_'+label+'_RECOIL',parent=pitch)
  if heavy:
   cyl('Heavy breech',(0,-.7,0),.42,1.5,'dark',recoil);cyl('Heavy barrel',(0,-3.25,0),.20,4.0,'edge',recoil)
   for j in ([0,1,2] if lod<2 else [0]):cyl('Heavy barrel collar '+str(j),(0,-1.7-j*1.15,0),.27,.23,'plate',recoil)
   box('Heavy muzzle',(0,-5.4,0),(.65,.8,.56),'hull',recoil);box('Heavy muzzle bore',(0,-5.81,0),(.36,.015,.29),'dark',recoil)
   empty('SOCKET_MUZZLE_HEAVY',(0,-5.85,0),recoil)
  else:
   spin=empty('GUN_'+label+'_SPIN',parent=recoil)
   if lod<2:
    for j in range(6):
     a=j*math.tau/6;px=.24*math.cos(a);pz=.24*math.sin(a);cyl('Rotary barrel '+label+str(j),(px,-2,pz),.075,2.7,'edge',spin,n=12 if lod==0 else 6)
   else:cyl('Rotary bundle '+label,(0,-2,0),.31,2.7,'edge',spin)
   for t in [-1.0,-2.9]:cyl('Rotary collar '+label+str(t),(0,t,0),.36,.18,'dark',spin)
   empty('SOCKET_MUZZLE_'+label,(0,-3.4,0),spin)
   if lod<2:clip(spin,'Rotary_Cycle','rotation_euler',[(0,(0,0,0)),(1,(0,math.tau,0))])
  if lod<2:clip(recoil,'Heavy_Fire' if heavy else 'Rotary_Fire','location',[(0,(0,0,0)),(.08,(0,.38 if heavy else .10,0)),(.35,(0,0,0)),(.6,(0,0,0))])
 # Deployable three-point landing gear, rest pose deployed.
 for label,x,y in [('NOSE',0,-3),('L',-3.15,6),('R',3.15,6)]:
  gear=empty('GEAR_'+label,(x,y,3.4));box('Gear strut '+label,(0,0,-1.45),(.26,.4,2.9),'edge',gear);box('Gear shock '+label,(0,.25,-.7),(.38,.45,1.25),'plate',gear);box('Landing pad '+label,(0,0,-3.17),(1.1,1.75,.46),'dark',gear)
  if lod<2:
   clip(gear,'Gear_Retract','rotation_euler',[(0,(0,0,0)),(2,(-math.pi/2,0,0))]);clip(gear,'Gear_Deploy','rotation_euler',[(0,(-math.pi/2,0,0)),(2,(0,0,0))])
 # Rear service bay and a single opening ramp; no overlapping rear wall.
 box('Bay floor',(0,8.8,3.62),(3.8,4.25,.16),'dark',hull);box('Bay bulkhead',(0,6.75,4.9),(4.0,.16,2.5),'dark',hull)
 for x in [-2.08,2.08]:box('Bay liner '+str(x),(x,8.8,4.9),(.12,4.25,2.5),'dark',hull)
 ramp=empty('REAR_RAMP',(0,11.03,3.7));box('Ramp armor',(0,0,1.26),(4.05,.16,2.52),'plate',ramp)
 if lod<2:
  for j in range(4):box('Ramp grip '+str(j),(0,-.11,.35+j*.55),(3.5,.04,.08),'dark',ramp)
  clip(ramp,'Ramp_Open','rotation_euler',[(0,(0,0,0)),(2,(-math.radians(75),0,0))]);clip(ramp,'Ramp_Close','rotation_euler',[(0,(-math.radians(75),0,0)),(2,(0,0,0))])
 # Optional GS01 marking as separate named geometry; replace in engine or hide.
 marking=empty('MARKING_GS01',(0,-1,7.33));marking['text']='GS01';marking['replaceable']=True
 if lod<2:
  curve=bpy.data.curves.new('GS01','FONT');curve.body='GS01';curve.align_x='CENTER';curve.size=.65;curve.extrude=0
  ob=bpy.data.objects.new('Marking letters',curve);col.objects.link(ob);ob.parent=marking;ob.data.materials.append(mats['edge']);ob['export_name']='MARKING_TEXT';bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.convert(target='MESH');ob.select_set(False)
 if lod==0:
  for side in [-1,1]:
   for y in range(-6,9,2):
    for dx in [1.05,2.15]:cyl('Armor fastener',(side*dx,y,7.13),.055,.07,'dark',hull,n=8,axis='Z')
  for y in [0,4,8]:box('Spine access hatch',(0,y,7.22),(1.4,1.7,.10),'edge',hull,bevel=True)
 empty('SOCKET_CARGO',(0,8.7,3.72));empty('SOCKET_CENTER_OF_MASS',(0,0,5.1));empty('SOCKET_NOSE',(0,-14.2,4.6))
 # Vertex palette and one mesh per independently moving assembly.
 palette=bpy.data.materials.new('KORP_PALETTE');palette.use_nodes=True;bs=palette.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=.45;bs.inputs['Roughness'].default_value=.42;vc=palette.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';palette.node_tree.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 groups={}
 for ob in list(col.objects):
  if ob.type!='MESH':continue
  if lod>0:
   attr=ob.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
   for face in ob.data.polygons:
    rgba=ob.data.materials[face.material_index].diffuse_color
    for loop in face.loop_indices:attr.data[loop].color=rgba
    face.material_index=0
   ob.data.materials.clear();ob.data.materials.append(palette)
  target=root if lod==2 else ob.parent
  # Walk through static grouping nodes only; keep all articulated parents intact.
  while target!=root and target['export_name'] not in ['HULL','MARKING_GS01','REAR_RAMP'] and not target['export_name'].startswith(('ENGINE_','GUN_','GEAR_')):target=target.parent
  groups.setdefault(target,[]).append(ob)
 for target,objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for ob in objects:ob.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();ob=objects[0];world=ob.matrix_world.copy();ob.parent=target;ob.matrix_world=world;ob['export_name']=target['export_name']+'_MESH'
 built.append((lod,scene,root));print('KORP_BUILT',lod,len(col.objects),'objects')

def export_all():
 entries=[]
 for level,sc,rt in built:
  bpy.context.window.scene=sc;bpy.ops.object.select_all(action='SELECT');rest={o:o.matrix_basis.copy() for o in sc.objects}
  for ob in sc.objects:
   if ob.animation_data:
    for tr in ob.animation_data.nla_tracks:tr.mute=False
  file=f'korp_d0_lod{level}.glb';path=OUT/file
  bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,export_extras=True,export_animations=level<2,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_cameras=False,export_lights=False)
  b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n]);blob=b[28+n:]
  for node in doc['nodes']:
   if 'export_name' in node.get('extras',{}):node['name']=node['extras']['export_name']
   name=node.get('name','')
   if name.startswith('GEAR_') and not name.endswith('_MESH') or name=='REAR_RAMP' or name.endswith('_SPIN'):
    node.pop('matrix',None);node['rotation']=[0,0,0,1]
   if name.endswith('_RECOIL'):node.pop('matrix',None);node['translation']=[0,0,0]

  data=json.dumps(doc,separators=(',',':')).encode();data+=b' '*(-len(data)%4);path.write_bytes(struct.pack('<III',0x46546c67,2,28+len(data)+len(blob))+struct.pack('<II',len(data),0x4e4f534a)+data+struct.pack('<II',len(blob),0x004e4942)+blob)
  clips=[{'name':a['name'],'duration_s':max(doc['accessors'][s['input']].get('max',[0])[0] for s in a['samplers']),'loop':a['name'].endswith('_Cycle')} for a in doc.get('animations',[])]
  for ob in sc.objects:
   if ob.animation_data:
    for tr in ob.animation_data.nla_tracks:tr.mute=True
   ob.matrix_basis=rest[ob]
  bpy.context.view_layer.update()
  parents={child:i for i,n in enumerate(doc['nodes']) for child in n.get('children',[])}
  def world(i):
   n=doc['nodes'][i];q=n.get('rotation',[0,0,0,1]);local=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
   return world(parents[i])@local if i in parents else local
  sockets=[{'id':n['name'],'position_m':list(world(i).translation)} for i,n in enumerate(doc['nodes']) if n.get('name','').startswith('SOCKET_')]
  entries.append({'id':f'korp_d0_lod{level}','family':'korp','name':'KORP / GS01 heavy gunship','file':file,'lod':level,'damage_level':0,'bytes':path.stat().st_size,'triangles':sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']),'draw_calls':sum(len(m['primitives']) for m in doc['meshes']),'plot_m':[30,32],'sockets':sockets,'clips':clips,'credit':'Models by jelaludo','engine_nodes':[o['export_name'] for o in sc.objects if o.type=='EMPTY'],'static':level==2})
  for ob in sc.objects:
   if ob.animation_data:
    for tr in ob.animation_data.nla_tracks:tr.mute=True
   name=ob.get('export_name','')
   if name.startswith('GEAR_') and ob.type=='EMPTY' or name=='REAR_RAMP' or name.endswith('_SPIN'):ob.rotation_euler=(0,0,0)
   if name.endswith('_RECOIL'):ob.location=(0,0,0)
  bpy.context.view_layer.update()
 (OUT/'manifest.json').write_text(json.dumps({'version':1,'units':'meters','up':'+Y','forward':'+Z','assets':entries},indent=2)+'\n')
 bpy.data.libraries.write(str(P/'source/blender/korp-gunship.blend'),{sc for _,sc,_ in built},fake_user=True,compress=True)
 print('KORP_EXPORTS',[(e['lod'],e['triangles'],e['draw_calls'],e['bytes']) for e in entries])
