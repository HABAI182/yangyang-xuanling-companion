import {HitTesting} from './hit-testing';
import {loadImage} from './renderer';
import {EDITION,EDITION_LABEL} from './edition';
import {desktop,prefs,call,notify,onPreferences} from './bridge';

/** One transparent raster, drawn once. No Cubism, input listener or animation loop. */
export async function staticPetPage(app:HTMLElement){
 if(!desktop)document.body.className='browser-preview';
 app.innerHTML=`<div class="pet-shell static-pet"><canvas id="pet" aria-label="秧秧玄翎静态桌面版"></canvas><div class="pet-tools"><button id="drag" title="拖动桌宠" aria-label="拖动桌宠">⠿</button><button id="interact" title="桌面菜单" aria-label="桌面菜单">✧</button><button id="settings" title="设置" aria-label="设置">⚙</button></div><p id="notice" role="alert"></p></div>${desktop?'':`<aside class="preview-bar"><span class="eyebrow">A LITTLE BREEZE</span><h1>秧秧玄翎</h1><p>${EDITION_LABEL} · 安静待在桌面</p><p>保留拖动、缩放、置顶和透明区域穿透<br>画面保持静止</p><div class="demo-actions"><a href="?settings">设置</a><a href="?menu">桌面菜单</a></div></aside>`}`;
 const shell=app.querySelector<HTMLElement>('.pet-shell')!,canvas=app.querySelector<HTMLCanvasElement>('canvas')!;
 const image=await loadImage('/assets/static/yangyang-neutral.png');
 canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.style.height='100%';
 const context=canvas.getContext('2d');if(!context)throw Error('静态画面初始化失败');
 context.drawImage(image,0,0);
 const hitTesting=new HitTesting(shell);let maskTimer:ReturnType<typeof setTimeout>;
 const scheduleMask=()=>{clearTimeout(maskTimer);maskTimer=setTimeout(()=>hitTesting.sample(performance.now()),80);};
 const apply=()=>{if(!desktop){shell.style.width=`${prefs.size}px`;shell.style.height=`${prefs.size*1.025}px`;}scheduleMask();};
 const unsubscribe=onPreferences(apply),resize=new ResizeObserver(scheduleMask);
 resize.observe(shell);resize.observe(app.querySelector('.pet-tools')!);
 const notice=new MutationObserver(scheduleMask);notice.observe(app.querySelector('#notice')!,{childList:true,attributes:true,subtree:true});
 apply();void document.fonts.ready.then(scheduleMask);
 const menu=()=>desktop?call('show_menu'):Promise.resolve(window.open('?menu','yangyang-static-menu','width=356,height=350'));
 app.querySelector<HTMLButtonElement>('#settings')!.onclick=()=>{if(desktop)void call('show_settings').catch(e=>notify(String(e)));else window.open('?settings','yangyang-static-settings');};
 app.querySelector<HTMLButtonElement>('#interact')!.onclick=()=>void menu().catch(e=>notify(String(e)));
 canvas.oncontextmenu=e=>{e.preventDefault();void menu().catch(e=>notify(String(e)));};
 app.querySelector<HTMLButtonElement>('#drag')!.onpointerdown=e=>{if(e.button===0&&desktop)void call('drag_pet').catch(e=>notify(String(e)));};
 Object.defineProperty(window,'__petStatus',{value:Object.freeze({mode:'static',edition:EDITION,read:()=>({edition:EDITION,mode:'static',frames:1,expression:'default',preferences:{...prefs},hitMask:hitTesting.read(),canvas:{width:canvas.width,height:canvas.height},animationLoop:false})}),writable:false});
 if(desktop)await call('pet_ready');
 window.addEventListener('beforeunload',()=>{resize.disconnect();notice.disconnect();unsubscribe();clearTimeout(maskTimer);});
}
