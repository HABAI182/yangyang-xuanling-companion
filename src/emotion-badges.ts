// Rounded vector lettering stays crisp at desktop sizes, independent of fonts.
const shape=(d:string,fill:string)=>`<path d="${d}" fill="${fill}" stroke="#516b91" stroke-width="15" stroke-linejoin="round"/><path d="${d}" fill="${fill}" stroke="#fff8e9" stroke-width="10" stroke-linejoin="round"/><path d="${d}" fill="${fill}" stroke="#6780a0" stroke-width="2" stroke-linejoin="round"/>`;
const stroke=(d:string,colour:string)=>`<path d="${d}" fill="none" stroke="#536b8b" stroke-width="23" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff8ee" stroke-width="18" stroke-linejoin="round" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${colour}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>`;
const dot=(x:number,y:number,r=11)=>shape(`M${x-r} ${y}a${r} ${r} 0 1 0 ${r*2} 0a${r} ${r} 0 1 0 ${-r*2} 0`,'#f0cd8f');
const exclamation=shape('M13 6Q32-1 49 7L43 77Q33 89 20 78Z','#edc47f')+dot(32,113,13)+'<path d="M22 15L25 61" stroke="#fff3cf" stroke-width="5" stroke-linecap="round"/>';
const question=shape('M2 23Q0-6 38-8Q83-6 83 28Q84 49 60 61Q48 68 50 81L29 81Q24 60 42 48Q62 37 59 27Q56 15 40 16Q23 17 22 29Z','#b5c5e4')+dot(40,109,12);
const z=shape('M3 0H68Q77 0 75 13L29 67H67Q77 67 77 79Q77 90 66 90H5Q-4 90-2 78L44 24H6Q-5 22-5 12Q-4 1 3 0Z','#a8c8e8');
const heart=shape('M0 22C-67-9-44-67-13-42L0-29Q29-67 51-37C76-7 27 10 0 22Z','#dfa2b7');
const star=(x:number,y:number,r:number)=>shape(`M${x} ${y-r}Q${x+6} ${y-6} ${x+r} ${y}Q${x+6} ${y+6} ${x} ${y+r}Q${x-6} ${y+6} ${x-r} ${y}Q${x-6} ${y-6} ${x} ${y-r}`,'#f0d49a');
const droplet=shape('M0-52Q-41 4-10 18Q20 32 24 3Q23-17 0-52Z','#acd7e9')+'<path d="M-6-20Q-14-5-10 3" fill="none" stroke="#f6fcff" stroke-width="6" stroke-linecap="round"/>';
const cloud=shape('M8 13Q-4-11 19-20Q28-42 49-31Q76-36 83-17Q111-12 103 10Q104 31 77 32H25Q6 34 8 13Z','#e7f1fb')+'<g fill="#7890b4"><circle cx="31" cy="4" r="6"/><circle cx="54" cy="4" r="6"/><circle cx="77" cy="4" r="6"/></g><circle cx="-2" cy="48" r="8" fill="#e7f1fb" stroke="#7890b4" stroke-width="3"/>';
const accents:Record<string,string>={
 smile:star(0,0,35)+star(69,57,18),
 think:`<g transform="translate(-10 34)">${cloud}</g>`,
 surprised:`<g transform="rotate(11)">${exclamation}</g>`+stroke('M-26 3L-41-16M-35 35L-53 31','#f1cd87'),
 resigned:`<g transform="translate(15 35) rotate(-9)">${droplet}</g>`,
 blush:heart,
 sleepy:`<g transform="translate(-12 45) rotate(-8)">${z}</g><g transform="translate(91 0) rotate(10) scale(.7)">${z}</g><g transform="translate(162 -35) rotate(15) scale(.43)">${z}</g>`,
 laugh:star(8,5,36)+star(75,62,19),
 angry:stroke('M-26-28V-12Q-26 0-42 0H-54M0-28V-12Q0 0 16 0H28M-26 50V34Q-26 21-42 21H-54M0 50V34Q0 21 16 21H28','#d795a4'),
 pout:`<g transform="scale(.7)">${cloud}</g>`,shy:`<g transform="scale(.75)">${heart}</g>`,
 proud:star(0,0,40)+star(67,48,18),confused:`<g transform="rotate(9)">${question}</g>`,
 starry:star(-4,-2,41)+star(76,46,24)+star(34,90,13),
 wind:stroke('M-26 10Q45-30 79-12T63 22M-10 58Q63 29 103 47','#a6cadf')+'<image href="/assets/ui/xuanling-crest.svg" x="-22" y="-55" width="70" height="54"/>',
};
export function emotionBadge(id:string){const body=accents[id];if(!body)return '';const y=id==='sleepy'?393:['smile','laugh','proud','starry','angry','blush','shy','resigned','wind'].includes(id)?437:365;return `<g data-emotion-badge="${id}" transform="translate(1165 ${y})"><g class="emotion-sticker">${body}</g></g>`;}
