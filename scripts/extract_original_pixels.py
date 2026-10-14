from pathlib import Path
import sys, json, os
if os.environ.get('PET_PSD_TOOLS'):sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image,ImageDraw,ImageFont

ROOT=Path(__file__).resolve().parents[1]
img=Image.open(ROOT/'art/source/skill-layout-reference.png').convert('RGBA')
rgb=np.array(img)[:,:,:3].astype(np.int16)
# Background paper is warm and nearly white. Seed from every outer border;
# closed white highlights inside the character remain opaque.
candidate=(rgb.min(2)>200)&((rgb.max(2)-rgb.min(2))<45)&(rgb[:,:,0]>=rgb[:,:,2]-4)
bottom=np.indices(candidate.shape)[0]>1106
candidate|=bottom&(rgb.min(2)>175)&((rgb.max(2)-rgb.min(2))<65)&(rgb[:,:,0]>=rgb[:,:,2]-4)
paper=Image.new('L',(img.width+2,img.height+2),255)
paper.paste(Image.fromarray(candidate.astype('uint8')*255),(1,1))
ImageDraw.floodfill(paper,(0,0),128,thresh=0)
for x,y in [(970,170),(1280,575),(1400,785),(1200,904),(175,645),(1300,630),(1320,810)]:
    if paper.getpixel((x+1,y+1))==255:ImageDraw.floodfill(paper,(x+1,y+1),128,thresh=0)
background=np.array(paper)[1:-1,1:-1]==128
components=Image.fromarray(np.where(background,0,255).astype('uint8')).copy()
for seed in [(900,480),(900,1270),(250,1140),(1440,1050)]:
    if components.getpixel(seed)==255:ImageDraw.floodfill(components,seed,128,thresh=0)
alpha=np.where(np.array(components)==128,255,0).astype('uint8')
# Restrict only the lower scene to actual objects, removing the tabletop.
keep=Image.new('L',img.size);d=ImageDraw.Draw(keep)
d.rectangle((0,0,1535,1106),fill=255)
d.rectangle((140,1050,425,1205),fill=255)
d.polygon([(444,1100),(1390,1100),(1470,1247),(1460,1310),(340,1310),(340,1250)],fill=255)
d.rectangle((1205,925,1535,1140),fill=255)
alpha=np.minimum(alpha,np.array(keep))
out=np.array(img);out[:,:,3]=alpha
Image.fromarray(out).save(ROOT/'art/source/original-pixel-cutout-v2.png')
grid=img.copy();draw=ImageDraw.Draw(grid)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',18)
for x in range(0,img.width,100):draw.line((x,0,x,img.height),fill=(255,0,100,120));draw.text((x+3,3),str(x),font=font,fill=(255,0,100,255))
for y in range(0,img.height,100):draw.line((0,y,img.width,y),fill=(255,0,100,120));draw.text((3,y+3),str(y),font=font,fill=(255,0,100,255))
grid.save(ROOT/'art/original-coordinate-grid.png')
foreground=alpha>0
report={'source':str(ROOT/'art/source/skill-layout-reference.png'),'size':list(img.size),'visibleRgbChangedPixels':int(np.any(out[:,:,:3]!=np.array(img)[:,:,:3],axis=2)[foreground].sum()),'alphaBounds':Image.fromarray(alpha).getbbox(),'pixelPreservation':True,'userAuthorizedLocalPixelProcessing':True,'edgeQa':'pending'}
(ROOT/'docs/pixel-extraction-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))

