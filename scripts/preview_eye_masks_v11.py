"""Source-pixel mask previews; these are not native Cubism render acceptance."""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'../../work/eye-diagnosis/v11-source';OUT.mkdir(exist_ok=True)
layout=json.loads((ROOT/'art/source/layers-v11.json').read_text());layers={}
for p in layout['layers']:
 im=Image.new('RGBA',(1536,1360));im.alpha_composite(Image.open(ROOT/('public'+p['file'])),(p['x'],p['y']));layers[p['id']]=im
montage=Image.new('RGB',(1200,900),'#34353c');d=ImageDraw.Draw(montage)
for index,(name,dx,dy) in enumerate([('neutral',0,0),('left-up',-9.5,-4.9),('right-up',9.5,-4.9),('left-down',-9.5,4.9),('right-down',9.5,4.9)]):
 im=layers['head-body'].copy()
 for side in ['left','right']:
  sclera=layers['eye-'+side];im.alpha_composite(sclera)
  iris=layers['iris-'+side].transform((1536,1360),Image.Transform.AFFINE,(1,0,-dx,0,1,-dy),Image.Resampling.BICUBIC)
  a=np.array(iris);a[:,:,3]=np.rint(a[:,:,3].astype(float)*np.array(sclera)[:,:,3]/255).astype('uint8');im.alpha_composite(Image.fromarray(a))
 crop=im.crop((480,710,1036,980)).resize((600,291));x=index%2*600;y=index//2*300
 montage.paste(crop,(x,y+9));d.text((x+4,y),name,fill='white');im.crop((480,710,1036,980)).resize((1112,540)).save(OUT/(name+'.png'))
montage.save(OUT/'source-mask-gaze.png')
print(OUT/'source-mask-gaze.png')
