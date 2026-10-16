// Verify the packaged WebView/model without changing user preferences or
// injecting input. Physical input evidence is recorded separately.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const exe=process.env.PET_NATIVE_EXE;if(!exe)throw new Error('PET_NATIVE_EXE required');
const out=path.resolve(process.env.PET_QA_OUTPUT||'../../work/refinement-native-smoke');await fs.mkdir(out,{recursive:true});
const child=spawn(exe,[],{windowsHide:true,detached:true,stdio:'ignore',env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9237 --remote-debugging-address=127.0.0.1'}});child.unref();
const delay=ms=>new Promise(r=>setTimeout(r,ms));let browser,page;
const report={passed:false,physicalInputVerified:false,exeSha256:createHash('sha256').update(await fs.readFile(exe)).digest('hex'),errors:[]};
const ipc=(name,args={})=>page.evaluate(({name,args})=>window.__TAURI_INTERNALS__.invoke(name,args),{name,args});
try{
 for(let n=0;n<100;n++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9237');break;}catch{await delay(200);}}
 assert.ok(browser,'native WebView');page=browser.contexts()[0].pages().find(p=>!p.url().includes('?'));
 page.on('pageerror',e=>report.errors.push(e.message));await page.waitForFunction(()=>window.__petStatus?.read().frames>10);
 assert.equal(await page.evaluate(()=>Boolean(window.__petDebug)),false);
 const prefs=await ipc('read_preferences');report.windows=await ipc('window_diagnostics');
 assert.ok(report.windows.pet.visible&&!report.windows.pet.minimized);report.visibleNativeWindow=true;
 report.modelConfig=await page.evaluate(()=>fetch('/assets/model-config.json').then(r=>r.json()));assert.ok(report.modelConfig.entry.includes('yangyang-v10'));
 const a=await page.evaluate(()=>window.__petStatus.read());await delay(250);const b=await page.evaluate(()=>window.__petStatus.read());assert.ok(b.frames>a.frames);assert.equal(b.canvas.height,1360);report.realCoreFramesAdvance=true;
 await page.screenshot({path:path.join(out,'pet-neutral.png'),omitBackground:true});
 await ipc('pet_action',{action:'laugh'});await page.waitForFunction(()=>window.__petStatus.read().model.parameters.eyeLeftOpen===0);
 await page.screenshot({path:path.join(out,'pet-closed.png'),omitBackground:true});
 await ipc('pet_action',{action:'default'});await page.waitForFunction(()=>window.__petStatus.read().model.parameters.eyeLeftOpen===1);report.blinkReopens=true;
 await ipc('pet_action',{action:'bird'});const c=await page.evaluate(()=>window.__petStatus.read().model.meshes.bird);await delay(140);assert.notEqual(await page.evaluate(()=>window.__petStatus.read().model.meshes.bird),c);report.birdMoves=true;
 await ipc('pet_action',{action:'default'});report.preferencesUnchanged=JSON.stringify(prefs)===JSON.stringify(await ipc('read_preferences'));
 assert.ok(report.preferencesUnchanged);assert.deepEqual(report.errors,[]);report.passed=true;
}catch(e){report.errors.push(String(e));throw e;}finally{
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 if(process.env.PET_QA_CLOSE==='1'&&page){try{await ipc('quit_app');}catch{}}
 if(browser)await browser.close();
}
console.log('Packaged native model smoke passed; physical input remains separate.');
