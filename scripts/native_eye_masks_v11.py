"""Scoped official Cubism 1.1 API transaction for the v11 eye-mask repair.

Run with the installed live2d-automation Python environment. This extends the
project workflow only; it does not claim generic mesh-authoring capabilities.
PSD import and Auto Mesh remain native Editor operations. No binary edits.
"""
import argparse, asyncio, json, uuid
from pathlib import Path
from filelock import FileLock
from live2d_automation.cli import settings_from_env
from live2d_automation.engine import Engine
from live2d_automation.bindings import capture
from live2d_automation.storage import atomic_json, digest

ROOT=Path(__file__).resolve().parents[1]
TARGETS={'ArtMesh4':'ParamEyeROpen','ArtMesh5':'ParamEyeLOpen','ArtMesh6':'ParamEyeROpen','ArtMesh7':'ParamEyeLOpen'}

async def run(args):
 engine=Engine(settings_from_env()); job='eye-v11-'+args.action+'-'+uuid.uuid4().hex
 path=ROOT/'docs/evidence/eye-v11-native'/job;path.mkdir(parents=True)
 active=False;before=None
 lock=FileLock(engine.lock_root/f'editor-{engine.settings.port}.lock',timeout=0)
 try:
  with lock:
   if engine.marker.exists():raise RuntimeError('Existing recovery marker requires review')
   uid,info=await engine.ready(args.uid);engine.edit_gate(info)
   before=await capture(engine,uid);atomic_json(path/'before.json',before)
   if args.action=='select':
    await engine.write_ok('EditBegin',{'Silent':False});active=True
    await engine.write_ok('ClearSelectedObjects',{'ModelUID':uid})
    await engine.write_ok('AddSelectedObjects',{'ModelUID':uid,'Ids':list(TARGETS)})
    await engine.write_ok('EditEnd',{'Cancel':False});active=False
    # This alpha returns a non-object payload for GetSelectedObjects, which
    # the installed transport deliberately rejects. Check the four highlighted
    # meshes in Editor before Auto Mesh; do not claim API readback here.
    print(json.dumps({'selectionRequested':list(TARGETS),'visualSelectionReadbackRequired':True}));return
   backup=await engine.backup(uid,job)
   atomic_json(path/'plan.json',{'uid':uid,'action':args.action,'beforeHash':digest(before),'backup':backup.model_dump(mode='json'),'targets':TARGETS,'officialApi':'https://cubism.live2d.com/editor-alpha/doc/manual/alpha1/zh/external-api-intergration/index.html'})
   atomic_json(engine.marker,{'job_id':job,'model_uid':uid,'phase':args.action,'job_path':str(path)})
   await engine.write_ok('EditBegin',{'Silent':False});active=True
   for oid,param in TARGETS.items():
    if args.action=='prepare':
     for binding in before['objects'][oid]['keys']:
      for value in binding['KeyValues']:
       await engine.write_ok('DeleteParameterKey',{'ModelUID':uid,'ObjectId':oid,'ParameterId':binding['Id'],'KeyValue':value,'Strict':True})
    else:
     keys=(await engine.ws.request('GetParameterKeys',{'ModelUID':uid,'ObjectId':oid}))['Parameters']
     if keys:raise RuntimeError(f'Remesh target has unexpected keys: {oid}')
     for value in [0.,1.]:
      await engine.write_ok('AddParameterKey',{'ModelUID':uid,'ObjectId':oid,'ParameterId':param,'KeyValue':value})
      props={'Opacity':value*100,'DrawOrder':502 if oid in ['ArtMesh4','ArtMesh5'] else 501}
      if oid in ['ArtMesh4','ArtMesh5']:props.update(ClippingIds=['ArtMesh6' if oid=='ArtMesh4' else 'ArtMesh7'],IsReverseMask=False)
      await engine.write_ok('EditArtMesh',{'ModelUID':uid,'Id':oid,'Parameters':[{'Id':param,'Value':value}],'IsExactMatch':True,**props})
   if args.action=='bind':
    for oid,param in [('ArtMesh2','ParamEyeROpen'),('ArtMesh3','ParamEyeLOpen')]:
     for v in [0.,1.]:
      await engine.write_ok('EditArtMesh',{'ModelUID':uid,'Id':oid,'Parameters':[{'Id':param,'Value':v}],'IsExactMatch':True,'DrawOrder':503})
   changed=await capture(engine,uid)
   for oid,old in before['objects'].items():
    if oid not in TARGETS and not(args.action=='bind' and oid in ['ArtMesh2','ArtMesh3']):
     assert changed['objects'][oid]==old,('Non-target changed',oid)
   for oid,param in TARGETS.items():
    actual=changed['objects'][oid]
    if args.action=='prepare':assert actual['keys']==[],oid
    else:
     assert actual['keys']==[{'Id':param,'KeyValues':[0.,1.]}],oid
     for form in actual['forms']:
      data=form['object']['Data'];value=form['parameters'][0]['Value'];assert data['Opacity']==value*100
      if oid in ['ArtMesh4','ArtMesh5']:assert data['ClippingIds']==['ArtMesh6' if oid=='ArtMesh4' else 'ArtMesh7']
   await engine.ready(uid)
   if engine.ws.edit_cancelled:raise RuntimeError('User cancelled')
   await engine.write_ok('EditEnd',{'Cancel':False});active=False
   after=await capture(engine,uid);assert after==changed
   atomic_json(path/'after.json',after);engine.marker.unlink()
   atomic_json(path/'result.json',{'passed':True,'action':args.action,'uid':uid,'beforeHash':digest(before),'afterHash':digest(after),'nativeSaved':False})
   print(json.dumps({'passed':True,'uid':uid,'action':args.action,'evidence':str(path)}))
 except BaseException as exc:
  atomic_json(path/'failure.json',exc.as_dict() if hasattr(exc,'as_dict') else {'error':str(exc)})
  print(json.dumps(exc.as_dict() if hasattr(exc,'as_dict') else {'error':str(exc)}))
  if active:
   await engine.write_ok('EditEnd',{'Cancel':True})
   restored=await capture(engine,args.uid)
   if restored==before:engine.marker.unlink()
  raise
 finally:await engine.close()

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','bind','select']);p.add_argument('--uid',required=True)
 asyncio.run(run(p.parse_args()))
