"""Render authored SH clips to PNG frames for the motion contact sheet."""
from pathlib import Path
import bpy
P=Path(__file__).resolve().parents[2]
bpy.ops.wm.open_mainfile(filepath=str(P/'source/blender/sh-rocket.blend'))
scene=bpy.context.scene;scene.render.resolution_x=336;scene.render.resolution_y=420;scene.cycles.samples=8
out=Path('/tmp/sh-motion');out.mkdir(exist_ok=True)
for name,end in [('Legs_Deploy',72),('Landing_Shock',60),('Legs_Retract',72),('Top_Door_Open',54),('Top_Door_Close',54)]:
    for o in scene.objects:
        if o.animation_data:
            for t in o.animation_data.nla_tracks:t.mute=t.name!=name
    for i in range(25):
        f=end*i/24;scene.frame_set(int(f),subframe=f-int(f))
        scene.render.filepath=str(out/f'{name}_{i:02d}.png');bpy.ops.render.render(write_still=True)
