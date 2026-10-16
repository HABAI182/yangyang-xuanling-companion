// Real Core/WebGL eye-mask captures. Pixel invariants are checked separately
// against the source aperture alpha; this does not replace human visual review.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const out=path.resolve(process.env.PET_QA_OUTPUT||'../../work/eye-v11-qa');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1800,height:1500}});page.on('pageerror',e=>{if(!errors.includes(e.message))errors.push(e.message);});
 await page.addInitScript(()=>localStorage.setItem('yangyang-preview-preferences',JSON.stringify({size:840,idleEnabled:false,bubblesEnabled:true,hoverFade:false,headElasticity:0,mouseScale:0,showKeys:true,multiKeyEnabled:true,keyCount:6})));
 await page.goto('http://127.0.0.1:1437/');await page.waitForFunction(()=>window.__petDebug?.frames()>10);
 await page.addStyleTag({content:'body{background:transparent!important}.pet-shell{background:transparent;width:1536px!important;height:1378px!important}.preview-bar{display:none}'});
 const base={keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,keyLabel:'',reach:0,cursorX:0,cursorY:0};
 const input=patch=>page.evaluate(f=>window.__petDebug.input(f),{...base,...patch});
 const capture=async name=>{
  // Capture the compositor. WebGL does not preserve its drawing buffer after
  // presentation, so reading canvas.toDataURL here can return a blank image.
  await page.locator('canvas').screenshot({path:path.join(out,name+'.png'),omitBackground:true});
 };
 await input({});await page.waitForTimeout(1200);await capture('neutral');
 const clipping=await page.evaluate(()=>window.__petDebug.geometry().clipping);
 assert.deepEqual(clipping,{ArtMesh4:['ArtMesh6'],ArtMesh5:['ArtMesh7']});
 for(const [name,x,y] of [['left-up',-1,-1],['right-up',1,-1],['left-down',-1,1],['right-down',1,1]]){
  await input({cursorX:x,cursorY:y});await page.waitForTimeout(1000);await capture(name);
 }
 await input({});await page.waitForTimeout(1000);
 await page.evaluate(()=>window.__petDebug.action('angry'));await page.waitForTimeout(200);await capture('angry');
 await page.evaluate(()=>window.__petDebug.action('blush'));await input({keysHeld:1,newPress:true,keyLabel:'A',presses:['A']});await page.waitForTimeout(300);
 const rects=await page.evaluate(()=>Object.fromEntries(['speech','key'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return [id,{left:r.left,top:r.top,right:r.right,bottom:r.bottom}];})));
 assert.ok(Math.abs(rects.speech.top-rects.key.top)<1);assert.ok(rects.speech.right<rects.key.left);
 await page.locator('.pet-shell').screenshot({path:path.join(out,'blush-bubbles.png')});
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,coreWebgl:true,nativeClipping:clipping,bubbleRects:rects,errors,physicalInput:false},null,2));
 console.log('Native masks and bubble alignment captured: '+out);
}finally{await browser.close();}
