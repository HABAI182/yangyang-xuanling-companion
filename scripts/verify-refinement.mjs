import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {keyTarget} from '../src/key-target.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const out=path.resolve(process.env.PET_QA_OUTPUT||'../../work/refinement-qa');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],poses={};
try{
 const page=await browser.newPage({viewport:{width:1300,height:1100}});page.on('pageerror',e=>{if(!errors.includes(e.message))errors.push(e.message);});
 await page.addInitScript(()=>localStorage.setItem('yangyang-preview-preferences',JSON.stringify({size:840,idleEnabled:false,bubblesEnabled:false,hoverFade:false,headElasticity:.9})));
 await page.goto('http://127.0.0.1:1437/');await page.waitForFunction(()=>window.__petDebug?.frames()>10);
 await page.addStyleTag({content:'.pet-shell{background:#34353c;width:840px!important;height:861px!important}.preview-bar{display:none}'});
 const frame={keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,keyLabel:'',reach:0,targetX:0,targetY:0,targetZone:'rest',cursorX:0,cursorY:0};
 const input=async(patch={})=>page.evaluate(f=>window.__petDebug.input(f),{...frame,...patch});
 const read=()=>page.evaluate(()=>({state:window.__petDebug.snapshot(),model:window.__petDebug.geometry()}));
 const shot=async(name)=>{poses[name]=await read();await page.locator('.pet-shell').screenshot({path:path.join(out,name+'.png')});};
 await input();await page.waitForTimeout(1200);await shot('neutral');
 for(const code of ['KeyQ','KeyA','KeyU','KeyH','Space']){
  const t=keyTarget(code);await input({keysHeld:1,newPress:true,keyLabel:code,targetX:t.x,targetY:t.y,targetZone:t.zone});
  await page.waitForTimeout(65);assert.equal((await read()).model.parameters.mousePress,0,'keyboard attack must not press mouse palm');
  await page.waitForTimeout(1200);await shot(t.zone);assert.ok(Math.abs(poses[t.zone].state.keyboardPress-1)<.002);assert.ok(Math.abs(poses[t.zone].state.keyboardBounce)<.002);assert.ok(Math.abs(poses[t.zone].state.mousePress)<.002);
  await input();await page.waitForTimeout(900);
 }
 const center=(b)=>[(b[0]+b[2])/2,(b[1]+b[3])/2];
 const palm=n=>center(poses[n].model.bounds.ArtMesh);
 assert.ok(palm('left-far')[0]>palm('right-far')[0]);assert.ok(palm('left-far')[1]<palm('left-near')[1]);
 assert.ok(palm('space')[1]>palm('right-near')[1]);
 for(const [name,x,y] of [['look-left-up',-1,-1],['look-right-up',1,-1],['look-left-down',-1,1],['look-right-down',1,1]]){
  await input({cursorX:x,cursorY:y});await page.waitForTimeout(1200);await shot(name);
 }
 for(const id of ['ArtMesh4','ArtMesh5']){
  assert.ok(center(poses['look-right-up'].model.bounds[id])[0]>center(poses['look-left-up'].model.bounds[id])[0]);
  assert.ok(center(poses['look-right-up'].model.bounds[id])[1]>center(poses['look-right-down'].model.bounds[id])[1]);
 }
 // Both mouse and palm translate by the same bounded horizontal displacement.
 const a=poses['look-left-up'].model.bounds,b=poses['look-right-up'].model.bounds;
 const dx=id=>center(b[id])[0]-center(a[id])[0];assert.ok(dx('mouse')>0);assert.ok(Math.abs(dx('mouse')-dx('ArtMesh0'))<1e-4);
 await input({mouseDown:true,newMousePress:true});await page.waitForTimeout(65);assert.equal((await read()).model.parameters.keyboardPress,0,'mouse attack must not press keyboard palm');
 await page.waitForTimeout(1200);await shot('mouse-only');assert.ok(Math.abs(poses['mouse-only'].state.keyboardPress)<.002);assert.ok(Math.abs(poses['mouse-only'].state.mousePress-1)<.002);
 await input();await page.waitForTimeout(900);
 await page.evaluate(()=>window.__petDebug.action('laugh'));await page.waitForTimeout(400);await shot('closed');assert.equal(poses.closed.model.bounds.ArtMesh4[4],0);assert.equal(poses.closed.model.bounds.ArtMesh5[4],0);assert.equal(poses.closed.model.bounds.ArtMesh2[4],1);
 await page.evaluate(()=>window.__petDebug.action('default'));await page.evaluate(()=>window.__petDebug.action('bird'));await page.waitForTimeout(180);await shot('bird-1');await page.waitForTimeout(150);await shot('bird-2');assert.notEqual(poses['bird-1'].model.meshes.bird,poses['bird-2'].model.meshes.bird);
 for(const expression of ['serious','angry','surprised','starry']){await page.evaluate(id=>window.__petDebug.action(id),expression);await page.waitForTimeout(120);await shot('expression-'+expression);}
 await page.evaluate(()=>window.__petDebug.action('default'));
 await input({keysHeld:1,newPress:true,targetX:.65,targetY:1,targetZone:'left-far',keyLabel:'Q'});await page.waitForTimeout(70);await shot('elastic-attack');
 await input();await page.waitForTimeout(110);await shot('elastic-release');await page.waitForTimeout(2300);await shot('settled');
 for(const id of ['keyboard','mouse','ArtMesh0','ArtMesh','ArtMesh8','ArtMesh4','ArtMesh5'])assert.equal(poses.settled.model.meshes[id],poses.neutral.model.meshes[id],`no cumulative drift: ${id}`);
 await page.addStyleTag({content:'.pet-shell{background:#fafafa}'});await shot('neutral-light');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,coreWebgl:true,fourZonesAndSpace:true,independentMouse:true,gazeXY:true,closedEyeArt:true,independentBird:true,noCumulativeDrift:true,physicalWindowsInput:false,errors,poses},null,2));
 console.log('Refinement render and geometry checks passed: '+out);
}catch(e){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:String(e),errors,poses},null,2));throw e;}finally{await browser.close();}
