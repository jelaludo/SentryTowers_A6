"""Original texture-free CTF flags: vector emblems, skinned cloth and modular poles."""
import sys,math,json,struct
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,Vector,empty
import bmesh
from mathutils.geometry import tessellate_polygon
OUT=k.PROJECT/'assets/ctf-flags';OUT.mkdir(parents=True,exist_ok=True)
SPECS=[('ember','Ember / 火',(.55,.025,.035),'beacon'),('vanguard','Vanguard / 力',(.025,.16,.62),'tactical'),('eclipse','Eclipse',(.27,.055,.46),'spire'),('helix','Helix',(.025,.32,.22),'beacon'),('horizon','Horizon',(.8,.34,.025),'tactical'),('void','Void',(.025,.035,.055),'spire')]
CLIPS=[('Flutter',2,True),('Gust',2,True),('Raise',2,False),('Lower',2,False)]
k.M['pole']=k.material('Graphite pole',(.12,.19,.22),.7,.35)
k.M['ink']=k.material('Ivory vector insignia',(.94,.89,.71),.05,.65)
for key,title,color,style in SPECS:k.M[key]=k.material(title+' woven color',color,.0,.85)
def box(n,l,s,m='pole',p=None):return k.box(n,l,s,m,0,p)
def cyl(n,l,r,d,m='pole',p=None):return k.cylinder(n,l,r,d,m,parent=p,vertices=8)
def stand():
 p=empty('BASE');cyl('Capture socket foot',(0,0,.065),.38,.13,'frame',p);cyl('Socket locking collar',(0,0,.20),.15,.2,'pole',p)
 for x,y in [(.26,0),(-.26,0),(0,.26),(0,-.26)]:box('Team socket light',(x,y,.135),(.07,.07,.035),'signal',p)
 return p
def pole(style):
 p=empty('CARRY');cyl('Pole shaft',(0,0,1.64),.038,2.96,'pole',p)
 for z in [.45,1.05]:cyl('Grip collar',(0,0,z),.052,.19,'dark',p)
 for z in [1.8,2.85]:cyl('Hoist latch',(0,0,z),.065,.07,'white',p)
 if style=='beacon':
  cyl('Beacon housing',(0,0,3.12),.085,.18,'frame',p);cyl('Beacon lens',(0,0,3.25),.055,.10,'signal',p)
 elif style=='tactical':
  box('Tactical cap',(0,0,3.12),(.16,.10,.11),'white',p);box('Locator',(0,-.06,3.12),(.085,.025,.045),'signal',p)
 else:
  bpy.ops.mesh.primitive_cone_add(vertices=4,radius1=.12,radius2=0,depth=.34);o=k.register(bpy.context.object,'Spire finial','white',p);o.location=(0,0,3.23)
 return p

# Each emblem is an original angular vector drawing in normalized banner coordinates.
def stroke(points,width):
 result=[]
 for a,b in zip(points,points[1:]):
  dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy);nx=-dy/length*width/2;ny=dx/length*width/2
  result.append([(a[0]+nx,a[1]+ny),(a[0]-nx,a[1]-ny),(b[0]-nx,b[1]-ny),(b[0]+nx,b[1]+ny)])
 return result
def symbol(key):
 if key=='ember': # 火: two outer sparks, central falling stroke, spreading right stroke.
  return [[(.29,.66),(.33,.69),(.39,.51),(.34,.45)],[(.67,.70),(.73,.65),(.60,.48),(.57,.52)],[(.49,.83),(.56,.82),(.54,.51),(.47,.32),(.30,.17),(.26,.23),(.41,.40),(.47,.59)],[(.50,.53),(.56,.55),(.62,.36),(.76,.23),(.71,.17),(.57,.29)]]
 if key=='vanguard': # 力: bent horizontal/hooked stroke, long sweeping diagonal.
  return [[(.28,.68),(.72,.68),(.70,.29),(.65,.19),(.52,.22),(.52,.29),(.61,.27),(.64,.34),(.65,.60),(.28,.60)],[(.48,.84),(.56,.83),(.52,.52),(.43,.33),(.27,.17),(.22,.24),(.37,.41),(.44,.58)]]
 if key=='eclipse':
  polygons=[]
  for i in range(18):
   a=math.tau*i/24;b=math.tau*(i+1)/24
   polygons.append([(.5+r*math.cos(t),.5+r*math.sin(t)) for r,t in [(.31,a),(.31,b),(.235,b),(.235,a)]])
  return polygons+[[ (.49,.16),(.57,.43),(.83,.51),(.57,.57),(.49,.84),(.43,.57),(.22,.51),(.43,.43)]]
 if key=='helix':return stroke([(.33,.19),(.62,.4),(.37,.61),(.65,.83)],.07)+stroke([(.64,.19),(.36,.4),(.63,.61),(.34,.83)],.07)+stroke([(.34,.2),(.64,.2)],.045)+stroke([(.34,.82),(.65,.82)],.045)
 if key=='horizon':return [[(.22,.38),(.5,.82),(.78,.38),(.64,.38),(.5,.6),(.36,.38)],[(.21,.25),(.79,.25),(.79,.32),(.21,.32)]]
 return [[(.5,.85),(.64,.56),(.8,.5),(.64,.44),(.5,.15),(.36,.44),(.2,.5),(.36,.56)],[(.16,.76),(.28,.76),(.28,.82),(.16,.82)],[(.72,.18),(.84,.18),(.84,.24),(.72,.24)]]

def cloth(key,carry):
 hoist=empty('HOIST',parent=carry);data=bpy.data.armatures.new('Banner skeleton');rig=bpy.data.objects.new('FLAG_RIG',data);k.active_collection.objects.link(rig);rig.parent=hoist
 bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
 for i in range(9):
  b=data.edit_bones.new('wave_%02d'%i);b.head=(.10+1.7*i/8,0,2.30);b.tail=b.head+Vector((0,0,.1))
 bpy.ops.object.mode_set(mode='OBJECT')
 verts=[];faces=[];mi=[]
 # A small forked fly edge makes the six banners recognizable as a common kit.
 for j in range(13):
  for i in range(25):
   u=i/24;v=j/12;x=.10+1.7*u-.12*max(0,1-abs(v-.5)*4)*u**8;verts.append((x,0,1.80+1.05*v-.055*u))
 for j in range(12):
  for i in range(24):a=j*25+i;faces.append((a,a+1,a+26,a+25));mi.append(1 if j in [0,11] or i==0 else 0)
 # Slice emblem triangles at bone boundaries so ink and cloth deform on the same planes.
 def clip_x(poly,bound,keep_greater):
  result=[]
  for a,b in zip(poly,poly[1:]+poly[:1]):
   ia=a.x>=bound-1e-8 if keep_greater else a.x<=bound+1e-8;ib=b.x>=bound-1e-8 if keep_greater else b.x<=bound+1e-8
   if ia:result.append(a)
   if ia!=ib:result.append(a.lerp(b,(bound-a.x)/(b.x-a.x)))
  return result
 for polygon in symbol(key):
  poly=[Vector((.10+1.7*u,0,1.80+1.05*v-.055*u)) for u,v in polygon]
  for side in [-1,1]:
   for tri in tessellate_polygon([poly]):
    points=[poly[v] if isinstance(v,int) else v for v in tri]
    for band in range(8):
     clipped=clip_x(clip_x(points,.1+1.7*band/8,True),.1+1.7*(band+1)/8,False)
     if len(clipped)<3:continue
     offset=len(verts);verts.extend([(v.x,side*.004,v.z) for v in clipped])
     for j in range(1,len(clipped)-1):faces.append((offset,offset+j,offset+j+1));mi.append(1)
 d=bpy.data.meshes.new('Fabric and vector emblem');d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new('FLAG_CLOTH',d);k.active_collection.objects.link(o);d.materials.append(k.M[key]);d.materials.append(k.M['ink'])
 for mat in d.materials:mat.use_backface_culling=False
 for f,m in zip(d.polygons,mi):f.material_index=m
 groups=[o.vertex_groups.new(name='wave_%02d'%i) for i in range(9)]
 for i,v in enumerate(verts):
  t=max(0,min(8,(v[0]-.1)/1.7*8));lo=min(7,int(t));w=t-lo
  if w<1:groups[lo].add([i],1-w,'REPLACE')
  if w>0:groups[lo+1].add([i],w,'REPLACE')
 mod=o.modifiers.new('Wind deformation','ARMATURE');mod.object=rig
 for name,seconds,loop in CLIPS:
  rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new(key+'_'+name)
  for frame in range(61):
   t=frame/60;wind=.14 if name=='Gust' else .065
   lift=0 if loop else -1.65*((1-t) if name=='Raise' else t)
   for i,b in enumerate(rig.pose.bones):
    u=i/8;phase=math.tau*(2*u-t);b.location=(0,lift+u*.016*math.sin(phase),-wind*u*math.sin(phase));b.keyframe_insert(data_path='location',frame=frame)
  action=rig.animation_data.action
  for layer in action.layers:
   for strip in layer.strips:
    for bag in strip.channelbags:
     for curve in bag.fcurves:
      for point in curve.keyframe_points:point.interpolation='LINEAR'
  rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,0,action);track.mute=True
 for track in rig.animation_data.nla_tracks:track.mute=False
 return rig

def export(entry):
 bpy.context.scene.frame_set(0);bpy.ops.object.select_all(action='DESELECT')
 for o in k.active_collection.objects:o.select_set(True)
 p=OUT/entry['file'];bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False)
 d=p.read_bytes();n=struct.unpack_from('<I',d,12)[0];doc=json.loads(d[20:20+n])
 for node in doc['nodes']:
  if node.get('name','').split('.')[0] in ['ROOT','BASE','CARRY','HOIST','FLAG_RIG','FLAG_CLOTH']:node['name']=node['name'].split('.')[0]
 payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*(-len(payload)%4);chunks=d[20+n:];p.write_bytes(struct.pack('<III',0x46546c67,2,20+len(payload)+len(chunks))+struct.pack('<II',len(payload),0x4e4f534a)+payload+chunks)
 entry.update(bytes=p.stat().st_size,triangles=sum(doc['accessors'][q['indices']]['count']//3 for m in doc.get('meshes',[]) for q in m['primitives']))
 print('EXPORTED',entry['id'],entry['triangles'],[a['name'] for a in doc.get('animations',[])],flush=True)

bpy.context.scene.render.fps=30;bpy.context.scene.frame_start=0;bpy.context.scene.frame_end=60
for key,title,color,style in SPECS:
 e=k.begin('flag_'+key,title,'Intact',[2.5,1],'Texture-free animated faction banner');e.update(kind='flag',faction=key,pole_style=style,clips=[dict(name=n,duration_s=d,loop=l) for n,d,l in CLIPS]);stand();carry=pole(style);rig=cloth(key,carry);export(e)
 for track in rig.animation_data.nla_tracks:track.mute=track.name!='Flutter'
for style in ['beacon','tactical','spire']:
 e=k.begin('pole_'+style,style.title()+' pole','Intact',[1,1],'Reusable pole without banner or base');e.update(kind='pole');pole(style);export(e)
e=k.begin('capture_socket','Capture socket','Intact',[1,1],'Reusable capture-zone flag socket');e.update(kind='base');stand();export(e)
(OUT/'manifest.json').write_text(json.dumps(dict(units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
for i,(root,collection,e) in enumerate(k.roots):root.location=((i%5)*2.8,(i//5)*2,0)
bpy.context.scene.frame_set(12);bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-ctf-flags.blend'));print('CTF_FLAGS_COMPLETE',flush=True)
