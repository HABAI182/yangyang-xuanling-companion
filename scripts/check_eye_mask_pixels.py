"""Rendered irises must not move pixels beyond their native eyelid apertures."""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter,ImageDraw
ROOT=Path(__file__).resolve().parents[1];out=Path(sys.argv[1])
mask=Image.new('L',(1536,1360));eye_rect=np.zeros((1360,1536),bool)
for p in json.loads((ROOT/'art/source/layers-v11.json').read_text())['layers']:
 if p['id'] in ['eye-left','eye-right']:
  im=Image.open(ROOT/('public'+p['file'])).getchannel('A');mask.paste(im,(p['x'],p['y']))
  eye_rect[p['y']:p['y']+p['height'],p['x']:p['x']+p['width']]=True
guard=np.array(mask.filter(ImageFilter.MaxFilter(11)))>0
baseline=np.array(Image.open(out/'neutral.png'))
assert baseline.shape==(1360,1536,4)
outside=eye_rect&~guard;report={};montage=Image.new('RGB',(1120,840),'#34353c');draw=ImageDraw.Draw(montage)
for i,name in enumerate(['neutral','left-up','right-up','left-down','right-down','angry']):
 image=Image.open(out/(name+'.png'));a=np.array(image);difference=np.max(np.abs(a.astype(int)-baseline.astype(int)),axis=2)
 changed=int(((difference>2)&outside).sum());assert changed==0,(name,changed)
 opaque=int((a[eye_rect,3]<250).sum());assert opaque==0,(name,'eye transparency',opaque)
 report[name]={'changedPixelsOutsideApertureGuard':changed,'transparentEyePixels':opaque}
 x=i%2*560;y=i//2*280;montage.paste(image.crop((480,710,1036,980)).resize((560,270)),(x,y+10));draw.text((x+4,y),name,fill='white')
montage.save(out/'eyes-contact.png');(out/'pixel-report.json').write_text(json.dumps({'passed':True,'maskBoundaryGuardPx':5,'poses':report},indent=2)+'\n');print(json.dumps(report))
