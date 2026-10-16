import './style.css';
import {listen} from '@tauri-apps/api/event';
import {InputState} from './state.mjs';
import {keyTarget} from './key-target.mjs';
import {KeyOverlay} from './key-overlay.mjs';
import {Companion} from './companion.mjs';
import {PetRenderer} from './renderer';
import {settingsPage,menuPage} from './settings';
import {renderEmotion} from './effects';
import {desktop,prefs,call,notify,onPreferences,initializePreferences,onAction,escapeHtml} from './bridge';

type Frame={keysHeld:number,mouseDown:boolean,newPress:boolean,newMousePress:boolean,keyLabel:string,reach:number,targetX?:number,targetY?:number,targetZone?:string,cursorX:number,cursorY:number,presses?:string[],repeats?:string[],hovering?:boolean};
const app=document.querySelector<HTMLDivElement>('#app')!;
async function petPage(){
 if(!desktop)document.body.className='browser-preview';
 app.innerHTML=`<div class="pet-shell"><canvas id="pet" aria-label="秧秧玄翎桌宠"></canvas><div id="emotion" class="emotion-layer"></div><div id="speech" class="speech-bubble" role="status"></div><div id="key" class="key-bubbles" aria-hidden="true"></div><div class="pet-tools"><button id="drag" title="拖动桌宠" aria-label="拖动桌宠">⠿</button><button id="interact" title="互动菜单" aria-label="互动菜单">✧</button><button id="settings" title="设置" aria-label="设置">⚙</button></div><p id="notice" role="alert"></p></div>${desktop?'':`<aside class="preview-bar"><span class="eyebrow">A LITTLE BREEZE</span><h1>秧秧玄翎</h1><p id="rendererMode">正在载入 Live2D</p><div class="demo-actions"><button id="demoKeyboard">键盘</button><button id="demoMouse">鼠标</button><button id="demoBoth">同时按下</button><button id="demoSleepy">困倦</button><button id="demoCheer">加油</button><button id="demoReset">日常</button><button id="toggleGround">切换背景</button><a href="?settings" target="yangyang-settings">设置</a><a href="?menu" target="yangyang-menu">互动菜单</a></div><p>在此页按键或点击可预览<br>Windows 程序使用原生全局输入</p></aside>`}`;
 const canvas=document.getElementById('pet') as HTMLCanvasElement,state=new InputState(),overlay=new KeyOverlay(),companion=new Companion();
 const gaze={x:0,y:0};let renderer:PetRenderer;const config=await(await fetch('/assets/model-config.json')).json();
 if(typeof (window as any).Live2DCubismCore==='undefined')await new Promise<void>((resolve,reject)=>{const s=document.createElement('script');s.src='/vendor/live2d/live2dcubismcore.min.js';s.onload=()=>resolve();s.onerror=()=>reject(new Error('Core 加载失败'));document.head.append(s);});
 const {CubismRenderer}=await import('./cubism');const live=new CubismRenderer(canvas,config);await live.load();renderer=live;
 const shell=document.querySelector<HTMLElement>('.pet-shell')!,emotion=document.getElementById('emotion')!,speech=document.getElementById('speech')!,key=document.getElementById('key')!;
 let hovering=false,hoverSince=0,lastKeyIds='',lastExpression='',frames=0,lastDraw=0,active=true,frameRequest=0,lastSound=0;
 const empty:Frame={keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,keyLabel:'',reach:0,cursorX:0,cursorY:0};
 function input(frame:Frame){
  const now=performance.now();if(!prefs.inputEnabled){frame={...frame,keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,presses:[],repeats:[]};}
  if(prefs.inputMode==='keyboard_only')frame={...frame,mouseDown:false,newMousePress:false};
  state.update(frame,now);const moved=Math.abs(frame.cursorX-gaze.x)+Math.abs(frame.cursorY-gaze.y)>.015;
  gaze.x=frame.cursorX;gaze.y=frame.cursorY;
  if(prefs.inputEnabled&&(frame.keysHeld||frame.mouseDown||frame.newPress||frame.newMousePress||moved))companion.activity(now);
  if(frame.newPress)overlay.add(frame.presses?.length?frame.presses:[frame.keyLabel],now,prefs);
  if(frame.repeats?.length)overlay.add(frame.repeats,now,prefs,true);
  if(frame.newPress&&prefs.sfxEnabled&&desktop&&now-lastSound>70){lastSound=now;void call('play_sound');}
  if(Boolean(frame.hovering)!==hovering){hovering=Boolean(frame.hovering);hoverSince=now;}
 }
 const perform=(id:string)=>{if(companion.action(id,performance.now(),prefs)&&prefs.sfxEnabled&&desktop)void call('play_sound');};await onAction(perform);
 onPreferences(p=>{if(!p.showKeys)overlay.clear();if(!p.inputEnabled)state.update(empty,performance.now());if(!desktop){shell.style.width=`${p.size}px`;shell.style.height=`${p.size*1.025}px`;}});
 if(desktop)await listen<Frame>('native-input',e=>input(e.payload));
 else{
  const held=new Set<string>();let mouseHeld=false,reach=0;
  const local=(extra:Partial<Frame>={})=>{const t=keyTarget([...held].at(-1)??"Space");input({...empty,keysHeld:held.size,mouseDown:mouseHeld,reach,targetX:t.x,targetY:t.y,targetZone:t.zone,cursorX:gaze.x,cursorY:gaze.y,...extra});};
  window.addEventListener('keydown',e=>{if(e.repeat){local({repeats:[e.code==='Space'?'Space':e.key.length===1?e.key.toUpperCase():e.key]});return;}held.delete(e.code);held.add(e.code);reach=/Key[QWERTASDFGZXCVB]|Digit[1-5]/.test(e.code)?.6:-.6;local({newPress:true,keyLabel:e.code==='Space'?'Space':e.key.length===1?e.key.toUpperCase():e.key});});
  window.addEventListener('keyup',e=>{held.delete(e.code);local();});window.addEventListener('blur',()=>{held.clear();mouseHeld=false;local();});
  canvas.addEventListener('pointerdown',e=>{if(e.button===0){mouseHeld=true;local({newMousePress:true});}});window.addEventListener('pointerup',()=>{mouseHeld=false;local();});
  canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();local({cursorX:Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),cursorY:Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1)),hovering:true});});canvas.addEventListener('pointerleave',()=>local({hovering:false}));
  function demo(kind:string){local({keysHeld:kind!=='mouse'?1:0,mouseDown:kind!=='keyboard',newPress:kind!=='mouse',newMousePress:kind!=='keyboard',keyLabel:'A',reach:.6});setTimeout(()=>local(),650);}
  for(const [id,kind] of [['demoKeyboard','keyboard'],['demoMouse','mouse'],['demoBoth','both']])document.getElementById(id)!.onclick=()=>demo(kind);
  document.getElementById('demoSleepy')!.onclick=()=>perform('sleepy');document.getElementById('demoCheer')!.onclick=()=>perform('cheer');document.getElementById('demoReset')!.onclick=()=>perform('default');document.getElementById('toggleGround')!.onclick=()=>document.body.classList.toggle('dark');document.getElementById('rendererMode')!.textContent='Cubism 运行预览 · 精修版';
 }
 document.getElementById('settings')!.onclick=()=>{if(desktop)void call('show_settings').catch(e=>notify(String(e)));else window.open('?settings','yangyang-settings');};
 const openMenu=()=>{if(desktop)void call('show_menu').catch(e=>notify(String(e)));else window.open('?menu','yangyang-menu','width=356,height=670');};
 document.getElementById('interact')!.onclick=openMenu;canvas.addEventListener('contextmenu',e=>{e.preventDefault();openMenu();});
 document.getElementById('drag')!.onpointerdown=e=>{if(e.button===0&&desktop)void call('drag_pet').catch(e=>notify(String(e)));};
 canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();if(e.clientY-r.top<r.height*.78)companion.touch(performance.now(),prefs);});
 function draw(now:number){
  if(!active)return;frameRequest=requestAnimationFrame(draw);if(now-lastDraw<1000/prefs.fps-.7)return;lastDraw=now;
  const snapshot=state.snapshot(now,prefs.handSpeed),mood=companion.read(now,prefs),level=prefs.motion==='off'?0:prefs.motion==='low'?.35:1;
  const mouseEnabled=prefs.inputEnabled&&prefs.inputMode==='keyboard_mouse';const look=prefs.cursorFollow?gaze:{x:0,y:0};renderer.draw(now,snapshot,look,prefs.intensity,prefs.idleEnabled,{keyboardScale:prefs.keyboardScale,mouseScale:mouseEnabled?prefs.mouseScale:0,headElasticity:prefs.headElasticity,motionLevel:level,expression:mood.expression,motion:mood.motion,motionAge:mood.age});
  if(lastExpression!==mood.expression){renderEmotion(emotion,mood.expression);lastExpression=mood.expression;}speech.textContent=mood.bubble;speech.classList.toggle('shown',Boolean(mood.bubble));
  const badges=overlay.read(now,prefs),ids=badges.map(x=>x.id).join(',');if(ids!==lastKeyIds){key.innerHTML=badges.map(x=>`<kbd>${escapeHtml(x.label)}</kbd>`).join('');lastKeyIds=ids;}
  shell.style.opacity=prefs.hoverFade&&hovering&&now-hoverSince>prefs.hoverDelay?String(prefs.hoverOpacity):'1';shell.dataset.motion=prefs.motion;frames++;
 }
 frameRequest=requestAnimationFrame(draw);if(desktop)await call('pet_ready');
 if(import.meta.env.DEV)(window as any).__petDebug={input,snapshot:()=>state.snapshot(performance.now(),prefs.handSpeed),frames:()=>frames,mode:'cubism',preferences:()=>({...prefs}),action:perform,companion:()=>companion.read(performance.now(),prefs),badges:()=>overlay.read(performance.now(),prefs),geometry:()=>live.diagnostics()};
 Object.defineProperty(window,'__petStatus',{value:Object.freeze({mode:'cubism',read:()=>({frames,snapshot:state.snapshot(performance.now(),prefs.handSpeed),preferences:{...prefs},expression:companion.read(performance.now(),prefs).expression,model:live.diagnostics(),canvas:{width:canvas.width,height:canvas.height}})}),writable:false});
 window.addEventListener('beforeunload',()=>{active=false;cancelAnimationFrame(frameRequest);renderer.dispose();});
}
(async()=>{await initializePreferences();const query=new URLSearchParams(location.search);if(query.has('settings'))await settingsPage(app);else if(query.has('menu'))menuPage(app);else await petPage();})().catch(async e=>{notify(String(e));if(desktop)await call('pet_ready').catch(()=>{});});
