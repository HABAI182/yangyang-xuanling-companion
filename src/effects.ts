const star=(x:number,y:number,r=22)=>`<path d="M ${x} ${y-r} Q ${x+3} ${y-3} ${x+r} ${y} Q ${x+3} ${y+3} ${x} ${y+r} Q ${x-3} ${y+3} ${x-r} ${y} Q ${x-3} ${y-3} ${x} ${y-r}" fill="#f0d6a2" stroke="#b9905d" stroke-width="3"/>`;
const text=(x:number,y:number,s:string,color='#7199ba',size=65)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="600" font-family="Segoe UI,Microsoft YaHei,sans-serif">${s}</text>`;
const blush=`<ellipse cx="535" cy="912" rx="58" ry="25" fill="#ed9ea0" opacity=".3"/><ellipse cx="976" cy="975" rx="55" ry="22" fill="#ed9ea0" opacity=".3"/>`;
const heart=(x:number,y:number)=>`<path d="M ${x} ${y+18} C ${x-70} ${y-18} ${x-44} ${y-72} ${x} ${y-35} C ${x+45} ${y-72} ${x+70} ${y-18} ${x} ${y+18}" fill="#d89aaf" stroke="#fff0f2" stroke-width="5"/>`;
const drop=(x:number,y:number)=>`<path d="M ${x} ${y-30} Q ${x-40} ${y+12} ${x} ${y+30} Q ${x+40} ${y+12} ${x} ${y-30}" fill="#a8d5e7" stroke="#fff" stroke-width="4" opacity=".9"/>`;
const wind=`<g fill="none" stroke="#b4d6e7" stroke-width="10" stroke-linecap="round"><path d="M1100 390q150-80 180-20t-65 40M1160 455q170-55 165 10t-90 12M1120 510q75-10 95 22"/></g>`;
export const emotionMarkup:Record<string,string>={
 default:'',smile:blush+star(1150,475)+star(1220,570,16),think:text(1130,485,'···','#8b9eae',100),
 surprised:text(1120,450,'!','#c4a36a',105)+text(280,540,'!','#c4a36a',75),resigned:drop(1150,590),
 blush:blush+heart(1110,540),sleepy:text(1130,500,'Z','#95a6c1',90)+text(1210,430,'z','#a8b6cd',62)+text(1260,365,'z','#b9c5d6',45),
 serious:`<path d="M520 697l112 22M865 760l113 45" fill="none" stroke="#4b4663" stroke-width="12" stroke-linecap="round"/>`,
 laugh:blush+star(1110,530)+star(320,580,15),angry:`<g fill="none" stroke="#91b8d1" stroke-width="14" stroke-linecap="round"><path d="M1140 420v35q0 20-22 20h-25M1170 420v35q0 20 22 20h25M1140 545v-25q0-20-22-20h-25M1170 545v-25q0-20 22-20h25"/></g>`,
 pout:blush+text(1120,500,'哼','#ac9bb0',58),shy:blush+heart(1150,520)+heart(325,590),
 wronged:drop(563,885)+drop(938,955),proud:star(1125,450,30)+star(1220,540,18)+text(1100,590,'✦','#c7a875',60),
 confused:text(1130,490,'?','#8e9fc1',100),starry:star(590,813,25)+star(930,897,25)+star(1150,500,18),wind,
};
export function renderEmotion(node:HTMLElement,id:string){node.innerHTML=`<svg viewBox="0 0 1536 1360" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${emotionMarkup[id]??''}</svg>`;node.dataset.expression=id;}
