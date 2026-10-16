"""Extract only closed-lid ink from an AI hidden-eye draft; retain other v7 PNGs."""
import json,os,sys,shutil
from pathlib import Path
if os.environ.get('PET_PSD_TOOLS'):sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image
from psd_tools import PSDImage
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'art/source';OUT=ROOT/'public/assets/v8';OUT.mkdir(exist_ok=True)
layout=json.loads((SRC/'layers-v7.json').read_text())
draft=Image.open(SRC/'closed-lids-ai-v8.png').convert('RGBA').resize((630,320),Image.Resampling.LANCZOS)
ink=np.array(draft).astype(np.int32);mask=(ink[:,:,0]>ink[:,:,1]*1.23)&(ink[:,:,0]>ink[:,:,2]*.96)&(ink[:,:,1]<140)&(ink[:,:,0]<200)
positions={'lid-left':((47,68,233,139),(184,27),(502,811)),'lid-right':((390,145,570,220),(177,29),(845,888))}
for name,(box,size,xy) in positions.items():
 keep=np.zeros(mask.shape,dtype=bool);x,y,x1,y1=box;keep[y:y1,x:x1]=mask[y:y1,x:x1]
 data=np.array(draft);data[:,:,3]=np.where(keep,255,0);im=Image.fromarray(data);im=im.crop(im.getchannel('A').getbbox());im.save(SRC/f'closed-{name}-v8.png');im.resize(size,Image.Resampling.LANCZOS).save(OUT/f'{name}.png')
psd=PSDImage.new(mode='RGB',size=(1536,1360),depth=8)
for p in layout['layers']:
 name=p['id']
 if name in positions:
  _,(p['width'],p['height']),(p['x'],p['y'])=positions[name]
 else:shutil.copy2(ROOT/('public'+p['file']),OUT/f'{name}.png')
 p['file']=f'/assets/v8/{name}.png';lay=psd.create_pixel_layer(Image.open(OUT/f'{name}.png'),name=name,left=p['x'],top=p['y']);lay.opacity=int(p['opacity']*255)
psd.save(SRC/'YangyangXuanling-Separated-v8.psd');(SRC/'layers-v8.json').write_text(json.dumps(layout,indent=2)+'\n')
