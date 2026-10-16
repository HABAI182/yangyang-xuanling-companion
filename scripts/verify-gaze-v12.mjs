import {createRequire} from 'node:module';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const out=path.resolve(process.env.PET_QA_OUTPUT||'../../work/gaze-v12-qa');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1800,height:1500}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('yangyang-preview-preferences',JSON.stringify({size:840,idleEnabled:false,bubblesEnabled:false,headElasticity:0,mouseScale:0,gazeScale:1.65})));
 await page.goto('http://127.0.0.1:1437/');await page.waitForFunction(()=>window.__petDebug?.frames()>10);
 await page.addStyleTag({content:'body{background:transparent!important}.pet-shell{background:transparent!important;width:1584px!important;height:1378px!important}.preview-bar{display:none}'});
 assert.deepEqual(await page.evaluate(()=>window.__petDebug.geometry().clipping),{ArtMesh4:['ArtMesh6'],ArtMesh5:['ArtMesh7']});
 const base={keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,keyLabel:'',reach:0,cursorX:0,cursorY:0};
 for(const [name,x,y] of [['neutral',0,0],['left-up',-1,-1],['right-up',1,-1],['left-down',-1,1],['right-down',1,1],['max',1,1]]){
  if(name==='max')await page.evaluate(async()=>{const bridge=await import('/src/bridge.ts');await bridge.updatePreferences({gazeScale:2.5});});
  await page.evaluate(f=>window.__petDebug.input(f),{...base,cursorX:x,cursorY:y});await page.waitForTimeout(1000);
  await page.locator('#pet').screenshot({path:path.join(out,'gaze-'+name+'.png'),omitBackground:true});
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,transparentCompositorCaptures:true,nativeMasks:true,errors},null,2));
}finally{await browser.close();}
