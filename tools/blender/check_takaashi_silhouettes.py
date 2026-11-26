"""LOD silhouette check for a TAKAASHI family: orthographic front and side masks of each tier in
its bind pose, compared with LOD0 as intersection over union (IoU). Open frames make LOD0 see-through
between bars, so a solid distance tier scores lower by design; the numbers are reported, not gated.
Run: blender -b --factory-startup --python-exit-code 1 --python tools/blender/check_takaashi_silhouettes.py -- \
     --family takaashi02 [--px 1000] [--out report.json]
"""
import bpy, sys, json
import numpy as np
from pathlib import Path
A = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def opt(k, d=None): return A[A.index(k)+1] if k in A else d
P = Path(__file__).resolve().parents[2]; fam = opt('--family', 'takaashi02'); PX = int(opt('--px', '1000'))
VIEWS = {'front': ((0, -10, .6), (0, 0, .6)), 'side': ((10, 0, .6), (0, 0, .6))}
def masks(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True); s = bpy.context.scene
    bpy.ops.import_scene.gltf(filepath=str(glb))
    for o in s.objects:
        if o.type == 'ARMATURE' and o.animation_data: o.animation_data.action = None
    s.render.engine = 'BLENDER_WORKBENCH'; sh = s.display.shading; sh.light = 'FLAT'; sh.color_type = 'SINGLE'; sh.single_color = (1, 1, 1)
    sh.show_cavity = False; sh.show_shadows = False; sh.background_type = 'VIEWPORT'; sh.background_color = (0, 0, 0)
    s.view_settings.view_transform = 'Standard'; s.render.resolution_x = PX; s.render.resolution_y = int(PX*.42); s.render.film_transparent = False
    w = bpy.data.worlds.new('W'); s.world = w; w.color = (0, 0, 0)
    cd = bpy.data.cameras.new('C'); cd.type = 'ORTHO'; cd.ortho_scale = 3.3; cam = bpy.data.objects.new('C', cd); s.collection.objects.link(cam); s.camera = cam
    out = {}
    from mathutils import Vector
    for name, (loc, tgt) in VIEWS.items():
        cam.location = loc; cam.rotation_euler = (Vector(tgt)-Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        path = str(Path(bpy.app.tempdir)/(name+'.png')); s.render.filepath = path; bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(path); a = np.array(img.pixels[:]).reshape(img.size[1], img.size[0], 4)[..., 0] > .5
        out[name] = a; bpy.data.images.remove(img)
    return out
tiers = {lod: masks(P/'assets'/fam/f'{fam}_d0_lod{lod}.glb') for lod in (0, 1, 2)}
rep = {'family': fam, 'pixels_wide': PX, 'metres_per_pixel': round(3.3/PX, 4), 'pose': 'bind', 'iou_vs_lod0': {}, 'coverage_ratio_vs_lod0': {}}
for lod in (1, 2):
    for v in VIEWS:
        a, b = tiers[0][v], tiers[lod][v]
        rep['iou_vs_lod0'][f'lod{lod}_{v}'] = round(float((a & b).sum()/max(1, (a | b).sum())), 4)
        rep['coverage_ratio_vs_lod0'][f'lod{lod}_{v}'] = round(float(b.sum()/max(1, a.sum())), 4)
print('SILHOUETTE', json.dumps(rep))
if opt('--out'): Path(opt('--out')).write_text(json.dumps(rep, indent=2)+'\n')
