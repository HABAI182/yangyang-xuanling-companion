import './style.css';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {InputState} from './state.mjs';
import {LayerRenderer,PetRenderer} from './renderer';

type Prefs={size:number,intensity:number,alwaysOnTop:boolean,clickThrough:boolean,showKeys:boolean,idleEnabled:boolean};
type Frame={keysHeld:number,mouseDown:boolean,newPress:boolean,newMousePress:boolean,keyLabel:string,reach:number,cursorX:number,cursorY:number};
const desktop=Boolean((window as any).__TAURI_INTERNALS__);
const settings=new URLSearchParams(location.search).has('settings');
const app=document.querySelector<HTMLDivElement>('#app')!;
let prefs:Prefs={size:420,intensity:1,alwaysOnTop:true,clickThrough:false,showKeys:true,idleEnabled:true};
const call=<T>(name:string,args?:Record<string,unknown>)=>invoke<T>(name,args);
function toast(message:string){const el=document.querySelector<HTMLElement>('#notice');if(el){el.textContent=message;el.classList.add('visible');}}

async function settingsPage(){
  document.body.className='settings-page';
  if(desktop)prefs=await call<Prefs>('read_preferences');
  app.innerHTML=`<div class="settings-shell"><header><span class="eyebrow">DESKTOP COMPANION</span><h1>秧秧玄翎</h1><p>让桌面多一点陪伴</p></header><section><h2>外观与动作</h2><label class="range-label" for="size">桌宠大小 <output id="sizeValue"></output></label><input id="size" type="range" min="260" max="720" step="10"><label class="range-label" for="intensity">动作幅度 <output id="intensityValue"></output></label><input id="intensity" type="range" min="0" max="1.6" step="0.05"><label class="toggle"><span>空闲时自动眨眼</span><input id="idleEnabled" type="checkbox"></label><label class="toggle"><span>显示最近一个按键</span><input id="showKeys" type="checkbox"></label></section><section><h2>桌面</h2><label class="toggle"><span>始终置顶</span><input id="alwaysOnTop" type="checkbox"></label><label class="toggle"><span>鼠标穿透</span><input id="clickThrough" type="checkbox"></label><p class="hint">穿透后可从托盘找回，或按 Ctrl + Alt + Y。</p><button id="reset" class="secondary">找回桌宠</button></section><footer><span>0.1.1 · Live2D 基础预览</span><span id="saved" role="status">设置已载入</span></footer><p id="notice" role="alert"></p></div>`;
  let timer:ReturnType<typeof setTimeout>;let sequence=0;
  const controls=['size','intensity','idleEnabled','showKeys','alwaysOnTop','clickThrough'] as const;
  function render(){for(const key of controls){const input=document.getElementById(key) as HTMLInputElement;if(input.type==='checkbox')input.checked=Boolean(prefs[key]);else input.value=String(prefs[key]);}
    document.getElementById('sizeValue')!.textContent=`${Math.round(prefs.size/420*100)}%`;document.getElementById('intensityValue')!.textContent=`${Math.round(prefs.intensity*100)}%`;}
  async function save(){clearTimeout(timer);const revision=++sequence;const snapshot={...prefs};document.getElementById('saved')!.textContent='保存中…';
    try{if(desktop)await call('save_preferences',{prefs:snapshot});else localStorage.setItem('yangyang-preview-preferences',JSON.stringify(snapshot));if(revision===sequence)document.getElementById('saved')!.textContent='已保存';}
    catch(e){if(revision===sequence){document.getElementById('saved')!.textContent='未保存';toast(String(e));if(desktop){prefs=await call<Prefs>('read_preferences');render();}}}}
  for(const key of controls){const input=document.getElementById(key) as HTMLInputElement;input.addEventListener('input',()=>{(prefs as any)[key]=input.type==='checkbox'?input.checked:Number(input.value);render();clearTimeout(timer);timer=setTimeout(save,180);});input.addEventListener('change',save);}
  document.getElementById('reset')!.addEventListener('click',async()=>{if(desktop){await call('reset_pet');prefs=await call<Prefs>('read_preferences');render();}else toast('浏览器预览中无需找回窗口');});render();
}

async function petPage(){
  if(!desktop)document.body.className='browser-preview';
  app.innerHTML=`<div class="pet-shell"><canvas id="pet" aria-label="秧秧玄翎桌宠"></canvas><div id="key" class="key-bubble" aria-hidden="true"></div><div class="pet-tools"><span class="stage-label">制作预览</span><button id="drag" title="拖动桌宠" aria-label="拖动桌宠">⠿</button><button id="settings" title="设置" aria-label="设置">⚙</button></div><p id="notice" role="alert"></p></div>${desktop?'':`<aside class="preview-bar"><div><strong>秧秧玄翎</strong><span id="rendererMode">分层动作预览</span></div><div class="demo-actions"><button id="demoKeyboard">键盘</button><button id="demoMouse">鼠标</button><button id="demoBoth">同时按下</button><button id="toggleGround">切换背景</button><a href="?settings">设置</a></div><p>在此页按键或点击可预览；Windows 程序使用原生全局输入。</p></aside>`}`;
  const canvas=document.getElementById('pet') as HTMLCanvasElement;const state=new InputState();const gaze={x:0,y:0};let renderer:PetRenderer;let mode='layered-preview';
  const config=await (await fetch('/assets/model-config.json')).json();
  if(config.entry){try{
    // The Framework evaluates Core-backed constants at module initialization.
    // Load the vendor Core before dynamically importing the Framework adapter.
    if(typeof (window as any).Live2DCubismCore==='undefined')await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/live2d/live2dcubismcore.min.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Core 加载失败'));document.head.append(script);});
    const {CubismRenderer}=await import('./cubism');const live=new CubismRenderer(canvas,config);await live.load();renderer=live;mode='cubism';
  }catch(e){throw new Error(`Live2D 模型加载失败：${String(e)}`);}}
  else{const layered=new LayerRenderer(canvas);await layered.load();renderer=layered;}
  const input=(frame:Frame)=>{state.update(frame,performance.now());gaze.x=frame.cursorX;gaze.y=frame.cursorY;};
  const empty:Frame={keysHeld:0,mouseDown:false,newPress:false,newMousePress:false,keyLabel:'',reach:0,cursorX:0,cursorY:0};
  if(desktop){prefs=await call<Prefs>('read_preferences');await listen<Frame>('native-input',event=>input(event.payload));await listen<Prefs>('preferences',event=>{prefs=event.payload;});}
  else{
    const held=new Set<string>();let mouseHeld=false;let reach=0;
    const local=(extra:Partial<Frame>={})=>input({...empty,keysHeld:held.size,mouseDown:mouseHeld,reach,cursorX:gaze.x,cursorY:gaze.y,...extra});
    window.addEventListener('keydown',e=>{if(e.repeat)return;held.add(e.code);reach=/Key[QWERTASDFGZXCVB]|Digit[1-5]/.test(e.code)?.6:-.6;local({newPress:true,keyLabel:e.code==='Space'?'Space':e.key.length===1?e.key.toUpperCase():e.key});});
    window.addEventListener('keyup',e=>{held.delete(e.code);local();});window.addEventListener('blur',()=>{held.clear();mouseHeld=false;local();});
    canvas.addEventListener('pointerdown',()=>{mouseHeld=true;local({newMousePress:true});});window.addEventListener('pointerup',()=>{mouseHeld=false;local();});
    window.addEventListener('pointermove',e=>{gaze.x=Math.max(-1,Math.min(1,e.clientX/innerWidth*2-1));gaze.y=Math.max(-1,Math.min(1,e.clientY/innerHeight*2-1));});
    function demo(kind:string){local({keysHeld:kind!=='mouse'?1:0,mouseDown:kind!=='keyboard',newPress:kind!=='mouse',newMousePress:kind!=='keyboard',keyLabel:'A',reach:.6});setTimeout(()=>local(),650);}
    document.getElementById('demoKeyboard')!.addEventListener('click',()=>demo('keyboard'));document.getElementById('demoMouse')!.addEventListener('click',()=>demo('mouse'));document.getElementById('demoBoth')!.addEventListener('click',()=>demo('both'));document.getElementById('toggleGround')!.addEventListener('click',()=>document.body.classList.toggle('dark'));
    document.getElementById('rendererMode')!.textContent=mode==='cubism'?'Cubism 运行预览':'分层动作预览';
  }
  document.getElementById('settings')!.addEventListener('click',()=>desktop?call('show_settings'):location.assign('?settings'));
  document.getElementById('drag')!.addEventListener('pointerdown',e=>{if(e.button===0&&desktop)call('drag_pet').catch(e=>toast(String(e)));});
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(desktop)call('show_settings');});
  const key=document.getElementById('key')!;let frames=0;let active=true;let frameRequest=0;
  function draw(now:number){if(!active)return;const snapshot=state.snapshot(now);renderer.draw(now,snapshot,gaze,prefs.intensity,prefs.idleEnabled);key.textContent=prefs.showKeys?snapshot.label:'';key.classList.toggle('shown',prefs.showKeys&&Boolean(snapshot.label));frames++;frameRequest=requestAnimationFrame(draw);}
  frameRequest=requestAnimationFrame(draw);if(desktop)await call('pet_ready');
  if(import.meta.env.DEV)(window as any).__petDebug={input,snapshot:()=>state.snapshot(performance.now()),frames:()=>frames,mode,preferences:()=>({...prefs})};
  // Read-only status for local WebView diagnostics. No input injection or history.
  Object.defineProperty(window,'__petStatus',{value:Object.freeze({mode,read:()=>({frames,snapshot:state.snapshot(performance.now()),preferences:{...prefs},canvas:{width:canvas.width,height:canvas.height}})}),writable:false});
  window.addEventListener('beforeunload',()=>{active=false;cancelAnimationFrame(frameRequest);renderer.dispose();});
}
(settings?settingsPage():petPage()).catch(async e=>{toast(String(e));if(desktop){await call('pet_ready').catch(()=>{});}});
