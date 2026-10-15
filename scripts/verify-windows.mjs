// Native WebView/IPC observation. OS key and mouse input is sent separately
// through the computer-use tool, never injected into the renderer by this test.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE||'playwright');
const output=path.resolve(process.env.PET_QA_OUTPUT||'../../work/windows-qa');
await fs.mkdir(output,{recursive:true});
const stop=path.join(output,'stop');
const executable=process.env.PET_NATIVE_EXE;if(!executable)throw new Error('PET_NATIVE_EXE required');
const child=spawn(executable,[],{windowsHide:true,env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=9237 --remote-debugging-address=127.0.0.1'}});
let browser,page,original,alternate;
const mode=process.env.PET_QA_MODE||'input';
const report={pass:false,mode,windowsNative:true,renderer:null,renderedPixels:0,framesAdvance:false,keyboardOnlyObserved:false,mouseOnlyObserved:false,bothObserved:false,heldKeyTested:false,settingsPersisted:false,preferencesRestored:false,errors:[],osInputSource:process.env.PET_OS_INPUT_SOURCE||'Separate sky.press_key / sky.click against the native settings window'};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function ipc(name,args={}){return Promise.race([
  page.evaluate(({name,args})=>window.__TAURI_INTERNALS__.invoke(name,args),{name,args}),
  new Promise((_,reject)=>{const t=setTimeout(()=>reject(new Error(`IPC ${name} timed out`)),10000);t.unref();})
]);}
try{
  for(let n=0;n<100;n++){try{browser=await chromium.connectOverCDP('http://127.0.0.1:9237');break;}catch{await delay(200);}}
  if(!browser)throw new Error('Native WebView CDP did not open');
  page=browser.contexts()[0].pages()[0];page.on('pageerror',e=>report.errors.push(e.message));
  await page.waitForFunction(()=>window.__petStatus,{timeout:20000});
  report.renderer=await page.evaluate(()=>window.__petStatus.mode);assert.equal(report.renderer,'cubism');
  assert.equal(await page.evaluate(()=>Boolean(window.__petDebug)),false);
  const start=await page.evaluate(()=>window.__petStatus.read().frames);await delay(300);
  report.framesAdvance=await page.evaluate(()=>window.__petStatus.read().frames)>start;assert.ok(report.framesAdvance);
  report.renderedPixels=await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{const c=document.getElementById('pet'),g=c.getContext('webgl'),p=new Uint8Array(c.width*c.height*4);g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,p);let visible=0;for(let i=3;i<p.length;i+=4)if(p[i]>20)visible++;resolve(visible);})));assert.ok(report.renderedPixels>10000);
  original=await ipc('read_preferences');
  await fs.writeFile(path.join(output,'original-preferences.json'),JSON.stringify(original,null,2));
  alternate={...original,size:460,intensity:.8,alwaysOnTop:false,clickThrough:false,showKeys:true,idleEnabled:false};
  await ipc('save_preferences',{prefs:alternate});assert.deepEqual(await ipc('read_preferences'),alternate);report.settingsPersisted=true;
  // Restore the desktop immediately, before any human-input wait. A closed
  // observer must never leave the pet behind another window with test values.
  await ipc('save_preferences',{prefs:original});assert.deepEqual(await ipc('read_preferences'),original);
  report.preferencesRestored=true;
  await ipc('show_settings');
  let settingsPage;
  for(let n=0;n<100;n++){settingsPage=browser.contexts()[0].pages().find(p=>p.url().includes('?settings'));if(settingsPage)break;await delay(100);}
  if(!settingsPage)throw new Error('Settings WebView did not open');
  await settingsPage.waitForSelector('#size',{timeout:10000});
  report.settingsRendered=true;
  report.windows=await ipc('window_diagnostics');
  const contained=w=>w.x>=w.work.x&&w.y>=w.work.y&&w.x+w.width<=w.work.x+w.work.width&&w.y+w.height<=w.work.y+w.work.height;
  const intersection=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  assert.ok(report.windows.pet.visible&&!report.windows.pet.minimized);
  assert.ok(contained(report.windows.pet),'Pet is outside the monitor work area');
  assert.ok(contained(report.windows.settings),'Settings are outside the monitor work area');
  assert.equal(report.windows.pet.alwaysOnTop,original.alwaysOnTop);
  report.windowOverlapPixels=intersection(report.windows.pet,report.windows.settings);
  assert.equal(report.windowOverlapPixels,0,'Settings cover the pet');
  await ipc('show_settings');
  assert.deepEqual(await ipc('window_diagnostics'),report.windows);
  report.repeatedSettingsOpen=true;
  await page.screenshot({path:path.join(output,'pet-webview.png'),omitBackground:true});
  await settingsPage.screenshot({path:path.join(output,'settings-webview.png')});
  report.metricsBefore=await ipc('input_metrics');
  await fs.writeFile(path.join(output,'ready.json'),JSON.stringify({ready:true,title:'秧秧玄翎 · 设置'}));console.log('READY: native renderer is running; awaiting separate OS input.');
  const deadline=mode==='visibility'?Date.now():Date.now()+Number(process.env.PET_QA_WAIT_MS||180000);
  while(Date.now()<deadline){
    try{await fs.access(stop);break;}catch{}
    const s=await page.evaluate(()=>{const r=window.__petStatus.read();return {frames:r.frames,keyboardPress:r.snapshot.keyboardPress,mousePress:r.snapshot.mousePress,keyboardBounce:r.snapshot.keyboardBounce,mouseBounce:r.snapshot.mouseBounce};});
    if(s.keyboardPress>.1&&s.mousePress===0)report.keyboardOnlyObserved=true;
    if(s.mousePress>.1&&s.keyboardPress===0)report.mouseOnlyObserved=true;
    if(s.mousePress>.1&&s.keyboardPress>.1)report.bothObserved=true;
    await delay(25);
  }
  report.metricsAfter=await ipc('input_metrics');
  if(mode!=='visibility'){
    assert.ok(report.keyboardOnlyObserved,'No native keyboard-only frame observed');
    assert.ok(report.mouseOnlyObserved,'No native mouse-only frame observed');
    assert.ok(report.metricsAfter.keyboardPresses>report.metricsBefore.keyboardPresses);
    assert.ok(report.metricsAfter.mousePresses>report.metricsBefore.mousePresses);
  }
  await ipc('save_preferences',{prefs:original});assert.deepEqual(await ipc('read_preferences'),original);report.preferencesRestored=true;
  await delay(300);assert.deepEqual(await page.evaluate(()=>window.__petStatus.read().preferences),original);
  assert.deepEqual(report.errors,[]);report.pass=true;
}catch(e){report.errors.push(e.message);throw e;}
finally{
  if(original&&page){try{await ipc('save_preferences',{prefs:original});report.preferencesRestored=true;}catch{}}
  if(original&&alternate&&!report.preferencesRestored&&process.env.APPDATA){
    try{
      const prefsFile=path.join(process.env.APPDATA,'local.habai182.yangyang-xuanling/preferences.json');
      const current=JSON.parse(await fs.readFile(prefsFile,'utf8'));
      if(Object.keys(alternate).every(key=>current[key]===alternate[key])){
        await fs.writeFile(prefsFile,JSON.stringify(original,null,2));report.persistedPreferencesRecovered=true;
      }
    }catch{}
  }
  await fs.writeFile(path.join(output,'windows-report.json'),JSON.stringify(report,null,2));
  if(page){try{await ipc('quit_app');}catch{}}
  if(browser)await browser.close();if(!child.killed)child.kill();
}
console.log(mode==='visibility'?'Windows visibility, non-overlap and preference checks passed; physical keyboard remains separate.':'Windows native rendering, OS input, and preference checks passed.');
