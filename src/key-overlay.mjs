const allowed=/^(?:[A-Z0-9]|F(?:[1-9]|1[0-9]|2[0-4])|Enter|Backspace|Space|Tab|Esc|Shift|Ctrl|Alt|CapsLock|[←↑→↓]|Home|End|PageUp|PageDown|Insert|Delete|Num [0-9]|[;,./=\-`\[\]\\'])$/;
// Bounded ephemeral badges only; never serialized into preferences or logs.
export class KeyOverlay {
 badges=[];sequence=0;
 add(labels,now,p,repeat=false){
  this.badges=this.badges.filter(x=>x.expires>now);
  if(!p.showKeys||(repeat&&!p.repeatKeys))return;
  for(const label of labels.slice(-6))if(allowed.test(label)){
   const badge={label,id:++this.sequence,expires:now+1500};
   this.badges=p.multiKeys?[...this.badges,badge].slice(-p.maxKeys):[badge];
  }
 }
 read(now,p){this.badges=this.badges.filter(x=>x.expires>now);return p.showKeys?this.badges.slice(-(p.multiKeys?p.maxKeys:1)):[];}
 clear(){this.badges=[];}
}
