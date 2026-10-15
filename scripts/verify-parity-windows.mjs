// Formal IPC and rendered WebView checks, separate from physical-input acceptance.
import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const exe=process.env.PET_NATIVE_EXE;if(!exe)throw new Error('PET_NATIVE_EXE required');
const out=path.resolve(process.env.PET_QA_OUTPUT||'docs/evidence/parity-windows-0.2.0');await fs.mkdir(out,{recursive:true});
const prefsFile=path.join(process.env.APPDATA,'local.habai182.yangyang-xuanling/preferences.json'),desktopFile=path.join(process.env.APPDATA,'local.habai182.yangyang-xuanling/desktop-state.json');
const originalPrefsBytes=await fs.readFile(prefsFile).catch(()=>null),originalDesktopBytes=await fs.readFile(desktopFile).catch(()=>null);
const child=spawn(exe,[],{windowsHide:true,env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9237 --remote-debugging-address=127.0.0.1'}});
let browser,page,control,original,originalWindow,fixture;const delay=ms=>new Promise(r=>setTimeout(r,ms));
const report={pass:false,exeSha256:createHash('sha256').update(await fs.readFile(exe)).digest('hex'),physicalInputVerified:false,errors:[],untested:['physical gamepad','UAC compatibility restart','Windows login autostart','installer execution','fullscreen game input']};
const ipc=(name,args={})=>Promise.race([(control??page).evaluate(({name,args})=>window.__TAURI_INTERNALS__.invoke(name,args),{name,args}),new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error(`IPC timeout: ${name}`)),15000);t.unref();})]);
async function wait(test,message){for(let n=0;n<100;n++){if(await test())return;await delay(100);}throw new Error(message);}
const diagnostics=()=>ipc('window_diagnostics');
try{
 for(let n=0;n<100;n++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9237');break;}catch{await delay(200);}}
 if(!browser)throw new Error('Native WebView did not open');page=browser.contexts()[0].pages().find(p=>!p.url().includes('?'));if(!page)throw new Error('Pet WebView missing');page.on('pageerror',e=>report.errors.push(e.message));
 await page.waitForFunction(()=>window.__petStatus?.read().frames>4);assert.equal(await page.evaluate(()=>Boolean(window.__petDebug)),false);original=await ipc('read_preferences');originalWindow=(await diagnostics()).pet;
 let current=await page.evaluate(()=>window.__petStatus.read());assert.equal(current.canvas.height,1360);report.realCubism=true;await delay(250);assert.ok((await page.evaluate(()=>window.__petStatus.read().frames))>current.frames);report.framesAdvance=true;
 const testing={...original,idleEnabled:false,motion:'off',headElasticity:0,cursorFollow:false,bubblesEnabled:true,inputEnabled:true,alwaysOnTop:true,clickThrough:false,showKeys:true,multiKeys:true,maxKeys:3,repeatKeys:false};
 await ipc('save_preferences',{prefs:testing});assert.deepEqual(await ipc('read_preferences'),testing);report.preferenceRoundTrip=true;
 await ipc('show_settings');await wait(()=>Promise.resolve(browser.contexts()[0].pages().some(p=>p.url().includes('?settings'))),'Settings missing');const settings=browser.contexts()[0].pages().find(p=>p.url().includes('?settings'));settings.on('pageerror',e=>report.errors.push(e.message));await settings.waitForSelector('#size');assert.equal(await settings.locator('[data-tab]').count(),4);await settings.screenshot({path:path.join(out,'settings-native.png')});
 let windows=await diagnostics();assert.ok(windows.pet.visible&&windows.settings.visible);const a=windows.pet,b=windows.settings;const overlap=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));assert.equal(overlap,0);report.settingsVisibleAndSeparate=true;report.ownEditorForeground=(await ipc('input_metrics')).ownEditorForeground;assert.equal(report.ownEditorForeground,true);
 await ipc('close_panel',{label:'settings'});await ipc('show_menu');await wait(()=>Promise.resolve(browser.contexts()[0].pages().some(p=>p.url().includes('?menu'))),'Menu missing');const menu=browser.contexts()[0].pages().find(p=>p.url().includes('?menu'));await menu.waitForSelector('.interaction-menu');assert.equal(await menu.locator('[data-action]').count(),20);await menu.screenshot({path:path.join(out,'menu-native.png')});report.detachedMenu=true;
 await ipc('pet_action',{action:'sleepy'});await page.waitForFunction(()=>window.__petStatus.read().model.parameters.eyeLeftOpen===0);await page.screenshot({path:path.join(out,'sleepy-native.png'),omitBackground:true});await ipc('pet_action',{action:'default'});await page.waitForFunction(()=>window.__petStatus.read().model.parameters.eyeLeftOpen===1);report.nativeActionDrivesModel=true;await ipc('close_panel',{label:'menu'});
 await ipc('save_position',{slot:2});assert.equal((await ipc('list_positions'))[2],true);const savedWindow=(await diagnostics()).pet;
 await ipc('preview_size',{size:210});await delay(200);assert.ok((await diagnostics()).pet.width<savedWindow.width);await ipc('restore_position',{slot:2});assert.ok((await diagnostics()).pet.width<savedWindow.width);await ipc('save_preferences',{prefs:testing});await ipc('restore_position',{slot:2});report.positionPresetDoesNotResize=true;
 await ipc('hide_pet');assert.equal((await diagnostics()).pet.visible,false);await delay(700);assert.equal((await diagnostics()).pet.visible,false);await ipc('show_pet');assert.equal((await diagnostics()).pet.visible,true);report.manualVisibility=true;
 await ipc('save_preferences',{prefs:{...testing,clickThrough:true}});await ipc('reset_pet');assert.equal((await ipc('read_preferences')).clickThrough,false);assert.equal((await diagnostics()).pet.visible,true);report.clickThroughRecoveredByCommand=true;
 const beforeInvalid=await ipc('read_preferences');const invalid={...beforeInvalid,shortcuts:beforeInvalid.shortcuts.map((s,n)=>n===0?{enabled:true,chord:'Ctrl+Alt+Y',action:'smile'}:s)};await assert.rejects(()=>ipc('save_preferences',{prefs:invalid}));assert.deepEqual(await ipc('read_preferences'),beforeInvalid);await assert.rejects(()=>ipc('open_project_link',{page:'invalid'}));report.invalidPreferenceAndLinkRejected=true;
 const fixturePath=path.resolve(process.env.PET_FIXTURE_EXE);if(!process.env.PET_FIXTURE_EXE)throw new Error('PET_FIXTURE_EXE required');
 await ipc('show_settings');await wait(()=>Promise.resolve(browser.contexts()[0].pages().some(p=>p.url().includes('?settings'))),'Control window missing');control=browser.contexts()[0].pages().find(p=>p.url().includes('?settings'));await control.waitForSelector('#size');
 await ipc('save_preferences',{prefs:{...testing,fullscreenHide:true,fullscreenExceptions:[]}});fixture=spawn(fixturePath,[],{windowsHide:true});await wait(async()=>!(await diagnostics()).pet.visible,'Fullscreen did not hide pet');report.fullscreenHide=true;
 await ipc('hide_pet');fixture.kill();await delay(1000);assert.equal((await diagnostics()).pet.visible,false);report.manualHideSurvivesFullscreenExit=true;await ipc('show_pet');
 await ipc('save_preferences',{prefs:{...testing,fullscreenHide:true,fullscreenExceptions:[path.basename(fixturePath).toLowerCase()]}});fixture=spawn(fixturePath,[],{windowsHide:true});await delay(1400);assert.equal((await diagnostics()).pet.visible,true);report.fullscreenException=true;fixture.kill();await delay(500);
 await ipc('save_preferences',{prefs:original});assert.deepEqual(await ipc('read_preferences'),original);await ipc('show_pet');report.preferencesRestored=true;await page.screenshot({path:path.join(out,'pet-native-final.png'),omitBackground:true});assert.deepEqual(report.errors,[]);report.pass=true;
}catch(error){report.errors.push(error.message);throw error;}
finally{
 if(fixture&&!fixture.killed)fixture.kill();if(page&&original){try{await ipc('save_preferences',{prefs:original});report.preferencesRestored=true;}catch{}}
 if(page){try{await ipc('quit_app');}catch{}}if(browser)await browser.close();if(!child.killed)child.kill();await delay(500);
 if(originalPrefsBytes){await fs.writeFile(prefsFile,originalPrefsBytes);report.persistedPreferenceBytesRestored=true;}
 if(originalDesktopBytes)await fs.writeFile(desktopFile,originalDesktopBytes);else if(originalWindow)await fs.writeFile(desktopFile,JSON.stringify({last:{x:originalWindow.x,y:originalWindow.y},slots:[null,null,null]}));report.positionSlotsRestored=true;
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
}
console.log('Windows parity checks passed; physical input remains separate.');
