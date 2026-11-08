/* Semantic background veto, separate from the high-resolution Longpipe matte.
   Uses official MediaPipe SelfieMulticlass: 0 background, 1 hair, 2 body,
   3 face, 4 clothing, 5 accessories. Conservative background ONLY.
   This worker may be disabled without changing the primary video. */
const SDK='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/+esm';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
let segmenter=null,stage=null,ctx=null,matte=null,matteCtx=null,buffer=null,broken=false;
async function init(){
 const m=await import(SDK);
 const vision=await m.FilesetResolver.forVisionTasks(WASM);
 segmenter=await m.ImageSegmenter.createFromOptions(vision,{
   baseOptions:{modelAssetPath:MODEL,delegate:'CPU'},runningMode:'VIDEO',
   outputCategoryMask:false,outputConfidenceMasks:true
 });
 stage=new OffscreenCanvas(256,256);ctx=stage.getContext('2d',{willReadFrequently:false});
 matte=new OffscreenCanvas(256,256);matteCtx=matte.getContext('2d',{willReadFrequently:true});
 postMessage({type:'ready'});
}
function gateFromResult(result){
 const masks=result.confidenceMasks;
 if(!masks||masks.length<6)throw Error('Multiclass masks missing');
 const w=masks[0].width,h=masks[0].height,n=w*h;
 const bg=masks[0].getAsFloat32Array(),hair=masks[1].getAsFloat32Array();
 const body=masks[2].getAsFloat32Array(),face=masks[3].getAsFloat32Array();
 const clothes=masks[4].getAsFloat32Array(),other=masks[5].getAsFloat32Array();
 // Preserve high-confidence hair/skin/clothing, but remove background
 // connected to an image edge. This avoids punching holes in skin or clothes.
 // The outer background can be peach-colored; never classify by hue alone.
 const inf=65500,dist=new Uint16Array(n),backgroundCandidate=new Uint8Array(n);
 const connected=new Uint8Array(n),queue=new Uint32Array(n);
 for(let i=0;i<n;i++){
  const human=Math.max(hair[i],body[i],face[i],clothes[i],other[i]);
  dist[i]=human>.31?0:inf;
  backgroundCandidate[i]=bg[i]>.55&&human<.42?1:0;
 }
 // Manhattan distance to confident human support protects wispy hair.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x;
  if(x&&dist[i-1]+1<dist[i])dist[i]=dist[i-1]+1;
  if(y&&dist[i-w]+1<dist[i])dist[i]=dist[i-w]+1;
 }
 for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){
  const i=y*w+x;
  if(x<w-1&&dist[i+1]+1<dist[i])dist[i]=dist[i+1]+1;
  if(y<h-1&&dist[i+w]+1<dist[i])dist[i]=dist[i+w]+1;
 }
 // Only suppress exterior regions attached to an image boundary.
 let head=0,tail=0;
 const seed=i=>{
  if(backgroundCandidate[i]&&!connected[i]){
   connected[i]=1;queue[tail++]=i;
  }
 };
 for(let x=0;x<w;x++){seed(x);seed((h-1)*w+x);}
 for(let y=0;y<h;y++){seed(y*w);seed(y*w+w-1);}
 while(head<tail){
  const i=queue[head++],x=i%w,y=(i-x)/w;
  if(x>0)seed(i-1);
  if(x<w-1)seed(i+1);
  if(y>0)seed(i-w);
  if(y<h-1)seed(i+w);
 }
 if(!buffer||matte.width!==w||matte.height!==h){
  matte.width=w;matte.height=h;buffer=matteCtx.createImageData(w,h);
 }
 for(let i=0;i<n;i++){
  const human=Math.max(hair[i],body[i],face[i],clothes[i],other[i]);
  const confidence=Math.min(1,Math.max(0,(bg[i]-.59)/.25));
  // Five native-model pixels of safety, then a six-pixel soft transition.
  const safety=Math.min(1,Math.max(0,(dist[i]-5)/6));
  // Outside edge-connected background only. Strong human pixels stay intact.
  const veto=connected[i]&&human<.36?confidence*safety:0;
  const alpha=Math.round(255*(1-.985*veto));
  const k=i*4;
  buffer.data[k]=255;buffer.data[k+1]=255;buffer.data[k+2]=255;buffer.data[k+3]=alpha;
 }
 matteCtx.putImageData(buffer,0,0);
 return matte.transferToImageBitmap();
}
self.onmessage=async({data})=>{
 if(data?.type==='init'){
  try{await init()}catch(error){broken=true;postMessage({type:'error',message:String(error)})}
  return;
 }
 if(data?.type==='stop'){
  segmenter?.close?.();self.close();return;
 }
 if(data?.type!=='frame')return;
 const {bitmap,time}=data;
 if(broken||!segmenter){bitmap?.close?.();return}
 const started=performance.now();
 try{
  ctx.clearRect(0,0,256,256);
  ctx.drawImage(bitmap,0,0,256,256);
  const result=segmenter.segmentForVideo(stage,time);
  let gate;
  try{gate=gateFromResult(result)}finally{result?.confidenceMasks?.forEach(m=>m.close?.())}
  postMessage({type:'gate',bitmap:gate,time,latency:performance.now()-started},[gate]);
 }catch(error){broken=true;postMessage({type:'error',message:String(error)})}
 finally{bitmap?.close?.()}
};
