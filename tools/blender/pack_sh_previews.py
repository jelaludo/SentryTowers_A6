"""Pack render_sh_motion.py outputs into GIF previews; requires Pillow."""
from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
p=Path(__file__).resolve().parents[2]/'assets/sh-rocket';src=Path('/tmp/sh-motion')
try: font=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',18)
except OSError: font=ImageFont.load_default()
def caption(im,label):
    out=Image.new('RGB',(im.width,im.height+40),'#17272e');out.paste(im,(0,40));ImageDraw.Draw(out).text((14,10),label,font=font,fill='#e0eeed');return out
for file,clips in [('legs',[('Legs_Deploy','Legs / deploy'),('Legs_Retract','Legs / retract')]),('landing',[('Landing_Shock','Landing / compression + settling')]),('door',[('Top_Door_Open','Top door / open'),('Top_Door_Close','Top door / close')])]:
    frames=[];times=[]
    for clip,label in clips:
        for i,path in enumerate(sorted(src.glob(clip+'_*.png'))):
            frames.append(caption(Image.open(path).convert('RGB'),label));times.append(350 if i in [0,24] else (96 if clip.startswith('Legs') else 80))
    frames[0].save(p/(file+'.gif'),save_all=True,append_images=frames[1:],duration=times,loop=0,optimize=True)
poses=[]
for file,label in [('stowed','01 / Stowed'),('deployed','02 / Deployed'),('shock','03 / Max compression'),('door-open','04 / Top door open')]:
    poses.append(caption(Image.open(p/(file+'.png')).convert('RGB'),label))
out=Image.new('RGB',(560*4,740))
for i,im in enumerate(poses):out.paste(im,(i*560,0))
out.save(p/'poses.png')
