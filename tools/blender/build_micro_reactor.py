"""Open next-generation micro reactor: four families × four authored states."""
import sys,math,json,struct,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,bmesh,Vector,empty,cylinder,beam,socket,collider
OUT=k.PROJECT/'assets/micro-reactor';OUT.mkdir(parents=True,exist_ok=True)
k.M.update({'core':k.material('Exposed reactor core',(.15,.65,.58),.25,.24,2),'core_hot':k.material('Critical core glow',(.95,.38,.06),.15,.25,2.4),'copper':k.material('Coolant copper',(.67,.25,.08),.8,.28),'pipe':k.material('Coolant pipe',(.12,.25,.28),.7,.3),'ceramic':k.material('White ceramic shield',(.65,.68,.63),.1,.42),'screen':k.material('Control glass',(.02,.12,.16),.5,.3,1.5),'hazard':k.material('Radiation hazard',(.95,.54,.04),.2,.4,1.4)})
STATES=['Intact','Damaged','Critical','Destroyed']
def b(n,l,s,m='armor',p=None,r=(0,0,0)):return k.box(n,l,s,m,.015,p,r)
def ring(n,l,R,r,m='frame',p=None,rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=8,major_radius=R,minor_radius=r,location=(0,0,0));o=k.register(bpy.context.object,n,m,p);o.location=l;o.rotation_euler=rot;return o
def core(state,p=None):
 root=empty('OPEN_CORE',parent=p);root['component']='fuel_lattice'
 if state<3:
  ring('Core vessel lower',(0,0,.5),1.35,.17,'ceramic',root)
  ring('Core vessel upper',(0,0,2.25),1.35,.17,'ceramic',root)
  for z in [.65,1.05,1.45,1.85]:
   for i in range(8):
    a=i*math.tau/8;x=.86*math.cos(a);y=.86*math.sin(a);cylinder('Visible fuel lattice',(x,y,z),.065,.31,'core_hot' if state==2 else 'core',parent=root,vertices=8)
  for i in range(8):
   a=i*math.tau/8;beam('Lattice radial brace',(0,0,.6),(1.05*math.cos(a),1.05*math.sin(a),.6),.025,'ceramic',root)
  if state<2:
   for i in range(6):
    a=i*math.tau/6;x=1.8*math.cos(a);y=1.8*math.sin(a);rod=empty('CONTROL_ROD_%02d'%i, (x,y,0),root);cylinder('Control rod guide',(0,0,1.6),.12,3.4,'frame',parent=rod);b('Rod actuator cap',(0,0,3.35),(.28,.28,.18),'hazard',rod)
  else:
   for i in range(6):
    a=i*math.tau/6;x=1.8*math.cos(a);y=1.8*math.sin(a);beam('Bent control rod',(x,y,.25),(x+.25*math.cos(a),y+.25*math.sin(a),2.4),.09,'frame',root);b('Dislodged rod cap',(x+.2*math.cos(a),y+.2*math.sin(a),2.5),(.24,.24,.15),'hazard',root)
 else:
  ring('Broken lower vessel',(0,0,.45),1.3,.16,'ceramic',root);ring('Detached vessel arc',(-.55,.15,1.8),.9,.15,'ceramic',root,rot=(.4,.1,.3))
  for i in range(8):cylinder('Exposed fuel lattice fragment',(.55*math.cos(i*.78),.55*math.sin(i*.78),.45+.1*(i%3)),.07,.5,'core_hot',parent=root,vertices=8)
  for i in range(3):beam('Fallen control rod',(1.1,-.5+i*.35,.35),(1.8,-.7+i*.3,.18),.08,'frame',root)
 return root
def pipes(state,p=None):
 root=empty('COOLANT_MANIFOLD',parent=p);root['component']='coolant_manifold'
 for i in range(4):
  a=i*math.tau/4;x=2.45*math.cos(a);y=2.45*math.sin(a);beam('Coolant riser',(x,y,.15),(x,y,2.4),.12,'pipe',root);ring('Pipe flange',(x,y,.3),.2,.055,'copper',root,rot=(math.pi/2,0,0))
  if state==1:beam('Scored coolant riser',(x,y,1.3),(x+.25,y+.2,1.7),.13,'pipe',root)
  if state>=2:beam('Ruptured coolant line',(x,y,.5),(x+.5*math.cos(a),y+.5*math.sin(a),.2),.1,'pipe',root);beam('Copper break strand',(x+.5*math.cos(a),y+.5*math.sin(a),.2),(x+.8*math.cos(a),y+.8*math.sin(a),.05),.025,'copper',root)
 ring('Manifold ring',(0,0,.28),2.5,.13,'copper',root)
 return root
def exchanger(state,p=None):
 root=empty('HEAT_EXCHANGER',parent=p);root['component']='heat_exchanger';b('Exchanger frame',(0,0,1.45),(3.2,1.5,2.9),'frame',root)
 for x in [-1.1,-.55,0,.55,1.1]:
  h=2.3 if state<3 else .9;cylinder('Exposed heat tube',(x,0,h/2+.2),.1,h,'copper' if state==0 else 'pipe',parent=root);ring('Tube collar',(x,0,.25),.15,.04,'hazard',root)
 if state<2:
  for x in [-1.42,1.42]:b('Exchanger side brace',(x,0,1.5),(.18,1.5,2.8),'ceramic',root)
  for z in [.45,1.05,1.65,2.25]:b('Heat fin rack',(0,-.8,z),(2.7,.12,.12),'copper',root)
 else:
  b('Caved exchanger shell',(.8,0,.9),(1.0,1.4,1.1),'ceramic',root,r=(0,.3,.1));beam('Bent exchanger tube',(-1.1,0,.4),(-.6,-.3,1.2),.1,'copper',root);b('Fallen heat fin',(0,-1.1,.2),(2.4,.14,.12),'copper',root,r=(0,.1,.2))
 return root
def control(state,p=None):
 root=empty('CONTROL_SKID',parent=p);root['component']='control_skid';b('Control skid base',(0,0,.15),(3.4,2,.3),'frame',root);b('Open instrument rack',(0,0,1.3),(2.8,.35,2.1),'ceramic',root)
 for x in [-.9,0,.9]:
  b('Monitor housing',(x,-.25,2.25),(.75,.12,.55),'frame',root);b('Monitor glass',(x,-.32,2.25),(.63,.02,.4),'screen',root);b('Telemetry bar',(x,-.34,2.05),(.35,.02,.05),'core' if state==0 else 'core_hot',root)
 for x in [-1.25,1.25]:cylinder('Emergency stop',(x,-.3,.7),.11,.1,'hazard',parent=root)
 if state>=2:b('Detached monitor',(1.1,-.7,.45),(.8,.12,.55),'frame',root,r=(.5,.3,.2));beam('Exposed control cable',(0,.2,1.6),(1.1,.5,.4),.035,'copper',root)
 return root
def make_complex(e,state):
 b('Reactor deck',(0,0,-.15),(10,10,.3),'frame');ring('Open shield ring',(0,0,.35),3.5,.24,'ceramic');
 if state<3:
  ring('Upper service ring',(0,0,3.1),3.1,.18,'frame');b('Open safety gantry',(0,-3,2.7),(5,.18,.18),'frame');b('Gantry upright',(-2.5,-3,1.5),(.18,.18,3),'frame');b('Gantry upright',(2.5,-3,1.5),(.18,.18,3),'frame')
  cr=core(state);cr.location=(-1.8,0,0);pm=pipes(state);pm.location=(-1.8,0,0);hx=exchanger(state);hx.location=(4,0,0);cs=control(state);cs.location=(-4,1,0)
 else:
  cr=core(state);cr.location=(-1.8,0,0);pm=pipes(state);pm.location=(-1.8,0,0);hx=exchanger(state);hx.location=(4,0,0);cs=control(state);cs.location=(-4,1,0);b('Fallen safety gantry',(0,-3,.32),(5,.2,.18),'frame',r=(0,.05,.18));b('Broken shield segment',(-2.8,1,.5),(1.4,.3,.4),'ceramic',r=(.2,.1,.2))
 socket(e,'POWER_OUT','power',[0,0,5],[0,0,1],state<3,4);collider(e,'reactor',[0,1.5,0],[8,3,8]);e['description']='Open reactor installation: visible fuel lattice, control rods, coolant manifold, heat exchanger and instrument skid.'
def one(e,state,kind):
 if kind=='core':core(state);socket(e,'CORE','support',[0,0,0],[0,1,0],state<3,3);collider(e,'core',[0,1.5,0],[5,3,5]);e['description']='Exposed hexagonal fuel lattice and six vertical control rods, with vessel rings and authored bent-rod wreckage.'
 elif kind=='pipes':pipes(state);socket(e,'COOLANT','utility',[0,0,0],[0,1,0],state<3,5);collider(e,'manifold',[0,1,0],[6,2,6]);e['description']='Open copper coolant manifold with four risers, flanges and rupture strands.'
 elif kind=='exchanger':exchanger(state);socket(e,'THERMAL','utility',[0,0,0],[0,1,0],state<3,3);collider(e,'exchanger',[0,1.4,0],[3.5,3,3.5]);e['description']='Exposed heat exchanger with copper tubes, collars, fins and caved D3 frame.'
 else:control(state);socket(e,'DATA','data',[0,0,0],[0,1,0],state<3,3);collider(e,'control',[0,1.2,0],[3.6,2,3]);e['description']='Open instrument skid with three monitors, telemetry bars, emergency stops and exposed control cable.'
SPECS=[('micro_reactor_complex','Open micro reactor complex',[12,12],'complex'),('micro_reactor_core','Exposed reactor core',[6,6],'core'),('micro_reactor_manifold','Coolant manifold',[9,9],'pipes'),('micro_reactor_exchanger','Open heat exchanger',[4,4],'exchanger'),('micro_reactor_control','Reactor control skid',[4,4],'control')]
for family,title,plot,kind in SPECS:
 for state in range(4):
  e=k.begin(f'{family}_d{state}',title,STATES[state],plot,'');e.update(family=family,damage_level=state,zone='utilities',functional=state<3,damage_signature=['visible vessel/lattice/rod/pipe hardware','scored open hardware','bent rods, cracked vessel, ruptured lines','identifiable core, coils, control and gantry fragments'][state])
  if kind=='complex':make_complex(e,state)
  else:one(e,state,kind)
  if state==3:e['description']+=' D3 preserves original reactor parts rather than replacing them with generic rubble.'
for i,(root,collection,e) in enumerate(k.roots):
 bpy.ops.object.select_all(action='DESELECT')
 for o in list(collection.objects):
  o.select_set(True)
  if o.type=='FONT':bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
  if o.type=='MESH':bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 bpy.context.view_layer.objects.active=root;p=OUT/e['file'];bpy.ops.export_scene.gltf(filepath=str(p),export_format='GLB',use_selection=True,export_extras=True,export_yup=True,export_cameras=False,export_lights=False)
 data=p.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);blob=data[28+n:]
 for node in doc['nodes']:
  if node.get('extras',{}).get('asset_id')==e['id']:node['name']='ROOT'
  if node.get('name','').startswith('SOCKET_'):node['name']=node['name'].split('.')[0]
 payload=json.dumps(doc,separators=(',',':')).encode();payload+=b' '*(-len(payload)%4);p.write_bytes(struct.pack('<III',0x46546c67,2,28+len(payload)+len(blob))+struct.pack('<II',len(payload),0x4e4f534a)+payload+struct.pack('<II',len(blob),0x004e4942)+blob);e['bytes']=p.stat().st_size;e['triangles']=sum(doc['accessors'][q['indices']]['count']//3 for m in doc.get('meshes',[]) for q in m['primitives']);print('EXPORTED',e['file'],flush=True)
(OUT/'manifest.json').write_text(json.dumps(dict(version=1,units='meters',up='+Y',forward='+Z',assets=k.manifest),indent=2)+'\n')
for i,(root,collection,e) in enumerate(k.roots):root.location=((i%4)*22,(i//4)*22,0)
bpy.context.scene.name='A6 / Open micro reactor';bpy.ops.wm.save_as_mainfile(filepath=str(k.SOURCE/'a6-micro-reactor.blend'));print('MICRO_REACTOR_COMPLETE',flush=True)
