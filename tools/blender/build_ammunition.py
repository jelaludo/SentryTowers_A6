"""Stylized external-only game ammunition. No functional weapon internals."""
import sys,math,json,struct
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,Vector
P=k.PROJECT;OUT=P/'assets/ammunition';OUT.mkdir(exist_ok=True)
colors={'gold':(.69,.43,.10),'steel':(.56,.64,.68),'bronze':(.48,.24,.10),'yellow':(.9,.72,.08),'blue':(.035,.27,.57),'green':(.20,.32,.09),'dark':(.055,.075,.09),'white':(.72,.78,.73),'copper':(.58,.26,.12)}
for name,color in colors.items():k.M[name]=k.material('Ammo / '+name,color,.78 if name in ['gold','steel','bronze','copper'] else .15,.29 if name in ['gold','steel','bronze','copper'] else .55)
palette=k.material('Ammo game / vertex palette',(1,1,1),.5,.38);node=palette.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Color';palette.node_tree.links.new(node.outputs['Color'],palette.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
# id, title, category, length, radius, casing finish, tip, companions, shape
specs=[
 ('rotor_light','Rotor / light round','Bullets',.057,.0048,'gold','green',['rotor'],'cartridge'),
 ('rotor_heavy','Rotor / heavy round','Bullets',.071,.006,'bronze','blue',['rotor'],'cartridge'),
 ('needle_50','Needle / .50-cal style','Bullets',.138,.0102,'gold','yellow',['needle'],'cartridge'),
 ('cannon_20','Autocannon / 20-class','Bullets',.20,.014,'steel','blue',['rotor','lancer'],'cartridge'),
 ('cannon_30','Autocannon / 30-class','Bullets',.285,.021,'bronze','green',['lancer'],'cartridge'),
 ('mortar_60','Mortar / compact finned','Mortars',.31,.030,'green','yellow',['mortar'],'mortar'),
 ('mortar_81','Mortar / medium finned','Mortars',.44,.0405,'steel','blue',['mortar'],'mortar'),
 ('mortar_120','Mortar / heavy finned','Mortars',.68,.060,'green','yellow',['mortar','howitzer'],'mortar'),
 ('tank_dart','MÖRK / long-rod dart','Tank shells',.94,.070,'gold','dark',['mork','railgun'],'dart'),
 ('tank_arrow','MÖRK / arrowhead','Tank shells',1.05,.078,'steel','blue',['mork','railgun'],'arrow'),
 ('howitzer_155','Howitzer / field shell','Heavy shells',.80,.0775,'steel','yellow',['howitzer'],'shell'),
 ('heavy_240','Heavy / bronze siege shell','Heavy shells',1.18,.12,'bronze','green',['howitzer'],'shell'),
 ('siege_400','Siege / 400-class reserve','Heavy shells',1.90,.20,'bronze','yellow',['future_heavy'],'shell'),
 ('siege_800','Siege / 800-class reserve','Heavy shells',3.10,.40,'green','green',['future_heavy'],'shell'),
 ('missile_scout','SCOUT / micro missile','Missiles',1.20,.095,'steel','yellow',['quiver','lancer'],'missile'),
 ('missile_interceptor','KESTREL / interceptor','Missiles',2.60,.16,'white','blue',['quiver','lancer'],'missile'),
 ('missile_cruise','SKIMMER / winged cruise','Missiles',4.80,.26,'steel','green',['quiver','future_heavy'],'cruise'),
 ('missile_heavy','MONOLITH / heavy missile','Missiles',6.40,.43,'white','yellow',['future_heavy'],'heavy_missile')]
entries=[];roots=[]

def lathe(name,profile,n,parent):
 # Profile entries (axial distance, radius, material for the outgoing span).
 verts=[];rings=[]
 for z,r,mat in profile:
  ids=[]
  for i in range(1 if r==0 else n):ids.append(len(verts));verts.append((r*math.cos(i*math.tau/n),-z,r*math.sin(i*math.tau/n)))
  rings.append(ids)
 faces=[];mats=[]
 if len(rings[0])>1:faces.append(tuple(reversed(rings[0])));mats.append(profile[0][2])
 for j,(a,b) in enumerate(zip(rings,rings[1:])):
  for i in range(n):
   q=(i+1)%n
   faces.append((a[0],b[q],b[i]) if len(a)==1 else (a[i],a[q],b[0]) if len(b)==1 else (a[i],a[q],b[q],b[i]));mats.append(profile[j][2])
 if len(rings[-1])>1:faces.append(tuple(rings[-1]));mats.append(profile[-1][2])
 return make_mesh(name,verts,faces,mats,parent)

def make_mesh(name,verts,faces,face_mats,parent):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();obj=bpy.data.objects.new(name,mesh);k.active_collection.objects.link(obj);obj.parent=parent
 used=list(dict.fromkeys(face_mats));[mesh.materials.append(k.M[m]) for m in used]
 for p,m in zip(mesh.polygons,face_mats):p.material_index=used.index(m);p.use_smooth=True
 import bmesh
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 return obj

def fins(parent,n,z0,z1,base,span,mat,thickness):
 for i in range(n):
  angle=i*math.tau/n;verts=[]
  for side in [-thickness,thickness]:
   for z,r in [(z0,base),(z0,span),(z1,base)]:verts.append((r*math.cos(angle)-side*math.sin(angle),-z,r*math.sin(angle)+side*math.cos(angle)))
  make_mesh('Swept stabilizer',verts,[(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],[mat]*5,parent)

def profile_for(shape,form,L,R,metal,tip,detailed):
 if shape=='cartridge':
  if form=='projectile':
   length=L*.4
   return [(0,R*.70,metal),(length*.68,R*.70,tip),(length,0,tip)] if not detailed else [(0,R*.68,metal),(length*.1,R*.72,metal),(length*.43,R*.72,tip),(length*.7,R*.52,tip),(length*.9,R*.23,tip),(length,0,tip)]
  end=L*.72
  p=[(0,R,metal),(L*.035,R,metal),(L*.05,R*.91,metal),(L*.51,R*.89,metal),(L*.61,R*.72,metal),(end,R*.72,metal)]
  if form=='case':return p+[(end,R*.58,'dark'),(end-L*.12,R*.58,'dark'),(end-L*.12,0,'dark')]
  return p+[(L*.78,R*.72,tip),(L*.94,R*.28,tip),(L,0,tip)]
 if shape in ['dart','arrow']:
  if form=='case':return [(0,R,metal),(L*.035,R,metal),(L*.05,R*.92,metal),(L*.56,R*.90,metal),(L*.61,R*.7,metal),(L*.65,R*.7,metal),(L*.65,R*.55,'dark'),(L*.55,R*.55,'dark'),(L*.55,0,'dark')]
  if form=='round':return [(0,R,metal),(L*.035,R,metal),(L*.06,R*.92,metal),(L*.58,R*.90,metal),(L*.65,R*.45,metal),(L*.67,R*.27,'dark'),(L*.9,R*.22,tip),(L,0,tip)]
  length=L*.68
  return [(0,R*.18,'dark'),(length*.13,R*.23,metal),(length*.72,R*.20,metal),(length*.76,R*(.68 if shape=='arrow' else .24),tip),(length,0,tip)]
 if shape=='mortar':return [(0,R*.23,'dark'),(L*.23,R*.23,'dark'),(L*.35,R*.72,metal),(L*.56,R,metal),(L*.70,R*.90,metal),(L*.90,R*.45,tip),(L,0,tip)]
 if shape=='shell':
  return [(0,R*.9,'dark'),(L*.04,R,'copper'),(L*.12,R,'copper'),(L*.14,R*.97,metal),(L*.61,R*.97,tip),(L*.79,R*.72,tip),(L*.94,R*.30,tip),(L,0,tip)]
 return [(0,R*.70,'dark'),(L*.04,R,'dark'),(L*.12,R,metal),(L*.63,R,metal),(L*.65,R,tip),(L*.79,R*.89,tip),(L*.93,R*.38,tip),(L,0,tip)]

for ident,title,category,L,R,metal,tip,companions,shape in specs:
 family={'id':ident,'name':title,'category':category,'companions':companions,'shape':shape,'finish':metal,'tip_color':tip,'variants':[]}
 forms=['round','projectile','case'] if shape in ['cartridge','dart','arrow'] else ['projectile']
 for tier in ['game','display']:
  for form in forms:
   asset_id=f'{ident}_{form}_{tier}';k.begin(asset_id,title,'Ready',[1,1],'');root=k.active_root;root['credit']='Models by jelaludo';root['role']='ammunition';root['family']=ident;root['form']=form;root['forward']='+Z';root['origin']='center of rear/base face'
   n=(6 if ident.startswith('rotor') else 8) if tier=='game' else 32
   if shape=='arrow' and form=='projectile':n=4 if tier=='game' else 8
   profile=profile_for(shape,form,L,R,metal,tip,tier=='display');length=max(z for z,r,m in profile)
   lathe('Ordnance body',profile,n,root)
   if shape=='mortar':fins(root,4,0,L*.26,R*.22,R*.82,'dark',R*.055)
   if shape in ['dart','arrow'] and form=='projectile':fins(root,4,0,length*.26,R*.20,R*.63,'dark',R*.035)
   if 'missile' in shape or shape=='cruise':
    fins(root,4,L*.07,L*.30,R*.96,R*2.1,'dark',R*.045)
    if shape=='cruise':fins(root,2,L*.32,L*.61,R*.98,R*4.6,metal,R*.06)
    elif tier=='display':fins(root,4,L*.52,L*.66,R*.98,R*1.55,metal,R*.035)
    k.empty('EXHAUST_SOCKET',(0,0,0),root)
   k.empty('TIP_SOCKET',(0,-length,0),root)
   # Rear face is a visual cap only. Empty cases have a short cosmetic mouth recess.
   objects=[o for o in k.active_collection.objects if o.type=='MESH']
   if tier=='game':
    for obj in objects:
     c=obj.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
     for face in obj.data.polygons:
      rgba=obj.data.materials[face.material_index].diffuse_color
      for loop in face.loop_indices:c.data[loop].color=rgba
      face.material_index=0
     obj.data.materials.clear();obj.data.materials.append(palette)
   bpy.ops.object.select_all(action='DESELECT')
   for obj in objects:obj.select_set(True)
   bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name='AMMO_MESH'
   bpy.context.view_layer.update();pts=[objects[0].matrix_world@Vector(v) for v in objects[0].bound_box];size=[max(v[i] for v in pts)-min(v[i] for v in pts) for i in range(3)]
   bpy.ops.object.select_all(action='DESELECT')
   for obj in k.active_collection.objects:obj.select_set(True)
   bpy.context.view_layer.objects.active=root
   file=asset_id+'.glb';bpy.ops.export_scene.gltf(filepath=str(OUT/file),export_format='GLB',use_selection=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False)
   b=(OUT/file).read_bytes();doc=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
   triangles=sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']);draws=sum(len(m['primitives']) for m in doc['meshes'])
   family['variants'].append({'id':asset_id,'tier':tier,'form':form,'file':file,'length_m':length,'width_m':size[0],'height_m':size[2],'triangles':triangles,'draw_calls':draws,'bytes':len(b),'flight_asset':form=='projectile','axis':'+Z','pivot':'rear base'})
   roots.append((root,k.active_collection,length))
 entries.append(family)
# Reuse exact existing motion-lab assets rather than changing or duplicating them.
legacy=json.loads((P/'assets/missile-kit/manifest.json').read_text())['assets']
for e in legacy:
 entries.append({'id':'legacy_'+e['id'],'name':e['name'],'category':'Legacy missiles','companions':['quiver','lancer'],'shape':'legacy','finish':'slate','tip_color':'cyan','variants':[{'id':'legacy_'+e['id'],'tier':'legacy','form':'projectile','file':'../missile-kit/'+e['file'],'length_m':e['length_m'],'triangles':e['triangles'],'draw_calls':e['draw_calls'],'bytes':e['bytes'],'flight_asset':True,'axis':'+Z','pivot':'existing motion root','animations':e['animations']} ]})
(OUT/'manifest.json').write_text(json.dumps({'version':1,'units':'meters','forward':'+Z','credit':'Models by jelaludo','dimensions':'Stylized visual sizes for game assets, not manufacturing specifications','families':entries},indent=2)+'\n')
# Source gallery normalizes size for editing; exports keep metre-scale dimensions.
for i,(root,col,length) in enumerate(roots):root.scale=(1/length,)*3;root.rotation_euler.x=-math.pi/2;root.location=(i%12*1.4,i//12*1.7,0)
bpy.context.scene.name='Ammunition / normalized source gallery'
bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/ammunition-library.blend'))
print('AMMO_COMPLETE',len(specs),'new families',sum(len(e['variants']) for e in entries),'variants including reused missiles')
