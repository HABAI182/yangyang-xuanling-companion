import {createRequire} from 'node:module';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const out=path.resolve(process.env.PET_QA_OUTPUT||'../../work/polish-v13-qa');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const report={passed:false,errors:[],moods:{}};
try{
 const context=await browser.newContext({viewport:{width:1800,height:1500}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('yangyang-preview-preferences',JSON.stringify({size:840,idleEnabled:false,bubblesEnabled:false,headElasticity:0,mouseScale:0,gazeReturnEnabled:false})));
 await page.goto('http://127.0.0.1:1437/');await page.waitForFunction(()=>window.__petDebug?.frames()>10);await page.addStyleTag({content:'.pet-shell{width:1584px!important;height:1378px!important;background:#34353c}.preview-bar{display:none}'});
 const base={keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,keyLabel:'',reach:0,cursorX:0,cursorY:0};
 const input=p=>page.evaluate(f=>window.__petDebug.input(f),{...base,...p});
 for(const id of ['default','sleepy','laugh','shy','proud','surprised','confused','think','angry','blush','wind']){
  await page.evaluate(id=>window.__petDebug.action(id),id);await page.waitForTimeout(180);await page.locator('.pet-shell').screenshot({path:path.join(out,'mood-'+id+'.png')});
  report.moods[id]=await page.evaluate(()=>window.__petDebug.geometry());
  const badge=page.locator('[data-emotion-badge]');if(!['default'].includes(id))assert.equal(await badge.count(),1);
 }
 const badge=await page.locator('[data-emotion-badge]').boundingBox();assert.ok(badge.width>130);
 assert.equal(report.moods.sleepy.parameters.eyeLeftOpen,0);assert.equal(report.moods.sleepy.parameters.eyeRightOpen,0);
 // Real rendered gaze returns; the independent mouse/palm target stays put.
 await page.evaluate(async()=>{const b=await import('/src/bridge.ts');await b.updatePreferences({gazeReturnEnabled:true,gazeIdleSeconds:1,mouseScale:1});});
 await page.evaluate(()=>window.__petDebug.action('default'));await input({cursorX:1,cursorY:.8});await page.waitForTimeout(450);
 const followed=await page.evaluate(()=>({model:window.__petDebug.geometry(),gaze:window.__petDebug.gaze()}));
 await page.waitForTimeout(2000);const centered=await page.evaluate(()=>({model:window.__petDebug.geometry(),gaze:window.__petDebug.gaze()}));
 assert.equal(centered.gaze.mode,'centered');assert.notEqual(followed.model.meshes.ArtMesh5,centered.model.meshes.ArtMesh5);assert.equal(followed.model.meshes.mouse,centered.model.meshes.mouse);assert.equal(followed.model.meshes.ArtMesh0,centered.model.meshes.ArtMesh0);
 await input({cursorX:.98,cursorY:.8});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__petDebug.gaze().mode),'following');
 report.idleReturn={passed:true,independentMouseTarget:true,moveResumes:true};
 // The menu box has no viewport-height minimum. Expanding adds only its rows.
 const menu=await context.newPage();await menu.setViewportSize({width:356,height:1000});await menu.goto('http://127.0.0.1:1437/?menu');await menu.waitForSelector('.menu-footer');
 report.menuCollapsed=await menu.locator('.interaction-menu').boundingBox();assert.ok(report.menuCollapsed.height<520);
 await menu.locator('.interaction-menu').screenshot({path:path.join(out,'menu-collapsed.png')});await menu.locator('.more-expressions summary').click();
 report.menuExpanded=await menu.locator('.interaction-menu').boundingBox();assert.ok(report.menuExpanded.height>report.menuCollapsed.height+80);assert.ok(report.menuExpanded.height<700);
 await menu.locator('.interaction-menu').screenshot({path:path.join(out,'menu-expanded.png')});
 // Shared stationery in the ordinary pet size, with a real transient key label.
 await page.bringToFront();await page.evaluate(async()=>{const b=await import('/src/bridge.ts');await b.updatePreferences({bubblesEnabled:true,gazeReturnEnabled:false});});
 await page.addStyleTag({content:'.pet-shell{width:546px!important;height:559.65px!important}'});await page.evaluate(()=>window.__petDebug.action('surprised'));await input({keysHeld:1,newPress:true,keyLabel:'A',presses:['A']});await page.waitForTimeout(250);
 report.stationery=await page.evaluate(()=>{const a=getComputedStyle(document.getElementById('speech')),b=getComputedStyle(document.querySelector('#key kbd'));return {speechBorder:a.borderTopWidth,keyBorder:b.borderTopWidth,speechColour:a.borderTopColor,keyColour:b.borderTopColor,speechCrest:getComputedStyle(document.getElementById('speech'),'::before').backgroundImage,keyCrest:getComputedStyle(document.querySelector('#key kbd'),'::before').backgroundImage};});
 assert.equal(report.stationery.speechBorder,'2px');assert.equal(report.stationery.keyBorder,'2px');assert.equal(report.stationery.speechColour,report.stationery.keyColour);assert.equal(report.stationery.speechCrest,report.stationery.keyCrest);
 await page.locator('.pet-shell').screenshot({path:path.join(out,'stationery-surprised.png')});assert.deepEqual(report.errors,[]);report.passed=true;
}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
console.log('Closed eyes, Q glyphs, stationery, menu height and gaze return passed: '+out);
