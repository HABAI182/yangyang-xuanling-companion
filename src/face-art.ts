// Source-space mouth art follows native head triangles. Neutral retains atlas.
const line=(d:string)=>`<path d="${d}" fill="none" stroke="#c77d87" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
const smile=line('M-17-3Q0 15 18-4'),smallSmile=line('M-11 1Q0 9 11 0');
const parted='<path d="M-7-10Q7-14 10 0Q12 12 1 13Q-10 12-10 1Q-10-7-7-10Z" fill="url(#mouth-pink)" stroke="#c67f86" stroke-width="2.5"/><path d="M-6 7q6-3 11 0" fill="none" stroke="#f9c3bd" stroke-width="2.4" stroke-linecap="round"/>';
export const mouthDefs='<defs><linearGradient id="mouth-pink" x2=".2" y2="1"><stop stop-color="#a76074"/><stop offset="1" stop-color="#e4a0a5"/></linearGradient></defs>';
export const mouths:Record<string,string>={
 smile,
 think:line('M-11 3Q-2 0 8 4'),
 surprised:'<ellipse cx="0" cy="2" rx="12" ry="18" fill="url(#mouth-pink)" stroke="#c27b83" stroke-width="2.7"/><path d="M-7 12q7-4 14-1" fill="none" stroke="#f6c0ba" stroke-width="2.8" stroke-linecap="round"/>',
 resigned:line('M-15 5Q-4-1 13 7'),blush:smallSmile,sleepy:parted,
 serious:line('M-14 3Q0 0 14 3'),
 laugh:'<path d="M-20-6Q0 3 20-6Q14 25 0 25Q-14 24-20-6Z" fill="#975268" stroke="#bd737c" stroke-width="2.6"/><path d="M-11 18Q0 10 11 18Q7 24 0 24T-11 18" fill="#e6a1aa"/><path d="M-15-4Q0 2 15-4" fill="none" stroke="#ffeadf" stroke-width="2.8" stroke-linecap="round"/>',
 angry:line('M-17 8Q0-9 17 8'),pout:line('M-13 1q7 8 13 1q6-5 12 0'),shy:smallSmile,
 wronged:line('M-15 6Q-8-1-1 4Q5-2 14 5'),proud:line('M-15 5Q1 12 18-7'),
 confused:line('M-9 6Q1 1 13 5'),starry:smile,wind:smallSmile,
};
export function mouthMarkup(id:string){return mouths[id]?`<g data-face-x="731" data-face-y="949"><g data-mouth transform="translate(731 949) rotate(10)">${mouths[id]}</g></g>`:'';}
