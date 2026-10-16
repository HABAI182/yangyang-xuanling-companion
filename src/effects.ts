const star=(x:number,y:number,r=22)=>`<path d="M ${x} ${y-r} Q ${x+3} ${y-3} ${x+r} ${y} Q ${x+3} ${y+3} ${x} ${y+r} Q ${x-3} ${y+3} ${x-r} ${y} Q ${x-3} ${y-3} ${x} ${y-r}" fill="#f0d6a2" stroke="#b9905d" stroke-width="3"/>`;
const text=(x:number,y:number,s:string,color='#7199ba',size=65)=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="600" font-family="Segoe UI,Microsoft YaHei,sans-serif">${s}</text>`;
// Diffuse cheek colour and small drawn strokes blend into the source artwork.
// Each cheek follows the same head/cuff falloff as the actual face vertices.
const blush=`<defs><radialGradient id="cheek-glow"><stop stop-color="#e78c9e" stop-opacity=".38"/><stop offset=".55" stop-color="#eb9aaa" stop-opacity=".22"/><stop offset="1" stop-color="#f0adba" stop-opacity="0"/></radialGradient></defs>`+
 [ [604,907],[926,962] ].map(([x,y])=>`<g data-face-y="${y}"><path d="M${x-67} ${y-10}q17-30 64-21t70 29q-3 28-62 32t-72-40" fill="url(#cheek-glow)"/><g fill="none" stroke="#d78395" stroke-width="3.2" stroke-linecap="round" opacity=".48"><path d="M${x-34} ${y-9}q-4 6-5 14M${x-15} ${y-12}q-4 8-5 18M${x+5} ${y-10}q-4 8-5 18M${x+25} ${y-6}q-3 6-4 12"/></g></g>`).join('');
const heart=(x:number,y:number)=>`<path d="M ${x} ${y+18} C ${x-70} ${y-18} ${x-44} ${y-72} ${x} ${y-35} C ${x+45} ${y-72} ${x+70} ${y-18} ${x} ${y+18}" fill="#d89aaf" stroke="#fff0f2" stroke-width="5"/>`;
const drop=(x:number,y:number)=>`<path d="M ${x} ${y-30} Q ${x-40} ${y+12} ${x} ${y+30} Q ${x+40} ${y+12} ${x} ${y-30}" fill="#a8d5e7" stroke="#fff" stroke-width="4" opacity=".9"/>`;
const wind=`<g fill="none" stroke="#b4d6e7" stroke-width="10" stroke-linecap="round"><path d="M1100 390q150-80 180-20t-65 40M1160 455q170-55 165 10t-90 12M1120 510q75-10 95 22"/></g>`;
export const emotionMarkup:Record<string,string>={
 default:'',smile:blush+star(1150,475)+star(1220,570,16),think:text(1130,485,'···','#8b9eae',100),
 surprised:text(1120,450,'!','#c4a36a',105)+text(280,540,'!','#c4a36a',75),resigned:drop(1150,590),
 blush:blush+heart(1110,540),sleepy:text(1130,500,'Z','#95a6c1',90)+text(1210,430,'z','#a8b6cd',62)+text(1260,365,'z','#b9c5d6',45),
 serious:`<g data-face-y="760"><path d="M520 697l112 22M865 760l113 45" fill="none" stroke="#4b4663" stroke-width="12" stroke-linecap="round"/></g>`,
 laugh:blush+star(1110,530)+star(320,580,15),angry:`<g fill="none" stroke="#91b8d1" stroke-width="14" stroke-linecap="round"><path d="M1140 420v35q0 20-22 20h-25M1170 420v35q0 20 22 20h25M1140 545v-25q0-20-22-20h-25M1170 545v-25q0-20 22-20h25"/></g>`,
 pout:blush+text(1120,500,'哼','#ac9bb0',58),shy:blush+heart(1150,520)+heart(325,590),
 wronged:`<g data-face-y="920">${drop(563,885)+drop(938,955)}</g>`,proud:star(1125,450,30)+star(1220,540,18)+text(1100,590,'✦','#c7a875',60),
 confused:text(1130,490,'?','#8e9fc1',100),starry:`<g data-face-y="850">${star(590,813,25)+star(930,897,25)}</g>`+star(1150,500,18),wind,
};
export function renderEmotion(node:HTMLElement,id:string){node.innerHTML=`<svg viewBox="0 0 1536 1360" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${emotionMarkup[id]??''}</svg>`;node.dataset.expression=id;}
