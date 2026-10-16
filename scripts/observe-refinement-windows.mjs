// Read-only native input observation; never injects renderer or keyboard events.
import {createRequire} from 'node:module';import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const exe=process.env.PET_NATIVE_EXE;if(!exe)throw new Error('PET_NATIVE_EXE required');
const out=path.resolve(process.env.PET_QA_OUTPUT||'../../work/native-refinement');await fs.mkdir(out,{recursive:true});
const child=spawn(exe,[],{windowsHide:true,detached:true,stdio:'ignore',env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9237 --remote-debugging-address=127.0.0.1'}});child.unref();
const delay=ms=>new Promise(r=>setTimeout(r,ms));let browser,page,prefs,report={passed:false,exeSha256:createHash('sha256').update(await fs.readFile(exe)).digest('hex'),inputSource:'human physical input outside pet settings',zones:[],keyboardOnly:false,mouseOnly:false,mouseToKeyboard:false,maxHoldMs:0,maxNewPressesIn1s:0,gazeRange:{minX:1,maxX:-1,minY:1e9,maxY:-1e9},errors:[]};
const ipc=(name,args={})=>page.evaluate(({name,args})=>window.__TAURI_INTERNALS__.invoke(name,args),{name,args});
try{
 for(let i=0;i<100;i++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9237');break;}catch{await delay(200);}}
 assert.ok(browser,'WebView CDP');page=browser.contexts()[0].pages().find(p=>!p.url().includes('?'));page.on('pageerror',e=>report.errors.push(e.message));await page.waitForFunction(()=>window.__petStatus?.read().frames>10);assert.equal(await page.evaluate(()=>Boolean(window.__petDebug)),false);
 prefs=await ipc('read_preferences');report.windows=await ipc('window_diagnostics');assert.ok(report.windows.pet.visible&&!report.windows.pet.minimized);report.nativeVisible=true;
 await ipc('show_settings');await delay(700);report.windows=await ipc('window_diagnostics');const a=report.windows.pet,b=report.windows.settings;assert.equal(Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)),0);report.settingsSeparate=true;
 await page.screenshot({path:path.join(out,'native-start.png'),omitBackground:true});
 const first=await page.evaluate(()=>window.__petStatus.read().frames);await delay(200);assert.ok((await page.evaluate(()=>window.__petStatus.read().frames))>first);report.framesAdvance=true;
 await fs.writeFile(path.join(out,'ready.json'),JSON.stringify({ready:true,windows:report.windows}));console.log('READY physical input observation');
 const deadline=Date.now()+Number(process.env.PET_QA_WAIT_MS||600000),counts=[];let heldSince=null,seenMouse=false,holdSaved=false;
 while(Date.now()<deadline){
  try{await fs.access(path.join(out,'stop'));break;}catch{}
  const r=await page.evaluate(()=>window.__petStatus.read()),s=r.snapshot,m=await ipc('input_metrics'),now=Date.now();
  if(s.zone!=='rest'&&!report.zones.includes(s.zone)){report.zones.push(s.zone);await page.screenshot({path:path.join(out,`native-${s.zone}.png`),omitBackground:true});}
  if(s.keyboardPress>.2&&Math.abs(s.mousePress)<.01)report.keyboardOnly=true;
  if(s.mousePress>.2&&Math.abs(s.keyboardPress)<.01){report.mouseOnly=true;seenMouse=true;}
  if(seenMouse&&s.keyboardPress>.2&&Math.abs(s.mousePress)<.01)report.mouseToKeyboard=true;
  if(s.zone!=='rest'&&s.keyboardPress>.98){heldSince??=now;report.maxHoldMs=Math.max(report.maxHoldMs,now-heldSince);if(now-heldSince>1000&&Math.abs(s.keyboardBounce)<.002)report.holdSettled=true;if(now-heldSince>3000&&!holdSaved){await page.screenshot({path:path.join(out,'native-held.png'),omitBackground:true});holdSaved=true;}}else heldSince=null;
  counts.push({t:now,n:m.keyboardPresses});while(counts.length>1&&counts[0].t<now-1000)counts.shift();report.maxNewPressesIn1s=Math.max(report.maxNewPressesIn1s,m.keyboardPresses-counts[0].n);
  const bx=r.model.parameters.eyeBallX,bb=r.model.bounds.ArtMesh5;report.gazeRange.minX=Math.min(report.gazeRange.minX,bx);report.gazeRange.maxX=Math.max(report.gazeRange.maxX,bx);report.gazeRange.minY=Math.min(report.gazeRange.minY,(bb[1]+bb[3])/2);report.gazeRange.maxY=Math.max(report.gazeRange.maxY,(bb[1]+bb[3])/2);
  report.metrics=m;report.physicalInputVerified=report.zones.length===5&&report.keyboardOnly&&report.mouseOnly&&report.mouseToKeyboard&&report.maxHoldMs>3000&&report.holdSettled&&report.maxNewPressesIn1s>=3;
  await fs.writeFile(path.join(out,'progress.json'),JSON.stringify(report,null,2));
  if(report.physicalInputVerified&&s.zone==='rest'&&Math.abs(s.mousePress)<.01)break;
  await delay(30);
 }
 report.preferencesUnchanged=JSON.stringify(await ipc('read_preferences'))===JSON.stringify(prefs);report.preferencePolicy='Observer never changes preferences; human changes are retained.';assert.deepEqual(report.errors,[]);assert.ok(report.physicalInputVerified,'Physical input checklist incomplete');report.passed=true;
}catch(e){report.errors.push(String(e));throw e;}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));if(process.env.PET_QA_CLOSE==='1'&&page){try{await ipc('quit_app');}catch{}}if(browser)await browser.close();}
console.log('Native refinement input checklist passed');
