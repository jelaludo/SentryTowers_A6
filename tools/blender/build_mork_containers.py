"""MORK fitted transport containers: empty, loaded and numbered deployment diorama."""
import sys,math,json,struct,bmesh
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import asset_common as k
from asset_common import bpy,Vector,empty
GAME='--low' in sys.argv
if GAME:k.finish=lambda obj,bevel:obj
P=k.PROJECT;OUT=P/'assets/hover-tank/containers';OUT.mkdir(parents=True,exist_ok=True)
k.M['shell']=k.material('Transport / armored olive',(.16,.205,.175),.45,.65)
k.M['panel']=k.material('Transport / inset panels',(.095,.135,.12),.35,.76)
k.M['trim']=k.material('Transport / graphite frame',(.035,.052,.06),.65,.52)
k.M['orange']=k.material('Transport / deployment amber',(.88,.33,.065),.25,.58)
k.M['stencil']=k.material('Transport / ivory stencil',(.76,.79,.66),.1,.72)
k.M['light']=k.material('Transport / cyan guide lights',(.04,.5,.65),.1,.35,2)
W=6.6;D=14.2;FLOOR=.26;CENTER=2.00475

def box(name,loc,size,mat='shell',parent=None,bevel=0):
 if GAME and name in ['Cassette reinforcing spine','Lock dog','Door warning block','Ramp edge marker','Tie down recess','Latch handle']:return None
 o=k.box(name,loc,size,mat,0,parent)
 if bevel and not GAME:
  mod=o.modifiers.new('Armor edge','BEVEL');mod.width=bevel;mod.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def mesh(name,verts,faces,mat,parent):
 d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update();o=bpy.data.objects.new(name,d);k.active_collection.objects.link(o);o.parent=parent;d.materials.append(k.M[mat]);return o

def stencil(number,loc,size,parent,angle=0):
 # Original angular military stencil glyphs: chamfered bars, separated bridges.
 group=empty('STENCIL_'+number,loc,parent);group.rotation_euler.z=angle
 glyphs={'0':'abcdef','1':'bc','2':'abged','3':'abgcd'}
 segments={'a':((.14,1.5),(.78,1.5)),'g':((.14,.78),(.78,.78)),'d':((.14,.06),(.78,.06)),'f':((.06,1.36),(.06,.92)),'e':((.06,.64),(.06,.20)),'b':((.86,1.36),(.86,.92)),'c':((.86,.64),(.86,.20))}
 for i,char in enumerate(number):
  for seg in glyphs[char]:
   a,b=map(Vector,segments[seg]);axis=(b-a).normalized();normal=Vector((-axis.y,axis.x));t=.075
   pts=[a-axis*t,a+normal*t,b+normal*t,b+axis*t,b-normal*t,a-normal*t]
   vs=[((v.x+i*1.16-1.04)*size,0,v.y*size) for v in pts]
   o=mesh('Stencil bar',vs,[tuple(reversed(range(6)))],'stencil',group)
 return group

def label(value,loc,size,parent,angle=0):
 if GAME:return
 o=k.text('Transport label',value,loc,size,'stencil',parent);o.rotation_euler.z=angle;o.data.extrude=0;o.data.resolution_u=2
 font=Path('/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf')
 if font.exists():o.data.font=bpy.data.fonts.load(str(font),check_existing=True)
 return o

def container(number,loc=(0,0,0),opened=True):
 r=empty('CONTAINER_'+number,loc);r['role']='tank_container';r['number']=number;r['interior_m']=[W,3.6,D];r['floor_y_m']=FLOOR
 shell=empty('SHELL_'+number,parent=r);roof=empty('ROOF_'+number,parent=r);roof['component']='removable_roof'
 box('Load bearing deck',(0,0,.115),(7.18,14.9,.23),'trim',shell)
 box('Interior deck',(0,0,.245),(6.6,14.25,.03),'panel',shell)
 for x in [-3.47,3.47]:
  box('Outer armored side',(x,0,2.05),(.34,14.7,3.7),'shell',shell)
  for y in ([-4.8,0,4.8] if GAME else [-5.7,-2.85,0,2.85,5.7]):
   box('Recessed side cassette',(x+math.copysign(.19,x),y,2.03),(.045,4.5 if GAME else 2.55,2.7),'panel',shell)
   box('Cassette reinforcing spine',(x+math.copysign(.24,x),y,2.03),(.09,.13,2.55),'trim',shell)
  for y in ([-7.24,-2.4,2.4,7.24] if GAME else [-7.24,-4.35,-1.45,1.45,4.35,7.24]):
   box('Exoskeleton upright',(x,y,2.02),(.46,.16,3.96),'trim',shell)
   for z in [.35,3.65]:box('Locking shoe',(x,y,z),(.52,.32,.32),'orange',shell,.025)
  for z in [.46,3.63]:box('Continuous side rail',(x,0,z),(.46,14.75,.16),'trim',shell)
  # External grab rails, isolated from the clear cargo volume.
  for y in ([] if GAME else [-5.7,5.7]):
   k.beam('Lifting grab',(x+math.copysign(.32,x),y-.4,2.7),(x+math.copysign(.32,x),y+.4,2.7),.045,'trim',shell)
  side=1 if x>0 else -1
  stencil(number,(x+side*.255,3.8,1.1),.8,shell,side*math.pi/2)
 box('Rear bulkhead',(0,7.29,2.08),(6.65,.3,3.64),'shell',shell)
 for x in [-2.15,0,2.15]:box('Rear bulkhead rib',(x,7.08,2),(.14,.12,3.2),'trim',shell)
 box('Roof armor',(0,0,3.99),(7.25,14.9,.24),'shell',roof)
 for y in [-6,-3,0,3,6]:box('Roof stiffener',(0,y,4.15),(6.9,.18,.12),'trim',roof)
 for x in [-2.6,2.6]:box('Roof loading rail',(x,0,4.19),(.18,14.2,.16),'trim',roof)
 box('Roof service hatch',(0,3,4.15),(2.7,2,.12),'panel',roof)
 for x in [-3.43,3.43]:box('Door jamb',(x,-7.3,2.05),(.28,.32,3.85),'trim',shell)
 box('Front header',(0,-7.3,3.72),(6.6,.32,.34),'trim',shell)
 label('MORK  /  ARMORED TRANSPORT',(0,-7.48,3.7),.25,shell)
 # A high-visibility number above each doorway stays readable with doors open.
 box('Unit number plate',(-2.43,-7.43,3.85),(1.32,.08,1.13),'trim',shell)
 stencil(number,(-2.43,-7.485,3.32),.62,shell)
 for x in [-3.12,3.12]:
  for y in [-5.5,-2,1.5,5]:box('Cargo alignment light',(x,y,.29),(.08,.55,.04),'light',shell)
  box('Floor clearance line',(x,0,.278),(.055,13.9,.01),'orange',shell)
 # Recessed tie-downs are outside the tank clearance envelope.
 for x in [-3.18,3.18]:
  for y in [-5,-1,3,6]:box('Tie down recess',(x,y,.275),(.14,.24,.016),'trim',shell)
 doors=[]
 for side,name in [(-1,'L'),(1,'R')]:
  hinge=empty('DOOR_'+number+'_'+name,(side*3.28,-7.36,.29),r);hinge['component']='door';doors.append(hinge)
  mid=-side*1.635
  box('Blast door leaf',(mid,0,1.59),(3.25,.20,3.18),'shell',hinge,.045)
  box('Door recessed armor',(mid,-.13,1.63),(2.85,.085,2.61),'panel',hinge)
  for z in [.36,2.80]:box('Door transverse reinforcement',(mid,-.2,z),(3.12,.11,.17),'trim',hinge)
  for x in [mid-side*.86,mid+side*.86]:
   box('Door locking rail',(x,-.22,1.59),(.085,.11,2.55),'trim',hinge)
   for z in [.6,2.5]:box('Lock dog',(x,-.3,z),(.23,.08,.16),'orange',hinge)
  for z in [.42,1.57,2.73]:k.cylinder('Door hinge barrel',(0,0,z),.11,.4,'trim',parent=hinge,vertices=8)
  box('Latch handle',(mid-side*.92,-.35,1.55),(.09,.13,.5),'stencil',hinge)
  stencil(number,(mid,-.205,1.01),.54,hinge)
  for j in range(5):box('Door warning block',(mid-.86+j*.43,-.205,.20),(.25,.01,.10),'orange',hinge)
 ramp=empty('RAMP_'+number,(0,-7.39,.26),r);ramp['component']='ramp'
 mesh('Loading ramp',[(-3.2,0,0),(3.2,0,0),(3.2,-3.1,-.26),(-3.2,-3.1,-.26),(-3.2,0,-.09),(3.2,0,-.09),(3.2,-3.1,-.28),(-3.2,-3.1,-.28)],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(3,7,6,2),(0,4,7,3),(1,2,6,5)],'trim',ramp)
 for x in [-3.03,3.03]:
  for j in range(6):box('Ramp edge marker',(x,-.3-j*.46,-(.3+j*.46)*.26/3.1+.008),(.15,.25,.012),'orange',ramp)
 def door_pose(value):
  for side,o in zip([-1,1],doors):o.rotation_euler.z=side*math.radians(110)*value
  ramp.rotation_euler.x=math.radians(-94.8)*(1-value)
 door_pose(1 if opened else 0)
 return r,doors,ramp,door_pose

def tank(number,loc):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(P/'assets/hover-tank/mork_hover_tank_low_d0.glb'))
 imported=set(bpy.data.objects)-before
 vehicle=empty('VEHICLE_'+number,loc);vehicle['role']='mork_tank';vehicle['source']='mork_hover_tank_low_d0.glb'
 for o in imported:
  o.animation_data_clear()
  for c in list(o.users_collection):c.objects.unlink(o)
  k.active_collection.objects.link(o)
  if o.parent not in imported:o.parent=vehicle
 return vehicle

def clip(name,objects,seconds,pose):
 for o in objects:
  if o.animation_data:o.animation_data.action=None
 for frame in range(round(seconds*30)+1):
  pose(frame/(seconds*30))
  for o in objects:
   for prop in ['location','rotation_euler']:o.keyframe_insert(prop,frame=frame)
 for o in objects:
  a=o.animation_data.action;a.name=name+'__'+o.name
  track=o.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,0,a);strip.extrapolation='NOTHING';track.mute=True;o.animation_data.action=None

def smooth(t):return t*t*(3-2*t)
entries=[]
for mode in ['empty','loaded','diorama']:
 e=k.begin('mork_container_'+('low_' if GAME else '')+mode,'MORK / '+{'empty':'Empty armored container','loaded':'Loaded armored container','diorama':'Container deployment diorama'}[mode],'Intact',[36,40] if mode=='diorama' else [8,20],'')
 e['detail']='low' if GAME else 'standard';e['scene_mode']=mode
 root=k.active_root;root['credit']='Models by jelaludo';scene_objects=[]
 if mode!='diorama':
  r,doors,ramp,door_pose=container('02' if mode=='loaded' else '01')
  if mode=='loaded':tank('02',(0,CENTER,FLOOR))
  clip('Doors_Open',doors+[ramp],2.4,lambda t:door_pose(smooth(t)))
  clip('Doors_Close',doors+[ramp],2.4,lambda t:door_pose(1-smooth(t)))
  door_pose(1);e['animations']=['Doors_Open','Doors_Close']
  e['description']='Close-fitting armored carrier with twin blast doors, ramp, removable inspection roof and military stencils.'+(' MORK is fully inside with its cannon facing the opening.' if mode=='loaded' else ' Empty cargo bay.')
 else:
  container('01',(-11,0,0),False);container('02',(0,0,0),True);container('03',(11,0,0),True)
  tank('02',(0,CENTER,FLOOR));vehicle=tank('03',(11,CENTER,FLOOR))
  def rollout(t):
   distance=19*smooth(t);vehicle.location=(11,CENTER-distance,FLOOR*(1-smooth(min(1,max(0,(distance-13.75)/3.4)))))
  clip('Tank_Roll_Out',[vehicle],8,rollout);rollout(.42)
  e['animations']=['Tank_Roll_Out'];e['preview_time_s']=3.36
  e['description']='01 sealed; 02 open with MORK parked inside; 03 open with MORK deploying down the ramp. Rollout animation is on vehicle 03 only.'
  box('Deployment hardstand',(0,-3,-.10),(34,42,.18),'concrete',root)
  for x in [-11,0,11]:
   for y in [-10.8,-13,-15.2,-17.4]:box('Deployment lane marking',(x,y,.005),(.14,1,.008),'stencil',root)
 # Convert labels and batch by material within each actual moving assembly.
 for o in list(k.active_collection.objects):
  if o.type=='FONT':
   bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
 if GAME:
  palette=k.M.get('game_palette')
  if not palette:
   palette=k.material('Container game / vertex palette',(1,1,1),.25,.78);k.M['game_palette']=palette
   color=palette.node_tree.nodes.new('ShaderNodeVertexColor');color.layer_name='Color';palette.node_tree.links.new(color.outputs['Color'],palette.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
  for o in list(k.active_collection.objects):
   if o.type!='MESH':continue
   o.data=o.data.copy();colors=o.data.color_attributes.new(name='Color',type='BYTE_COLOR',domain='CORNER')
   for face in o.data.polygons:
    mat=o.data.materials[face.material_index];bs=mat.node_tree.nodes.get('Principled BSDF') if mat.use_nodes else None
    rgba=bs.inputs['Base Color'].default_value if bs else mat.diffuse_color
    for loop in face.loop_indices:colors.data[loop].color=rgba
    face.material_index=0
   o.data.materials.clear();o.data.materials.append(palette)
 groups={}
 for o in list(k.active_collection.objects):
  if o.type!='MESH':continue
  parent=o.parent
  while parent and parent!=root and not parent.name.startswith(('DOOR_','RAMP_','ROOF_','SHELL_','VEHICLE_')):parent=parent.parent
  groups.setdefault((parent or root,o.active_material),[]).append(o)
 for (parent,mat),objects in groups.items():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  active=objects[0];bpy.context.view_layer.objects.active=active;bpy.ops.object.join();world=active.matrix_world.copy();active.parent=parent;active.matrix_world=world;active.name='Geometry_'+parent.name+'_'+mat.name
  bm=bmesh.new();bm.from_mesh(active.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(active.data);bm.free()
 # Remove emptied tank internals after static batching; keep the vehicle motion root.
 for o in list(k.active_collection.objects):
  if o.type=='EMPTY' and not o.children and not o.animation_data and o!=root and not o.name.startswith(('DOOR_','RAMP_','ROOF_','SHELL_','VEHICLE_','CONTAINER_')):bpy.data.objects.remove(o,do_unlink=True)
 e.update(interior_m=[6.6,3.6,14.2],floor_y_m=.26,tank_clearance_m={'side_each':.387,'length_each':.46,'roof':.58},tank_pose='neutral cannon forward; power off',credit='Models by jelaludo')
 entries.append((root,k.active_collection,e))
# Export each self-contained scene with the authored default presentation pose.
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=0;scene.frame_end=240
for root,col,e in entries:
 bpy.ops.object.select_all(action='DESELECT')
 for o in col.objects:
  o.select_set(True)
  if o.animation_data:
   for track in o.animation_data.nla_tracks:track.mute=False
 bpy.context.view_layer.objects.active=root
 bpy.ops.export_scene.gltf(filepath=str(OUT/e['file']),export_format='GLB',use_selection=True,export_extras=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
 for o in col.objects:
  if o.animation_data:
   for track in o.animation_data.nla_tracks:track.mute=True
 b=(OUT/e['file']).read_bytes();d=json.loads(b[20:20+struct.unpack_from('<I',b,12)[0]])
 # Explicit default display pose, independent of exported clip sampling at frame zero.
 for node in d['nodes']:
  name=node.get('name','')
  if name.startswith('DOOR_'):
   closed=e['id'].endswith('diorama') and name.startswith('DOOR_01_')
   side=-1 if '_L' in name else 1;angle=0 if closed else side*math.radians(110)
   node['rotation']=[0,math.sin(angle/2),0,math.cos(angle/2)]
  if name.startswith('RAMP_'):
   closed=e['id'].endswith('diorama') and name.startswith('RAMP_01')
   angle=math.radians(-94.8) if closed else 0;node['rotation']=[math.sin(angle/2),0,0,math.cos(angle/2)]
  if name.startswith('VEHICLE_03'):
   node['translation']=[11,FLOOR,19*smooth(.42)-CENTER]
 old_length=struct.unpack_from('<I',b,12)[0];payload=json.dumps(d,separators=(',',':')).encode();payload+=b' '*((-len(payload))%4);chunks=b[20+old_length:]
 b=struct.pack('<III',0x46546c67,2,20+len(payload)+len(chunks))+struct.pack('<II',len(payload),0x4e4f534a)+payload+chunks
 (OUT/e['file']).write_bytes(b)
 e['triangles']=sum(d['accessors'][p['indices']]['count']//3 for m in d.get('meshes',[]) for p in m['primitives']);e['draw_calls']=sum(len(m['primitives']) for m in d.get('meshes',[]));e['bytes']=len(b)
(OUT/('manifest-low.json' if GAME else 'manifest.json')).write_text(json.dumps({'units':'meters','up':'+Y','forward':'+Z','assets':[e for r,c,e in entries]},indent=2)+'\n')
# Editable gallery, separate collections for all three deliverables.
for i,(root,col,e) in enumerate(entries):root.location.x=i*50
bpy.ops.wm.save_as_mainfile(filepath=str(P/('source/blender/mork-containers-low.blend' if GAME else 'source/blender/mork-containers.blend')))
print('CONTAINERS_COMPLETE',[(e['id'],e['triangles']) for r,c,e in entries])
