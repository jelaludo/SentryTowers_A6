"""Isolate HUGIN and render registered, transparent landing-PoC sprites."""
import bpy, math, json, bmesh
from pathlib import Path
from mathutils import Vector, Matrix
P=Path(__file__).resolve().parents[2]; OUT=P/'assets/hugin-flight';OUT.mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(P/'assets/launchpad/hugin_launchpad_d0.glb'))
booster=bpy.data.objects['REUSABLE_BOOSTER'];capsule=bpy.data.objects['CARGO_CAPSULE']
# Imported glTF is converted to Blender Z-up by the importer.
keep={booster,capsule,*booster.children_recursive,*capsule.children_recursive}
for o in [booster,capsule]:
    o.parent=None;o.animation_data_clear();o.rotation_euler=(0,0,0);o.scale=(1,1,1)
booster.location=(0,0,0);capsule.location=(0,0,18.4)
for o in list(bpy.data.objects):
    if o not in keep:bpy.data.objects.remove(o,do_unlink=True)
root=bpy.data.objects.new('HUGIN_FLIGHT',None);bpy.context.collection.objects.link(root)
booster.parent=root;capsule.parent=booster
bpy.context.view_layer.update()
def bounds():
    pts=[o.matrix_world@Vector(v) for o in keep if o.type=='MESH' for v in o.bound_box]
    return [min(v[i] for v in pts) for i in range(3)],[max(v[i] for v in pts) for i in range(3)]
lo,hi=bounds();height=hi[2]-lo[2]
# Stable game-body origin, an explicitly estimated dry-mass reference (not simulated mass).
pivot_z=.75*11.5+.25*(18.4+2.1)
booster.location.z=-pivot_z
root['credit']='Model by jelaludo';root['pivot_method']='Estimated dry COM: 75% booster at z11.5, 25% capsule at z20.5; not physical mass data'
root['vehicle_height_m']=height
bpy.context.view_layer.update()
original={o:o.matrix_local.copy() for o in keep};materials={o:list(o.data.materials) for o in keep if o.type=='MESH'}
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=384;scene.render.resolution_y=512;scene.render.resolution_percentage=100;scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.30,.38,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
camdata=bpy.data.cameras.new('Registered side camera');cam=bpy.data.objects.new('Registered side camera',camdata);scene.collection.objects.link(cam);cam.location=(0,-60,0);cam.rotation_euler=(math.pi/2,0,0);camdata.type='ORTHO'
# Camera origin is the common pivot. Reserve equal vertical space around it.
span=2*max(abs(lo[2]-pivot_z),abs(hi[2]-pivot_z))*1.065
camdata.ortho_scale=span;scene.camera=cam
for name,loc,power,size in [('Key',(-12,-18,20),6500,12),('Fill',(12,-8,5),3500,10),('Rim',(0,10,16),7000,9)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(-o.location).to_track_quat('-Z','Y').to_euler()
scene.view_settings.view_transform='AgX'
char=bpy.data.materials.new('Wreck / burned ceramic');char.diffuse_color=(.09,.065,.045,1);char.use_nodes=True;bs=char.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.09,.065,.045,1);bs.inputs['Roughness'].default_value=.94
states={}
for state in ['deployed','stowed','wreck']:
    for o,m in original.items():o.matrix_local=m.copy();o.hide_render=False;o.hide_set(False)
    for o,mats in materials.items():o.data.materials.clear();[o.data.materials.append(m) for m in mats]
    if state=='stowed':
        for leg in [o for o in keep if o.name.startswith('LANDING_LEG_')]:
            fold=Matrix.Translation((1.86,0,7))@Matrix.Rotation(math.radians(-143),4,'Y')@Matrix.Translation((-1.86,0,-7))
            for o in leg.children:
                if not o.name.startswith(('Thermal descent fin','Landing leg hinge')):o.matrix_local=fold@original[o]
    if state=='wreck':
        for o in materials:
            o.data.materials.clear();o.data.materials.append(char)
            if o.name.startswith(('Booster propellant hull','Cargo pressure hull')):
                o.data=o.data.copy()
                for v in o.data.vertices:
                    w=o.matrix_world@v.co
                    if w.y<0 and w.x>-.3:v.co.x*=.77;v.co.y*=.72
            if o.name.startswith('Booster propellant hull'):
                bm=bmesh.new();bm.from_mesh(o.data)
                torn=[f for f in bm.faces if (o.matrix_world@f.calc_center_median()).y < -1 and -4 < (o.matrix_world@f.calc_center_median()).z < 4]
                bmesh.ops.delete(bm,geom=torn,context='FACES');bm.to_mesh(o.data);bm.free()
            if o.name.startswith('Booster reinforcement ring'):o.rotation_euler.y+=.09
            if o.name.startswith('Cargo nose'):o.rotation_euler.y+=.32
            if o.name.startswith('Thermal descent fin'):o.rotation_euler.y+=.4
    bpy.context.view_layer.update();low,high=bounds()
    bpy.ops.object.select_all(action='DESELECT')
    for o in keep|{root}:o.select_set(True)
    bpy.context.view_layer.objects.active=root
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'hugin_{state}.glb'),export_format='GLB',use_selection=True,export_animations=False,export_extras=True,export_cameras=False,export_lights=False)
    scene.render.filepath=str(OUT/f'hugin_{state}.png');bpy.ops.render.render(write_still=True)
    states[state]={'image':f'hugin_{state}.png','model':f'hugin_{state}.glb','pivot_px':[192,256],'height_m':high[2]-low[2],'bounds_m':{'min':low,'max':high}}
    img=bpy.data.images.load(scene.render.filepath,check_existing=False)
    pixels=list(img.pixels);coords=[(i%384,511-i//384) for i in range(384*512) if pixels[i*4+3]>0]
    x0=min(x for x,y in coords);y0=min(y for x,y in coords);x1=max(x for x,y in coords)+1;y1=max(y for x,y in coords)+1
    assert x0>0 and y0>0 and x1<384 and y1<512,'Sprite clipped'
    states[state]['sprite_bounds_px']={'x':x0,'y':y0,'width':x1-x0,'height':y1-y0}
    states[state]['pivot_in_bounds_px']=[192-x0,256-y0]
    bpy.data.images.remove(img)
    if state=='deployed':bpy.ops.wm.save_as_mainfile(filepath=str(P/'source/blender/a6-hugin-flight.blend'))
(OUT/'atlas.json').write_text(json.dumps({'version':1,'credit':'Model by jelaludo','image_size_px':[384,512],'coordinates':'pixels: top-left origin; pivot shared across all images','pixels_per_metre':512/span,'vehicle_height_m':height,'height_definition':'Intact deployed foot sole to capsule nose; includes capsule, excludes launch complex','pivot_source_z_m':pivot_z,'pivot_method':root['pivot_method'],'camera':{'projection':'orthographic','view':'front side, looking along Blender +Y','vertical_span_m':span},'sprites':states},indent=2)+'\n')
print('MEASURED',height,'m',flush=True)
