"""Build the ISAO-Birudoron production-alpha character family.

Run from the repository root:
  blender --background --factory-startup --python tools/blender/build_isao_birudoron.py

The supplied concept GLB is never opened or overwritten. This script authors a new
LOD0 master and LOD1 game tier with matching pivots, sockets and animation names.
"""
import bpy
import math
import json
import struct
import hashlib
import subprocess
from pathlib import Path
from mathutils import Vector

P = Path(__file__).resolve().parents[2]
OUT = P / "assets/isao-birudoron"
SOURCE = P / "source/blender/isao-birudoron.blend"
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.parent.mkdir(parents=True, exist_ok=True)
FPS = 30

COLORS = {
    "graphite": (0.030, 0.055, 0.064, 1),
    "armor": (0.115, 0.180, 0.195, 1),
    "edge": (0.285, 0.375, 0.385, 1),
    "dark": (0.008, 0.014, 0.018, 1),
    "cyan": (0.030, 0.720, 0.920, 1),
    "amber": (0.940, 0.480, 0.055, 1),
    "green": (0.100, 0.930, 0.320, 1),
    "red": (1.000, 0.075, 0.040, 1),
    "purple": (0.620, 0.240, 1.000, 1),
    "pink": (1.000, 0.180, 0.620, 1),
    "white": (0.180, 0.270, 0.290, 1),
}

FACE_PATTERNS = {
    "NEUTRAL": ["01100110", "10011001", "00000000", "00011000", "00011000", "00000000"],
    "HAPPY": ["01000010", "10100101", "00000000", "10000001", "01000010", "00111100"],
    "CURIOUS_LEFT": ["01100110", "00000000", "10001000", "00000000", "01111110", "00000000"],
    "CURIOUS_CENTER": ["01100110", "00000000", "01000010", "00000000", "01111110", "00000000"],
    "CURIOUS_RIGHT": ["01100110", "00000000", "00010001", "00000000", "01111110", "00000000"],
    "WORKING": ["11100111", "10100101", "11100111", "00011000", "00111100", "00011000"],
    "ALARM": ["10000001", "01000010", "00100100", "00000000", "00111100", "01000010"],
    "DETERMINED": ["00000000", "11100111", "00100100", "00000000", "00011000", "00000000"],
    "SAD": ["00100100", "01000010", "00100100", "00000000", "00111100", "01000010"],
    "SKEPTICAL_A": ["01000000", "00000000", "00000110", "01000010", "00000000", "00011100"],
    "SKEPTICAL_B": ["00100000", "01000000", "00000110", "01000010", "00000000", "00011100"],
    "LOVE_SMALL": ["00000000", "00100100", "01111110", "01111110", "00111100", "00011000"],
    "LOVE_LARGE": ["01000010", "11100111", "11111111", "01111110", "00111100", "00011000"],
}
FACE_MATERIAL = {
    "NEUTRAL": "amber", "HAPPY": "green", "CURIOUS_LEFT": "amber",
    "CURIOUS_CENTER": "amber", "CURIOUS_RIGHT": "amber", "WORKING": "cyan",
    "ALARM": "red", "DETERMINED": "amber", "SAD": "purple",
    "SKEPTICAL_A": "amber", "SKEPTICAL_B": "amber",
    "LOVE_SMALL": "pink", "LOVE_LARGE": "pink",
}
EMOTION_FACE_SEQUENCE = {
    "NEUTRAL": [(0.0, "NEUTRAL"), (4.0, "NEUTRAL")],
    "HAPPY": [(0.0, "HAPPY"), (1.6, "HAPPY")],
    "CURIOUS": [(0.0, "CURIOUS_LEFT"), (0.6, "CURIOUS_CENTER"), (1.2, "CURIOUS_RIGHT"), (1.8, "CURIOUS_CENTER"), (2.4, "CURIOUS_LEFT")],
    "WORKING": [(0.0, "WORKING"), (2.0, "WORKING")],
    "ALARM": [(0.0, "ALARM"), (1.2, "ALARM")],
    "DETERMINED": [(0.0, "DETERMINED"), (2.0, "DETERMINED")],
    "SAD": [(0.0, "SAD"), (3.2, "SAD")],
    "SKEPTICAL": [(0.0, "SKEPTICAL_A"), (0.8, "SKEPTICAL_B"), (1.6, "SKEPTICAL_A"), (2.4, "SKEPTICAL_A")],
    "LOVE": [(0.0, "LOVE_SMALL"), (0.35, "LOVE_LARGE"), (0.7, "LOVE_SMALL"), (1.05, "LOVE_LARGE"), (1.4, "LOVE_SMALL"), (2.2, "LOVE_SMALL")],
}
CLIPS = {
    "Rotor_Cycle": (1.0, True),
    "Hover_Idle": (4.0, True),
    "Emotion_Neutral": (4.0, True),
    "Emotion_Happy": (1.6, False),
    "Emotion_Curious": (2.4, True),
    "Emotion_Working": (2.0, True),
    "Emotion_Alarm": (1.2, False),
    "Emotion_Determined": (2.0, True),
    "Emotion_Sad": (3.2, True),
    "Emotion_Skeptical": (2.4, True),
    "Emotion_Love": (2.2, False),
    "Tool_Fabricate": (2.0, True),
}

built = []


def material(key):
    color = COLORS[key]
    mat = bpy.data.materials.new(f"ISAO_{key.upper()}_LOD{lod}")
    mat.diffuse_color = color
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = 0.62 if key not in {"dark", "green", "red", "cyan", "amber", "purple", "pink"} else 0.25
    bsdf.inputs["Roughness"].default_value = 0.34 if key in {"armor", "edge"} else 0.44
    if key in {"cyan", "amber", "green", "red", "purple", "pink"}:
        bsdf.inputs["Emission Color"].default_value = color
        bsdf.inputs["Emission Strength"].default_value = 3.5
    return mat


def empty(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    collection.objects.link(obj)
    obj.parent = parent if parent is not None else root
    obj.location = location
    obj.empty_display_size = 0.08
    obj["export_name"] = name
    return obj


def box(name, location, size, mat="armor", parent=None, rotation=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj["export_name"] = name
    obj.parent = parent if parent is not None else root
    obj.location = location
    obj.rotation_euler = rotation
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    collection.objects.link(obj) if obj.name not in collection.objects else None
    if obj.name in scene.collection.objects:
        pass
    obj.data.materials.append(materials[mat])
    if bevel:
        mod = obj.modifiers.new("Armor chamfer", "BEVEL")
        mod.width = bevel
        mod.segments = 2 if lod == 0 else 1
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def cylinder(name, location, radius, depth, mat="edge", parent=None, vertices=None, rotation=(0, 0, 0)):
    vertices = vertices or (20 if lod == 0 else 10)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    obj["export_name"] = name
    obj.parent = parent if parent is not None else root
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(materials[mat])
    return obj


def torus(name, location, major, minor, mat="edge", parent=None):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=28 if lod == 0 else 14,
        minor_segments=8 if lod == 0 else 4,
        location=(0, 0, 0),
    )
    obj = bpy.context.object
    obj.name = name
    obj["export_name"] = name
    obj.parent = parent if parent is not None else root
    obj.location = location
    obj.data.materials.append(materials[mat])
    return obj


def beam(name, start, end, width, mat="armor", parent=None, bevel=0.0):
    start, end = Vector(start), Vector(end)
    direction = end - start
    obj = box(name, (start + end) * 0.5, (width, width, direction.length), mat, parent, bevel=bevel)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    obj.rotation_mode = "XYZ"
    return obj


def clip(obj, name, prop, keys, interpolation="BEZIER"):
    saved = getattr(obj, prop).copy()
    obj.animation_data_create()
    action = bpy.data.actions.new(f"{name}_{obj['export_name']}")
    obj.animation_data.action = action
    for time, value in keys:
        setattr(obj, prop, value)
        obj.keyframe_insert(data_path=prop, frame=time * FPS)
    for layer in action.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:
                        key.interpolation = interpolation
    obj.animation_data.action = None
    track = obj.animation_data.nla_tracks.new()
    track.name = name
    strip = track.strips.new(name, 0, action)
    strip.extrapolation = "NOTHING"
    track.mute = True
    setattr(obj, prop, saved)


def add_leg(label, x, y):
    side = -1 if x < 0 else 1
    front = y < 0
    hip = empty(f"LEG_{label}_HIP", (x, y, -0.02), body)
    hip["axis"] = "local X swing; local Y splay"
    cylinder(f"Leg {label} hip axle", (0, 0, 0), 0.095, 0.16, "edge", hip, rotation=(0, math.pi / 2, 0))
    box(f"Leg {label} shoulder armor", (side * 0.055, 0, -0.03), (0.18, 0.19, 0.20), "armor", hip, bevel=0.025)
    knee_pos = (side * 0.17, (-0.035 if front else 0.035), -0.39)
    beam(f"Leg {label} upper link", (side * 0.03, 0, -0.08), knee_pos, 0.105, "white", hip, 0.015)
    if lod == 0:
        beam(f"Leg {label} upper brace", (side * 0.00, 0.055, -0.10), (side * 0.135, 0.055, -0.36), 0.035, "edge", hip)
    knee = empty(f"LEG_{label}_KNEE", knee_pos, hip)
    cylinder(f"Leg {label} knee axle", (0, 0, 0), 0.082, 0.15, "edge", knee, rotation=(0, math.pi / 2, 0))
    claw_pos = (side * 0.12, (0.05 if front else -0.05), -0.43)
    beam(f"Leg {label} lower link", (side * 0.015, 0, -0.055), claw_pos, 0.09, "white", knee, 0.012)
    if lod == 0:
        box(f"Leg {label} lower inset", (side * 0.075, 0.0, -0.25), (0.035, 0.102, 0.21), "graphite", knee, bevel=0.008)
    claw = empty(f"LEG_{label}_CLAW", claw_pos, knee)
    cylinder(f"Leg {label} wrist", (0, 0, 0), 0.072, 0.13, "edge", claw, rotation=(0, math.pi / 2, 0))
    box(f"Leg {label} pad", (side * 0.015, 0, -0.095), (0.23, 0.25, 0.075), "graphite", claw, bevel=0.025)
    box(f"Leg {label} pad emitter", (side * 0.015, 0, -0.137), (0.14, 0.15, 0.018), "cyan", claw, bevel=0.006)
    empty(f"SOCKET_CLAW_{label}", (side * 0.015, 0, -0.14), claw)
    return hip, knee, claw


def add_rotor(label, x, y):
    mount = empty(f"ROTOR_{label}_MOUNT", (x, y, 0.23), body)
    beam(f"Rotor {label} arm", (0, 0, -0.02), (-x * 0.22, -y * 0.20, -0.11), 0.07, "armor", mount, 0.012)
    torus(f"Rotor {label} duct", (0, 0, 0), 0.215, 0.034, "graphite", mount)
    torus(f"Rotor {label} lift ring", (0, 0, -0.025), 0.175, 0.012, "cyan", mount)
    box(f"Rotor {label} forward shield", (0, -0.205, 0.025), (0.34, 0.075, 0.10), "armor", mount, bevel=0.018)
    box(f"Rotor {label} aft shield", (0, 0.205, 0.025), (0.34, 0.075, 0.10), "armor", mount, bevel=0.018)
    box(f"Rotor {label} service mark", (0.115, -0.246, 0.079), (0.09, 0.012, 0.018), "amber", mount, bevel=0.003)
    cylinder(f"Rotor {label} hub", (0, 0, 0.015), 0.065, 0.09, "edge", mount)
    spin = empty(f"ROTOR_{label}_SPIN", (0, 0, 0.045), mount)
    for i in range(3):
        blade = box(f"Rotor {label} blade {i}", (0.12, 0, 0), (0.23, 0.035, 0.016), "white", spin, bevel=0.006)
        blade.rotation_euler.z = i * math.tau / 3
    clip(spin, "Rotor_Cycle", "rotation_euler", [(0, (0, 0, 0)), (1, (0, 0, math.tau))])
    empty(f"SOCKET_LIFT_{label}", (0, 0, -0.04), mount)
    return spin


def set_expression_clips(face_groups):
    for clip_name, (duration, _) in CLIPS.items():
        if not clip_name.startswith("Emotion_"):
            continue
        emotion = clip_name.removeprefix("Emotion_").upper()
        sequence = EMOTION_FACE_SEQUENCE[emotion]
        for name, group in face_groups.items():
            visible_at_start = name == sequence[0][1]
            value = (1, 1, 1) if visible_at_start else (0.001, 0.001, 0.001)
            settle = (0.98, 0.98, 0.98) if visible_at_start else (0.01, 0.01, 0.01)
            keys = [(0, value), (1 / FPS, settle), (2 / FPS, value)]
            keys.extend((time, (1, 1, 1) if name == state else (0.001, 0.001, 0.001)) for time, state in sequence[1:])
            clip(group, clip_name, "scale", keys, interpolation="CONSTANT")


def animate_character(body, legs, tool_yaw, tool_pitch, tool_extend, head):
    # Hover is deliberately small so it can layer with emotion clips in-engine.
    body_base = tuple(body.location)
    clip(body, "Hover_Idle", "location", [(0, body_base), (1, (body_base[0], body_base[1], body_base[2] + 0.025)), (2, body_base), (3, (body_base[0], body_base[1], body_base[2] - 0.018)), (4, body_base)])
    clip(body, "Emotion_Neutral", "rotation_euler", [(0, (0, 0, 0)), (2, (0.015, 0, 0)), (4, (0, 0, 0))])

    clip(body, "Emotion_Happy", "rotation_euler", [(0, (0, 0, 0)), (0.45, (-0.05, 0, -0.04)), (1.2, (-0.025, 0, 0.035)), (1.6, (0, 0, 0))])
    for label, (hip, knee, claw) in legs.items():
        side = -1 if "L" in label else 1
        clip(hip, "Emotion_Happy", "rotation_euler", [(0, (0, 0, 0)), (0.45, (-0.16, side * 0.18, side * 0.08)), (1.2, (-0.08, side * 0.10, -side * 0.05)), (1.6, (0, 0, 0))])
        clip(knee, "Emotion_Happy", "rotation_euler", [(0, (0, 0, 0)), (0.45, (0.20, 0, -side * 0.10)), (1.6, (0, 0, 0))])

    clip(body, "Emotion_Curious", "rotation_euler", [(0, (0.03, 0, 0.04)), (1.2, (-0.02, 0, -0.04)), (2.4, (0.03, 0, 0.04))])
    clip(tool_yaw, "Emotion_Curious", "rotation_euler", [(0, (0, 0, -0.28)), (1.2, (0, 0, 0.30)), (2.4, (0, 0, -0.28))])
    clip(head, "Emotion_Curious", "rotation_euler", [(0, (0.22, 0, 0)), (1.2, (-0.12, 0, 0)), (2.4, (0.22, 0, 0))])
    reach = legs["FL"]
    clip(reach[0], "Emotion_Curious", "rotation_euler", [(0, (-0.32, -0.18, 0.10)), (1.2, (-0.46, -0.12, 0.16)), (2.4, (-0.32, -0.18, 0.10))])
    clip(reach[1], "Emotion_Curious", "rotation_euler", [(0, (0.42, 0, 0)), (1.2, (0.22, 0, 0)), (2.4, (0.42, 0, 0))])

    clip(body, "Emotion_Working", "rotation_euler", [(0, (-0.035, 0, 0)), (0.5, (0.035, 0, 0)), (1.0, (-0.035, 0, 0)), (1.5, (0.035, 0, 0)), (2, (-0.035, 0, 0))])
    clip(tool_pitch, "Emotion_Working", "rotation_euler", [(0, (0.18, 0, 0)), (0.5, (-0.10, 0, 0)), (1, (0.18, 0, 0)), (1.5, (-0.10, 0, 0)), (2, (0.18, 0, 0))])
    for index, label in enumerate(["FL", "RR", "FR", "RL"]):
        hip, knee, _ = legs[label]
        phase = (index % 2) * 0.5
        clip(hip, "Emotion_Working", "rotation_euler", [(0, (-0.08 + phase * 0.25, 0, 0)), (1, (0.10 - phase * 0.25, 0, 0)), (2, (-0.08 + phase * 0.25, 0, 0))])
        clip(knee, "Emotion_Working", "rotation_euler", [(0, (0.12 - phase * 0.18, 0, 0)), (1, (-0.08 + phase * 0.18, 0, 0)), (2, (0.12 - phase * 0.18, 0, 0))])

    clip(body, "Emotion_Alarm", "rotation_euler", [(0, (0, 0, 0)), (0.18, (0.14, 0, 0.05)), (0.38, (0.10, 0, -0.05)), (0.72, (0.13, 0, 0.04)), (1.2, (0, 0, 0))])
    for label, (hip, knee, claw) in legs.items():
        side = -1 if "L" in label else 1
        clip(hip, "Emotion_Alarm", "rotation_euler", [(0, (0, 0, 0)), (0.18, (0.34, -side * 0.22, -side * 0.10)), (0.72, (0.26, -side * 0.16, side * 0.08)), (1.2, (0, 0, 0))])
        clip(knee, "Emotion_Alarm", "rotation_euler", [(0, (0, 0, 0)), (0.18, (-0.48, 0, side * 0.12)), (0.72, (-0.38, 0, -side * 0.08)), (1.2, (0, 0, 0))])

    # Determined: low forward posture, wide planted construction stance.
    clip(body, "Emotion_Determined", "rotation_euler", [(0, (-0.07, 0, 0)), (1.0, (-0.09, 0, 0)), (2.0, (-0.07, 0, 0))])
    for label, (hip, knee, claw) in legs.items():
        side = -1 if "L" in label else 1
        front = label.startswith("F")
        hip_pose = (-0.18 if front else 0.10, side * 0.14, -side * 0.04)
        knee_pose = (0.20 if front else -0.12, 0, side * 0.04)
        clip(hip, "Emotion_Determined", "rotation_euler", [(0, hip_pose), (1.0, (hip_pose[0] * 1.08, hip_pose[1], hip_pose[2])), (2.0, hip_pose)])
        clip(knee, "Emotion_Determined", "rotation_euler", [(0, knee_pose), (1.0, (knee_pose[0] * 1.08, 0, knee_pose[2])), (2.0, knee_pose)])

    # Sad: slow droop, tucked wrists and a lowered tool head in purple.
    clip(body, "Emotion_Sad", "rotation_euler", [(0, (0.10, 0, 0.035)), (1.6, (0.15, 0, -0.035)), (3.2, (0.10, 0, 0.035))])
    clip(head, "Emotion_Sad", "rotation_euler", [(0, (0.20, 0, 0)), (1.6, (0.30, 0, 0)), (3.2, (0.20, 0, 0))])
    for label, (hip, knee, claw) in legs.items():
        side = -1 if "L" in label else 1
        hip_pose = (0.24, -side * 0.12, side * 0.035)
        knee_pose = (-0.32, 0, -side * 0.05)
        clip(hip, "Emotion_Sad", "rotation_euler", [(0, hip_pose), (1.6, (0.30, -side * 0.15, -side * 0.025)), (3.2, hip_pose)])
        clip(knee, "Emotion_Sad", "rotation_euler", [(0, knee_pose), (1.6, (-0.38, 0, side * 0.03)), (3.2, knee_pose)])

    # Skeptical: one raised brow on the panel, side lean and a measured wrist tap.
    clip(body, "Emotion_Skeptical", "rotation_euler", [(0, (0.01, 0, 0.075)), (0.8, (0.01, 0, 0.11)), (1.6, (0.01, 0, 0.075)), (2.4, (0.01, 0, 0.075))])
    skeptic_hip, skeptic_knee, skeptic_claw = legs["FR"]
    clip(skeptic_hip, "Emotion_Skeptical", "rotation_euler", [(0, (-0.18, 0.12, -0.06)), (0.8, (-0.27, 0.16, -0.10)), (1.6, (-0.18, 0.12, -0.06)), (2.4, (-0.18, 0.12, -0.06))])
    clip(skeptic_knee, "Emotion_Skeptical", "rotation_euler", [(0, (0.28, 0, 0.08)), (0.8, (0.16, 0, -0.04)), (1.6, (0.28, 0, 0.08)), (2.4, (0.28, 0, 0.08))])
    clip(skeptic_claw, "Emotion_Skeptical", "rotation_euler", [(0, (0, 0, -0.10)), (0.8, (0, 0, 0.14)), (1.6, (0, 0, -0.10)), (2.4, (0, 0, -0.10))])

    # Love: a rare one-shot double heart pulse with a small self-hug gesture.
    clip(body, "Emotion_Love", "rotation_euler", [(0, (0, 0, 0)), (0.35, (-0.055, 0, -0.035)), (0.7, (0.01, 0, 0.03)), (1.05, (-0.055, 0, -0.03)), (1.4, (0.01, 0, 0.025)), (2.2, (0, 0, 0))])
    for label in ("FL", "FR"):
        hip, knee, claw = legs[label]
        side = -1 if "L" in label else 1
        clip(hip, "Emotion_Love", "rotation_euler", [(0, (0, 0, 0)), (0.35, (-0.34, -side * 0.28, side * 0.12)), (1.05, (-0.42, -side * 0.34, side * 0.15)), (1.4, (-0.30, -side * 0.24, side * 0.10)), (2.2, (0, 0, 0))])
        clip(knee, "Emotion_Love", "rotation_euler", [(0, (0, 0, 0)), (0.35, (0.55, 0, -side * 0.18)), (1.05, (0.64, 0, -side * 0.22)), (1.4, (0.48, 0, -side * 0.15)), (2.2, (0, 0, 0))])
        clip(claw, "Emotion_Love", "rotation_euler", [(0, (0, 0, 0)), (0.35, (0, 0, side * 0.20)), (1.05, (0, 0, -side * 0.18)), (1.4, (0, 0, side * 0.14)), (2.2, (0, 0, 0))])

    clip(tool_yaw, "Tool_Fabricate", "rotation_euler", [(0, (0, 0, -0.22)), (1, (0, 0, 0.22)), (2, (0, 0, -0.22))])
    clip(tool_pitch, "Tool_Fabricate", "rotation_euler", [(0, (0.10, 0, 0)), (0.5, (-0.12, 0, 0)), (1, (0.10, 0, 0)), (1.5, (-0.12, 0, 0)), (2, (0.10, 0, 0))])
    extend_base = tuple(tool_extend.location)
    clip(tool_extend, "Tool_Fabricate", "location", [(0, extend_base), (0.5, (extend_base[0], extend_base[1], extend_base[2] - 0.10)), (1, extend_base), (1.5, (extend_base[0], extend_base[1], extend_base[2] - 0.10)), (2, extend_base)])


def owner_for(obj, owners):
    current = obj.parent
    while current and current not in owners:
        current = current.parent
    return current or root


def merge_geometry(owners, face_groups):
    palette = bpy.data.materials.new(f"ISAO_VERTEX_PALETTE_LOD{lod}")
    palette.use_nodes = True
    bsdf = palette.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Metallic"].default_value = 0.48
    bsdf.inputs["Roughness"].default_value = 0.40
    vertex = palette.node_tree.nodes.new("ShaderNodeVertexColor")
    vertex.layer_name = "Color"
    palette.node_tree.links.new(vertex.outputs["Color"], bsdf.inputs["Base Color"])
    expression_owners = set(face_groups.values())
    groups = {}
    for obj in list(collection.objects):
        if obj.type != "MESH":
            continue
        owner = owner_for(obj, owners)
        is_face = owner in expression_owners
        if lod == 1 and not is_face:
            attr = obj.data.color_attributes.new(name="Color", type="BYTE_COLOR", domain="CORNER")
            for polygon in obj.data.polygons:
                color = obj.data.materials[polygon.material_index].diffuse_color
                for loop_index in polygon.loop_indices:
                    attr.data[loop_index].color = color
                polygon.material_index = 0
            obj.data.materials.clear()
            obj.data.materials.append(palette)
            key = (owner, "palette")
        else:
            key = (owner, obj.data.materials[0].name if obj.data.materials else "none")
        groups.setdefault(key, []).append(obj)
    for (owner, mat_key), objects in groups.items():
        active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.select_all(action="DESELECT")
            for obj in objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = active
            bpy.ops.object.join()
        world = active.matrix_world.copy()
        active.parent = owner
        active.matrix_world = world
        suffix = mat_key.split("_")[1] if mat_key.startswith("ISAO_") else mat_key
        active["export_name"] = f"{owner['export_name']}_MESH_{suffix}"
        active.name = active["export_name"]


def build(level):
    global lod, scene, collection, root, body, materials
    lod = level
    scene = bpy.data.scenes.new(f"ISAO_LOD{lod}")
    scene.render.fps = FPS
    bpy.context.window.scene = scene
    collection = scene.collection
    # Primitive operators link to the active scene collection automatically.
    materials = {key: material(key) for key in COLORS}
    root = bpy.data.objects.new("ISAO_ROOT", None)
    collection.objects.link(root)
    root["export_name"] = "ISAO_ROOT"
    root["asset_id"] = f"isao_birudoron_lod{lod}"
    root["credit"] = "Models by jelaludo"
    root["status"] = "production_alpha"
    root["units"] = "meters"
    root["forward"] = "+Z"

    body = empty("BODY_PITCH", (0, 0, 1.10))
    body["axis"] = "local X pitch; local Z roll"
    box("Core pressure shell", (0, 0, 0), (0.78, 0.60, 0.48), "graphite", body, bevel=0.09)
    box("Upper armor crown", (0, 0.02, 0.22), (0.66, 0.50, 0.16), "armor", body, bevel=0.045)
    box("Front face frame", (0, -0.325, 0.035), (0.66, 0.075, 0.36), "edge", body, bevel=0.035)
    box("Face glass", (0, -0.371, 0.035), (0.55, 0.018, 0.27), "dark", body, bevel=0.006)
    box("Rear service spine", (0, 0.325, 0.02), (0.38, 0.11, 0.34), "armor", body, bevel=0.025)
    for side in (-1, 1):
        box(f"Cheek armor {'L' if side < 0 else 'R'}", (side * 0.405, -0.05, 0.0), (0.16, 0.42, 0.31), "armor", body, bevel=0.035)
        box(f"Cyan cheek slit {'L' if side < 0 else 'R'}", (side * 0.49, -0.11, 0.02), (0.018, 0.19, 0.055), "cyan", body, bevel=0.006)
    box("Amber maker plate", (0.23, -0.376, -0.17), (0.13, 0.012, 0.025), "amber", body, bevel=0.004)
    if lod == 0:
        for x in (-0.24, 0, 0.24):
            box(f"Crown access rib {x}", (x, 0.01, 0.315), (0.11, 0.42, 0.022), "edge", body, bevel=0.006)
        for side in (-1, 1):
            for z in (-0.12, 0.12):
                cylinder(f"Armor fastener {side} {z}", (side * 0.49, 0.08, z), 0.018, 0.018, "dark", body, 10, rotation=(0, math.pi / 2, 0))

    led_panel = empty("LED_PANEL", (0, -0.385, 0.035), body)
    face_groups = {}
    for name, rows in FACE_PATTERNS.items():
        group = empty(f"FACE_{name}", (0, 0, 0), led_panel)
        face_groups[name] = group
        group.scale = (1, 1, 1) if name == "NEUTRAL" else (0.001, 0.001, 0.001)
        cell = 0.050
        for row, bits in enumerate(rows):
            for column, bit in enumerate(bits):
                if bit == "1":
                    box(f"{name} pixel {row} {column}", ((column - 3.5) * cell, -0.012, (2.5 - row) * cell * 0.72), (0.027, 0.012, 0.027), FACE_MATERIAL[name], group, bevel=0.004)

    rotors = {}
    for label, x, y in [("FL", -0.63, -0.39), ("FR", 0.63, -0.39), ("RL", -0.63, 0.39), ("RR", 0.63, 0.39)]:
        rotors[label] = add_rotor(label, x, y)

    legs = {}
    for label, x, y in [("FL", -0.43, -0.25), ("FR", 0.43, -0.25), ("RL", -0.43, 0.25), ("RR", 0.43, 0.25)]:
        legs[label] = add_leg(label, x, y)

    tool_yaw = empty("TOOL_NOZZLE_YAW", (0, 0.02, -0.24), body)
    tool_yaw["axis"] = "local Z yaw"
    cylinder("Tool yaw collar", (0, 0, -0.02), 0.15, 0.13, "edge", tool_yaw)
    tool_pitch = empty("TOOL_NOZZLE_PITCH", (0, -0.02, -0.10), tool_yaw)
    tool_pitch["axis"] = "local X pitch"
    box("Tool gimbal", (0, 0, -0.08), (0.24, 0.22, 0.20), "armor", tool_pitch, bevel=0.025)
    tool_extend = empty("TOOL_NOZZLE_EXTEND", (0, 0, -0.16), tool_pitch)
    cylinder("Tool piston", (0, 0, -0.13), 0.07, 0.30, "white", tool_extend)
    cylinder("Tool cyan chamber", (0, 0, -0.28), 0.085, 0.11, "cyan", tool_extend)
    head = empty("TOOL_HEAD", (0, 0, -0.35), tool_extend)
    cylinder("Tool head shield", (0, 0, -0.02), 0.12, 0.13, "graphite", head)
    cylinder("Fabrication nozzle", (0, 0, -0.14), 0.045, 0.22, "edge", head)
    if lod == 0:
        for z in (-0.055, -0.10, -0.15):
            torus(f"Nozzle induction ring {z}", (0, 0, z), 0.058, 0.009, "cyan", head)
    empty("TOOL_TIP", (0, 0, -0.27), head)["direction"] = "local -Y after glTF conversion; fabrication emission"

    sensor = empty("SENSOR_MAST", (0, 0.10, 0.31), body)
    cylinder("Sensor mast base", (0, 0, 0.05), 0.07, 0.10, "edge", sensor)
    box("Sensor beacon", (0, 0, 0.14), (0.10, 0.10, 0.16), "cyan", sensor, bevel=0.018)
    box("Sensor cap", (0, 0, 0.235), (0.13, 0.13, 0.04), "graphite", sensor, bevel=0.012)

    empty("CARGO_GRIP", (0, 0.27, -0.25), body)
    empty("SOCKET_CENTER_OF_MASS", (0, 0, 0), body)
    empty("TERRAFORMER_ASSEMBLY_ORIGIN", (0, 0, 0), root)

    set_expression_clips(face_groups)
    animate_character(body, legs, tool_yaw, tool_pitch, tool_extend, head)
    body.location = (0, 0, 1.10)
    body.rotation_euler = (0, 0, 0)
    # Freeze the authored NLA tracks before measuring and capturing the neutral
    # export pose. Otherwise Blender evaluates whichever clip owns the current
    # frame and the manifest records animated bounds instead of rest bounds.
    for obj in collection.objects:
        if obj.animation_data:
            for track in obj.animation_data.nla_tracks:
                track.mute = True

    tool_yaw.rotation_euler = (0, 0, 0)
    tool_pitch.rotation_euler = (0, 0, 0)
    tool_extend.location = (0, 0, -0.16)
    head.rotation_euler = (0, 0, 0)
    for leg in legs.values():
        for joint in leg:
            joint.rotation_euler = (0, 0, 0)
    for name, group in face_groups.items():
        group.scale = (1, 1, 1) if name == "NEUTRAL" else (0.001, 0.001, 0.001)
    for spin in rotors.values():
        spin.rotation_euler = (0, 0, 0)

    owners = {body, led_panel, tool_yaw, tool_pitch, tool_extend, head, sensor, *rotors.values(), *face_groups.values()}
    for hip, knee, claw in legs.values():
        owners.update((hip, knee, claw))
    for obj in collection.objects:
        if obj.get("export_name", "").startswith("ROTOR_") and obj.get("export_name", "").endswith("_MOUNT"):
            owners.add(obj)
    merge_geometry(owners, face_groups)
    bpy.context.view_layer.update()
    minimum = Vector((float("inf"),) * 3)
    maximum = Vector((float("-inf"),) * 3)
    for obj in collection.objects:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            point = obj.matrix_world @ Vector(corner)
            minimum.x, minimum.y, minimum.z = min(minimum.x, point.x), min(minimum.y, point.y), min(minimum.z, point.z)
            maximum.x, maximum.y, maximum.z = max(maximum.x, point.x), max(maximum.y, point.y), max(maximum.z, point.z)
    socket_positions = {}
    for obj in collection.objects:
        name = obj.get("export_name", "")
        if name.startswith("SOCKET_") or name in {"TOOL_TIP", "CARGO_GRIP", "TERRAFORMER_ASSEMBLY_ORIGIN"}:
            point = obj.matrix_world.translation
            socket_positions[name] = [round(point.x, 6), round(point.z, 6), round(-point.y, 6)]
    bounds = {
        "min": [round(minimum.x, 6), round(minimum.z, 6), round(-maximum.y, 6)],
        "max": [round(maximum.x, 6), round(maximum.z, 6), round(-minimum.y, 6)],
    }
    bounds["size"] = [round(bounds["max"][i] - bounds["min"][i], 6) for i in range(3)]
    built.append((lod, scene, root, bounds, socket_positions))
    print("ISAO_BUILT", lod, len(collection.objects), "objects")


def read_glb_json(path):
    data = path.read_bytes()
    json_len = struct.unpack_from("<I", data, 12)[0]
    return json.loads(data[20:20 + json_len])


def patch_glb_names(path, rest_transforms):
    data = path.read_bytes()
    json_len = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20:20 + json_len])
    blob = data[28 + json_len:]
    for node in doc["nodes"]:
        export_name = node.get("extras", {}).get("export_name")
        if export_name:
            node["name"] = export_name
            rest = rest_transforms.get(export_name)
            if rest:
                for key in ("matrix", "translation", "rotation", "scale"):
                    node.pop(key, None)
                for key, value in rest.items():
                    node[key] = value
    packed = json.dumps(doc, separators=(",", ":")).encode()
    packed += b" " * (-len(packed) % 4)
    path.write_bytes(
        struct.pack("<III", 0x46546C67, 2, 28 + len(packed) + len(blob))
        + struct.pack("<II", len(packed), 0x4E4F534A)
        + packed
        + struct.pack("<II", len(blob), 0x004E4942)
        + blob
    )
    return doc


def export_all():
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    concept = [entry for entry in manifest["assets"] if entry["id"] == "isao_birudoron_initial_concept"][0]
    entries = [concept]
    for level, current_scene, current_root, bounds, socket_positions in built:
        bpy.context.window.scene = current_scene
        bpy.ops.object.select_all(action="SELECT")
        rest_path = OUT / f".isao_rest_lod{level}.glb"
        bpy.ops.export_scene.gltf(
            filepath=str(rest_path), export_format="GLB", use_selection=True, use_active_scene=True,
            export_extras=True, export_animations=False, export_cameras=False, export_lights=False,
        )
        rest_doc = read_glb_json(rest_path)
        rest_transforms = {}
        for node in rest_doc["nodes"]:
            name = node.get("extras", {}).get("export_name")
            if name:
                rest_transforms[name] = {key: node[key] for key in ("matrix", "translation", "rotation", "scale") if key in node}
        for expression in FACE_PATTERNS:
            rest_transforms[f"FACE_{expression}"] = {
                "scale": [1, 1, 1] if expression == "NEUTRAL" else [0.001, 0.001, 0.001]
            }
        rest_path.unlink()
        for obj in current_scene.objects:
            if obj.animation_data:
                for track in obj.animation_data.nla_tracks:
                    track.mute = False
        filename = f"isao_birudoron_lod{level}.glb"
        path = OUT / filename
        bpy.ops.export_scene.gltf(
            filepath=str(path), export_format="GLB", use_selection=True, use_active_scene=True,
            export_extras=True, export_animations=True, export_animation_mode="NLA_TRACKS",
            export_force_sampling=True, export_frame_range=False, export_cameras=False,
            export_lights=False, export_apply=False,
        )
        doc = patch_glb_names(path, rest_transforms)
        for obj in current_scene.objects:
            if obj.animation_data:
                for track in obj.animation_data.nla_tracks:
                    track.mute = True
        triangles = sum(doc["accessors"][primitive["indices"]]["count"] // 3 for mesh in doc["meshes"] for primitive in mesh["primitives"])
        draws = sum(len(mesh["primitives"]) for mesh in doc["meshes"])
        clips = []
        for animation in doc.get("animations", []):
            duration = max(doc["accessors"][sampler["input"]].get("max", [0])[0] for sampler in animation["samplers"])
            clips.append({"name": animation["name"], "duration_s": round(duration, 3), "loop": CLIPS[animation["name"]][1]})
        sockets = [{"id": name, "position_m": position} for name, position in sorted(socket_positions.items())]
        engine_nodes = sorted(obj["export_name"] for obj in current_scene.objects if obj.type == "EMPTY" and "export_name" in obj)
        entries.append({
            "id": f"isao_birudoron_lod{level}", "family": "isao_birudoron",
            "name": "ISAO-Birudorōn / Production alpha", "file": filename,
            "lod": level, "damage_level": 0, "production_lod": True,
            "production_status": "alpha", "derived": False, "game_ready": False,
            "plot_m": [3, 3],
            "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "triangles": triangles, "draw_calls": draws,
            "nodes": len(doc.get("nodes", [])),
            "materials": len(doc.get("materials", [])),
            "embedded_textures": len(doc.get("textures", [])),
            "bounds_min_m": bounds["min"], "bounds_max_m": bounds["max"],
            "dimensions_m": bounds["size"], "forward": "+Z", "up": "+Y",
            "root": "ISAO_ROOT", "clips": clips, "sockets": sockets,
            "engine_nodes": engine_nodes, "credit": "Models by jelaludo",
            "notes": "Functional limb, rotor, LED-expression and fabrication-tool hierarchy; pending art-direction and gameplay review."
        })
        print("ISAO_EXPORT", level, triangles, "triangles", draws, "draws", path.stat().st_size, "bytes", len(clips), "clips")
    manifest["status"] = "production_alpha"
    manifest["assets"] = entries
    for tier in manifest.get("future_tiers", []):
        if tier["tier"] in {"LOD0", "LOD1"}:
            tier["status"] = "production_alpha_delivered"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
    subprocess.run(
        ["node", str(P / "tools/asset-pipeline/sync-isao-bounds.mjs")],
        cwd=P,
        check=True,
    )
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE), compress=True)
    print("ISAO_SOURCE", SOURCE)


def main():
    initial_scene = bpy.context.scene
    for obj in list(initial_scene.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    build(0)
    build(1)
    bpy.data.scenes.remove(initial_scene)
    export_all()


if __name__ == "__main__":
    main()
