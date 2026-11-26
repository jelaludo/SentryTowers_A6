"""TAKAASHI-01 review renders: bright seamless studio after the user's concept lighting.
Derived images only. Imports a plain GLB tier; optionally poses one clip at a time.
blender -b --factory-startup --python-exit-code 1 --python tools/blender/render_takaashi.py -- \
    --glb assets/takaashi01/takaashi01_d0_lod0.glb --out DIR --views front,hero,side,top [--clip Name --time 0.5] [--engine eevee|cycles|workbench] [--samples 32] [--size 1400x800]
Views: front hero side top low claw knee face back actuator palm. Workbench renders clay for a quick shape check.
"""
import bpy, sys, math
from pathlib import Path
from mathutils import Vector
A = sys.argv[sys.argv.index('--')+1:]
def opt(k, d=None): return A[A.index(k)+1] if k in A else d
P = Path(__file__).resolve().parents[2]
glb = Path(opt('--glb', 'assets/takaashi01/takaashi01_d0_lod0.glb')); glb = glb if glb.is_absolute() else P/glb
out = Path(opt('--out', '/tmp/takaashi-review')); out.mkdir(parents=True, exist_ok=True)
views = opt('--views', 'front,hero,side').split(','); engine = opt('--engine', 'eevee'); samples = int(opt('--samples', '32'))
W, Hh = [int(x) for x in opt('--size', '1400x800').split('x')]
poses = [(opt('--clip'), float(opt('--time', '0')))] if opt('--clip') else [(None, 0.)]
if opt('--poses'):   # Name@time,Name@time
    poses = [(p.split('@')[0], float(p.split('@')[1])) for p in opt('--poses').split(',')]

bpy.ops.wm.read_factory_settings(use_empty=True)
s = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=str(glb))
arm = next((o for o in s.objects if o.type == 'ARMATURE'), None)
if engine == 'workbench':   # clay silhouettes for fast shape review
    s.render.engine = 'BLENDER_WORKBENCH'; sh = s.display.shading; sh.light = 'STUDIO'; sh.color_type = 'SINGLE'
    sh.single_color = (.62, .60, .56); sh.show_cavity = True; sh.cavity_type = 'BOTH'; sh.show_shadows = True
elif engine == 'cycles':
    s.render.engine = 'CYCLES'; s.cycles.samples = samples; s.cycles.use_denoising = True
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type = 'METAL'; prefs.get_devices()
        for d in prefs.devices: d.use = True
        s.cycles.device = 'GPU'
    except Exception as e: print('CPU render', e)
else:
    for eng in ('BLENDER_EEVEE', 'BLENDER_EEVEE_NEXT'):
        try: s.render.engine = eng; break
        except TypeError: pass
    try: s.eevee.taa_render_samples = samples; s.eevee.use_raytracing = True; s.eevee.use_shadows = True
    except AttributeError: pass
s.render.resolution_x = W; s.render.resolution_y = Hh; s.render.resolution_percentage = 100
s.view_settings.view_transform = 'AgX'; s.view_settings.look = 'AgX - Medium High Contrast' if engine == 'cycles' else 'None'
world = bpy.data.worlds.new('Studio'); s.world = world
bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND'); bg.inputs[0].default_value = (.20, .20, .21, 1); bg.inputs[1].default_value = 1.
# White seamless sweep behind the subject; the darker world keeps metal reading as gunmetal.
import bmesh
sweep = bpy.data.meshes.new('Sweep'); bm = bmesh.new(); prof = []
for i in range(13):
    a = math.pi/2*i/12; prof.append((0, 6-3.5*math.cos(a)*0+3.5*(1-math.cos(a))*0, 0))
rows = []
for i in range(25):
    a = math.pi/2*i/24; y = 5.0+2.0*math.sin(a); z = 2.0*(1-math.cos(a))
    rows.append([bm.verts.new((x, y, z)) for x in (-14, 14)])
rows.append([bm.verts.new((x, 7.0, 9.0)) for x in (-14, 14)])
for r0, r1 in zip(rows, rows[1:]): bm.faces.new((r0[0], r0[1], r1[1], r1[0]))
bm.to_mesh(sweep); bm.free(); so = bpy.data.objects.new('Sweep', sweep); s.collection.objects.link(so)
sm = bpy.data.materials.new('Sweep_white'); sb = next(n for n in sm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
sb.inputs['Base Color'].default_value = (.85, .85, .84, 1); sb.inputs['Roughness'].default_value = .9; sweep.materials.append(sm)
for o in [so]:
    o.rotation_euler = (0, 0, 0)
# Glossy pale floor and a curved seamless backdrop.
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); floor = bpy.context.object
m = bpy.data.materials.new('Studio_floor'); b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
b.inputs['Base Color'].default_value = (.72, .72, .70, 1); b.inputs['Roughness'].default_value = .16; floor.data.materials.append(m)
def light(name, loc, power, size, target=(0, 0, .5), color=(1, 1, 1)):
    d = bpy.data.lights.new(name, 'AREA'); o = bpy.data.objects.new(name, d); s.collection.objects.link(o); o.location = loc
    d.energy = power; d.shape = 'DISK'; d.size = size; d.color = color
    o.rotation_euler = (Vector(target)-o.location).to_track_quat('-Z', 'Y').to_euler()
light('Key', (2.2, -3.2, 4.2), 1100, 3.0, color=(1, .97, .93)); light('Fill', (-3.5, -2.0, 2.4), 380, 4)
light('Top', (0, .5, 5.5), 700, 4); light('Rim', (0, 3.5, 2.5), 700, 3); light('Sweep', (0, 1.5, 6), 1600, 8, target=(0, 6, 1.5))
cd = bpy.data.cameras.new('Cam'); cam = bpy.data.objects.new('Cam', cd); s.collection.objects.link(cam); s.camera = cam; cd.lens = 50
VIEWS = {  # Blender axes: -Y forward, +X crab left
    'front': ((0., -5.6, .95), (0, 0, .52), 42), 'hero': ((3.6, -4.4, 1.9), (0, -.1, .45), 45),
    'side': ((6.0, -.05, .9), (0, 0, .50), 42), 'top': ((0., -.6, 7.0), (0, -.05, 0), 38),
    'low': ((1.1, -3.2, .30), (0, -.3, .55), 32), 'claw': ((1.35, -1.75, .95), (.30, -.85, .40), 50),
    'knee': ((2.2, -1.2, 1.4), (.75, -.55, .80), 60), 'face': ((.45, -1.35, .78), (0, -.32, .64), 55),
    'back': ((-2.8, 4.2, 1.6), (0, 0, .45), 45),
    'actuator': ((1.10, -1.18, .96), (.54, -.43, .82), 62), 'palm': ((.95, -1.30, .62), (.33, -.86, .47), 58),
}
def aim(o, p): o.rotation_euler = (Vector(p)-o.location).to_track_quat('-Z', 'Y').to_euler()
for clip, t in poses:
    if clip and arm:
        act = bpy.data.actions.get(clip) or next((a for a in bpy.data.actions if a.name.startswith(clip)), None)
        arm.animation_data_create(); arm.animation_data.action = act
        try:
            if act.slots: arm.animation_data.action_slot = act.slots[0]
        except Exception: pass
        fps = s.render.fps; s.frame_set(int(t*fps), subframe=(t*fps) % 1)
    for v in views:
        loc, tgt, lens = VIEWS[v]; cam.location = loc; aim(cam, tgt); cd.lens = lens
        tag = (clip+'-'+('%.2f' % t)+'-' if clip else '')+v
        s.render.filepath = str(out/(tag+'.png')); bpy.ops.render.render(write_still=True); print('RENDERED', s.render.filepath, flush=True)
