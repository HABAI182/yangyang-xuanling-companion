/** Build-time capability policy; restored preferences cannot unlock an edition. */
export function restrictEditionPreferences(p,edition){
 if(edition==='full')return p;
 const restricted={...p,bubblesEnabled:false,touchEnabled:false,idleSeconds:0,sleepMinutes:0,
  shortcuts:Array.isArray(p.shortcuts)?p.shortcuts.map(s=>({...s,enabled:false})):[]};
 if(edition!=='static')return restricted;
 return {...restricted,inputEnabled:false,showKeys:false,idleEnabled:false,cursorFollow:false,
  gazeReturnEnabled:false,gamepadEnabled:false,sfxEnabled:false,hoverFade:false,
  intensity:0,keyboardScale:0,mouseScale:0,headElasticity:0,motion:'off'};
}
