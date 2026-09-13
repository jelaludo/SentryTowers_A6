"""Build static one-draw distance tiers for recurring background units.

Run from the repository root:
  blender --background --factory-startup --python tools/blender/build_unit_distance_lods.py

The detailed/game sources remain untouched. Each distance tier keeps the source
control/socket empties for stable engine lookup, but its visible geometry is one
merged vertex-colour mesh with no animation. These are background, container and
loading proxies, not articulated combat or character-performance tiers.
"""
import bpy
import bmesh
import hashlib
import json
from pathlib import Path
from mathutils import Vector

P = Path(__file__).resolve().parents[2]

SPECS = (
    {
        "family": "mork",
        "source": P / "assets/hover-tank/mork_hover_tank_low_d0.glb",
        "output": P / "assets/hover-tank/mork_hover_tank_d0_lod2.glb",
        "blend": P / "source/blender/mork-hover-tank-distance.blend",
        "root": "ROOT",
        "id": "mork_hover_tank_d0_lod2",
        "name": "MÖRK / Static container and background proxy",
        "target_triangles": 1750,
        "plot_m": [18, 18],
    },
    {
        "family": "isao",
        "source": P / "assets/isao-birudoron/isao_birudoron_lod1.glb",
        "output": P / "assets/isao-birudoron/isao_birudoron_lod2.glb",
        "blend": P / "source/blender/isao-birudoron-distance.blend",
        "root": "ISAO_ROOT",
        "id": "isao_birudoron_lod2",
        "name": "ISAO-Birudorōn / Static distant-flight proxy",
        "target_triangles": 1800,
        "plot_m": [3, 3],
    },
)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def base_color(material):
    if material and material.use_nodes:
        shader = material.node_tree.nodes.get("Principled BSDF")
        if shader:
            value = shader.inputs.get("Base Color")
            if value:
                return tuple(value.default_value)
    return tuple(material.diffuse_color) if material else (0.18, 0.24, 0.25, 1)


def palette_material(family):
    material = bpy.data.materials.new(f"{family.upper()}_DISTANCE_PALETTE")
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Metallic"].default_value = 0.42
    shader.inputs["Roughness"].default_value = 0.48
    colors = material.node_tree.nodes.new("ShaderNodeVertexColor")
    colors.layer_name = "Color"
    material.node_tree.links.new(colors.outputs["Color"], shader.inputs["Base Color"])
    return material


def add_isao_distance_signal(root):
    # At distance the individual emotion pixels cannot be read. A single cyan
    # functional bar preserves the lit-panel landmark without implying emotion.
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.393, 1.17))
    signal = bpy.context.object
    signal.name = "DISTANCE_PANEL_SIGNAL_SOURCE"
    signal.dimensions = (0.38, 0.018, 0.065)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    material = bpy.data.materials.new("ISAO_DISTANCE_SIGNAL")
    material.diffuse_color = (0.02, 0.72, 1.0, 1)
    signal.data.materials.append(material)
    signal.parent = root


def visible_meshes(family):
    meshes = []
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            continue
        if family == "isao" and obj.name.startswith("FACE_"):
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        scale = obj.matrix_world.to_scale()
        if min(abs(value) for value in scale) < 0.01:
            bpy.data.objects.remove(obj, do_unlink=True)
            continue
        meshes.append(obj)
    return meshes


def bake_vertex_colors(meshes, palette):
    for obj in meshes:
        mesh = obj.data
        colors = mesh.color_attributes.get("Color") or mesh.color_attributes.new(
            name="Color", type="BYTE_COLOR", domain="CORNER"
        )
        for polygon in mesh.polygons:
            material = obj.material_slots[polygon.material_index].material if obj.material_slots else None
            rgba = base_color(material)
            for loop_index in polygon.loop_indices:
                colors.data[loop_index].color = rgba
            polygon.material_index = 0
        mesh.materials.clear()
        mesh.materials.append(palette)


def triangle_count(obj):
    obj.data.calc_loop_triangles()
    return len(obj.data.loop_triangles)


def protected_geometry(obj, family):
    if family == "isao":
        return obj.name == "DISTANCE_PANEL_SIGNAL_SOURCE"
    protected_names = {
        "Armored cannon breech", "Long cannon barrel", "Barrel stiffener",
        "Open cannon muzzle", "Muzzle brake vane",
    }
    return any(obj.name == name or obj.name.startswith(name + ".") for name in protected_names)


def join_objects(objects):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    return bpy.context.object


def merge_and_reduce(root, meshes, target_triangles, family):
    bake_vertex_colors(meshes, palette_material(root.name.split("_")[0]))
    protected = [obj for obj in meshes if protected_geometry(obj, family)]
    core = [obj for obj in meshes if obj not in protected]
    for obj in meshes:
        obj.data = obj.data.copy()
        world = obj.matrix_world.copy()
        obj.parent = None
        obj.matrix_world = world
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    protected_triangles = sum(triangle_count(obj) for obj in protected)
    result = join_objects(core)
    result.name = "DISTANCE_GEOMETRY"
    result.data.name = "DISTANCE_GEOMETRY_MESH"
    result["static"] = True
    result["purpose"] = "background container map and loading proxy"
    result.data.calc_loop_triangles()
    original = len(result.data.loop_triangles)
    core_target = max(300, target_triangles - protected_triangles)
    if original > core_target:
        modifier = result.modifiers.new("Silhouette distance reduction", "DECIMATE")
        modifier.ratio = core_target / original
        modifier.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = result
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    if protected:
        result = join_objects([result, *protected])
        result.name = "DISTANCE_GEOMETRY"
        result.data.name = "DISTANCE_GEOMETRY_MESH"
    triangulate = result.modifiers.new("Distance triangles", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=triangulate.name)
    bm = bmesh.new()
    bm.from_mesh(result.data)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-7, edges=list(bm.edges))
    loose = [vertex for vertex in bm.verts if not vertex.link_faces]
    if loose:
        bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.to_mesh(result.data)
    bm.free()
    result.data.validate(clean_customdata=False)
    result.data.update()
    result.parent = root
    result.matrix_parent_inverse.identity()
    result.matrix_basis.identity()
    return result


def glb_bounds(mesh):
    used = {index for polygon in mesh.data.polygons for index in polygon.vertices}
    points = [mesh.matrix_world @ mesh.data.vertices[index].co for index in used]
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    low = [minimum.x, minimum.z, -maximum.y]
    high = [maximum.x, maximum.z, -minimum.y]
    return {
        "min": [round(value, 6) for value in low],
        "max": [round(value, 6) for value in high],
        "size": [round(high[index] - low[index], 6) for index in range(3)],
    }


def read_glb(path):
    data = path.read_bytes()
    json_length = int.from_bytes(data[12:16], "little")
    return json.loads(data[20:20 + json_length])


def build(spec):
    reset()
    bpy.ops.import_scene.gltf(filepath=str(spec["source"]))
    scene = bpy.context.scene
    scene.name = f'{spec["name"]} source'
    root = scene.objects.get(spec["root"])
    if not root:
        raise RuntimeError(f'Missing {spec["root"]} in {spec["source"]}')
    scene.frame_set(0)
    bpy.context.view_layer.update()
    rest_transforms = {obj: obj.matrix_basis.copy() for obj in scene.objects}
    for obj in scene.objects:
        obj.animation_data_clear()
        obj.matrix_basis = rest_transforms[obj]
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    bpy.context.view_layer.update()
    if spec["family"] == "isao":
        add_isao_distance_signal(root)
    meshes = visible_meshes(spec["family"])
    merged = merge_and_reduce(root, meshes, spec["target_triangles"], spec["family"])
    root["asset_id"] = spec["id"]
    root["lod"] = 2
    root["damage_level"] = 0
    root["static"] = True
    root["credit"] = "Models by jelaludo"
    bounds = glb_bounds(merged)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(spec["output"]), export_format="GLB", use_selection=True,
        export_extras=True, export_animations=False, export_cameras=False,
        export_lights=False,
    )
    doc = read_glb(spec["output"])
    triangles = sum(
        doc["accessors"][primitive["indices"]]["count"] // 3
        for mesh in doc.get("meshes", []) for primitive in mesh.get("primitives", [])
    )
    draws = sum(len(mesh.get("primitives", [])) for mesh in doc.get("meshes", []))
    if triangles > spec["target_triangles"] or draws != 1:
        raise RuntimeError(f'{spec["id"]}: {triangles} triangles / {draws} draws')
    engine_nodes = sorted(obj.name for obj in scene.objects if obj.type == "EMPTY")
    entry = {
        "id": spec["id"], "family": "mork_hover_tank" if spec["family"] == "mork" else "isao_birudoron",
        "name": spec["name"], "file": spec["output"].name, "lod": 2,
        "damage_level": 0, "state": "Intact static distance" if spec["family"] == "mork" else "Static distant flight", "detail": "distance", "static": True,
        "functional": False, "derived": True, "game_ready": False,
        "source_file": spec["source"].name,
        "source_sha256": hashlib.sha256(spec["source"].read_bytes()).hexdigest(),
        "reduction_method": "authored Blender silhouette reduction with merged vertex-color palette",
        "intended_uses": ["background", "container display", "map or loading view"] if spec["family"] == "mork" else ["distant flight", "background", "map or loading view"],
        "excluded_uses": ["combat articulation", "damage states D1-D3"] if spec["family"] == "mork" else ["readable emotion", "limb acting", "fabrication close-up"],
        "plot_m": spec["plot_m"], "bytes": spec["output"].stat().st_size,
        "sha256": hashlib.sha256(spec["output"].read_bytes()).hexdigest(),
        "triangles": triangles, "draw_calls": draws, "nodes": len(doc.get("nodes", [])),
        "materials": len(doc.get("materials", [])), "embedded_textures": len(doc.get("textures", [])),
        "bounds_min_m": bounds["min"], "bounds_max_m": bounds["max"], "dimensions_m": bounds["size"],
        "root": spec["root"], "engine_nodes": engine_nodes, "sockets": [], "clips": [],
        "credit": "Models by jelaludo",
        "notes": "Static one-draw proxy. Engine may translate/rotate the root; child controls do not articulate this tier.",
    }
    bpy.ops.wm.save_as_mainfile(filepath=str(spec["blend"]), compress=True)
    print("DISTANCE_EXPORT", spec["id"], triangles, "triangles", draws, "draw", entry["bytes"], "bytes")
    return entry


def update_manifests(entries):
    mork, isao = entries
    mork_source_manifest = json.loads((P / "assets/hover-tank/manifest-low.json").read_text())
    mork_source = next(asset for asset in mork_source_manifest["assets"] if asset["damage_level"] == 0)
    mork["sockets"] = mork_source["sockets"]
    mork["description"] = "Static intact MÖRK proxy for repeated tanks in containers and other distant background views."
    mork_manifest = {
        "version": 1, "units": "meters", "up": "+Y", "forward": "+Z",
        "plain_glb_source_of_truth": True,
        "lod_policy": {
            "use": "Recurring intact tank displays in containers and other background views",
            "swap_note": "Static D0 proxy only; swap to the articulated game tier before combat or visible damage.",
        },
        "assets": [mork],
    }
    (P / "assets/hover-tank/manifest-distance.json").write_text(json.dumps(mork_manifest, indent=2, ensure_ascii=False) + "\n")
    isao_path = P / "assets/isao-birudoron/manifest.json"
    manifest = json.loads(isao_path.read_text())
    isao_source = next(asset for asset in manifest["assets"] if asset.get("lod") == 1)
    isao["sockets"] = isao_source["sockets"]
    isao["engine_nodes"] = isao_source["engine_nodes"]
    isao["description"] = "Static distant-flight silhouette with one non-emotive cyan functional signal; use LOD1 before facial or limb acting becomes readable."
    manifest["assets"] = [asset for asset in manifest["assets"] if asset.get("lod") != 2] + [isao]
    manifest["lod_policy"] = {
        "distance": "Load static LOD2 while ISAO's face and limb acting are below the readable screen-size threshold.",
        "game": "Swap to articulated LOD1 before the LED expression or limb performance becomes readable.",
        "detailed": "LOD0 remains a manual cinematic and recording selection.",
        "threshold": "Tune by projected screen size and reference hardware; do not assume the landmark 150 m threshold.",
    }
    controls = manifest.setdefault("viewer_controls", [])
    if "static one-draw distance tier" not in controls:
        controls.insert(3, "static one-draw distance tier")
    for tier in manifest.get("future_tiers", []):
        if tier["tier"] == "LOD2":
            tier["status"] = "delivered"
            tier["purpose"] = "Static one-draw distant-flight, background and loading representation"
    isao_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


def main():
    entries = [build(spec) for spec in SPECS]
    update_manifests(entries)


if __name__ == "__main__":
    main()
