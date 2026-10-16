export const defaults = Object.freeze({
  size:420,intensity:1,alwaysOnTop:true,clickThrough:false,showKeys:true,idleEnabled:true,
  theme:'system',accent:'blue',density:'comfortable',textScale:1,motion:'full',fps:60,
  keyboardScale:1,mouseScale:1,handSpeed:1,headElasticity:.6,cursorFollow:true,gazeScale:2.1,gazeReturnEnabled:true,gazeIdleSeconds:3,
  keyBubbleScale:1.3,speechBubbleScale:1,
  multiKeys:false,maxKeys:1,repeatKeys:false,inputEnabled:true,inputMode:'keyboard_mouse',
  bubblesEnabled:true,bubbleSeconds:4,idleSeconds:90,sleepMinutes:10,touchEnabled:true,
  fullscreenHide:false,fullscreenExceptions:[],edgeSnap:true,hoverFade:false,hoverDelay:500,hoverOpacity:.4,
  gamepadEnabled:false,sfxEnabled:false,sfxVolume:.25,autostart:false,shortcuts:[],
});
export const expressions = [
 ['default','日常'],['smile','开心'],['think','思考'],['surprised','惊讶'],['resigned','无奈'],
 ['blush','脸红'],['sleepy','困倦'],['serious','认真'],['laugh','大笑'],['angry','生气'],
 ['pout','鼓气'],['shy','害羞'],['wronged','委屈'],['proud','得意'],['confused','疑惑'],
 ['starry','星光'],['wind','听风'],
];
export const motions=[['nod','轻轻点头'],['bird','和小鸟玩'],['cheer','为你加油']];
export const actionIds=new Set([...expressions,...motions].map(x=>x[0]));
export function normalizePreferences(raw={}){
 const p={...defaults,...raw};
 const ranges={size:[210,840],intensity:[0,1.6],textScale:[.85,1.3],keyboardScale:[0,1.6],mouseScale:[0,1.6],handSpeed:[.5,2],headElasticity:[0,1.5],gazeScale:[.5,3.2],gazeIdleSeconds:[1,15],keyBubbleScale:[.8,1.8],speechBubbleScale:[.8,1.6],maxKeys:[1,6],bubbleSeconds:[2,12],hoverDelay:[250,1500],hoverOpacity:[.2,.8],sfxVolume:[0,1]};
 for(const [k,[lo,hi]] of Object.entries(ranges))p[k]=Number.isFinite(p[k])?Math.min(hi,Math.max(lo,p[k])):defaults[k];
 p.maxKeys=Math.round(p.maxKeys);
 for(const k of Object.keys(defaults))if(typeof defaults[k]==='boolean')p[k]=typeof p[k]==='boolean'?p[k]:defaults[k];
 for(const [k,values] of Object.entries({theme:['system','light','dark'],accent:['blue','violet','sage','coral'],density:['comfortable','compact'],motion:['full','low','off'],fps:[30,60],inputMode:['keyboard_mouse','keyboard_only'],idleSeconds:[0,60,90,180],sleepMinutes:[0,5,10,15]}))if(!values.includes(p[k]))p[k]=defaults[k];
 p.fullscreenExceptions=Array.isArray(p.fullscreenExceptions)?[...new Set(p.fullscreenExceptions.filter(x=>typeof x==='string'&&/^[^\\/:*?"<>|]{1,120}\.exe$/i.test(x)).map(x=>x.toLowerCase()))].slice(0,32):[];
 p.shortcuts=Array.isArray(p.shortcuts)?p.shortcuts.slice(0,25):[];
 return p;
}
export function applyTheme(p){
 const d=document.documentElement;d.dataset.theme=p.theme;d.dataset.density=p.density;
 d.style.setProperty('--accent',({blue:'#507db9',violet:'#8475b5',sage:'#648d83',coral:'#c77e87'})[p.accent]);
 d.style.setProperty('--text-scale',String(p.textScale));
 d.style.setProperty('--key-bubble-scale',String(p.keyBubbleScale));
 d.style.setProperty('--speech-bubble-scale',String(p.speechBubbleScale));
}
