import {mouthDefs,mouthMarkup} from './face-art';
import {emotionBadge} from './emotion-badges';
// Diffuse cheek colour and small drawn strokes blend into the source artwork.
// Each cheek follows the same head/cuff falloff as the actual face vertices.
const blush=`<defs><radialGradient id="cheek-glow"><stop stop-color="#e78c9e" stop-opacity=".38"/><stop offset=".55" stop-color="#eb9aaa" stop-opacity=".22"/><stop offset="1" stop-color="#f0adba" stop-opacity="0"/></radialGradient></defs>`+
 [ [604,907],[926,962] ].map(([x,y])=>`<g data-face-y="${y}"><path d="M${x-67} ${y-10}q17-30 64-21t70 29q-3 28-62 32t-72-40" fill="url(#cheek-glow)"/><g fill="none" stroke="#d78395" stroke-width="3.2" stroke-linecap="round" opacity=".48"><path d="M${x-34} ${y-9}q-4 6-5 14M${x-15} ${y-12}q-4 8-5 18M${x+5} ${y-10}q-4 8-5 18M${x+25} ${y-6}q-3 6-4 12"/></g></g>`).join('');
const tears=[[569,856],[955,941]].map(([x,y])=>`<g data-face-x="${x}" data-face-y="${y}"><path d="M${x-10} ${y}q10 4 20 0q-4 8-10 9t-10-9" fill="#c1deeb" stroke="#a4becf" stroke-width="1.6"/><path d="M${x+1} ${y+7}q-7 10-5 21q2 8 8 2t-3-23" fill="#c5e2ee" opacity=".8"/><path d="M${x+1} ${y+10}q-3 7-2 11" fill="none" stroke="#fff9f5" stroke-width="2" stroke-linecap="round"/></g>`).join('');
export const emotionMarkup:Record<string,string>={default:'',smile:blush,think:'',surprised:'',resigned:'',blush,sleepy:'',serious:'',laugh:blush,angry:'',pout:blush,shy:blush,wronged:tears,proud:'',confused:'',starry:blush,wind:''};
export function renderEmotion(node:HTMLElement,id:string){node.innerHTML=`<svg viewBox="-24 0 1584 1360" preserveAspectRatio="xMidYMax meet" aria-hidden="true">${mouthDefs}${mouthMarkup(id)}${emotionMarkup[id]??''}${emotionBadge(id)}</svg>`;node.dataset.expression=id;}
