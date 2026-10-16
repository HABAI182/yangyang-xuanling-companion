import {createRequire} from 'node:module';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {expressions} from '../src/preferences.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const out=path.resolve(process.env.PET_QA_OUTPUT||'../../work/details-v12-qa');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[],poses={};
try{
 const context=await browser.newContext({viewport:{width:1800,height:1500}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('yangyang-preview-preferences',JSON.stringify({size:840,idleEnabled:false,headElasticity:0,mouseScale:0,bubblesEnabled:false,hoverFade:false,multiKeys:true,maxKeys:6})));
 await page.goto('http://127.0.0.1:1437/');await page.waitForFunction(()=>window.__petDebug?.frames()>10);
 await page.addStyleTag({content:'.pet-shell{width:1584px!important;height:1378px!important;background:#34353c}.preview-bar{display:none}'});
 const base={keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,keyLabel:'',reach:0,cursorX:0,cursorY:0};
 const input=patch=>page.evaluate(f=>window.__petDebug.input(f),{...base,...patch});
 await input({});await page.waitForTimeout(1200);await page.locator('#pet').screenshot({path:path.join(out,'gaze-neutral.png'),omitBackground:true});
 for(const [id] of expressions){await page.evaluate(id=>window.__petDebug.action(id),id);await page.waitForTimeout(90);poses[id]=await page.evaluate(()=>window.__petDebug.geometry());await page.locator('.pet-shell').screenshot({path:path.join(out,'mood-'+id+'.png')});
  assert.equal(await page.locator('[data-mouth]').count(),id==='default'?0:1);
 }
 assert.equal(poses.laugh.parameters.eyeLeftOpen,0);assert.equal(poses.laugh.parameters.eyeRightOpen,0);
 assert.equal(poses.shy.parameters.eyeLeftOpen,0);assert.equal(poses.shy.parameters.eyeRightOpen,1);
 assert.equal(poses.proud.parameters.eyeLeftOpen,1);assert.equal(poses.proud.parameters.eyeRightOpen,0);
 await page.evaluate(()=>window.__petDebug.action('default'));await page.waitForTimeout(100);
 for(const [name,x,y] of [['left-up',-1,-1],['right-up',1,-1],['left-down',-1,1],['right-down',1,1]]){
  await input({cursorX:x,cursorY:y});await page.waitForTimeout(900);poses[name]=await page.evaluate(()=>window.__petDebug.geometry());await page.locator('#pet').screenshot({path:path.join(out,'gaze-'+name+'.png'),omitBackground:true});
 }
 const cx=b=>(b[0]+b[2])/2;
 const gazeDisplacementSourcePx=(cx(poses['right-up'].bounds.ArtMesh5)-cx(poses['left-up'].bounds.ArtMesh5))*1360;
 assert.ok(Math.abs(gazeDisplacementSourcePx-31.35)<.2,'65% larger default gaze');
 const settings=await context.newPage();await settings.goto('http://127.0.0.1:1437/?settings');await settings.waitForSelector('#keyBubbleScale',{state:'attached'});
 const set=async(id,value)=>{await settings.locator('#'+id).evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);await page.waitForTimeout(160);};
 await settings.locator('[data-tab="interaction"]').click();
 // Independent settings broadcast live, save, survive page reload.
 await set('keyBubbleScale',1.8);await set('speechBubbleScale',1.4);await settings.reload();
 assert.equal(await settings.locator('#keyBubbleScale').inputValue(),'1.8');assert.equal(await settings.locator('#speechBubbleScale').inputValue(),'1.4');
 const pref=await page.evaluate(()=>window.__petDebug.preferences());assert.equal(pref.keyBubbleScale,1.8);assert.equal(pref.speechBubbleScale,1.4);
 await settings.locator('[data-tab="interaction"]').click();await settings.locator('#bubblesEnabled').check();await page.waitForTimeout(180);
 // Inspect at the ordinary desktop size, not only the large art QA view.
 await page.addStyleTag({content:'.pet-shell{width:445.2px!important;height:456.33px!important}'});
 await page.evaluate(()=>window.__petDebug.action('blush'));await input({keysHeld:1,newPress:true,keyLabel:'A',presses:['Ctrl','Alt','A']});
 await page.bringToFront();await page.locator('#speech.shown').waitFor();await page.waitForTimeout(250);
 const boxes=await page.evaluate(()=>Object.fromEntries(['speech','key'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{left:r.left,top:r.top,right:r.right,bottom:r.bottom}];})));
 await fs.writeFile(path.join(out,'bubble-boxes.json'),JSON.stringify(boxes));assert.ok(Math.abs(boxes.speech.top-boxes.key.top)<1,JSON.stringify(boxes));assert.ok(boxes.speech.right<boxes.key.left);
 await page.locator('.pet-shell').screenshot({path:path.join(out,'ui-large.png')});
 await settings.locator('[data-tab="interaction"]').click();await set('keyBubbleScale',1.3);await set('speechBubbleScale',1);await input({keysHeld:1,newPress:true,keyLabel:'A',presses:['A']});await page.waitForTimeout(100);
 await page.locator('.pet-shell').screenshot({path:path.join(out,'ui-default.png')});
 await page.evaluate(()=>window.__petDebug.action('default'));await settings.locator('[data-tab="appearance"]').click();await set('gazeScale',2.5);await page.bringToFront();await input({cursorX:1,cursorY:1});await page.waitForTimeout(900);
 await page.addStyleTag({content:'.pet-shell{width:1584px!important;height:1378px!important}'});await page.locator('#pet').screenshot({path:path.join(out,'gaze-max.png'),omitBackground:true});
 await page.evaluate(()=>window.__petDebug.action('smile'));await settings.locator('#headElasticity').evaluate(el=>{el.value='1.5';el.dispatchEvent(new Event('change',{bubbles:true}));});
 await input({cursorX:-1,cursorY:-1,keysHeld:1,newPress:true,targetX:.65,targetY:1,targetZone:'left-far',keyLabel:'Q'});await page.waitForTimeout(70);await page.locator('.pet-shell').screenshot({path:path.join(out,'combined-extreme.png')});
 assert.deepEqual(errors,[]);
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,coreWebgl:true,allMenuExpressions:expressions.map(x=>x[0]),gazeDisplacementSourcePx,independentScalesPersist:true,bubbleBoxes:boxes,nativeMocReauthored:false,runtimePatchesBoundToNativeHead:true,physicalInput:false,errors,poses},null,2));
}finally{await browser.close();}
console.log('Detailed menu moods, gaze, framed overlays and saved scales verified: '+out);
