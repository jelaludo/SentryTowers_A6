"""Reduce only the imported static surface; coordinates are passed through verbatim."""
import bpy
import json
import sys
from mathutils.kdtree import KDTree

source, output, target = sys.argv[sys.argv.index('--') + 1:]
data = json.load(open(source))
mesh = bpy.data.meshes.new('RED_WITNESS_DISTANCE_WORK')
mesh.from_pydata(data['positions'], [], data['triangles'])
colors = mesh.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
for item, color in zip(colors.data, data['colors']):
    item.color = (*color[:3], 1)
obj = bpy.data.objects.new('RED_WITNESS_DISTANCE_WORK', mesh)
bpy.context.collection.objects.link(obj)
samples = KDTree(len(data['positions']))
for index, position in enumerate(data['positions']):
    samples.insert(position, index)
samples.balance()
# A closed voxel proxy avoids tearing the source's many thin, overlapping
# muscle/plate surfaces when reduced to a few thousand triangles.
remesh = obj.modifiers.new('STATIC_SURFACE_UNION', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = 0.016
remesh.use_smooth_shade = True
evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
proxy = bpy.data.meshes.new_from_object(evaluated)
obj.modifiers.clear()
obj.data = proxy
proxy.calc_loop_triangles()
modifier = obj.modifiers.new('STATIC_DISTANCE_REDUCTION', 'DECIMATE')
modifier.ratio = min(1.0, int(target) / len(proxy.loop_triangles))
modifier.use_collapse_triangulate = True
evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
result = evaluated.to_mesh()
for polygon in result.polygons:
    polygon.use_smooth = True
result.update()
result.calc_loop_triangles()
sampled_colors = []
for vertex in result.vertices:
    neighbors = samples.find_n(vertex.co, 3)
    weights = [1.0 / max(distance, 0.001)**2 for _, _, distance in neighbors]
    sampled_colors.append([sum(data['colors'][index][channel] * weight for (_, index, _), weight in zip(neighbors, weights)) / sum(weights) for channel in range(3)])
json.dump({'positions': [list(v.co) for v in result.vertices],
           'normals': [list(v.normal) for v in result.vertices],
           'colors': sampled_colors,
           'triangles': [list(t.vertices) for t in result.loop_triangles]}, open(output, 'w'))
evaluated.to_mesh_clear()
