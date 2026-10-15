import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PET_PLAYWRIGHT_PACKAGE || 'playwright');
const out=path.resolve(process.env.PET_QA_OUTPUT || '../../work/browser-qa');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1100,height:760}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:1437/');await page.waitForFunction(()=>window.__petDebug);
  const renderer=await page.evaluate(()=>window.__petDebug.mode);assert.equal(renderer,'cubism');
  await page.screenshot({path:path.join(out,'preview-light.png')});
  const first=await page.evaluate(()=>window.__petDebug.frames());await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>window.__petDebug.frames())>first);
  const frame={keysHeld:1,mouseDown:false,newPress:true,newMousePress:false,keyLabel:'A',reach:.6,cursorX:0,cursorY:0};
  await page.evaluate(f=>window.__petDebug.input(f),frame);await page.waitForTimeout(30);
  let s=await page.evaluate(()=>window.__petDebug.snapshot());assert.equal(s.keyboardPress,1);assert.equal(s.mousePress,0);assert.equal(await page.locator('#key').innerText(),'A');
  await page.screenshot({path:path.join(out,'keyboard-only.png')});
  await page.evaluate(f=>window.__petDebug.input({...f,newPress:false}),frame);await page.waitForTimeout(600);s=await page.evaluate(()=>window.__petDebug.snapshot());assert.equal(s.keyboardBounce,0);assert.equal(s.keyboardPress,1);
  await page.evaluate(f=>window.__petDebug.input({...f,keysHeld:0,mouseDown:true,newPress:false,newMousePress:true,keyLabel:''}),frame);await page.waitForTimeout(180);s=await page.evaluate(()=>window.__petDebug.snapshot());assert.equal(s.keyboardPress,0);assert.equal(s.mousePress,1);
  await page.screenshot({path:path.join(out,'mouse-only.png')});
  await page.evaluate(f=>window.__petDebug.input({...f,keysHeld:0,mouseDown:false,newPress:false,newMousePress:false}),frame);
  await page.locator('#toggleGround').click();await page.screenshot({path:path.join(out,'preview-dark.png')});
  await page.goto('http://127.0.0.1:1437/?settings');await page.locator('#size').waitFor();await page.screenshot({path:path.join(out,'settings.png')});
  assert.equal(await page.locator('#showKeys').isChecked(),true);assert.equal(await page.locator('#clickThrough').isChecked(),false);assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(out,'browser-report.json'),JSON.stringify({pass:true,renderer,raf:true,keyboardOnly:true,mouseOnly:true,heldKeySettles:true,overlay:true,settings:true,errors,windowsGlobalInputVerified:false},null,2));
  console.log('Browser rendering and input checks passed; native global input remains separate.');
}catch(error){console.error('Browser QA failed:',error.message);const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0]){await pages[0].screenshot({path:path.join(out,'failure.png')});console.error((await pages[0].locator('body').innerText()).slice(0,2500));}throw error;}finally{await browser.close();}
