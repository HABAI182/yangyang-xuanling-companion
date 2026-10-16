"""Complete only device pixels hidden by the original palms/cuffs.

Requires the prior pixel-preserving v8 split. Visible neutral pixels are
asserted byte-identical; no resizing of the character or palette correction.
"""
import json,os,sys,shutil
from pathlib import Path
if os.environ.get('PET_PSD_TOOLS'):sys.path.insert(0,os.environ['PET_PSD_TOOLS'])
import numpy as np
from PIL import Image
from psd_tools import PSDImage
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'art/source';OUT=ROOT/'public/assets/v9';OUT.mkdir(exist_ok=True)
layout=json.loads((SRC/'layers-v8.json').read_text());w,h=1536,1360
layers={};meta={p['id']:p for p in layout['layers']}
for p in layout['layers']:
 im=Image.new('RGBA',(w,h));im.alpha_composite(Image.open(ROOT/('public'+p['file'])),(p['x'],p['y']));layers[p['id']]=im
def compose(items):
 out=Image.new('RGBA',(w,h))
 for p in layout['layers']:
  if p['opacity']:out.alpha_composite(items[p['id']])
 return out
before=np.array(compose(layers));cover=np.zeros((h,w),dtype=bool)
for k in ['sleeve-roots','keyboard-hand','mouse-hand']:cover|=np.array(layers[k])[:,:,3]==255
ai=np.array(Image.open(SRC/'occlusion-underpaint-ai-v7.png').convert('RGBA').resize((w,h),Image.Resampling.LANCZOS))
d=np.array(layers['keyboard']);mask=cover&(d[:,:,3]>0);d[mask,:3]=ai[mask,:3];layers['keyboard']=Image.fromarray(d)
# Complete the mouse top under the original cuff from adjacent mouse surface.
# The donor pixels are original painted mouse pixels, never skin or hair.
d=np.array(layers['mouse']);mask=cover&(d[:,:,3]>0);ys,xs=np.nonzero(mask)
for y,x in zip(ys,xs):
 donor_y=min(y+55,1180)
 if d[donor_y,x,3]>240:d[y,x,:3]=d[donor_y,x,:3]
layers['mouse']=Image.fromarray(d)
after=compose(layers);assert np.array_equal(before,np.array(after)), 'Neutral visible pixels changed'
psd=PSDImage.new(mode='RGB',size=(w,h),depth=8)
for p in layout['layers']:
 k=p['id'];crop=layers[k].crop((p['x'],p['y'],p['x']+p['width'],p['y']+p['height']));crop.save(OUT/f'{k}.png');p['file']=f'/assets/v9/{k}.png'
 lay=psd.create_pixel_layer(crop,name=k,left=p['x'],top=p['y']);lay.opacity=int(p['opacity']*255)
psd.save(SRC/'YangyangXuanling-Separated-v9.psd');after.save(SRC/'composition-neutral-v9.png')
(SRC/'layers-v9.json').write_text(json.dumps(layout,indent=2)+'\n')
report={'keyboardHiddenPixels':int((cover&(np.array(layers['keyboard'])[:,:,3]>0)).sum()),'mouseHiddenPixels':len(xs),'neutralRgbaDifferenceFromV8':0,'closedLids':'v8 continuous arcs retained','visibleOriginalPixelsResized':False}
(ROOT/'docs/hidden-devices-v9.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
