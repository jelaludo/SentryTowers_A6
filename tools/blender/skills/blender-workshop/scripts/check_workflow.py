"""Blender 5.3 scratch smoke check; run in a separate background process."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from bpy_extras.anim_utils import action_get_channelbag_for_slot
from mathutils import Vector


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    assert bpy.app.background, 'Run in a separate background process'
    assert bpy.app.version[:2] == (5, 3), bpy.app.version_string
    out = args.out.expanduser().resolve()
    if out.exists() and any(out.iterdir()):
        raise RuntimeError(f'Refusing nonempty output directory: {out}')
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.name = 'WORKFLOW_PROBE'
    scene.unit_settings.system = 'METRIC'
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = 0, 48

    def obj(name, data=None, parent=None):
        item = bpy.data.objects.new(name, data)
        scene.collection.objects.link(item)
        item.parent = parent
        return item

    root = obj('PROBE_ROOT')
    root['credit'] = 'Jelaludo'
    root['purpose'] = 'Toolchain validation only; not a production asset'
    rig = obj('PROBE_RIG', bpy.data.armatures.new('PROBE_ARMATURE'), root)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    try:
        for name, z in [('BASE_JOINT', 0), ('TIP_JOINT', 1)]:
            bone = rig.data.edit_bones.new(name)
            bone.head, bone.tail = (0, 0, z), (0, 0, z + 1)
            if z:
                bone.parent = rig.data.edit_bones['BASE_JOINT']
                bone.use_connect = True
    finally:
        bpy.ops.object.mode_set(mode='OBJECT')

    verts, faces = [], []
    cube_faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4),
                  (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    for base in (0, 1):
        offset = len(verts)
        verts.extend((x, y, z + base) for z in (0, 1)
                     for x, y in [(-.35, -.25), (.35, -.25), (.35, .25), (-.35, .25)])
        faces.extend(tuple(i + offset for i in face) for face in cube_faces)
    mesh = bpy.data.meshes.new('PROBE_GEOMETRY')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    # glTF skins use joint world matrices, so keep the skinned mesh at scene root.
    body = obj('PROBE_BODY', mesh)
    uv = mesh.uv_layers.new(name='UVMap')
    for face in mesh.polygons:
        for loop, coord in zip(face.loop_indices, [(0, 0), (1, 0), (1, 1), (0, 1)]):
            uv.data[loop].uv = coord
    for index, name in enumerate(['BASE_JOINT', 'TIP_JOINT']):
        body.vertex_groups.new(name=name).add(list(range(index * 8, index * 8 + 8)), 1, 'REPLACE')
    body.modifiers.new('PROBE_SKIN', 'ARMATURE').object = rig

    material = bpy.data.materials.new('PROBE_PBR')
    nodes, links = material.node_tree.nodes, material.node_tree.links
    bsdf = next(node for node in nodes if node.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Metallic'].default_value = .15
    bsdf.inputs['Roughness'].default_value = .45
    color_roles = {}
    for name, role, pixels in [('PROBE_COLOR', 'srgb_rec709_display', [.15, .6, .8, 1]),
                               ('PROBE_NORMAL', 'data', [.5, .5, 1, 1])]:
        image = bpy.data.images.new(name, width=2, height=2)
        image.colorspace_settings.interop_id = role
        assert image.colorspace_settings.interop_id == role
        image.pixels[:] = pixels * 4
        image.pack()
        texture = nodes.new('ShaderNodeTexImage')
        texture.image = image
        color_roles[name] = role
        if role == 'data':
            normal = nodes.new('ShaderNodeNormalMap')
            links.new(texture.outputs['Color'], normal.inputs['Color'])
            links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
        else:
            links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
    body.data.materials.append(material)

    pivot = obj('ENGINE_YAW', parent=root)
    pivot.location = (0, 0, 2)
    socket = obj('SOCKET_TOOL', parent=pivot)
    socket.location = (0, -.35, 0)
    expected_socket = Vector((0, -.35, 2))
    tip = rig.pose.bones['TIP_JOINT']
    tip.rotation_mode = 'XYZ'
    for frame, angle in [(0, 0), (24, math.radians(35)), (48, 0)]:
        tip.rotation_euler.x = angle
        tip.keyframe_insert('rotation_euler', frame=frame)
    action = rig.animation_data.action
    action.name = 'Probe_Cycle'
    bag = action_get_channelbag_for_slot(action, rig.animation_data.action_slot)
    assert len(bag.fcurves) == 3
    for curve in bag.fcurves:
        for key in curve.keyframe_points:
            key.interpolation = 'LINEAR'
    expected_positions = {}
    for frame in (0, 24, 48):
        scene.frame_set(frame)
        evaluated = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        expected_positions[frame] = [tuple(v.co) for v in evaluated.data.vertices]
    scene.frame_set(0)
    assert max((Vector(a) - Vector(b)).length for a, b in
               zip(expected_positions[0], expected_positions[24])) > .1
    bpy.context.view_layer.update()
    assert (socket.matrix_world.translation - expected_socket).length < 1e-6
    names = {item.name for item in scene.objects} | {b.name for b in rig.data.bones}
    assert all('.' not in name for name in names)
    for item in scene.objects:
        item.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'workflow-probe.blend'))
    bpy.ops.export_scene.gltf(filepath=str(out / 'workflow-probe.glb'), export_format='GLB',
                             use_selection=True, export_yup=True, export_extras=True,
                             export_animations=True, export_animation_mode='ACTIONS',
                             export_force_sampling=True, export_frame_range=True,
                             export_tangents=True)

    # Separate scene, no source overwrite or name collisions.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 24
    bpy.ops.import_scene.gltf(filepath=str(out / 'workflow-probe.glb'))
    imported = list(bpy.data.objects)
    imported_names = {item.name for item in imported}
    imported_rig = next(item for item in imported if item.type == 'ARMATURE')
    assert names <= imported_names | {b.name for b in imported_rig.data.bones}
    imported_body = bpy.data.objects['PROBE_BODY']
    assert any(m.type == 'ARMATURE' for m in imported_body.modifiers)
    assert bpy.data.objects['ENGINE_YAW'].animation_data is None
    max_error = 0.0
    for frame, positions in expected_positions.items():
        scene.frame_set(frame)
        evaluated = imported_body.evaluated_get(bpy.context.evaluated_depsgraph_get())
        actual = [imported_body.matrix_world @ v.co for v in evaluated.data.vertices]
        for position in positions:
            max_error = max(max_error, min((Vector(position) - other).length for other in actual))
        assert (bpy.data.objects['SOCKET_TOOL'].matrix_world.translation - expected_socket).length < 1e-5
    assert max_error < 1e-5, max_error
    imported_material = imported_body.data.materials[0]
    roles = {n.image.colorspace_settings.interop_id for n in imported_material.node_tree.nodes
             if n.type == 'TEX_IMAGE'}
    assert roles == {'data', 'srgb_rec709_display'}, roles
    imported_action = imported_rig.animation_data.action
    duration = (imported_action.frame_range[1] - imported_action.frame_range[0]) / 24
    assert abs(duration - 2) < 1e-6, duration
    imported_body.data.calc_loop_triangles()
    payload = (out / 'workflow-probe.glb').read_bytes()
    json_length = struct.unpack_from('<I', payload, 12)[0]
    gltf = json.loads(payload[20:20 + json_length])
    draw_calls = sum(len(gltf['meshes'][node['mesh']]['primitives'])
                     for node in gltf['nodes'] if 'mesh' in node)
    assert [clip['name'] for clip in gltf['animations']] == ['Probe_Cycle']
    report = {'blender': bpy.app.version_string, 'build_hash': bpy.app.build_hash.decode(),
              'triangles': len(imported_body.data.loop_triangles), 'draw_calls': draw_calls,
              'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(),
              'nodes': sorted(names), 'clip': 'Probe_Cycle', 'duration_seconds': duration,
              'sampled_frames': [0, 24, 48], 'max_vertex_roundtrip_error_m': max_error,
              'color_roles': color_roles, 'engine_pivot_unkeyed': True,
              'socket_blender_m': list(expected_socket), 'credit': 'Jelaludo', 'passed': True}
    (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print('WORKFLOW_PASS', json.dumps(report))


if __name__ == '__main__':
    main()
