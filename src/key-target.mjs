// Physical key positions. Front-facing pet: typist left projects screen right.
const rows=[
 ['Escape','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'],
 ['Backquote','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6','Digit7','Digit8','Digit9','Digit0','Minus','Equal','Backspace'],
 ['Tab','KeyQ','KeyW','KeyE','KeyR','KeyT','KeyY','KeyU','KeyI','KeyO','KeyP','BracketLeft','BracketRight','Backslash'],
 ['CapsLock','KeyA','KeyS','KeyD','KeyF','KeyG','KeyH','KeyJ','KeyK','KeyL','Semicolon','Quote','Enter'],
 ['ShiftLeft','KeyZ','KeyX','KeyC','KeyV','KeyB','KeyN','KeyM','Comma','Period','Slash','ShiftRight'],
 ['ControlLeft','MetaLeft','AltLeft','Space','AltRight','MetaRight','ContextMenu','ControlRight']
];
export function keyTarget(code){
 if(code==='Space')return {x:-.25,y:0,zone:'space'};
 for(let r=0;r<rows.length;r++){const c=rows[r].indexOf(code);if(c<0)continue;
  const left=c<(r===0?6:r===5?3:6),far=r<=2;
  return {x:left?.65:-.85,y:far?1:.35,zone:`${left?'left':'right'}-${far?'far':'near'}`};
 }
 if(/^Numpad|^Arrow|^(Insert|Delete|Home|End|PageUp|PageDown|PrintScreen|ScrollLock|Pause)$/.test(code)){
  const far=/Up|Home|PageUp|Divide|Multiply|Subtract|[789]$/.test(code);return {x:-.85,y:far?1:.35,zone:far?'right-far':'right-near'};
 }
 return {x:0,y:.35,zone:'left-near'};
}

// Exact damped-spring solution, stable across different frame rates.
export class Spring {
 constructor(x=0){this.x=x;this.v=0;}
 step(target,dt,omega=24,zeta=.48){
  if(dt<=0)return this.x;
  const w=omega*Math.sqrt(1-zeta*zeta),a=zeta*omega,d=this.x-target;
  const c=Math.cos(w*dt),s=Math.sin(w*dt),e=Math.exp(-a*dt),b=(this.v+a*d)/w;
  this.x=target+e*(d*c+b*s);this.v=e*((-a*d+w*b)*c+(-a*b-w*d)*s);
  if(Math.abs(this.x-target)<1e-5&&Math.abs(this.v)<1e-4){this.x=target;this.v=0;}
  return this.x;
 }
 kick(v){this.v+=v;}
}
