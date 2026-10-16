"""Measure pupil-only gaze against native aperture alpha at the padded view size."""
import sys,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
root=Path(__file__).resolve().parents[1];out=Path(sys.argv[1]);layout=json.loads((root/'art/source/layers-v11.json').read_text(encoding='utf-8'))
mask=Image.new('L',(1584,1360));rect=np.zeros((1360,1584),bool)
for p in layout['layers']:
 if p['id'] in ['eye-left','eye-right']:
  x=p['x']+24;y=p['y'];mask.paste(Image.open(root/('public'+p['file'])).getchannel('A'),(x,y));rect[y:y+p['height'],x:x+p['width']]=True
guard=np.array(mask.filter(ImageFilter.MaxFilter(11)))>0;baseline=np.array(Image.open(out/'gaze-neutral.png'))
assert baseline.shape==(1360,1584,4)
report={}
for name in ['neutral','left-up','right-up','left-down','right-down','max']:
 data=np.array(Image.open(out/f'gaze-{name}.png'));diff=np.max(np.abs(data.astype(int)-baseline.astype(int)),axis=2)
 changed=int(((diff>2)&rect&~guard).sum());holes=int((data[rect,3]<250).sum())
 assert changed==0,(name,'outside native eye mask',changed)
 assert holes==0,(name,'transparent eye pixels',holes)
 report[name]={'outsideApertureGuardPixels':changed,'transparentEyePixels':holes}
(out/'pixel-report.json').write_text(json.dumps({'passed':True,'sourcePadding':24,'guardPx':5,'poses':report},indent=2)+'\n',encoding='utf-8');print(json.dumps(report))
