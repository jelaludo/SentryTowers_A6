"""Temporary body-only distance geometry for the AUREL hand retrofit.

Original Blender master and all existing exports remain untouched.
"""
import bpy, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_c08_worker import shape, make_arm, make_skin

destination = Path(sys.argv[sys.argv.index('--') + 1])
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
col = bpy.data.collections.new('C08_BODY_ONLY')
bpy.context.scene.collection.children.link(col)
g = shape(2)
keep = [i for i, face in enumerate(g.f)
        if not any(g.b[v].startswith(('HAND_', 'FINGER_', 'THUMB_')) for v in face)]
g.f = [g.f[i] for i in keep]
g.mi = [g.mi[i] for i in keep]
g.smooth = [g.smooth[i] for i in keep]
arm = make_arm(col)
mesh = make_skin(g, col, arm, 2)
bpy.ops.object.select_all(action='DESELECT')
mesh.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB',
                         use_selection=True, export_animations=False,
                         export_cameras=False, export_lights=False)
