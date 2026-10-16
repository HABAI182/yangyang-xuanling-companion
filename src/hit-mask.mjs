// Alpha is sampled after the current WebGL frame. A row-run mask keeps IPC
// compact; no screenshot, key text or pixel colours leave this process.
export function alphaRuns(rgba,width,height,threshold=8){
 const occupied=new Uint8Array(width*height);
 for(let i=0;i<occupied.length;i++)if(rgba[i*4+3]>=threshold)occupied[i]=1;
 // One sample of tolerance keeps fine, antialiased hair tips easy to touch.
 const mask=occupied.slice();
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(occupied[y*width+x]){
  if(x)mask[y*width+x-1]=1;if(x+1<width)mask[y*width+x+1]=1;
  if(y)mask[(y-1)*width+x]=1;if(y+1<height)mask[(y+1)*width+x]=1;
 }
 const runs=[];let hash=2166136261;
 for(let y=0;y<height;y++)for(let x=0;x<width;){
  if(!mask[y*width+x]){x++;continue;}const start=x;while(x<width&&mask[y*width+x])x++;
  runs.push([y,start,x]);for(const n of [y,start,x])hash=Math.imul(hash^n,16777619);
 }
 return {runs,hash:hash>>>0};
}
